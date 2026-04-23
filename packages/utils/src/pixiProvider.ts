import type {
    Assets,
    Color,
    Container,
    FillGradient,
    Graphics,
    Rectangle,
    Sprite,
    Text,
    TextStyle,
    Texture,
} from 'pixi.js';

export type PixiServiceMap = {
    Assets: typeof Assets;
    Color: typeof Color;
    Container: typeof Container;
    FillGradient: typeof FillGradient;
    Graphics: typeof Graphics;
    Rectangle: typeof Rectangle;
    Sprite: typeof Sprite;
    Text: typeof Text;
    TextStyle: typeof TextStyle;
    Texture: typeof Texture;
};

export type PixiProviderInput = Partial<PixiServiceMap>;

export class PixiProxy {
    readonly input: PixiProviderInput;

    constructor(input: PixiProviderInput = {}) {
        this.input = input;
    }

    get<T extends keyof PixiServiceMap>(name: T): PixiServiceMap[T] {
        return (this.input[name] ?? PixiProvider.fallbacks[name]) as PixiServiceMap[T];
    }
}

export class PixiProvider {
    static #fallbacks?: PixiServiceMap;
    static #shared?: PixiProvider;
    readonly #proxy: PixiProxy;

    constructor(input: PixiProviderInput = {}) {
        this.#proxy = new PixiProxy(input);
    }

    static init(input: PixiProviderInput): PixiProvider {
        this.#shared = new PixiProvider(input);
        return this.#shared;
    }

    static get shared(): PixiProvider {
        if (!this.#shared) {
            throw new Error('PixiProvider.init(...) must be called before accessing PixiProvider.shared');
        }
        return this.#shared;
    }

    static get fallbacks(): PixiServiceMap {
        this.#fallbacks ??= createHeadlessServices();
        return this.#fallbacks;
    }

    get isHeadless(): boolean {
        return Object.keys(this.input).length === 0;
    }

    get input(): PixiProviderInput {
        return this.#proxy.input;
    }

    get Assets(): typeof Assets {
        return this.#proxy.get('Assets');
    }

    get Color(): typeof Color {
        return this.#proxy.get('Color');
    }

    get Container(): typeof Container {
        return this.#proxy.get('Container');
    }

    get FillGradient(): typeof FillGradient {
        return this.#proxy.get('FillGradient');
    }

    get Graphics(): typeof Graphics {
        return this.#proxy.get('Graphics');
    }

    get Rectangle(): typeof Rectangle {
        return this.#proxy.get('Rectangle');
    }

    get Sprite(): typeof Sprite {
        return this.#proxy.get('Sprite');
    }

    get Text(): typeof Text {
        return this.#proxy.get('Text');
    }

    get TextStyle(): typeof TextStyle {
        return this.#proxy.get('TextStyle');
    }

    get Texture(): typeof Texture {
        return this.#proxy.get('Texture');
    }

    service<T extends keyof PixiServiceMap>(name: T): PixiServiceMap[T] {
        return this.#proxy.get(name);
    }
}

function createHeadlessServices(): PixiServiceMap {
    const HeadlessContainer = createHeadlessDisplayClass('Container');
    const HeadlessGraphics = createHeadlessGraphicsClass(HeadlessContainer);
    const HeadlessSprite = createHeadlessSpriteClass(HeadlessContainer);
    const HeadlessTextStyle = createHeadlessTextStyleClass();
    const HeadlessText = createHeadlessTextClass(HeadlessContainer, HeadlessTextStyle);
    const HeadlessTexture = createHeadlessTextureClass();
    const HeadlessRectangle = createHeadlessRectangleClass();
    const HeadlessFillGradient = createHeadlessFillGradientClass();
    const HeadlessColor = createHeadlessColorClass();
    const HeadlessAssets = createHeadlessAssetsService(HeadlessTexture);

    return {
        Assets: HeadlessAssets as unknown as typeof Assets,
        Color: HeadlessColor as unknown as typeof Color,
        Container: HeadlessContainer as unknown as typeof Container,
        FillGradient: HeadlessFillGradient as unknown as typeof FillGradient,
        Graphics: HeadlessGraphics as unknown as typeof Graphics,
        Rectangle: HeadlessRectangle as unknown as typeof Rectangle,
        Sprite: HeadlessSprite as unknown as typeof Sprite,
        Text: HeadlessText as unknown as typeof Text,
        TextStyle: HeadlessTextStyle as unknown as typeof TextStyle,
        Texture: HeadlessTexture as unknown as typeof Texture,
    };
}

