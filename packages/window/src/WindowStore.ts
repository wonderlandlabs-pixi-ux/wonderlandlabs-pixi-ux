import {TickerForest} from "@wonderlandlabs-pixi-ux/ticker-forest";
import type {PartialWindowStyle, RgbColor, WindowCloseHandler, WindowDef, WindowRectTransform, WindowStyle} from "./types";
import {Application, Container, Graphics, Rectangle} from "pixi.js";
import {WindowsManager} from "./WindowsManager";
import rgbToColor from "./rgbToColor";
import {DragStore} from "@wonderlandlabs-pixi-ux/drag";
import {StoreParams} from "@wonderlandlabs/forestry4";
import {TitlebarStore} from "./TitlebarStore";
import {ResizerStore} from "@wonderlandlabs-pixi-ux/resizer";
import {distinctUntilChanged, map} from 'rxjs';
import type {Subscription} from 'rxjs';
import {resolveWindowStyle} from './styles';
import {STYLE_VARIANT} from './constants';

// Default color for handles and selection border (blue)
const HANDLE_COLOR: RgbColor = {r: 0.3, g: 0.6, b: 1};

export class WindowStore extends TickerForest<WindowDef> {
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
        // Create titlebar store as a branch using $branch
        // @ts-ignore
        this.#titlebarStore = this.$branch(['titlebar'], {
            subclass: TitlebarStore,
        }, this.application!) as unknown as TitlebarStore;
        this.#titlebarStore.application = this.application;
        this.#titlebarStore.set('isDirty', true);
        this.#syncTitlebarCloseState();

        this.#sizeSubscription?.unsubscribe();
        this.#sizeSubscription = this.$subject.pipe(
            map(() => `${this.value?.width}-${this.value?.height}`),
            distinctUntilChanged(),
        ).subscribe(() => {
            this.#titlebarStore?.set('isDirty', true);
            this.#titlebarStore?.queueResolve();
            this.set('isDirty', true);
            this.queueResolve();
        });
    }

    resolveComponents(parentContainer?: Container, handlesContainer?: Container) {
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
    #closable = false;
    #onClose?: WindowCloseHandler;

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
            this.markDirty();
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
        this.#titlebarStore.set('isDirty', true);
        this.#titlebarStore.queueResolve();
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
                        self.#rootContainer.position.set(pos.x, pos.y);
                        if (self.value.x !== pos.x || self.value.y !== pos.y) {
                            self.mutate((draft) => {
                                draft.x = pos.x;
                                draft.y = pos.y;
                            });
                        }
                        // Update resizer rect to match new position
                        if (self.#resizerStore) {
                            self.#resizerStore.setRect(new Rectangle(
                                pos.x,
                                pos.y,
                                self.value.width,
                                self.value.height
                            ));
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
                self.#dragStore!.startDragContainer(
                    self.value.id,
                    event, self.#rootContainer
                );
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
            self.#dragStore!.startDragContainer(
                self.value.id,
                event, self.#rootContainer
            );

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

            this.#resizerStore = new ResizerStore({
                container: this.#rootContainer,
                handleContainer: handlesContainer,
                rect: new Rectangle(x, y, width, height),
                app: this.application!,
                mode: resizeMode || 'ONLY_CORNER',
                size: 8,
                color: HANDLE_COLOR,
                rectTransform: this.rectTransform,
                drawRect: (rect: Rectangle) => {
                    // Update window dimensions when resizing
                    self.mutate((draft) => {
                        draft.x = rect.x;
                        draft.y = rect.y;
                        draft.width = Math.max(rect.width, minWidth || 50);
                        draft.height = Math.max(rect.height, minHeight || 50);
                    });
                    self.markDirty();
                },
                onRelease: (rect: Rectangle) => {
                    // Final update when resize is complete
                    self.mutate((draft) => {
                        draft.width = Math.max(rect.width, minWidth || 50);
                        draft.height = Math.max(rect.height, minHeight || 50);
                        draft.x = rect.x;
                        draft.y = rect.y;
                    });
                    self.markDirty();
                }
            });
        }

        // Update resizer rect if dimensions changed externally
        if (this.#resizerStore) {
            const currentRect = this.#resizerStore.value.rect;
            if (currentRect.width !== width || currentRect.height !== height) {
                this.#resizerStore.setRect(new Rectangle(currentRect.x, currentRect.y, width, height));
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

    protected isDirty(): boolean {
        return this.value.isDirty;
    }

    protected clearDirty(): void {
        this.set('isDirty', false);
    }

    /**
     * Mark this window and its titlebar as dirty to trigger re-render
     */
    markDirty(): void {
        this.set('isDirty', true);
        this.queueResolve();

        this.#titlebarStore?.markDirty();
    }

    protected resolve(): void {
        if (this.isDirty()) {
            if (!this.$isRoot) {
                const rootStore = this.$root as unknown as WindowsManager;
                if (rootStore?.windowsContainer) {
                    this.resolveComponents(rootStore.windowsContainer, rootStore.handlesContainer);
                    rootStore.updateZIndices();
                }
            }
        }
    }

    cleanup(): void {
        super.cleanup();

        this.#sizeSubscription?.unsubscribe();
        this.#sizeSubscription = undefined;
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
