import type {Meta, StoryObj} from '@storybook/html';
import {Application, Container, Graphics, Text} from 'pixi.js';
import type {TextStyleOptions} from 'pixi.js';
import {createRootContainer, createZoomPan, makeStageZoomable} from '@wonderlandlabs-pixi-ux/root-container';
import type {
    TitlebarContentRendererFn,
    WindowContentRendererFn,
    WindowContentRendererParams,
    WindowDef,
} from './types';
import {CounterScalingTitlebar} from './CounterScalingTitlebar';
import {renderStockTitlebarContent} from './titlebarRenderers';
import {WindowsManager} from "./WindowsManager";

interface WindowArgs {
}

type BodyCardConfig = {
    accent: number;
    eyebrow: string;
    heading: string;
    body?: string;
    note?: string;
    showCard?: boolean;
    textColor?: number;
};

const meta: Meta<WindowArgs> = {
    title: 'Window/Window',
};

function createWrapper(height = 600): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = `${height}px`;
    wrapper.style.position = 'relative';
    wrapper.style.overflow = 'hidden';
    return wrapper;
}

function mountScene(
    wrapper: HTMLDivElement,
    width: number,
    height: number,
    scene: (app: Application) => void,
): HTMLDivElement {
    const app = new Application();
    void app.init({
        width,
        height,
        backgroundColor: 0xf0f4f8,
        antialias: true,
    }).then(() => {
        wrapper.appendChild(app.canvas);
        scene(app);
    });
    return wrapper;
}

function ensureText(
    container: Container,
    label: string,
    baseStyle: TextStyleOptions,
): Text {
    let text = container.getChildByLabel(label) as Text | null;
    if (!text) {
        text = new Text({
            text: '',
            style: baseStyle,
        });
        text.label = label;
        container.addChild(text);
    }
    return text;
}

function ensureCard(container: Container, label: string): Graphics {
    let card = container.getChildByLabel(label) as Graphics | null;
    if (!card) {
        card = new Graphics({label});
        container.addChild(card);
    }
    return card;
}

function removeChildByLabel(container: Container, label: string): void {
    const child = container.getChildByLabel(label);
    if (!child) {
        return;
    }
    child.parent?.removeChild(child);
    child.destroy();
}

function makeBodyRenderer(config: BodyCardConfig): WindowContentRendererFn {
    return ({contentContainer, windowValue}: WindowContentRendererParams) => {
        const cardX = 12;
        const cardY = 14;
        const cardWidth = Math.max(120, windowValue.width - 24);
        const cardHeight = Math.max(84, Math.min(122, windowValue.height - 26));
        const textColor = config.textColor ?? 0xffffff;
        const showCard = config.showCard ?? true;
        const cardLabel = `${windowValue.id}-body-card`;

        if (showCard) {
            const card = ensureCard(contentContainer, cardLabel);
            card.clear();
            card.roundRect(cardX, cardY, cardWidth, cardHeight, 10)
                .fill({color: config.accent, alpha: 0.18});
            card.roundRect(cardX, cardY, cardWidth, cardHeight, 10)
                .stroke({color: config.accent, alpha: 0.45, width: 2});
        } else {
            removeChildByLabel(contentContainer, cardLabel);
        }

        const eyebrow = ensureText(contentContainer, `${windowValue.id}-eyebrow`, {
            fontSize: 10,
            fill: config.accent,
            fontWeight: '700',
            letterSpacing: 1.2,
        });
        eyebrow.text = config.eyebrow.toUpperCase();
        eyebrow.position.set(cardX + 14, cardY + 12);

        const heading = ensureText(contentContainer, `${windowValue.id}-heading`, {
            fontSize: 18,
            fill: textColor,
            fontWeight: '700',
        });
        heading.text = config.heading;
        heading.position.set(cardX + 14, cardY + 28);

        const bodyLabel = `${windowValue.id}-body-copy`;
        if (config.body) {
            const body = ensureText(contentContainer, bodyLabel, {
                fontSize: 13,
                fill: textColor,
                wordWrap: true,
                wordWrapWidth: Math.max(80, cardWidth - 28),
                lineHeight: 18,
            });
            body.style.wordWrapWidth = Math.max(80, cardWidth - 28);
            body.text = config.body;
            body.position.set(cardX + 14, heading.y + heading.height + 8);
        } else {
            removeChildByLabel(contentContainer, bodyLabel);
        }

        const noteLabel = `${windowValue.id}-body-note`;
        if (config.note) {
            const note = ensureText(contentContainer, noteLabel, {
                fontSize: 11,
                fill: textColor,
                wordWrap: true,
                wordWrapWidth: Math.max(80, cardWidth - 28),
            });
            note.alpha = 0.8;
            note.style.wordWrapWidth = Math.max(80, cardWidth - 28);
            note.text = config.note;
            note.position.set(cardX + 14, cardY + cardHeight - 28);
        } else {
            removeChildByLabel(contentContainer, noteLabel);
        }
    };
}

