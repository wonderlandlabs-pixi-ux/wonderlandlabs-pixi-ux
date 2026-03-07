import type {Meta, StoryObj} from '@storybook/html';
import {Application, Assets, Container, Graphics, Sprite, Text} from 'pixi.js';
import {ToolbarStore} from '@wonderlandlabs-pixi-ux/toolbar';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import {WindowsManager, TEXTURE_STATUS} from "./WindowsManager";
import type {TitlebarContentRendererFn, WindowContentRendererFn, WindowDef} from "./types";
import type {TitlebarStore} from "./TitlebarStore";
import {STYLE_VARIANT} from "./constants";

const toolbarStyleTree = fromJSON({
    button: {
        text: {
            padding: {
                '$*': {x: 10, y: 5}
            },
            borderRadius: {
                '$*': 4
            },
            label: {
                fontSize: {
                    '$*': 12
                },
                color: {
                    '$*': {r: 1, g: 1, b: 1}
                },
                alpha: {
                    '$*': 1
                }
            },
            stroke: {
                '$*': {
                    color: {r: 0.4, g: 0.4, b: 0.4},
                    alpha: 0,
                    width: 0
                }
            }
        },
        image: {
            text: {
                fill: {
                    '$*': {color: {r: 0.333, g: 0.667, b: 0.6}, alpha: 1},
                    '$hover': {color: {r: 0.267, g: 0.733, b: 0.533}, alpha: 1}
                }
            }
        },
        caption: {
            text: {
                fill: {
                    '$*': {color: {r: 0.333, g: 0.6, b: 0.667}, alpha: 1},
                    '$hover': {color: {r: 0.267, g: 0.533, b: 0.733}, alpha: 1}
                }
            }
        },
        done: {
            text: {
                fill: {
                    '$*': {color: {r: 0.4, g: 0.4, b: 0.4}, alpha: 1},
                    '$hover': {color: {r: 0.533, g: 0.533, b: 0.533}, alpha: 1}
                },
                stroke: {
                    '$*': {
                        color: {r: 0.667, g: 0.667, b: 0.667},
                        alpha: 1,
                        width: 2
                    }
                }
            }
        }
    }
});

function createStoryToolbar(
    app: Application,
    onAddImage: () => void,
    onAddCaption: () => void,
    onDone: () => void
): ToolbarStore {
    const toolbar = new ToolbarStore({
        id: 'window-floating-toolbar',
        spacing: 8,
        orientation: 'horizontal',
        padding: 10,
        style: toolbarStyleTree,
        background: {
            fill: { color: { r: 0.27, g: 0.27, b: 0.27 }, alpha: 1 },
            borderRadius: 6,
        },
        buttons: [
            { id: 'toolbar-image', label: 'Image', mode: 'text', variant: 'image', onClick: onAddImage },
            { id: 'toolbar-caption', label: 'Caption', mode: 'text', variant: 'caption', onClick: onAddCaption },
            { id: 'toolbar-done', label: 'Done', mode: 'text', variant: 'done', onClick: onDone },
        ],
    }, app);
    toolbar.container.visible = false;
    toolbar.kickoff();
    return toolbar;
}

interface EditableWindowArgs {
}

interface StoryWindowContentItem {
    id: string;
    type: 'image' | 'caption';
    text?: string;
}

type EditableStoryWindowValue = WindowDef & {
    contentItems?: StoryWindowContentItem[];
};

