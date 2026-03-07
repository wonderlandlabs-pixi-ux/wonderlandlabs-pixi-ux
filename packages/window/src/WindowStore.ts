import {TickerForest} from "@wonderlandlabs-pixi-ux/ticker-forest";
import type {
    ConfigureTitlebarFn,
    ModifyInitialTitlebarParamsResult,
    ModifyInitialTitlebarParamsFn,
    PartialWindowStyle,
    RgbColor,
    TitlebarConfig,
    TitlebarContentRendererFn,
    TitlebarStoreClass,
    WindowContentRendererFn,
    WindowCloseHandler,
    WindowDef,
    WindowResolveHookFn,
    WindowRectTransform,
    WindowStyle
} from "./types";
import {Application, Container, Graphics, Rectangle} from "pixi.js";
import {WindowsManager} from "./WindowsManager";
import rgbToColor from "./rgbToColor";
import {DragStore} from "@wonderlandlabs-pixi-ux/drag";
import {StoreParams} from "@wonderlandlabs/forestry4";
import {TitlebarStore} from "./TitlebarStore";
import {ResizerStore} from "@wonderlandlabs-pixi-ux/resizer";
import {distinctUntilChanged, filter, map} from 'rxjs';
import type {Subscription} from 'rxjs';
import {resolveWindowStyle} from './styles';
import {STYLE_VARIANT} from './constants';
import {isEqual} from 'lodash-es';

// Default color for handles and selection border (blue)
const HANDLE_COLOR: RgbColor = {r: 0.3, g: 0.6, b: 1};

export class WindowStore extends TickerForest<WindowDef> {
    static titlebarStoreClass: TitlebarStoreClass = TitlebarStore;
    static titlebarContentRenderer?: TitlebarContentRendererFn;
    static windowContentRenderer?: WindowContentRendererFn;
    static onResolve?: WindowResolveHookFn;
    static configureTitlebar?: ConfigureTitlebarFn;
    static modifyInitialTitlebarParams?: ModifyInitialTitlebarParamsFn;

    handlesContainer?: Container; // Shared container for resize handles
    customStyle?: PartialWindowStyle; // User style overrides
    rectTransform?: WindowRectTransform; // Optional transform for resizer rectangle