function createHeadlessDisplayClass(name: string) {
    class HeadlessDisplayObject {
        alpha = 1;
        children: HeadlessDisplayObject[] = [];
        cursor = 'default';
        destroyed = false;
        eventMode = 'auto';
        height = 0;
        hitArea: unknown = null;
        isRenderGroup = false;
        label?: string;
        mask: unknown = null;
        parent: HeadlessDisplayObject | null = null;
        position = {
            x: 0,
            y: 0,
            set: (x = 0, y = 0) => {
                this.position.x = x;
                this.position.y = y;
            },
        };
        visible = true;
        width = 0;
        zIndex = 0;

        constructor(options?: Record<string, unknown>) {
            if (options && typeof options === 'object') {
                Object.assign(this, options);
            }
            return proxifyHeadless(this, name);
        }

        addChild(...children: HeadlessDisplayObject[]): HeadlessDisplayObject {
            for (const child of children) {
                child.parent = this;
                this.children.push(child);
            }
            return children[children.length - 1] ?? this;
        }

        addChildAt(child: HeadlessDisplayObject, index: number): HeadlessDisplayObject {
            child.parent = this;
            this.children.splice(Math.max(0, index), 0, child);
            return child;
        }

        destroy(): void {
            this.destroyed = true;
            this.children = [];
            this.parent = null;
        }

        getChildByLabel(label: string): HeadlessDisplayObject | undefined {
            return this.children.find((child) => child.label === label);
        }

        getChildIndex(child: HeadlessDisplayObject): number {
            return this.children.indexOf(child);
        }

        getLocalBounds(): { width: number; height: number } {
            const ownWidth = Math.max(
                0,
                this.width,
                readExtentValue(this.hitArea, 'width'),
            );
            const ownHeight = Math.max(
                0,
                this.height,
                readExtentValue(this.hitArea, 'height'),
            );

            let maxWidth = ownWidth;
            let maxHeight = ownHeight;

            for (const child of this.children) {
                const bounds = child.getLocalBounds();
                const childX = child.position?.x ?? 0;
                const childY = child.position?.y ?? 0;
                maxWidth = Math.max(maxWidth, childX + Math.max(0, bounds.width));
                maxHeight = Math.max(maxHeight, childY + Math.max(0, bounds.height));
            }

            return {width: maxWidth, height: maxHeight};
        }

        on(): this {
            return this;
        }

        removeChild(child: HeadlessDisplayObject): HeadlessDisplayObject {
            const index = this.children.indexOf(child);
            if (index >= 0) {
                this.children.splice(index, 1);
                child.parent = null;
            }
            return child;
        }
    }

    Object.defineProperty(HeadlessDisplayObject, 'name', {value: `Headless${name}`});
    return HeadlessDisplayObject;
}

function createHeadlessGraphicsClass(ContainerClass: ReturnType<typeof createHeadlessDisplayClass>) {
    class HeadlessGraphics extends ContainerClass {
        clear(): this {
            return this;
        }

        fill(): this {
            return this;
        }

        rect(): this {
            return this;
        }

        roundRect(): this {
            return this;
        }

        stroke(): this {
            return this;
        }
    }

    Object.defineProperty(HeadlessGraphics, 'name', {value: 'HeadlessGraphics'});
    return HeadlessGraphics;
}

function createHeadlessSpriteClass(ContainerClass: ReturnType<typeof createHeadlessDisplayClass>) {
    class HeadlessSprite extends ContainerClass {
        texture: unknown;

        constructor(texture?: unknown) {
            super();
            this.texture = texture ?? null;
        }
    }

    Object.defineProperty(HeadlessSprite, 'name', {value: 'HeadlessSprite'});
    return HeadlessSprite;
}

function createHeadlessTextStyleClass() {
    class HeadlessTextStyle {
        constructor(options: Record<string, unknown> = {}) {
            Object.assign(this, options);
        }
    }

    Object.defineProperty(HeadlessTextStyle, 'name', {value: 'HeadlessTextStyle'});
    return HeadlessTextStyle;
}