// Custom titlebar renderer that adds close and move buttons
// Uses WindowsManager's texture loading system for the move icon
const customTitlebarRenderer: TitlebarContentRendererFn = ({
    titlebarStore,
    windowValue,
    contentContainer
}) => {
    const store = titlebarStore as TitlebarStore;
    const closeButtonId = `close-btn-${windowValue.id}`;
    const moveButtonId = `move-btn-${windowValue.id}`;

    // Check if close button already exists
    let closeBtn = contentContainer.getChildByLabel(closeButtonId) as Graphics | null;

    if (!closeBtn) {
        closeBtn = new Graphics({label: closeButtonId});
        closeBtn.eventMode = 'static';
        closeBtn.cursor = 'pointer';

        // Draw close button (X)
        const size = 12;
        closeBtn.circle(0, 0, size / 2 + 2).fill({color: 0xff4444});
        closeBtn.moveTo(-size / 3, -size / 3).lineTo(size / 3, size / 3).stroke({color: 0xffffff, width: 2});
        closeBtn.moveTo(size / 3, -size / 3).lineTo(-size / 3, size / 3).stroke({color: 0xffffff, width: 2});

        contentContainer.addChild(closeBtn);

        // Add click handler
        closeBtn.on('pointerdown', (event) => {
            event.stopPropagation();
            console.log(`Close button clicked for window: ${windowValue.id}`);
        });
    }

    // Check if move button already exists
    let moveBtn = contentContainer.getChildByLabel(moveButtonId) as Container | null;

    if (!moveBtn) {
        // Check texture status from WindowsManager (accessed via store.$parent.$root)
        const windowsManager = (store.$parent as any)?.$root as WindowsManager | undefined;
        const textureStatus = windowsManager?.getTextureStatus('move');

        if (textureStatus === TEXTURE_STATUS.LOADED) {
            // Create move button with loaded texture
            moveBtn = new Container({label: moveButtonId});
            moveBtn.eventMode = 'static';
            moveBtn.cursor = 'move';

            const moveIcon = new Sprite(Assets.get('move'));
            moveIcon.width = 16;
            moveIcon.height = 16;
            moveIcon.anchor.set(0.5);
            moveBtn.addChild(moveIcon);

            contentContainer.addChild(moveBtn);

            moveBtn.on('pointerdown', (event) => {
                event.stopPropagation();
                console.log(`Move button clicked for window: ${windowValue.id}`);
            });
        }
        // If texture not loaded yet, WindowsManager will mark all windows dirty when it loads
    }

    // Position buttons at right side of titlebar
    const parentWidth = (store.$parent?.value as any)?.width || 200;
    const padding = store.value.padding;
    const yPos = -store.value.fontSize * 0.3;

    // Close button at far right
    closeBtn.x = parentWidth - padding - 20;
    closeBtn.y = yPos;

    // Move button to the left of close button
    if (moveBtn) {
        moveBtn.x = parentWidth - padding - 44;
        moveBtn.y = yPos;
    }
};