function makeBadgeTitlebarRenderer(
    resolveBadge: (windowValue: WindowDef) => string,
    badgeFill: number,
    badgeTextFill: number,
): TitlebarContentRendererFn {
    return (params) => {
        renderStockTitlebarContent(params);
        const {
            contentContainer,
            localRect,
            localScale,
            titlebarValue,
            windowValue,
        } = params;
        const counterScaleContainer = contentContainer.getChildByLabel('counter-scale') as Container | null;
        const targetContainer = counterScaleContainer ?? contentContainer;
        const layoutRect = counterScaleContainer
            ? {
                width: localRect.width * localScale.x,
                height: localRect.height * localScale.y,
            }
            : {
                width: localRect.width,
                height: localRect.height,
            };

        const badgeText = resolveBadge(windowValue);
        const padding = titlebarValue.padding ?? 4;
        const closeReserve = titlebarValue.showCloseButton ? 30 : 8;

        const badge = ensureCard(targetContainer, `${windowValue.id}-titlebar-badge`);
        const text = ensureText(targetContainer, `${windowValue.id}-titlebar-badge-text`, {
            fontSize: 10,
            fill: badgeTextFill,
            fontWeight: '700',
        });
        text.text = badgeText;

        const badgeHeight = Math.max(14, layoutRect.height - 10);
        const badgeWidth = Math.max(48, text.width + 12);
        const badgeX = layoutRect.width - padding - closeReserve - badgeWidth;
        const badgeY = Math.max(4, (layoutRect.height - badgeHeight) / 2);

        badge.clear();
        badge.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2)
            .fill({color: badgeFill, alpha: 0.95});

        text.position.set(
            badgeX + Math.max(6, (badgeWidth - text.width) / 2),
            badgeY + Math.max(1, (badgeHeight - text.height) / 2) - 1,
        );
    };
}

function drawBackdrop(container: Container, width: number, height: number): void {
    const backdrop = new Graphics({label: 'story-backdrop'});
    backdrop.rect(0, 0, width, height).fill(0xe2e8f0);
    backdrop.moveTo(width / 2, 0).lineTo(width / 2, height).stroke({color: 0xcbd5e1, width: 1});
    backdrop.moveTo(0, height / 2).lineTo(width, height / 2).stroke({color: 0xcbd5e1, width: 1});
    container.addChild(backdrop);
}

export default meta;
type Story = StoryObj<WindowArgs>;