function createHeadlessTextClass(
    ContainerClass: ReturnType<typeof createHeadlessDisplayClass>,
    TextStyleClass: ReturnType<typeof createHeadlessTextStyleClass>,
) {
    class HeadlessText extends ContainerClass {
        style: InstanceType<typeof TextStyleClass>;
        text = '';

        constructor(input?: { text?: string; style?: InstanceType<typeof TextStyleClass> }) {
            super();
            this.text = input?.text ?? '';
            this.style = input?.style ?? new TextStyleClass();
        }

        getLocalBounds(): { width: number; height: number } {
            const fontSize = typeof (this.style as { fontSize?: unknown }).fontSize === 'number'
                ? (this.style as { fontSize: number }).fontSize
                : 14;
            const letterSpacing = typeof (this.style as { letterSpacing?: unknown }).letterSpacing === 'number'
                ? (this.style as { letterSpacing: number }).letterSpacing
                : 0;
            const width = Math.max(0, this.text.length * Math.max(1, fontSize * 0.6) + Math.max(0, this.text.length - 1) * letterSpacing);
            const height = typeof (this.style as { lineHeight?: unknown }).lineHeight === 'number'
                ? (this.style as { lineHeight: number }).lineHeight
                : fontSize;
            return {width, height};
        }
    }

    Object.defineProperty(HeadlessText, 'name', {value: 'HeadlessText'});
    return HeadlessText;
}

function createHeadlessTextureClass() {
    class HeadlessTexture {
        static EMPTY = new HeadlessTexture();
        height = 0;
        width = 0;
    }

    Object.defineProperty(HeadlessTexture, 'name', {value: 'HeadlessTexture'});
    return HeadlessTexture;
}

function createHeadlessRectangleClass() {
    class HeadlessRectangle {
        constructor(
            public x = 0,
            public y = 0,
            public width = 0,
            public height = 0,
        ) {
        }
    }

    Object.defineProperty(HeadlessRectangle, 'name', {value: 'HeadlessRectangle'});
    return HeadlessRectangle;
}

function createHeadlessFillGradientClass() {
    class HeadlessFillGradient {
        colorStops: Array<{ offset: number; color: string | number }>;
        end: { x: number; y: number };
        start: { x: number; y: number };

        constructor(input: {
            colorStops: Array<{ offset: number; color: string | number }>;
            end: { x: number; y: number };
            start: { x: number; y: number };
        }) {
            this.colorStops = input.colorStops;
            this.end = input.end;
            this.start = input.start;
        }
    }

    Object.defineProperty(HeadlessFillGradient, 'name', {value: 'HeadlessFillGradient'});
    return HeadlessFillGradient;
}

function createHeadlessColorClass() {
    class HeadlessColor {
        #value: unknown;

        constructor(value: unknown) {
            this.#value = value;
        }

        toNumber(): number {
            return coerceColorNumber(this.#value) ?? 0;
        }
    }

    Object.defineProperty(HeadlessColor, 'name', {value: 'HeadlessColor'});
    return HeadlessColor;
}

function createHeadlessAssetsService(TextureClass: ReturnType<typeof createHeadlessTextureClass>) {
    return {
        cache: new Map<string, InstanceType<typeof TextureClass>>(),
        async load(key: string) {
            const cached = this.cache.get(key);
            if (cached) {
                return cached;
            }
            const texture = new TextureClass();
            this.cache.set(key, texture);
            return texture;
        },
    };
}

function proxifyHeadless<T extends object>(target: T, name: string): T {
    const proxy = new Proxy(target, {
        get(currentTarget, property, receiver) {
            if (Reflect.has(currentTarget, property)) {
                return Reflect.get(currentTarget, property, receiver);
            }

            if (typeof property === 'symbol') {
                return Reflect.get(currentTarget, property, receiver);
            }

            return (..._args: unknown[]) => proxy;
        },
    });

    Object.defineProperty(proxy, '__headlessPixiName', {
        configurable: true,
        enumerable: false,
        value: name,
        writable: false,
    });

    return proxy;
}

function coerceColorNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.startsWith('#') ? value.slice(1) : value;
        if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(normalized)) {
            return Number.parseInt(normalized.slice(0, 6), 16);
        }
    }

    if (value && typeof value === 'object') {
        const rgb = value as { r?: unknown; g?: unknown; b?: unknown };
        if (typeof rgb.r === 'number' && typeof rgb.g === 'number' && typeof rgb.b === 'number') {
            const normalize = (input: number) => Math.max(0, Math.min(255, Math.round(input <= 1 ? input * 255 : input)));
            return (normalize(rgb.r) << 16) + (normalize(rgb.g) << 8) + normalize(rgb.b);
        }
    }

    return undefined;
}

function readExtentValue(input: unknown, key: 'width' | 'height'): number {
    if (!input || typeof input !== 'object') {
        return 0;
    }

    const value = (input as Record<'width' | 'height', unknown>)[key];
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}
