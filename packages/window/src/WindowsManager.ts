import {Application, Assets, Container, FederatedPointerEvent, Texture} from 'pixi.js';
import {Forest} from "@wonderlandlabs/forestry4";
import dragObserverFactory from '@wonderlandlabs-pixi-ux/observe-drag';
import {
    ConfigureTitlebarFn,
    ModifyInitialTitlebarParamsFn,
    TitlebarContentRendererFn,
    TitlebarStoreClass,
    WindowDef,
    WindowDefInput,
    WindowDefSchema,
    WindowStoreClass,
    WindowStoreValue,
    ZIndexData,
    PartialWindowStyle,
    TextureDef,
    WindowContentRendererFn,
    WindowCloseHandler,
    WindowResolveHookFn
} from './types.js';
import type {WindowRectTransform} from './types.js';
import {WindowStore} from "./WindowStore.js";

// Texture status constants
export const TEXTURE_STATUS = {
    MISSING: 'missing',   // Not in state at all
    PENDING: 'pending',   // In state but not yet started loading
    LOADING: 'loading',   // Currently being loaded
    LOADED: 'loaded',     // Successfully loaded and ready to use
    ERROR: 'error',       // Failed to load
} as const;

export type TextureStatus = typeof TEXTURE_STATUS[keyof typeof TEXTURE_STATUS];

export interface WindowsManagerConfig {
    app: Application;
    container: Container;
    handleContainer?: Container;
    textures?: TextureDef[];
}

/**
 * WindowsManager manages multiple windows as a collection of WindowStore branches.
 * Each window is a TickerForest branch that handles its own dirty tracking and rendering.
 */
export class WindowsManager extends Forest<WindowStoreValue> {
    app: Application;
    container!: Container; // Parent container that holds both windowsContainer and handlesContainer
    windowsContainer!: Container; // Container for all windows
    handlesContainer!: Container; // Container for all resize handles (sibling to windowsContainer)
    #dragObserverFactory!: ReturnType<typeof dragObserverFactory<FederatedPointerEvent>>;