export const ThreeWindows: Story = {
    args: {},
    render: () => {
        const wrapper = createWrapper();
        return mountScene(wrapper, 1000, 600, (app) => {
            const backdrop = new Container({label: 'three-windows-backdrop'});
            const container = new Container();
            const handleContainer = new Container();

            app.stage.addChild(backdrop, container, handleContainer);
            drawBackdrop(backdrop, 1000, 600);

            const wm = new WindowsManager({container, handleContainer, app});

            wm.addWindow('alpha', {
                x: 24,
                y: 24,
                width: 468,
                height: 286,
                closable: true,
                backgroundColor: {r: 0.61, g: 0.11, b: 0.16},
                isDraggable: true,
                zIndex: 1,
                onClose: ({id}) => {
                    console.log(`Closed window: ${id}`);
                },
                titlebar: {
                    title: 'Hover Reveal',
                    mode: 'onHover',
                    height: 24,
                    backgroundColor: {r: 0.35, g: 0.35, b: 0.38},
                    isVisible: false,
                    fontSize: 11,
                    textColor: {r: 1, g: 1, b: 1},
                },
                titlebarContentRenderer: makeBadgeTitlebarRenderer(
                    () => 'hover',
                    0x111827,
                    0xf8fafc,
                ),
                windowContentRenderer: makeBodyRenderer({
                    accent: 0xfca5a5,
                    eyebrow: 'alpha',
                    heading: 'Body content starts below the titlebar',
                    body: 'This story now reads as window body content instead of centering the copy in the top edge.',
                    note: 'Hover the frame to reveal the titlebar, then drag the window around.',
                }),
            });

            wm.addWindow('beta', {
                x: 520,
                y: 24,
                width: 380,
                height: 250,
                closable: true,
                backgroundColor: {r: 0.08, g: 0.35, b: 0.66},
                isDraggable: true,
                zIndex: 0,
                titlebar: {
                    title: 'Persistent Titlebar',
                    mode: 'persistent',
                    height: 30,
                    padding: 6,
                    backgroundColor: {r: 0.19, g: 0.23, b: 0.31},
                    textColor: {r: 1, g: 1, b: 1},
                },
                titlebarContentRenderer: makeBadgeTitlebarRenderer(
                    () => 'always on',
                    0xdbeafe,
                    0x1d4ed8,
                ),
                windowContentRenderer: makeBodyRenderer({
                    accent: 0x93c5fd,
                    eyebrow: 'beta',
                    heading: 'Persistent chrome with generated body copy',
                    body: 'The titlebar is anchored above the body rect, so the body renderer starts directly in window-local content space.',
                    note: 'This one keeps the titlebar visible and shows a right-aligned status badge.',
                }),
            });

            wm.addWindow('gamma', {
                x: 220,
                y: 342,
                width: 332,
                height: 214,
                closable: true,
                minWidth: 180,
                minHeight: 140,
                backgroundColor: {r: 0.12, g: 0.47, b: 0.23},
                isDraggable: true,
                isResizeable: true,
                resizeMode: 'ONLY_CORNER',
                zIndex: 2,
                titlebar: {
                    title: 'Resizable Window',
                    mode: 'persistent',
                    height: 30,
                    padding: 6,
                    backgroundColor: {r: 0.09, g: 0.37, b: 0.18},
                    textColor: {r: 1, g: 1, b: 1},
                },
                titlebarContentRenderer: makeBadgeTitlebarRenderer(
                    (windowValue) => `${Math.round(windowValue.width)}x${Math.round(windowValue.height)}`,
                    0xdcfce7,
                    0x166534,
                ),
                windowContentRenderer: makeBodyRenderer({
                    accent: 0x86efac,
                    eyebrow: 'gamma',
                    heading: 'Resize from the lower-right corner',
                    body: 'The window body stays visually anchored below the titlebar while the badge updates with the current dimensions.',
                    note: 'Selection border and resize handle remain tied to the managed window store.',
                    textColor: 0xf0fdf4,
                }),
            });
        });
    },
};