    // Pixi components - created in property definitions
    // guardContainer wraps rootContainer to protect event listeners from being purged
    // when event models change on rootContainer
    #guardContainer: Container = new Container({
        position: {x: 0, y: 0}
    });
    #rootContainer: Container = new Container({
        eventMode: "static",
        position: {x: 0, y: 0},
        sortableChildren: true  // Enable zIndex sorting
    });
    #background: Graphics = new Graphics();
    #selectionBorder: Graphics = new Graphics();
    #contentContainer: Container = new Container({
        eventMode: "static",
        position: {x: 0, y: 0}
    });
    #contentMask: Graphics = new Graphics();
    #titlebarContentRendererOverride?: TitlebarContentRendererFn;
    #windowContentRendererOverride?: WindowContentRendererFn;
    #onResolveOverride?: WindowResolveHookFn;
    #titlebarConfigureOverride?: ConfigureTitlebarFn;
    #titlebarModifyInitialParamsOverride?: ModifyInitialTitlebarParamsFn;
    #initialTitlebarParamsApplied = false;

    /**
     * Get the resolved style for this window (variant + custom overrides)
     */
    get resolvedStyle(): WindowStyle {
        const variant = this.value.variant ?? STYLE_VARIANT.DEFAULT;
        return resolveWindowStyle(variant, this.customStyle);
    }

    constructor(config: StoreParams<WindowDef>, app: Application) {
        super(config, { app });
        this.#initTitlebar();
        if (app) {
            this.kickoff();
        }
    }

    #initTitlebar() {
        const self = this;
        const subclass = (this.constructor as typeof WindowStore).titlebarStoreClass ?? TitlebarStore;
        // Create titlebar store as a branch using $branches.$add
        // @ts-ignore
        self.#titlebarStore = self.$branches.$add(['titlebar'], {
            subclass,
        }, self.application!) as unknown as TitlebarStore;
        self.#titlebarStore.application = self.application;
        self.#titlebarStore.dirty();
        self.#applyTitlebarHooks();
        self.#applyInitialTitlebarParamOverrides();
        self.#syncTitlebarCloseState();

        self.#dirtyCascadeSubscription?.unsubscribe();
        self.#dirtyCascadeSubscription = self.dirty$
            .pipe(
                distinctUntilChanged(),
                filter(Boolean),
            )
            .subscribe(() => {
                self.#titlebarStore?.dirty();
            });

        self.#sizeSubscription?.unsubscribe();
        self.#sizeSubscription = self.$subject.pipe(
            map(() => `${self.value?.width}-${self.value?.height}`),
            distinctUntilChanged(),
        ).subscribe(() => {
            self.dirty();
        });
    }

    resolveComponents(parentContainer?: Container, handlesContainer?: Container) {
        this.#applyResolveHook();
        this.#refreshRoot();
        this.#refreshBackground();
        this.#refreshSelectionBorder();
        // Add guardContainer to parent, rootContainer to guardContainer
        // guardContainer protects rootContainer's event listeners from being purged
        if (!this.#guardContainer.parent && parentContainer) {
            parentContainer.addChild(this.#guardContainer);
        }
        if (!this.#rootContainer.parent) {
            this.#guardContainer.addChild(this.#rootContainer);
        }
        this.#refreshContentContainer();
        this.#refreshTitlebar();
        this.#refreshResizer(handlesContainer);
    }

    #dragStore?: DragStore;
    #titlebarStore?: TitlebarStore;
    #resizerStore?: ResizerStore;
    #dragInitialized = false;
    #sizeSubscription?: Subscription;
    #dirtyCascadeSubscription?: Subscription;
    #closable = false;
    #onClose?: WindowCloseHandler;

    #applyTitlebarHooks(): void {
        const titlebarStore = this.#titlebarStore;
        if (!titlebarStore) {
            return;
        }

        const ctor = this.constructor as typeof WindowStore;
        const contentRenderer = this.#titlebarContentRendererOverride ?? ctor.titlebarContentRenderer;
        const configureHook = this.#titlebarConfigureOverride ?? ctor.configureTitlebar;

        if (contentRenderer) {
            titlebarStore.titlebarContentRenderer = contentRenderer;
        }

        if (configureHook) {
            configureHook(titlebarStore, this);
        }
    }

    #applyWindowContentRenderer(): void {
        const ctor = this.constructor as typeof WindowStore;
        const contentRenderer = this.#windowContentRendererOverride ?? ctor.windowContentRenderer;
        if (!contentRenderer) {
            return;
        }
        const {width, height} = this.value;
        contentRenderer({
            windowStore: this,
            windowValue: this.value,
            contentContainer: this.#contentContainer,
            localRect: new Rectangle(0, 0, width, height),
            localScale: {
                x: this.#contentContainer.scale.x,
                y: this.#contentContainer.scale.y,
            },
        });
    }

    #applyResolveHook(): void {
        const ctor = this.constructor as typeof WindowStore;
        const resolveHook = this.#onResolveOverride ?? ctor.onResolve;
        if (!resolveHook) {
            return;
        }
        resolveHook(this.value);
    }

    #applyPatch<T extends object>(target: T, patch: Partial<T>): boolean {
        let changed = false;
        for (const [key, value] of Object.entries(patch) as [keyof T, T[keyof T]][]) {
            if (value === undefined) {
                continue;
            }
            if (!isEqual(target[key], value)) {
                target[key] = value;
                changed = true;
            }
        }
        return changed;
    }

    #applyInitialTitlebarParamOverrides(): void {
        if (this.#initialTitlebarParamsApplied) {
            return;
        }

        const titlebarStore = this.#titlebarStore;
        if (!titlebarStore) {
            return;
        }

        const ctor = this.constructor as typeof WindowStore;
        const modifyHook = this.#titlebarModifyInitialParamsOverride ?? ctor.modifyInitialTitlebarParams;
        if (!modifyHook) {
            return;
        }

        const next = modifyHook({
            state: titlebarStore.value as TitlebarConfig,
            config: this.value,
        }) as ModifyInitialTitlebarParamsResult | void;

        if (!next) {
            this.#initialTitlebarParamsApplied = true;
            return;
        }

        if (next.state) {
            let titlebarChanged = false;
            titlebarStore.mutate((draft) => {
                titlebarChanged = this.#applyPatch(draft, next.state!);
            });
            if (titlebarChanged) {
                titlebarStore.dirty();
            }
        }

        if (next.config) {
            let windowChanged = false;
            this.mutate((draft) => {
                windowChanged = this.#applyPatch(draft, next.config!);
            });
            if (windowChanged) {
                this.dirty();
            }
        }

        this.#initialTitlebarParamsApplied = true;
    }

    /**
     * Get the titlebar store for custom configuration
     */
    get titlebarStore(): TitlebarStore | undefined {
        return this.#titlebarStore;
    }

    get closable(): boolean {
        return this.#closable;
    }

    setClosable(closable: boolean): void {
        if (this.#closable === closable) {
            return;
        }
        this.#closable = closable;
        this.#syncTitlebarCloseState();
    }

    setOnClose(onClose?: WindowCloseHandler): void {
        this.#onClose = onClose;
    }

    setTitlebarContentRenderer(titlebarContentRenderer?: TitlebarContentRendererFn): void {
        this.#titlebarContentRendererOverride = titlebarContentRenderer;
        if (!this.#titlebarStore) {
            return;
        }
        if (titlebarContentRenderer) {
            this.#titlebarStore.titlebarContentRenderer = titlebarContentRenderer;
        } else {
            const ctor = this.constructor as typeof WindowStore;
            this.#titlebarStore.titlebarContentRenderer = ctor.titlebarContentRenderer;
        }
        this.#titlebarStore.dirty();
    }

    configureTitlebar(configureTitlebar?: ConfigureTitlebarFn): void {
        this.#titlebarConfigureOverride = configureTitlebar;
        if (!this.#titlebarStore || !configureTitlebar) {
            return;
        }
        configureTitlebar(this.#titlebarStore, this);
        this.#titlebarStore.dirty();
    }

    setModifyInitialTitlebarParams(modifyInitialTitlebarParams?: ModifyInitialTitlebarParamsFn): void {
        this.#titlebarModifyInitialParamsOverride = modifyInitialTitlebarParams;
        this.#applyInitialTitlebarParamOverrides();
    }

    setWindowContentRenderer(windowContentRenderer?: WindowContentRendererFn): void {
        this.#windowContentRendererOverride = windowContentRenderer;
        this.dirty();
    }

    setOnResolve(onResolve?: WindowResolveHookFn): void {
        this.#onResolveOverride = onResolve;
        this.dirty();
    }

    setRectTransform(rectTransform?: WindowRectTransform): void {
        if (this.rectTransform === rectTransform) {
            return;
        }
        this.rectTransform = rectTransform;

        // Recreate resizer so new transform callback is applied.
        if (this.#resizerStore) {
            this.#resizerStore.removeHandles();
            this.#resizerStore.cleanup();
            this.#resizerStore = undefined;
            this.dirty();
        }
    }

    requestClose(): void {
        const rootStore = this.$root as unknown as WindowsManager | undefined;
        const shouldKeepOpen = this.#onClose?.({
            id: this.value.id,
            windowStore: this,
            windowsManager: rootStore,
        }) === false;

        if (!shouldKeepOpen) {
            rootStore?.removeWindow?.(this.value.id);
        }
    }

    #syncTitlebarCloseState(): void {
        const showCloseButton = this.#closable || !!this.value.titlebar?.showCloseButton;
        if (!this.#titlebarStore || this.#titlebarStore.value.showCloseButton === showCloseButton) {
            return;
        }
        this.#titlebarStore.set('showCloseButton', showCloseButton);
        this.#titlebarStore.dirty();
    }

    #getFrameContainer(): Container | undefined {
        const rootStore = this.$root as unknown as WindowsManager | undefined;
        return rootStore?.container;
    }

    #framePointToRootLocal(x: number, y: number): {x: number; y: number} {
        const frameContainer = this.#getFrameContainer();
        const parent = this.#rootContainer.parent;
        if (!frameContainer || !parent || frameContainer === parent) {
            return {x, y};
        }
        const globalPoint = frameContainer.toGlobal({x, y});
        const localPoint = parent.toLocal(globalPoint);
        return {x: localPoint.x, y: localPoint.y};
    }

    #rootLocalPointToFrame(x: number, y: number): {x: number; y: number} {
        const frameContainer = this.#getFrameContainer();
        const parent = this.#rootContainer.parent;
        if (!frameContainer || !parent || frameContainer === parent) {
            return {x, y};
        }
        const globalPoint = parent.toGlobal({x, y});
        const localPoint = frameContainer.toLocal(globalPoint);
        return {x: localPoint.x, y: localPoint.y};
    }

    #frameRectToRootLocal(rect: Rectangle): Rectangle {
        const topLeft = this.#framePointToRootLocal(rect.x, rect.y);
        const topRight = this.#framePointToRootLocal(rect.x + rect.width, rect.y);
        const bottomLeft = this.#framePointToRootLocal(rect.x, rect.y + rect.height);
        return new Rectangle(
            topLeft.x,
            topLeft.y,
            topRight.x - topLeft.x,
            bottomLeft.y - topLeft.y
        );
    }

    #rootLocalRectToFrame(rect: Rectangle): Rectangle {
        const topLeft = this.#rootLocalPointToFrame(rect.x, rect.y);
        const topRight = this.#rootLocalPointToFrame(rect.x + rect.width, rect.y);
        const bottomLeft = this.#rootLocalPointToFrame(rect.x, rect.y + rect.height);
        return new Rectangle(
            topLeft.x,
            topLeft.y,
            topRight.x - topLeft.x,
            bottomLeft.y - topLeft.y
        );
    }

    #refreshRoot() {
        const {x, y, isDraggable, zIndex} = this.value;

        // Update position
        this.#rootContainer.position.set(x, y);
        this.#guardContainer.zIndex = zIndex;

        // Only add drag behavior if isDraggable is true and not already initialized
        if (isDraggable && !this.#dragStore) {
            this.#initDrag();
        }
    }

    #initDrag() {
        const self = this;
        const {dragFromTitlebar} = this.value;

        this.#dragStore = new DragStore({
            app: this.application!,
            callbacks: {
                onDragStart() {
                    const rootStore = self.$root as unknown as WindowsManager;
                    rootStore?.setSelectedWindow?.(self.value.id);
                },
                onDrag(state) {
                    const pos = self.#dragStore?.getCurrentItemPosition();
                    if (pos) {
                        const localPos = self.#framePointToRootLocal(pos.x, pos.y);
                        self.#rootContainer.position.set(localPos.x, localPos.y);
                        if (self.value.x !== localPos.x || self.value.y !== localPos.y) {
                            self.mutate((draft) => {
                                draft.x = localPos.x;
                                draft.y = localPos.y;
                            });
                        }
                        // Update resizer rect to match new position
                        if (self.#resizerStore) {
                            const resizerRect = self.#rootLocalRectToFrame(new Rectangle(
                                localPos.x,
                                localPos.y,
                                self.value.width,
                                self.value.height
                            ));
                            self.#resizerStore.setRect(resizerRect);
                        }
                    }
                },
                onDragEnd() {
                    const finalX = self.#rootContainer.position.x;
                    const finalY = self.#rootContainer.position.y;
                    if (self.value.x !== finalX || self.value.y !== finalY) {
                        self.mutate((draft) => {
                            draft.x = finalX;
                            draft.y = finalY;
                        });
                    }
                    // Reset cursor on the drag target
                    if (dragFromTitlebar && self.#titlebarStore) {
                        self.#titlebarStore.container.cursor = 'grab';
                    } else {
                        self.#rootContainer.cursor = 'grab';
                    }
                },
            },
        });

        // Attach drag to titlebar or root container based on dragFromTitlebar setting
        if (dragFromTitlebar) {
            // Drag will be initialized after titlebar is ready
            // Mark as pending - will be set up in #initTitlebarDrag
            this.#dragInitialized = false;
        } else {
            this.#rootContainer.cursor = 'grab';
            this.#rootContainer.on('pointerdown', (event) => {
                event.stopPropagation();
                self.#rootContainer.cursor = 'grabbing';

                // Start drag with current container position
                const started = self.#dragStore!.startDragContainer(
                    self.value.id,
                    event,
                    self.#rootContainer,
                    self.#getFrameContainer()
                );
                if (!started) {
                    self.#rootContainer.cursor = 'grab';
                }
            });
            this.#dragInitialized = true;
        }
    }

    // Click detection state
    #clickStartTime = 0;
    #clickStartX = 0;
    #clickStartY = 0;
    #clickTimeout?: ReturnType<typeof setTimeout>;
    static readonly CLICK_MAX_TIME = 800; // ms
    static readonly CLICK_MAX_DISTANCE = 10; // pixels

    #initTitlebarDrag() {
        if (this.#dragInitialized || !this.#dragStore || !this.#titlebarStore) {
            return;
        }

        const self = this;
        const titlebarContainer = this.#titlebarStore.container;

        titlebarContainer.cursor = 'grab';
        titlebarContainer.on('pointerdown', (event) => {
            event.stopPropagation();
            titlebarContainer.cursor = 'grabbing';

            // Record click start for click detection
            self.#clickStartTime = Date.now();
            self.#clickStartX = event.global.x;
            self.#clickStartY = event.global.y;

            // Start drag with current container position (root container moves)
            const started = self.#dragStore!.startDragContainer(
                self.value.id,
                event,
                self.#rootContainer,
                self.#getFrameContainer()
            );
            if (!started) {
                titlebarContainer.cursor = 'grab';
                return;
            }

            // Set up click detection timeout
            self.#clickTimeout = setTimeout(() => {
                self.#clickTimeout = undefined;
            }, WindowStore.CLICK_MAX_TIME);
        });

        titlebarContainer.on('pointerup', (event) => {
            self.#handlePotentialClick(event.global.x, event.global.y);
        });

        titlebarContainer.on('pointerupoutside', (event) => {
            self.#handlePotentialClick(event.global.x, event.global.y);
        });

        this.#dragInitialized = true;
    }

    #handlePotentialClick(endX: number, endY: number) {
        // Check if this qualifies as a click
        const elapsed = Date.now() - this.#clickStartTime;
        const dx = Math.abs(endX - this.#clickStartX);
        const dy = Math.abs(endY - this.#clickStartY);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (elapsed <= WindowStore.CLICK_MAX_TIME && distance <= WindowStore.CLICK_MAX_DISTANCE) {
            // This is a click! Cancel the drag and select the window
            this.#dragStore?.cancelDrag();

            // Reset the window position to where it was before drag started
            const {x, y} = this.value;
            this.#rootContainer.position.set(x, y);

            // Select this window
            const rootStore = this.$root as unknown as WindowsManager;
            if (rootStore?.setSelectedWindow) {
                rootStore.setSelectedWindow(this.value.id);
            }

            // Reset cursor
            if (this.#titlebarStore) {
                this.#titlebarStore.container.cursor = 'grab';
            }
        }

        // Clear timeout if still pending
        if (this.#clickTimeout) {
            clearTimeout(this.#clickTimeout);
            this.#clickTimeout = undefined;
        }
    }

    #backgroundClickInitialized = false;

    #refreshBackground() {
        const {width, height, backgroundColor} = this.value;
        const style = this.resolvedStyle;

        // Add to container if not already added
        if (!this.#background.parent) {
            this.#rootContainer.addChild(this.#background);
            this.#background.zIndex = 0;  // Background layer
            this.#background.eventMode = 'static';
        }

        // Use style background color if variant is set, otherwise use explicit backgroundColor
        const bgColor = this.value.variant ? style.backgroundColor : backgroundColor;

        // Update graphics - fill only
        this.#background.clear();
        this.#background.rect(0, 0, width, height)
            .fill(rgbToColor(bgColor));

        // Add click-to-select handler (only once)
        if (!this.#backgroundClickInitialized) {
            this.#initBackgroundClick();
        }
    }

    #initBackgroundClick() {
        if (this.#backgroundClickInitialized) {
            return;
        }

        const self = this;
        this.#background.on('pointerdown', (event) => {
            // Select this window via WindowsManager
            const rootStore = self.$root as unknown as WindowsManager;
            if (rootStore?.setSelectedWindow) {
                rootStore.setSelectedWindow(self.value.id);
            }
        });
        this.#backgroundClickInitialized = true;
    }

    #refreshSelectionBorder() {
        const {width, height, id} = this.value;
        const rootStore = this.$root as unknown as WindowsManager;
        const isSelected = rootStore?.isWindowSelected?.(id) ?? false;
        const style = this.resolvedStyle;

        if (!this.#selectionBorder.parent) {
            this.#rootContainer.addChild(this.#selectionBorder);
            this.#selectionBorder.zIndex = 3; // Above titlebar/content/background
            this.#selectionBorder.eventMode = 'none';
        }

        this.#selectionBorder.clear();
        this.#selectionBorder.visible = isSelected;
        if (!isSelected) {
            return;
        }

        const borderColor = style?.selectedBorderColor ?? HANDLE_COLOR;
        const borderWidth = style?.selectedBorderWidth ?? 2;
        const color = rgbToColor(borderColor);
        this.#selectionBorder
            .rect(0, 0, width, height)
            .stroke({width: borderWidth, color, alignment: 1});
    }

    #refreshContentContainer() {
        const {width, height, contentClickable} = this.value;

        // Add content container if not already added
        if (!this.#contentContainer.parent) {
            this.#rootContainer.addChild(this.#contentContainer);
            this.#contentContainer.zIndex = 1;  // Content layer (above background, below titlebar)
        }

        // Position content container at 0,0 (titlebar will overlap)
        this.#contentContainer.position.set(0, 0);

        // Set event mode based on contentClickable
        this.#contentContainer.eventMode = contentClickable ? 'static' : 'none';

        this.#refreshContentMask();
        this.#applyWindowContentRenderer();
    }

    #refreshContentMask() {
        const {width, height, id} = this.value;

        // Check if window is selected
        const rootStore = this.$root as unknown as WindowsManager;
        const isSelected = rootStore?.isWindowSelected?.(id) ?? false;

        // When selected, disable mask to show content overflow
        if (isSelected) {
            this.#contentContainer.mask = null;
            // Keep mask geometry from drawing over the window background when not used.
            this.#contentMask.visible = false;
            this.#contentMask.clear();
            return;
        }

        // Update content mask - simple rectangle matching window dimensions
        if (!this.#contentMask.parent) {
            this.#rootContainer.addChild(this.#contentMask);
        }
        this.#contentMask.visible = true;

        this.#contentMask.clear();
        this.#contentMask.rect(0, 0, width, height)
            .fill(0xffffff); // Color doesn't matter for masks

        // Apply mask to content container
        this.#contentContainer.mask = this.#contentMask;
    }

    #tbKicked = false;

    #refreshTitlebar() {
        this.#syncTitlebarCloseState();
        if (!this.#tbKicked) {
            this.#titlebarStore?.kickoff();
            this.#tbKicked = true;
        }
        this.#titlebarStore?.addHover();

        // Initialize titlebar drag if dragFromTitlebar is enabled
        if (this.value.dragFromTitlebar && this.#titlebarStore) {
            this.#initTitlebarDrag();
        }
    }

    #refreshResizer(handlesContainer?: Container) {
        const {isResizeable, width, height, x, y, resizeMode, minWidth, minHeight, id} = this.value;

        // Remove existing resizer if isResizeable is false
        if (!isResizeable && this.#resizerStore) {
            this.#resizerStore.removeHandles();
            this.#resizerStore = undefined;
            return;
        }

        // Create resizer if isResizeable is true and it doesn't exist
        if (isResizeable && !this.#resizerStore && this.#rootContainer) {
            const self = this;
            const frameRect = this.#rootLocalRectToFrame(new Rectangle(x, y, width, height));

            this.#resizerStore = new ResizerStore({
                container: this.#rootContainer,
                handleContainer: handlesContainer,
                deltaSpace: this.#getFrameContainer(),
                rect: frameRect,
                app: this.application!,
                mode: resizeMode || 'ONLY_CORNER',
                size: 8,
                color: HANDLE_COLOR,
                rectTransform: this.rectTransform,
                drawRect: (rect: Rectangle) => {
                    const localRect = self.#frameRectToRootLocal(rect);
                    // Update window dimensions when resizing
                    self.mutate((draft) => {
                        draft.x = localRect.x;
                        draft.y = localRect.y;
                        draft.width = Math.max(localRect.width, minWidth || 50);
                        draft.height = Math.max(localRect.height, minHeight || 50);
                    });
                    self.dirty();
                },
                onRelease: (rect: Rectangle) => {
                    const localRect = self.#frameRectToRootLocal(rect);
                    // Final update when resize is complete
                    self.mutate((draft) => {
                        draft.width = Math.max(localRect.width, minWidth || 50);
                        draft.height = Math.max(localRect.height, minHeight || 50);
                        draft.x = localRect.x;
                        draft.y = localRect.y;
                    });
                    self.dirty();
                }
            });
        }

        // Update resizer rect if dimensions changed externally
        if (this.#resizerStore) {
            const currentRect = this.#resizerStore.value.rect;
            const frameRect = this.#rootLocalRectToFrame(new Rectangle(x, y, width, height));
            const rectChanged = currentRect.x !== frameRect.x
                || currentRect.y !== frameRect.y
                || currentRect.width !== frameRect.width
                || currentRect.height !== frameRect.height;
            if (rectChanged) {
                // Sync to current window rect directly (no rectTransform pass here).
                this.#resizerStore.setRect(frameRect);
            }

            // Only show handles when window is selected
            const rootStore = this.$root as unknown as WindowsManager;
            const isSelected = rootStore?.isWindowSelected?.(id) ;
            this.#resizerStore.setVisible(isSelected ?? false);
        }
    }

    /**
     * Get the guardContainer for this window (used for z-index management in parent)
     * guardContainer wraps rootContainer to protect event listeners
     */
    get guardContainer(): Container {
        return this.#guardContainer;
    }

    /**
     * Get the rootContainer for this window (main container with event handling)
     */
    get rootContainer(): Container {
        return this.#rootContainer;
    }

    /**
     * Get the content container for this window (for adding custom content)
     */
    get contentContainer(): Container {
        return this.#contentContainer;
    }

    protected resolve(): void {
        if (!this.$isRoot) {
            const rootStore = this.$root as unknown as WindowsManager;
            if (rootStore?.windowsContainer) {
                this.resolveComponents(rootStore.windowsContainer, rootStore.handlesContainer);
                rootStore.updateZIndices();
            }
        }
    }

    cleanup(): void {
        super.cleanup();

        this.#sizeSubscription?.unsubscribe();
        this.#sizeSubscription = undefined;
        this.#dirtyCascadeSubscription?.unsubscribe();
        this.#dirtyCascadeSubscription = undefined;
        this.#onClose = undefined;

        // Cleanup drag store
        if (this.#dragStore) {
            this.#dragStore.cleanup();
            this.#dragStore = undefined;
        }

        // Cleanup titlebar store
        if (this.#titlebarStore) {
            this.#titlebarStore.cleanup();
            this.#titlebarStore = undefined;
        }

        // Cleanup resizer store
        if (this.#resizerStore) {
            this.#resizerStore.removeHandles();
            this.#resizerStore.cleanup();
            this.#resizerStore = undefined;
        }

        // Cleanup content mask
        if (this.#contentMask) {
            this.#contentMask.destroy();
        }

        // Cleanup containers (guardContainer contains rootContainer)
        this.#guardContainer.destroy({children: true});
    }

}