    constructor(config: WindowsManagerConfig) {
        super(
            {
                value: {
                    windows: new Map(), // if we don't need any further variables we may collapse this to a map
                    selected: new Set(),
                    textures: [] as TextureDef[],
                },
                // @ts-ignore
                prep(next: WindowStoreValue) {
                    (this as WindowsManager).initNewWindows(next.windows);
                    // Ensure all textures have status field for Immer compatibility
                    for (const tex of next.textures) {
                        if (tex.status === undefined) tex.status = TEXTURE_STATUS.PENDING;
                    }
                    return next;
                }
            }
        );
        this.app = config.app;
        // Stage listeners are used by observe-drag for move/up tracking.
        this.app.stage.eventMode = 'static';
        if (!this.app.stage.hitArea) {
            this.app.stage.hitArea = this.app.screen;
        }
        this.#dragObserverFactory = dragObserverFactory<FederatedPointerEvent>({
            stage: this.app.stage,
            app: this.app,
        });
        this.#initContainers(config);
        this.initNewWindows(this.value.windows);

        // Add any textures provided in config to state and load them
        if (config.textures && config.textures.length > 0) {
            // Ensure textures have status field before adding to state
            const preparedTextures = config.textures.map(t => ({
                ...t,
                status: t.status ?? TEXTURE_STATUS.PENDING,
            }));
            this.mutate(draft => {
                draft.textures.push(...preparedTextures);
            });
            this.loadTextures();
        }
    }

    #initContainers(config: Partial<WindowsManagerConfig>) {
        const {container} = config

        if (!this.container && container) {
            this.container = container;
            this.container.label = 'WindowsManager';
        }
        this.container?.position.set(0, 0);

        // Create windowsContainer as a child of the main container
        // This will hold all the windows and be used for z-index management
        if (!this.windowsContainer) {
            this.windowsContainer = new Container();
            this.windowsContainer.label = 'windows';
            this.container?.addChild(this.windowsContainer);
        }

        // Create handlesContainer as a sibling to windowsContainer
        // Added after windowsContainer so it renders on top
        // This ensures handles are always visible regardless of window z-index
        if (!this.handlesContainer) {
            this.handlesContainer = new Container();
            this.handlesContainer.label = 'handles';
            this.container?.addChild(this.handlesContainer);
        }
    }

    initNewWindows(nextWindows: Map<string, WindowDef>) {
        for (const key of nextWindows?.keys()) {
            if (!this.value.windows.has(key)) {
                queueMicrotask(() => {
                    this.initWindow(key);
                })
            }

        }
        for (const key of this.value.windows.keys()) {
            if (!nextWindows.has(key)) {
                this.#removeWindowBranch(key);
            }
        }
    }

    addWindow(key: string, value: Omit<WindowDefInput, 'id'>) {
        // Extract customStyle and storeClass before parsing (they're not part of the schema)
        const {
            customStyle,
            storeClass,
            titlebarStoreClass,
            closable,
            onClose,
            rectTransform,
            titlebarContentRenderer,
            windowContentRenderer,
            onResolve,
            configureTitlebar,
            modifyInitialTitlebarParams,
            ...windowDef
        } = value;
        if (customStyle) {
            this.#customStyles.set(key, customStyle);
        }
        if (storeClass) {
            this.#storeClasses.set(key, storeClass);
        }
        if (titlebarStoreClass) {
            this.#titlebarStoreClasses.set(key, titlebarStoreClass);
        }
        this.#resolvedWindowStoreClasses.delete(key);
        if (closable !== undefined) {
            this.#closableMap.set(key, closable);
        } else {
            this.#closableMap.delete(key);
        }
        if (onClose) {
            this.#onCloseMap.set(key, onClose);
        } else {
            this.#onCloseMap.delete(key);
        }
        if (rectTransform) {
            this.#rectTransformMap.set(key, rectTransform);
        } else {
            this.#rectTransformMap.delete(key);
        }
        if (titlebarContentRenderer) {
            this.#titlebarContentRendererMap.set(key, titlebarContentRenderer);
        } else {
            this.#titlebarContentRendererMap.delete(key);
        }
        if (windowContentRenderer) {
            this.#windowContentRendererMap.set(key, windowContentRenderer);
        } else {
            this.#windowContentRendererMap.delete(key);
        }
        if (onResolve) {
            this.#onResolveMap.set(key, onResolve);
        } else {
            this.#onResolveMap.delete(key);
        }
        if (configureTitlebar) {
            this.#configureTitlebarMap.set(key, configureTitlebar);
        } else {
            this.#configureTitlebarMap.delete(key);
        }
        if (modifyInitialTitlebarParams) {
            this.#modifyInitialTitlebarParamsMap.set(key, modifyInitialTitlebarParams);
        } else {
            this.#modifyInitialTitlebarParamsMap.delete(key);
        }

        const existingBranch = this.#windowsBranches.get(key);
        if (existingBranch) {
            existingBranch.setRectTransform(rectTransform);
            existingBranch.setTitlebarContentRenderer(titlebarContentRenderer);
            existingBranch.setWindowContentRenderer(windowContentRenderer);
            existingBranch.setOnResolve(onResolve);
            existingBranch.configureTitlebar(configureTitlebar);
            existingBranch.setModifyInitialTitlebarParams(modifyInitialTitlebarParams);
        }
        this.set(['windows', key], WindowDefSchema.parse({...windowDef, id: key}));
    }

    /**
     * this is called _after_ the window data has been injected
     * @param key string
     */
    initWindow(key: string) {
        if (this.#windowsBranches.has(key)) {
            console.warn('attempt to recreate existing branch ' + key);
            return this.#windowsBranches.get(key)!;
        }

        // Use custom store class if provided, otherwise default to WindowStore
        const StoreClass = this.#resolveWindowStoreClass(key);

        // @ts-ignore
        const branch = this.$branches.$add<WindowDef, WindowStore>(['windows', key], {
            subclass: StoreClass,
        }, this.app) as unknown as WindowStore;

        branch.dirty();
        this.#windowsBranches.set(key, branch);
        branch.application = this.app;
        branch.handlesContainer = this.handlesContainer; // Pass shared handles container

        // Pass custom style if available
        const customStyle = this.#customStyles.get(key);
        if (customStyle) {
            branch.customStyle = customStyle;
        }
        const closable = this.#closableMap.get(key) ?? false;
        branch.setClosable(closable);
        branch.setOnClose(this.#onCloseMap.get(key));
        branch.setRectTransform(this.#rectTransformMap.get(key));
        branch.setTitlebarContentRenderer(this.#titlebarContentRendererMap.get(key));
        branch.setWindowContentRenderer(this.#windowContentRendererMap.get(key));
        branch.setOnResolve(this.#onResolveMap.get(key));
        branch.configureTitlebar(this.#configureTitlebarMap.get(key));
        branch.setModifyInitialTitlebarParams(this.#modifyInitialTitlebarParamsMap.get(key));

        branch.kickoff();

        // Add content container to content map
        this.#contentMap.set(key, branch.contentContainer);

        return branch;
    }

    #windowsBranches = new Map<string, WindowStore>();
    #contentMap = new Map<string, Container>();
    #customStyles = new Map<string, PartialWindowStyle>();
    #storeClasses = new Map<string, WindowStoreClass>();
    #titlebarStoreClasses = new Map<string, TitlebarStoreClass>();
    #resolvedWindowStoreClasses = new Map<string, WindowStoreClass>();
    #closableMap = new Map<string, boolean>();
    #onCloseMap = new Map<string, WindowCloseHandler>();
    #rectTransformMap = new Map<string, WindowRectTransform>();
    #titlebarContentRendererMap = new Map<string, TitlebarContentRendererFn>();
    #windowContentRendererMap = new Map<string, WindowContentRendererFn>();
    #onResolveMap = new Map<string, WindowResolveHookFn>();
    #configureTitlebarMap = new Map<string, ConfigureTitlebarFn>();
    #modifyInitialTitlebarParamsMap = new Map<string, ModifyInitialTitlebarParamsFn>();

    #resolveWindowStoreClass(id: string): WindowStoreClass {
        const cached = this.#resolvedWindowStoreClasses.get(id);
        if (cached) {
            return cached;
        }

        const baseStoreClass = this.#storeClasses.get(id) || WindowStore;
        const titlebarStoreClass = this.#titlebarStoreClasses.get(id);
        if (!titlebarStoreClass) {
            this.#resolvedWindowStoreClasses.set(id, baseStoreClass);
            return baseStoreClass;
        }

        class InjectedTitlebarWindowStore extends baseStoreClass {
            static titlebarStoreClass = titlebarStoreClass;
        }

        this.#resolvedWindowStoreClasses.set(id, InjectedTitlebarWindowStore);
        return InjectedTitlebarWindowStore;
    }

    getDragObserver() {
        return this.#dragObserverFactory;
    }

    windowBranch(id: string) {
        return this.#windowsBranches.get(id);
    }

    /**
     * Get the content container for a specific window
     */
    getContentContainer(id: string): Container | undefined {
        return this.#contentMap.get(id);
    }

    /**
     * Get all content containers
     */
    get contentMap(): ReadonlyMap<string, Container> {
        return this.#contentMap;
    }

    #flattenZIndices(): ZIndexData[] {
        const sortedWindows: Omit<ZIndexData, 'zIndexFlat'>[] = Array.from(this.#windowsBranches.entries())
            .map(([id, branch]) => ({
                id,
                branch,
                zIndex: branch.value.zIndex
            }))
            .sort((a, b) => a.zIndex - b.zIndex);

        return sortedWindows.map((data, index) => {
            return {...data, zIndexFlat: index}
        })
    }


    /**
     * Update z-indices of all windows to respect their zIndex property
     */
    updateZIndices() {
        // Get all window branches and sort by zIndex
        const indices = this.#flattenZIndices()
        let maxIndex = 0;
        // Apply the sorted order using setChildIndex
        // Use guardContainer since that's what's added to windowsContainer
        indices.forEach(({branch, zIndexFlat}) => {
            const branchStore = branch as WindowStore;
            maxIndex = Math.max(maxIndex, zIndexFlat);
            if (branchStore.guardContainer && this.windowsContainer.children.includes(branchStore.guardContainer)) {
                try {
                    this.windowsContainer.setChildIndex(branchStore.guardContainer, zIndexFlat);
                } catch (err) {
                }
            }
        });
    }

    #removeWindowBranch(id: string) {
        if (this.#windowsBranches.has(id)) {
            this.#windowsBranches.get(id)?.cleanup();
            this.#windowsBranches.delete(id);
        }
        // Remove from content map
        this.#contentMap.delete(id);
        this.#customStyles.delete(id);
        this.#storeClasses.delete(id);
        this.#titlebarStoreClasses.delete(id);
        this.#resolvedWindowStoreClasses.delete(id);
        this.#closableMap.delete(id);
        this.#onCloseMap.delete(id);
        this.#rectTransformMap.delete(id);
        this.#titlebarContentRendererMap.delete(id);
        this.#windowContentRendererMap.delete(id);
        this.#onResolveMap.delete(id);
        this.#configureTitlebarMap.delete(id);
        this.#modifyInitialTitlebarParamsMap.delete(id);
    }

    /**
     * Remove a window
     */
    removeWindow(id: string) {
        this.#removeWindowBranch(id);
        this.mutate((draft) => {
            draft.windows.delete(id);
            draft.selected.delete(id); // Remove from selection if selected
        });
    }

    /**
     * Refresh window for selection border update
     */
    #refreshWindowSelection(id: string) {
        const windowStore = this.#windowsBranches.get(id);
        if (windowStore) {
            windowStore.dirty();
        }
    }

    /**
     * Select a window (adds to selection set)
     */
    selectWindow(id: string) {
        if (this.value.windows.has(id)) {
            this.mutate((draft) => {
                draft.selected.add(id);
            });
            this.#refreshWindowSelection(id);
        }
    }

    /**
     * Deselect a window (removes from selection set)
     */
    deselectWindow(id: string) {
        this.mutate((draft) => {
            draft.selected.delete(id);
        });
        this.#refreshWindowSelection(id);
    }

    /**
     * Set the selection to a single window (clears other selections)
     */
    setSelectedWindow(id: string) {
        if (this.value.windows.has(id)) {
            // Get previously selected windows to refresh them
            const previouslySelected = Array.from(this.value.selected);

            this.mutate((draft) => {
                draft.selected.clear();
                draft.selected.add(id);
            });

            // Refresh all affected windows
            previouslySelected.forEach(prevId => this.#refreshWindowSelection(prevId));
            this.#refreshWindowSelection(id);
        }
    }

    /**
     * Set the selection to multiple windows (clears other selections)
     */
    setSelectedWindows(ids: string[]) {
        // Get previously selected windows to refresh them
        const previouslySelected = Array.from(this.value.selected);

        this.mutate((draft) => {
            draft.selected.clear();
            ids.forEach(id => {
                if (draft.windows.has(id)) {
                    draft.selected.add(id);
                }
            });
        });

        // Refresh all affected windows
        const allAffected = new Set([...previouslySelected, ...ids]);
        allAffected.forEach(id => this.#refreshWindowSelection(id));
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        const previouslySelected = Array.from(this.value.selected);
        this.mutate((draft) => {
            draft.selected.clear();
        });
        previouslySelected.forEach(id => this.#refreshWindowSelection(id));
    }

    /**
     * Check if a window is selected
     */
    isWindowSelected(id: string): boolean {
        return this.value.selected.has(id);
    }

    /**
     * Get all selected window IDs
     */
    getSelectedWindows(): ReadonlySet<string> {
        return this.value.selected;
    }

    /**
     * Toggle window selection
     */
    toggleWindowSelection(id: string) {
        if (this.value.windows.has(id)) {
            const wasSelected = this.value.selected.has(id);
            this.mutate((draft) => {
                if (draft.selected.has(id)) {
                    draft.selected.delete(id);
                } else {
                    draft.selected.add(id);
                }
            });
            this.#refreshWindowSelection(id);
        }
    }

    // ==================== Texture Management ====================

    /**
     * Load textures that are in state but not yet loaded.
     * Finds textures where status is 'pending', then batch loads them.
     * When textures finish loading, all windows and titlebars are marked dirty.
     */
    loadTextures() {
        const textures = this.value.textures as TextureDef[];
        const texturesToLoad = textures.filter(t => !t.status || t.status === TEXTURE_STATUS.PENDING);
        if (texturesToLoad.length === 0) return;

        // Get the IDs of textures to load
        const idsToLoad = texturesToLoad.map(t => t.id);

        // Mark them as loading via mutate (respects Immer)
        this.mutate(draft => {
            for (const tex of draft.textures) {
                if (idsToLoad.includes(tex.id)) {
                    tex.status = TEXTURE_STATUS.LOADING;
                }
            }
        });

        // Build manifest for batch loading
        const manifest = {
            bundles: [{
                name: 'windowTextures',
                assets: texturesToLoad.map(({id, url}) => ({
                    alias: id,
                    src: url
                }))
            }]
        };

        // Use Assets.init with manifest for efficient batch loading
        Assets.init({manifest}).then(() => {
            return Assets.loadBundle('windowTextures');
        }).then((loadedTextures) => {
            // Update entries with loaded textures via mutate
            this.mutate(draft => {
                for (const tex of draft.textures) {
                    if (idsToLoad.includes(tex.id)) {
                        tex.texture = loadedTextures[tex.id];
                        tex.status = TEXTURE_STATUS.LOADED;
                    }
                }
            });
            // Mark all windows and titlebars dirty
            this.#markAllDirty();
        }).catch((err) => {
            // Mark all as errored via mutate
            this.mutate(draft => {
                for (const tex of draft.textures) {
                    if (idsToLoad.includes(tex.id)) {
                        tex.status = TEXTURE_STATUS.ERROR;
                        tex.error = err?.message || String(err);
                    }
                }
            });
            console.warn('Failed to load textures:', err);
        });
    }

    /**
     * Get the status of a texture by id.
     * Returns MISSING if not in state, PENDING if not yet loading,
     * LOADING if currently loading, ERROR if load failed, or LOADED if ready to use.
     * Use Assets.get(id) to retrieve the actual texture when status is LOADED.
     */
    getTextureStatus(id: string): TextureStatus {
        const textures = this.value.textures as TextureDef[];
        const tex = textures.find(t => t.id === id);
        if (!tex) return TEXTURE_STATUS.MISSING;
        return tex.status ?? TEXTURE_STATUS.PENDING;
    }

    /**
     * Mark all windows and their titlebars as dirty to trigger re-render
     */
    #markAllDirty() {
        for (const [, windowStore] of this.#windowsBranches) {
            windowStore.dirty();
        }
    }
}