export const ZoomCounterScaleTitlebar: Story = {
    args: {},
    render: () => {
        const wrapper = createWrapper(640);
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.top = '14px';
        instructions.style.left = '14px';
        instructions.style.zIndex = '1';
        instructions.style.padding = '10px 12px';
        instructions.style.borderRadius = '10px';
        instructions.style.background = 'rgba(255,255,255,0.92)';
        instructions.style.color = '#0f172a';
        instructions.style.fontFamily = 'sans-serif';
        instructions.style.fontSize = '13px';
        instructions.style.lineHeight = '1.4';
        instructions.style.pointerEvents = 'none';
        instructions.innerHTML = '<strong>Wheel to zoom</strong><br>Body content scales with the zoom layer. Titlebar text and badges stay evenly counter-scaled.';
        wrapper.appendChild(instructions);

        return mountScene(wrapper, 1040, 640, (app) => {
            const {root} = createRootContainer(app);
            const {zoomPan} = createZoomPan(app, root);
            app.stage.addChild(root);
            root.addChild(zoomPan);

            const {getZoom, setZoom} = makeStageZoomable(app, zoomPan, {
                minZoom: 0.65,
                maxZoom: 3,
                zoomSpeed: 0.1,
            });

            const worldGrid = new Graphics({label: 'zoom-grid'});
            for (let x = -520; x <= 520; x += 40) {
                worldGrid.moveTo(x, -360).lineTo(x, 360);
            }
            for (let y = -360; y <= 360; y += 40) {
                worldGrid.moveTo(-520, y).lineTo(520, y);
            }
            worldGrid.stroke({color: 0xcbd5e1, width: 1});
            worldGrid.moveTo(-520, 0).lineTo(520, 0).stroke({color: 0x94a3b8, width: 2});
            worldGrid.moveTo(0, -360).lineTo(0, 360).stroke({color: 0x94a3b8, width: 2});
            zoomPan.addChild(worldGrid);

            const origin = new Graphics({label: 'origin'});
            origin.circle(0, 0, 8).fill({color: 0x0f172a, alpha: 0.9});
            zoomPan.addChild(origin);

            const wm = new WindowsManager({
                container: zoomPan,
                app,
            });

            wm.addWindow('zoomed-notes', {
                x: -130,
                y: -90,
                width: 260,
                height: 190,
                closable: true,
                isDraggable: true,
                backgroundColor: {r: 0.08, g: 0.11, b: 0.17},
                titlebarStoreClass: CounterScalingTitlebar,
                titlebar: {
                    title: 'Counter-Scaled Titlebar',
                    mode: 'persistent',
                    height: 28,
                    padding: 6,
                    backgroundColor: {r: 0.11, g: 0.2, b: 0.35},
                    textColor: {r: 0.95, g: 0.98, b: 1},
                },
                titlebarContentRenderer: makeBadgeTitlebarRenderer(
                    () => 'zoom 1.85x',
                    0x0f172a,
                    0xe2e8f0,
                ),
                windowContentRenderer: makeBodyRenderer({
                    accent: 0x60a5fa,
                    eyebrow: 'zoomed scene',
                    heading: 'Body text is fixed;\ntitlebar counter-scales',
                    showCard: false,
                    textColor: 0xe2e8f0,
                }),
            });

            const zoomDisplay = new Text({
                text: `Zoom: ${getZoom().toFixed(2)}x`,
                style: {
                    fontSize: 14,
                    fill: 0x0f172a,
                    fontWeight: '700',
                },
            });
            zoomDisplay.position.set(-app.screen.width / 2 + 16, -app.screen.height / 2 + 16);
            root.addChild(zoomDisplay);

            const sceneLabel = new Text({
                text: 'Counter-scaled titlebar inside zoomable root-container',
                style: {
                    fontSize: 16,
                    fill: 0x334155,
                    fontWeight: '700',
                },
            });
            sceneLabel.position.set(-app.screen.width / 2 + 16, -app.screen.height / 2 + 38);
            root.addChild(sceneLabel);

            app.stage.on('stage-zoom', () => {
                zoomDisplay.text = `Zoom: ${getZoom().toFixed(2)}x`;
            });

            setZoom(1.6);
        });
    },
};