const meta: Meta<EditableWindowArgs> = {
    title: 'Window/EditableWindow',
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '650px';

        const managedContentPrefix = 'editable-content';
        const placeholderImagePath = '/placeholder-art.png';

        let wm: WindowsManager;
        let currentSelectedId: string | null = null;
        let placeholderImageReady = false;
        let placeholderImageLoading = false;
        let contentItemCounter = 0;

        const markAllStoryWindowsDirty = () => {
            if (!wm) return;
            for (const id of wm.value.windows.keys()) {
                wm.windowBranch(id)?.dirty();
            }
        };

        const ensurePlaceholderImageLoaded = () => {
            if (placeholderImageReady || placeholderImageLoading) {
                return;
            }

            placeholderImageLoading = true;
            Assets.load(placeholderImagePath)
                .then(() => {
                    placeholderImageReady = true;
                    placeholderImageLoading = false;
                    markAllStoryWindowsDirty();
                })
                .catch((err) => {
                    placeholderImageLoading = false;
                    console.error('Failed to load image:', err);
                });
        };

        const getSelectedWindowStore = () => {
            if (!currentSelectedId || !wm) return undefined;
            return wm.windowBranch(currentSelectedId);
        };

        const appendWindowContent = (type: StoryWindowContentItem['type']) => {
            const windowStore = getSelectedWindowStore();
            if (!windowStore) return;

            windowStore.mutate((draft) => {
                const draftWithContent = draft as EditableStoryWindowValue;
                const currentItems = Array.isArray(draftWithContent.contentItems)
                    ? draftWithContent.contentItems
                    : [];
                const nextIndex = currentItems.length + 1;
                const nextItem: StoryWindowContentItem = type === 'caption'
                    ? {id: `${type}-${contentItemCounter++}`, type, text: `Caption ${nextIndex}`}
                    : {id: `${type}-${contentItemCounter++}`, type};
                draftWithContent.contentItems = [...currentItems, nextItem];
            });

            if (type === 'image') {
                ensurePlaceholderImageLoaded();
            }
            windowStore.dirty();
        };

        const windowContentRenderer: WindowContentRendererFn = ({
            windowValue,
            contentContainer,
        }) => {
            const contentValue = windowValue as EditableStoryWindowValue;
            const items = Array.isArray(contentValue.contentItems) ? contentValue.contentItems : [];
            const activeLabels = new Set<string>();

            const titlebarHeight = windowValue.titlebar?.height || 30;
            const rowHeight = 80;
            const x = 10;
            const startY = titlebarHeight + 10;
            const maxWidth = Math.max(10, windowValue.width - 20);

            for (const [index, item] of items.entries()) {
                const y = startY + (index * rowHeight);
                const label = `${managedContentPrefix}-${item.id}`;
                activeLabels.add(label);

                if (item.type === 'caption') {
                    let caption = contentContainer.getChildByLabel(label) as Text | null;
                    if (!caption) {
                        caption = new Text({
                            text: '',
                            style: {
                                fontSize: 14,
                                fill: 0xffffff,
                                fontFamily: 'Arial',
                            }
                        });
                        caption.label = label;
                        contentContainer.addChild(caption);
                    }
                    caption.text = item.text ?? `Caption ${index + 1}`;
                    caption.position.set(x, y);
                    continue;
                }

                if (!placeholderImageReady) {
                    ensurePlaceholderImageLoaded();
                    continue;
                }

                const texture = Assets.get(placeholderImagePath);
                if (!texture) {
                    continue;
                }

                let sprite = contentContainer.getChildByLabel(label) as Sprite | null;
                if (!sprite) {
                    sprite = new Sprite(texture);
                    sprite.label = label;
                    contentContainer.addChild(sprite);
                } else if (sprite.texture !== texture) {
                    sprite.texture = texture;
                }

                const safeWidth = Math.max(1, sprite.texture.width);
                const scale = Math.min(1, maxWidth / safeWidth);
                sprite.scale.set(scale);
                sprite.position.set(x, y);
            }

            for (const child of [...contentContainer.children]) {
                const childLabel = child.label;
                if (typeof childLabel === 'string'
                    && childLabel.startsWith(`${managedContentPrefix}-`)
                    && !activeLabels.has(childLabel)) {
                    child.destroy();
                }
            }
        };

        // Add image to selected window
        const addImageToWindow = () => {
            appendWindowContent('image');
            if (currentSelectedId) {
                console.log(`Added image to window: ${currentSelectedId}`);
            }
        };

        // Add caption to selected window
        const addCaptionToWindow = () => {
            appendWindowContent('caption');
            if (currentSelectedId) {
                console.log(`Added caption to window: ${currentSelectedId}`);
            }
        };

        // Selection indicator
        const selectionInfo = document.createElement('div');
        selectionInfo.style.padding = '10px';
        selectionInfo.style.fontFamily = 'sans-serif';
        selectionInfo.style.fontSize = '14px';
        selectionInfo.textContent = 'Selected: none';
        wrapper.appendChild(selectionInfo);

        let toolbar: ToolbarStore;
        const stageWidth = 1000;
        const stageHeight = 550;
        const toolbarGap = 8; // Gap between window and toolbar

        // Deselect handler (for Done button and background click)
        const handleDeselect = () => {
            if (wm) {
                wm.clearSelection();
            }
        };

        // Position toolbar below selected window, clamped to stage bounds
        const positionToolbar = () => {
            if (!currentSelectedId || !wm || !toolbar) return;

            const windowStore = wm.windowBranch(currentSelectedId);
            if (!windowStore) return;

            const bounds = windowStore.rootContainer.getBounds();
            const x = bounds.x;
            const y = bounds.y;
            const width = bounds.width;
            const height = bounds.height;
            const viewportWidth = app.renderer.width;
            const viewportHeight = app.renderer.height;
            const toolbarWidth = toolbar.rect.width > 0 ? toolbar.rect.width : 150;
            const toolbarHeight = toolbar.rect.height > 0 ? toolbar.rect.height : 40;

            // Ideal position: centered below the window
            let toolbarX = x + (width - toolbarWidth) / 2;
            let toolbarY = y + height + toolbarGap;

            // Clamp X to stage bounds
            toolbarX = Math.max(0, Math.min(toolbarX, viewportWidth - toolbarWidth));

            // If toolbar would go below stage, position it above the window
            if (toolbarY + toolbarHeight > viewportHeight) {
                toolbarY = y - toolbarHeight - toolbarGap;
                // If still out of bounds (window at top), clamp to bottom of stage
                if (toolbarY < 0) {
                    toolbarY = viewportHeight - toolbarHeight;
                }
            }

            toolbar.setPosition(toolbarX, toolbarY);
        };

        const app = new Application();
        app.init({
            width: stageWidth,
            height: stageHeight,
            backgroundColor: 0x2a2a2a,
            antialias: true,
        }).then(async () => {
            wrapper.appendChild(app.canvas);
            const container = new Container();
            const handleContainer = new Container();

            // Create toolbar and add to stage (above everything)
            toolbar = createStoryToolbar(app, addImageToWindow, addCaptionToWindow, handleDeselect);

            // Create background for click-to-deselect
            const background = new Graphics();
            background.rect(0, 0, stageWidth, stageHeight).fill(0x2a2a2a);
            background.eventMode = 'static';
            background.cursor = 'default';
            background.on('pointerdown', () => {
                handleDeselect();
            });

            app.stage.addChild(background, container, handleContainer, toolbar.container);
            app.stage.eventMode = 'static';
            wm = new WindowsManager({
                container,
                handleContainer,
                app,
                textures: [
                    {id: 'move', url: '/icons/move.png'}
                ]
            });

            // Window 1: Default style with custom renderer
            wm.addWindow('editor', {
                x: 50, y: 50,
                width: 300,
                height: 200,
                isDraggable: true,
                dragFromTitlebar: true,
                isResizeable: true,
                resizeMode: 'ONLY_CORNER',
                zIndex: 1,
                variant: STYLE_VARIANT.DEFAULT,
                titlebar: {
                    title: 'Default Style',
                    mode: 'persistent',
                    height: 28,
                    padding: 8,
                    fontSize: 12,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/32/2991/2991112.png',
                        width: 16,
                        height: 16
                    }
                },
                titlebarContentRenderer: customTitlebarRenderer,
                windowContentRenderer
            });

            // Window 2: Blue style
            wm.addWindow('blue-window', {
                x: 380, y: 50,
                width: 280,
                height: 180,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 2,
                variant: STYLE_VARIANT.BLUE,
                titlebar: {
                    title: 'Blue Style',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                },
                windowContentRenderer
            });

            // Window 3: Light grayscale style
            wm.addWindow('light-window', {
                x: 690, y: 50,
                width: 280,
                height: 180,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 3,
                variant: STYLE_VARIANT.LIGHT_GRAYSCALE,
                titlebar: {
                    title: 'Light Grayscale',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                },
                windowContentRenderer
            });

            // Window 4: Alert Info style
            wm.addWindow('info-window', {
                x: 50, y: 280,
                width: 280,
                height: 150,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 4,
                variant: STYLE_VARIANT.ALERT_INFO,
                titlebar: {
                    title: 'Alert Info',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                },
                windowContentRenderer
            });

            // Window 5: Alert Danger style
            wm.addWindow('danger-window', {
                x: 360, y: 280,
                width: 280,
                height: 150,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 5,
                variant: STYLE_VARIANT.ALERT_DANGER,
                titlebar: {
                    title: 'Alert Danger',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                },
                windowContentRenderer
            });

            // Window 6: Alert Warning style
            wm.addWindow('warning-window', {
                x: 670, y: 280,
                width: 280,
                height: 150,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 6,
                variant: STYLE_VARIANT.ALERT_WARNING,
                titlebar: {
                    title: 'Alert Warning',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                },
                windowContentRenderer
            });

            // Window 7: Inverted style with custom style override
            wm.addWindow('custom-window', {
                x: 200, y: 450,
                width: 350,
                height: 120,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 7,
                variant: STYLE_VARIANT.INVERTED,
                customStyle: {
                    selectedBorderColor: {r: 0, g: 1, b: 0.5}, // Custom green selection
                    selectedBorderWidth: 3
                },
                titlebar: {
                    title: 'Inverted + Custom (green selection)',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                },
                windowContentRenderer
            });

            // Subscribe to selection changes
            wm.$subject.subscribe(() => {
                const selectedWindows = wm.getSelectedWindows();
                const selectedArray = Array.from(selectedWindows);
                const selected = selectedArray.join(', ') || 'none';
                selectionInfo.textContent = `Selected: ${selected}`;

                // Show toolbar only when exactly one window is selected
                if (selectedArray.length === 1) {
                    currentSelectedId = selectedArray[0];
                    toolbar.container.visible = true;
                    positionToolbar();
                } else {
                    currentSelectedId = null;
                    toolbar.container.visible = false;
                }
            });

            app.ticker.add(() => {
                if (toolbar.container.visible) {
                    positionToolbar();
                }
            });
        });

        return wrapper;
    },
};

export default meta;
type Story = StoryObj<EditableWindowArgs>;

export const EditableWindows: Story = {
    args: {},
};
