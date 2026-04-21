import type { Meta, StoryObj } from '@storybook/html';
import {
    Application,
    Assets,
    Container,
    Graphics,
    Sprite,
    Text,
    TextStyle,
    Texture,
} from 'pixi.js';
import { fromJSON, StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import {
    BoxStore,
    DIR_HORIZ,
    DIR_VERT,
    INSET_SCOPE_ALL,
    POS_CENTER,
    POS_FILL,
    POS_START,
    SIZE_FRACTION,
    SIZE_PCT,
    boxTreeToPixi,
    type BoxCellType,
    type BoxPixiRenderInput,
    type BoxPixiRendererManifest,
    type BoxPixiRendererOverride,
} from './index.js';
import boxPixiStoryStyles from './boxPixiStoryStyles.json' with {type: 'json'};

type Story = StoryObj;

const meta: Meta = {
    title: 'Box/Pixi/Renderer',
};

export default meta;

type ProductRecord = {
    name: string;
    price: string;
    imageUrl: string;
    bullets: string[];
    accent: number;
    tint?: number;
};

type PixiStoryConfig = {
    title: string;
    subtitle: string;
    width: number;
    height: number;
    root: BoxCellType;
    styles: StyleTree[];
    renderers: BoxPixiRendererManifest;
};

function createPixiStory(config: PixiStoryConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <style>
            .pixi-box-story {
                min-height: 100vh;
                padding: 18px;
                background:
                    radial-gradient(circle at top left, rgba(255, 232, 214, 0.9), transparent 34%),
                    linear-gradient(180deg, #f6f0e8 0%, #e6edf6 100%);
                color: #14213d;
                font-family: Georgia, "Times New Roman", serif;
            }

            .pixi-box-shell {
                max-width: 1240px;
                margin: 0 auto;
                display: grid;
                gap: 16px;
            }

            .pixi-box-header {
                display: grid;
                gap: 6px;
            }

            .pixi-box-kicker {
                font-size: 11px;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: #8b5e34;
            }

            .pixi-box-header h2 {
                margin: 0;
                font-size: 34px;
                line-height: 1.05;
                font-weight: 600;
            }

            .pixi-box-header p {
                margin: 0;
                max-width: 760px;
                color: #46546b;
                font: 15px/1.5 ui-sans-serif, system-ui, sans-serif;
            }

            .pixi-box-canvas {
                display: inline-flex;
                border-radius: 28px;
                overflow: hidden;
                border: 1px solid rgba(20, 33, 61, 0.08);
                box-shadow: 0 24px 70px rgba(20, 33, 61, 0.16);
                background: #f7f5f1;
            }
        </style>
        <div class="pixi-box-story">
            <div class="pixi-box-shell">
                <header class="pixi-box-header">
                    <div class="pixi-box-kicker">Box Renderer / Pixi</div>
                    <h2>${escapeHtml(config.title)}</h2>
                    <p>${escapeHtml(config.subtitle)}</p>
                </header>
                <div class="pixi-box-canvas"></div>
            </div>
        </div>
    `;

    const mount = wrapper.querySelector('.pixi-box-canvas');
    if (!(mount instanceof HTMLElement)) {
        throw new Error('Pixi story mount missing');
    }

    void renderPixiLayout(config, mount);
    return wrapper;
}

async function renderPixiLayout(config: PixiStoryConfig, mount: HTMLElement): Promise<void> {
    const app = new Application();
    await app.init({
        width: config.width,
        height: config.height,
        antialias: true,
        background: '#f7f5f1',
    });

    mount.appendChild(app.canvas);
    await preloadStoryTextures(config.root);

    const store = new BoxStore({ value: config.root });
    store.styles = config.styles;
    store.update();
    boxTreeToPixi({
        root: store.layoutValue,
        app,
        styleTree: config.styles,
        renderers: config.renderers,
        store,
    });
}

function createPixiStoryStyles(): StyleTree[] {
    return [fromJSON(boxPixiStoryStyles)];
}

function createPixiStoryRenderers(): BoxPixiRendererManifest {
    return {
        byPath: {
            photo: { renderer: renderPhotoNode, post: true } satisfies BoxPixiRendererOverride,
            'hero-photo': { renderer: renderPhotoNode, post: true } satisfies BoxPixiRendererOverride,
            cta: { renderer: renderCtaNode, post: true } satisfies BoxPixiRendererOverride,
        },
    };
}

function renderPhotoNode(input: BoxPixiRenderInput): Container {
    const host = input.local.currentContainer!;
    const location = input.local.localLocation;
    const imageUrl = input.context.cell.content?.value;
    const accent = accentFromSeed(imageUrl ?? input.context.cell.name);

    const frame = ensureGraphicsChild(host, '$$photo-frame');
    frame.clear();
    frame.roundRect(0, 0, location.w, location.h, 18);
    frame.fill(0xf5eadf);
    frame.roundRect(8, 8, location.w - 16, location.h - 16, 14);
    frame.fill(lighten(accent, 0.55));

    const mask = ensureGraphicsChild(host, '$$photo-mask');
    mask.clear();
    mask.roundRect(10, 10, location.w - 20, location.h - 20, 14);
    mask.fill(0xffffff);

    const sprite = ensureSpriteChild(host, '$$photo-sprite');
    const texture = imageUrl ? textureCache.get(imageUrl) : undefined;
    if (texture) {
        sprite.texture = texture;
        fitSprite(sprite, texture, location.w - 20, location.h - 20, 10, 10);
        sprite.tint = tintFromStates(input.context.cell.states);
        sprite.alpha = input.context.cell.states?.includes('muted') ? 0.84 : 1;
        sprite.visible = true;
        sprite.mask = mask;
    } else {
        sprite.visible = false;
    }

    const text = ensureTextChild(host, '$$photo-label');
    text.text = input.context.cell.name === 'hero-photo' ? 'PRODUCT IMAGE' : 'PRODUCT';
    text.style = new TextStyle({
        fontFamily: 'Courier New',
        fontSize: Math.max(12, Math.floor(location.h * 0.08)),
        fontWeight: '700',
        fill: 0x4c3d30,
        letterSpacing: 1.2,
    });
    text.position.set(16, Math.max(12, location.h - 34));

    return host;
}

function renderCtaNode(input: BoxPixiRenderInput): Container {
    const host = input.local.currentContainer!;
    const location = input.local.localLocation;
    const textValue = input.context.cell.content?.value ?? 'Action';
    const chrome = ensureGraphicsChild(host, '$$cta-chrome');
    const text = ensureTextChild(host, '$$content');

    const normalFill = 0x1f5c4d;
    const hoverFill = 0xb85c38;
    const normalBorder = 0x17483c;
    const hoverBorder = 0x8e4124;

    const draw = (hovered: boolean) => {
        chrome.clear();
        chrome.roundRect(0, 0, location.w, location.h, 12);
        chrome.fill(hovered ? hoverFill : normalFill);
        chrome.roundRect(1, 1, location.w - 2, location.h - 2, 11);
        chrome.stroke({
            color: hovered ? hoverBorder : normalBorder,
            width: 2,
            alpha: 1,
        });

        text.text = textValue;
        text.style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 15,
            fontWeight: '700',
            fill: hovered ? 0xfff4e8 : 0xf9f6f1,
            align: 'center',
        });
        text.position.set(
            Math.max(0, (location.w - text.width) / 2),
            Math.max(0, (location.h - text.height) / 2) - 1,
        );

        if (host.getChildIndex(text) < host.getChildIndex(chrome)) {
            host.setChildIndex(text, host.children.length - 1);
        }
    };

    bindCtaHover(host, draw);
    draw(false);
    return host;
}

function ensureGraphicsChild(host: Container, label: string): Graphics {
    const existing = host.children.find((child) => child.label === label);
    if (existing instanceof Graphics) {
        return existing;
    }

    const graphics = new Graphics();
    graphics.label = label;
    host.addChild(graphics);
    return graphics;
}

function ensureTextChild(host: Container, label: string): Text {
    const existing = host.children.find((child) => child.label === label);
    if (existing instanceof Text) {
        return existing;
    }

    const text = new Text({
        text: '',
        style: new TextStyle({
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0x14213d,
        }),
    });
    text.label = label;
    host.addChild(text);
    return text;
}

function ensureSpriteChild(host: Container, label: string): Sprite {
    const existing = host.children.find((child) => child.label === label);
    if (existing instanceof Sprite) {
        return existing;
    }

    const sprite = new Sprite(Texture.EMPTY);
    sprite.label = label;
    host.addChild(sprite);
    return sprite;
}

function bindCtaHover(host: Container, draw: (hovered: boolean) => void): void {
    const interactiveHost = host as Container & {
        __ctaHoverBound?: boolean;
        __ctaHoverDraw?: (hovered: boolean) => void;
    };

    interactiveHost.__ctaHoverDraw = draw;
    if (interactiveHost.__ctaHoverBound) {
        return;
    }

    interactiveHost.__ctaHoverBound = true;
    interactiveHost.eventMode = 'static';
    interactiveHost.cursor = 'pointer';
    interactiveHost.on('pointerover', () => interactiveHost.__ctaHoverDraw?.(true));
    interactiveHost.on('pointerout', () => interactiveHost.__ctaHoverDraw?.(false));
}

function accentFromSeed(seed: string): number {
    const palette = [0xa55c3d, 0x356c7d, 0x7e935b, 0x9a6d2f, 0x75518b];
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
        hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return palette[hash % palette.length] ?? palette[0];
}

function lighten(color: number, amount: number): number {
    const ratio = Math.max(0, Math.min(1, amount));
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const nextR = Math.round(r + (255 - r) * ratio);
    const nextG = Math.round(g + (255 - g) * ratio);
    const nextB = Math.round(b + (255 - b) * ratio);
    return (nextR << 16) | (nextG << 8) | nextB;
}

const textureCache = new Map<string, Texture>();

async function preloadStoryTextures(root: BoxCellType): Promise<void> {
    const urls = collectImageUrls(root);
    if (urls.length === 0) {
        return;
    }

    const loaded = await Promise.all(urls.map(async (url) => [url, await Assets.load<Texture>(url)] as const));
    for (const [url, texture] of loaded) {
        textureCache.set(url, texture);
    }
}

function collectImageUrls(cell: BoxCellType): string[] {
    const urls = new Set<string>();

    function visit(node: BoxCellType): void {
        if (node.content?.type === 'url') {
            urls.add(node.content.value);
        }
        for (const child of node.children ?? []) {
            visit(child);
        }
    }

    visit(cell);
    return [...urls];
}

function fitSprite(sprite: Sprite, texture: Texture, width: number, height: number, x: number, y: number): void {
    const sourceWidth = texture.width || width;
    const sourceHeight = texture.height || height;
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    sprite.position.set(x, y);
    sprite.scale.set(scale);
    sprite.x = x + (width - sourceWidth * scale) / 2;
    sprite.y = y + (height - sourceHeight * scale) / 2;
}

function tintFromStates(states: string[] | undefined): number {
    if (!states || states.length === 0) {
        return 0xffffff;
    }
    if (states.includes('warm')) {
        return 0xffd0c2;
    }
    if (states.includes('cool')) {
        return 0xcfe8ff;
    }
    if (states.includes('forest')) {
        return 0xd6f0d7;
    }
    if (states.includes('sunset')) {
        return 0xffddb3;
    }
    return 0xffffff;
}

function productCard(product: ProductRecord): BoxCellType {
    return {
        name: 'card',
        absolute: false,
        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_START },
        insets: [{
            role: 'padding',
            inset: [{ scope: INSET_SCOPE_ALL, value: 16 }],
        }],
        gap: 10,
        children: [
            {
                name: 'photo',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 150 },
                align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
                content: { type: 'url', value: product.imageUrl },
                states: product.tint ? tintState(product.tint) : undefined,
            },
            {
                name: 'eyebrow',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 16 },
                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                content: { type: 'text', value: 'STUDIO EDITION' },
            },
            {
                name: 'title',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 54 },
                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                content: { type: 'text', value: product.name },
            },
            bulletRow(product.bullets[0] ?? 'Lorem ipsum dolor sit amet.', 24),
            bulletRow(product.bullets[1] ?? 'Consectetur adipiscing elit.', 24),
            {
                name: 'price',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 32 },
                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                content: { type: 'text', value: product.price },
                states: product.accent > 0x700000 ? ['warm'] : ['cool'],
            },
            {
                name: 'cta',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 42 },
                align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
                content: { type: 'text', value: 'Add to cart' },
            },
        ],
    };
}

function bulletRow(text: string, height: number): BoxCellType {
    return {
        name: 'bullet-row',
        absolute: false,
        dim: { w: { value: 100, unit: SIZE_PCT }, h: height },
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
        gap: 8,
        children: [
            {
                name: 'bullet-mark',
                absolute: false,
                dim: { w: 10, h: height },
                align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
                content: { type: 'text', value: '-' },
            },
            {
                name: 'bullet-text',
                absolute: false,
                dim: { w: { value: 1, unit: SIZE_FRACTION }, h: height },
                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                content: { type: 'text', value: text },
            },
        ],
    };
}

function createCatalogRoot(products: ProductRecord[]): BoxCellType {
    return {
        name: 'scene',
        absolute: true,
        dim: { x: 28, y: 28, w: 1120, h: 760 },
        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
        insets: [{
            role: 'padding',
            inset: [{ scope: INSET_SCOPE_ALL, value: 20 }],
        }],
        gap: 20,
        children: [
            {
                name: 'hero',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 230 },
                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                insets: [{
                    role: 'padding',
                    inset: [{ scope: INSET_SCOPE_ALL, value: 18 }],
                }],
                gap: 18,
                children: [
                    {
                        name: 'details',
                        absolute: false,
                        dim: { w: { value: 1.2, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_START },
                        insets: [{
                            role: 'padding',
                            inset: [{ scope: INSET_SCOPE_ALL, value: 14 }],
                        }],
                        gap: 10,
                        children: [
                            {
                                name: 'eyebrow',
                                absolute: false,
                                dim: { w: { value: 100, unit: SIZE_PCT }, h: 18 },
                                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                                content: { type: 'text', value: 'SPRING DROP 04' },
                            },
                            {
                                name: 'title',
                                absolute: false,
                                dim: { w: { value: 100, unit: SIZE_PCT }, h: 62 },
                                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                                content: { type: 'text', value: 'Quiet forms for desks, shelves, and travel kits.' },
                            },
                            {
                                name: 'body',
                                absolute: false,
                                dim: { w: { value: 100, unit: SIZE_PCT }, h: 48 },
                                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                                content: { type: 'text', value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis.' },
                            },
                            bulletRow('Durable shell, soft-touch finish, low visual noise.', 20),
                            bulletRow('Sized for small spaces and tidy merchandising.', 20),
                        ],
                    },
                    {
                        name: 'hero-photo',
                        absolute: false,
                        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                        align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
                        content: { type: 'url', value: products[0]?.imageUrl ?? '/products/laptop.png' },
                        states: products[0]?.tint ? tintState(products[0].tint) : ['cool'],
                    },
                ],
            },
            {
                name: 'catalog',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                insets: [{
                    role: 'padding',
                    inset: [{ scope: INSET_SCOPE_ALL, value: 18 }],
                }],
                gap: 18,
                children: products.map((product) => productCard(product)),
            },
        ],
    };
}

function createDetailRoot(product: ProductRecord): BoxCellType {
    return {
        name: 'scene',
        absolute: true,
        dim: { x: 28, y: 28, w: 1120, h: 760 },
        align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
        insets: [{
            role: 'padding',
            inset: [{ scope: INSET_SCOPE_ALL, value: 22 }],
        }],
        gap: 22,
        children: [
            {
                name: 'hero-photo',
                absolute: false,
                dim: { w: { value: 1.1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
                content: { type: 'url', value: product.imageUrl },
                states: product.tint ? tintState(product.tint) : ['cool'],
            },
            {
                name: 'details',
                absolute: false,
                dim: { w: { value: 0.9, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_START },
                insets: [{
                    role: 'padding',
                    inset: [{ scope: INSET_SCOPE_ALL, value: 20 }],
                }],
                gap: 14,
                children: [
                    {
                        name: 'eyebrow',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 18 },
                        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                        content: { type: 'text', value: 'FEATURED PRODUCT' },
                    },
                    {
                        name: 'title',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 88 },
                        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                        content: { type: 'text', value: product.name },
                    },
                    {
                        name: 'price',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 34 },
                        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                        content: { type: 'text', value: product.price },
                    },
                    {
                        name: 'body',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 70 },
                        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                        content: { type: 'text', value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed posuere consectetur est at lobortis. Cras mattis consectetur purus sit amet fermentum.' },
                    },
                    ...product.bullets.map<BoxCellType>((bullet) => bulletRow(bullet, 24)),
                    {
                        name: 'cta',
                        absolute: false,
                        dim: { w: 220, h: 46 },
                        align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
                        content: { type: 'text', value: 'Reserve this finish' },
                    },
                ],
            },
        ],
    };
}

function createComparisonRoot(products: ProductRecord[]): BoxCellType {
    return {
        name: 'scene',
        absolute: true,
        dim: { x: 24, y: 24, w: 1140, h: 700 },
        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
        insets: [{
            role: 'padding',
            inset: [{ scope: INSET_SCOPE_ALL, value: 18 }],
        }],
        gap: 16,
        children: [
            {
                name: 'details',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 140 },
                align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_START },
                insets: [{
                    role: 'padding',
                    inset: [{ scope: INSET_SCOPE_ALL, value: 16 }],
                }],
                gap: 8,
                children: [
                    {
                        name: 'eyebrow',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 18 },
                        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                        content: { type: 'text', value: 'RENDERER STRESS TEST' },
                    },
                    {
                        name: 'title',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 40 },
                        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                        content: { type: 'text', value: 'Three card variants sharing one box-driven renderer override map.' },
                    },
                    {
                        name: 'body',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 46 },
                        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                        content: { type: 'text', value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam euismod keeps the custom Pixi nodes aligned to the computed box rectangles.' },
                    },
                ],
            },
            {
                name: 'catalog',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                insets: [{
                    role: 'padding',
                    inset: [{ scope: INSET_SCOPE_ALL, value: 18 }],
                }],
                gap: 18,
                children: products.map((product) => productCard(product)),
            },
        ],
    };
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function tintState(tint: number): string[] {
    if (tint === 0xffd0c2) return ['warm'];
    if (tint === 0xcfe8ff) return ['cool'];
    if (tint === 0xd6f0d7) return ['forest'];
    if (tint === 0xffddb3) return ['sunset'];
    return [];
}

const sampleProducts: ProductRecord[] = [
    {
        name: 'Featherweight Laptop',
        price: '$48',
        imageUrl: '/products/laptop.png',
        bullets: [
            'Lorem ipsum dolor sit amet.',
            'Slim profile with quiet metallic finish.',
        ],
        accent: 0xa55c3d,
        tint: 0xcfe8ff,
    },
    {
        name: 'Merino Crew Sweater',
        price: '$92',
        imageUrl: '/products/sweater.png',
        bullets: [
            'Consectetur adipiscing elit.',
            'Soft knit texture with clean neckline.',
        ],
        accent: 0x356c7d,
        tint: 0xffd0c2,
    },
    {
        name: 'Hyundai Sport Coupe',
        price: '$64',
        imageUrl: '/products/hyundai.png',
        bullets: [
            'Integer posuere erat a ante.',
            'Gloss finish with bold contour lines.',
        ],
        accent: 0x7e935b,
        tint: 0xd6f0d7,
    },
];

export const PixiBoxRendererPOC: Story = {
    render: () => createPixiStory({
        title: 'Pixi Box Renderer POC',
        subtitle: 'A direct proof of concept for box-driven Pixi rendering: one box tree lays out repeated product cards, the same public images are reused, and per-node states tint the sprites to prove the renderer can vary output without changing the source assets.',
        width: 1180,
        height: 760,
        root: createComparisonRoot([
            {
                ...sampleProducts[0],
                name: 'Laptop / Cool Tint',
                tint: 0xcfe8ff,
            },
            {
                ...sampleProducts[1],
                name: 'Sweater / Warm Tint',
                tint: 0xffd0c2,
            },
            {
                ...sampleProducts[2],
                name: 'Hyundai / Forest Tint',
                tint: 0xd6f0d7,
            },
        ]),
        styles: createPixiStoryStyles(),
        renderers: createPixiStoryRenderers(),
    }),
};

export const ProductCatalogGrid: Story = {
    render: () => createPixiStory({
        title: 'Product Catalog Grid',
        subtitle: 'Three cards rendered through box-computed geometry, with Pixi image and text overrides for thumbnails, pricing, and bullet copy.',
        width: 1180,
        height: 820,
        root: createCatalogRoot(sampleProducts),
        styles: createPixiStoryStyles(),
        renderers: createPixiStoryRenderers(),
    }),
};

export const ProductDetailHero: Story = {
    render: () => createPixiStory({
        title: 'Product Detail Hero',
        subtitle: 'A larger product image with copy, bullet points, and CTA showing the same renderer overrides on a different box tree.',
        width: 1180,
        height: 820,
        root: createDetailRoot({
            name: 'Featherweight Laptop in Graphite',
            price: '$48',
            imageUrl: '/products/laptop.png',
            bullets: [
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                'Balanced silhouette sized for commuting, studio desks, and compact bags.',
                'Lightweight shell with crisp edges and a low-gloss exterior.',
            ],
            accent: 0xa55c3d,
        }),
        styles: createPixiStoryStyles(),
        renderers: createPixiStoryRenderers(),
    }),
};

export const ProductComparisonStrip: Story = {
    render: () => createPixiStory({
        title: 'Product Comparison Strip',
        subtitle: 'A denser catalog view for checking how repeated card renderers behave when the box tree is reused across siblings.',
        width: 1180,
        height: 760,
        root: createComparisonRoot(sampleProducts),
        styles: createPixiStoryStyles(),
        renderers: createPixiStoryRenderers(),
    }),
};

export const BoxDebugLoop: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '16px';
        wrapper.style.alignItems = 'flex-start';

        const canvasWrap = document.createElement('div');
        canvasWrap.style.width = '720px';
        canvasWrap.style.minHeight = '260px';
        canvasWrap.style.borderRadius = '18px';
        canvasWrap.style.overflow = 'hidden';
        canvasWrap.style.border = '1px solid rgba(20, 33, 61, 0.08)';
        canvasWrap.style.boxShadow = '0 24px 70px rgba(20, 33, 61, 0.16)';
        canvasWrap.style.background = '#f7f5f1';

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.flexDirection = 'column';
        controls.style.gap = '12px';
        controls.style.width = '360px';

        const rerender = document.createElement('button');
        rerender.textContent = 'Render Again';
        rerender.style.padding = '8px 12px';

        const widen = document.createElement('button');
        widen.textContent = 'Widen Label';
        widen.style.padding = '8px 12px';

        const panel = document.createElement('pre');
        panel.style.width = '100%';
        panel.style.height = '360px';
        panel.style.margin = '0';
        panel.style.padding = '12px';
        panel.style.overflow = 'auto';
        panel.style.border = '1px solid #d1d5db';
        panel.style.borderRadius = '8px';
        panel.style.background = '#ffffff';
        panel.style.color = '#111827';
        panel.style.fontSize = '12px';
        panel.style.lineHeight = '1.4';

        controls.appendChild(rerender);
        controls.appendChild(widen);
        controls.appendChild(panel);
        wrapper.appendChild(canvasWrap);
        wrapper.appendChild(controls);

        const lines: string[] = [];
        const writeLine = (...parts: unknown[]) => {
            const message = parts.map((part) => {
                if (typeof part === 'string') {
                    return part;
                }
                try {
                    return JSON.stringify(part);
                } catch {
                    return String(part);
                }
            }).join(' ');
            lines.push(`${new Date().toLocaleTimeString()} ${message}`);
            if (lines.length > 120) {
                lines.shift();
            }
            panel.textContent = lines.join('\n');
            panel.scrollTop = panel.scrollHeight;
        };

        const app = new Application();
        let store: BoxStore | undefined;
        let labelText = 'Debug Label';
        const originalInfo = console.info.bind(console);
        console.info = (...args: unknown[]) => {
            const first = args[0];
            if (
                typeof first === 'string'
                && (
                    first.startsWith('[BoxStore')
                    || first.startsWith('[boxTreeToPixi]')
                )
            ) {
                writeLine(...args);
            }
            originalInfo(...args);
        };

        function makeRoot(): BoxCellType {
            return {
                id: 'debug-root',
                name: 'container',
                absolute: true,
                dim: {x: 40, y: 40, w: 220, h: 56},
                align: {
                    direction: DIR_HORIZ,
                    xPosition: POS_CENTER,
                    yPosition: POS_CENTER,
                },
                insets: [{
                    role: 'padding',
                    inset: [{scope: INSET_SCOPE_ALL, value: 12}],
                }],
                children: [
                    {
                        id: 'debug-label',
                        name: 'label',
                        absolute: false,
                        dim: {w: 120, h: 22},
                        align: {
                            direction: DIR_HORIZ,
                            xPosition: POS_CENTER,
                            yPosition: POS_CENTER,
                        },
                        content: {
                            type: 'text',
                            value: labelText,
                        },
                    },
                ],
            };
        }

        function renderStore() {
            if (!store) {
                return;
            }
            store.mutate((draft) => {
                Object.assign(draft, makeRoot());
            });
            store.update();
            boxTreeToPixi({
                root: store.layoutValue,
                app,
                parentContainer: app.stage,
                store,
                styleTree: createPixiStoryStyles(),
                renderers: createPixiStoryRenderers(),
            });
        }

        app.init({
            width: 720,
            height: 260,
            backgroundColor: 0xf6f1e7,
            antialias: true,
        }).then(() => {
            canvasWrap.appendChild(app.canvas);
            store = new BoxStore({value: makeRoot()});
            store.isDebug = true;
            renderStore();

            rerender.onclick = () => {
                writeLine('[Story] manual render');
                renderStore();
            };

            widen.onclick = () => {
                labelText += ' more text';
                writeLine('[Story] widen label', {labelText});
                renderStore();
            };
        });

        wrapper.addEventListener('DOMNodeRemoved', () => {
            console.info = originalInfo;
            store?.complete();
        });

        return wrapper;
    },
};
