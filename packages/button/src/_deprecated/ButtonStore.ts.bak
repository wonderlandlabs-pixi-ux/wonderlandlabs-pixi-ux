import {
    BoxStore,
    DIR_HORIZ,
    DIR_VERT,
    POS_CENTER,
    POS_START,
    type BoxCellType,
    type BoxContentType,
} from '@wonderlandlabs-pixi-ux/box';
import { TickerForest, type TickerForestConfig } from '@wonderlandlabs-pixi-ux/ticker-forest';
import type { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import {
    Application,
    CanvasTextMetrics,
    Container,
    Graphics,
    Text,
    TextStyle,
    type ContainerOptions,
    type Sprite,
    type TextStyleOptions,
    type Ticker,
} from 'pixi.js';
import type { ButtonConfig, ButtonMode, RgbColor } from './types.js';
import { rgbToHex } from './types.js';

type ButtonState = Record<string, never>;

type TickerSource = Application | { ticker: Ticker };

type ButtonChildView = {
    name: string;
    rect: { x: number; y: number; width: number; height: number };
    content?: BoxContentType;
};

type IconRef = {
    key: 'icon' | 'rightIcon';
    sprite?: Sprite;
    container?: Container;
    host?: Container;
    role: 'left' | 'right';
};

type LabelRef = {
    key: 'label';
    host: Container;
    textDisplay: Text;
};

type LayoutNodeSpec = {
    key: string;
    name: string;
    width: number;
    height: number;
    content?: BoxContentType;
};

type ButtonLayoutView = {
    contentRect: { x: number; y: number; width: number; height: number };
    semanticChildren: ButtonChildView[];
    absoluteChildren: ButtonChildView[];
};

function isApplication(value: TickerSource): value is Application {
    return !!value && typeof value === 'object' && 'renderer' in value && 'ticker' in value;
}

function toTickerConfig(source: TickerSource): TickerForestConfig {
    if (isApplication(source)) {
        return { app: source };
    }
    return { ticker: source.ticker };
}

export class ButtonStore extends TickerForest<ButtonState> {
    readonly id: string;

    #styleTree: StyleTree;
    #config: ButtonConfig;
    #mode: ButtonMode;
    #isHovered = false;
    #isDisabled: boolean;
    #minWidth?: number;
    #minHeight?: number;

    #box: BoxStore;
    #rootLayer: Container;
    #background: Graphics;
    #contentLayer: Container;

    #leftIcon?: IconRef;
    #rightIcon?: IconRef;
    #label?: LabelRef;
    #childViews: ButtonChildView[] = [];

    constructor(
        config: ButtonConfig,
        styleTree: StyleTree,
        tickerSource: TickerSource,
        rootProps?: ContainerOptions
    ) {
        const buttonContainer = new Container({
            label: `button-${config.id}`,
            sortableChildren: true,
            ...rootProps,
        });
        super({ value: {} }, { ...toTickerConfig(tickerSource), container: buttonContainer });

        this.id = config.id;
        this.#styleTree = styleTree;
        this.#config = config;
        this.#mode = ButtonStore.#resolveMode(config);
        this.#isDisabled = config.isDisabled ?? false;

        this.#box = new BoxStore({
            value: this.#buildBoxCell(0, 0, []),
        });
        this.#box.styles = styleTree;

        this.#rootLayer = new Container({
            label: `${config.id}-box-root`,
            sortableChildren: true,
        });
        this.#background = new Graphics();
        this.#background.label = `${config.id}-background`;
        this.#contentLayer = new Container({
            label: `${config.id}-content`,
            sortableChildren: true,
        });
        this.#rootLayer.addChild(this.#background, this.#contentLayer);
        this.container.addChild(this.#rootLayer);

        this.#buildChildren();
        this.#setupInteractivity();
    }

    static #resolveMode(config: ButtonConfig): ButtonMode {
        if (config.mode) return config.mode;
        if (!config.sprite && !config.icon && config.label) return 'text';
        if ((config.sprite || config.icon) && config.label) return 'inline';
        return 'icon';
    }

    get #wantsLeftIcon(): boolean {
        return this.#mode === 'icon'
            || this.#mode === 'iconVertical'
            || (this.#mode === 'inline' && !!(this.#config.sprite || this.#config.icon));
    }

    get #wantsRightIcon(): boolean {
        return this.#mode === 'inline' && !!(this.#config.rightSprite || this.#config.rightIcon);
    }

    get #wantsLabel(): boolean {
        return !!this.#config.label && this.#mode !== 'icon';
    }

    get container(): Container {
        const container = super.container;
        if (!container) {
            throw new Error('ButtonStore: container unavailable');
        }
        return container;
    }

    get rect(): { x: number; y: number; width: number; height: number } {
        return this.#box.rect;
    }

    get children(): readonly ButtonChildView[] {
        return this.#childViews;
    }

    get isHovered(): boolean {
        return this.#isHovered;
    }

    get isDisabled(): boolean {
        return this.#isDisabled;
    }

    get mode(): ButtonMode {
        return this.#mode;
    }

    get order(): number {
        return this.container.zIndex;
    }

    static #asNonEmptyString(value: unknown): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }
        const next = value.trim();
        return next.length ? next : undefined;
    }

    #extractSpriteUrl(sprite?: Sprite): string | undefined {
        if (!sprite) return undefined;
        const texture = (sprite as unknown as { texture?: any }).texture;
        const source = texture?.source;
        return ButtonStore.#asNonEmptyString(source?.resource?.src)
            ?? ButtonStore.#asNonEmptyString(source?.src)
            ?? ButtonStore.#asNonEmptyString(texture?.resource?.src)
            ?? ButtonStore.#asNonEmptyString(texture?.url);
    }

    #extractContainerUrl(container?: Container): string | undefined {
        if (!container) return undefined;
        const firstChild = container.children?.[0] as Sprite | undefined;
        return this.#extractSpriteUrl(firstChild);
    }

    #buildChildren(): void {
        if (this.#wantsLeftIcon) {
            const sprite = this.#config.sprite;
            const container = this.#config.icon;
            let host: Container | undefined;
            if (sprite || container) {
                host = new Container({ label: `${this.id}-icon-host` });
                if (sprite) {
                    if ('anchor' in sprite && sprite.anchor) {
                        sprite.anchor.set(0);
                    }
                    host.addChild(sprite);
                } else if (container) {
                    host.addChild(container);
                }
                this.#contentLayer.addChild(host);
            }
            this.#leftIcon = { key: 'icon', sprite, container, host, role: 'left' };
        }

        if (this.#wantsLabel) {
            const host = new Container({ label: `${this.id}-label-host` });
            const textDisplay = new Text({
                text: this.#config.label ?? '',
                style: new TextStyle({
                    fontSize: 13,
                    fill: 0xffffff,
                    align: 'center',
                    fontFamily: this.#config.bitmapFont ?? 'Arial',
                }),
            });
            host.addChild(textDisplay);
            this.#contentLayer.addChild(host);
            this.#label = { key: 'label', host, textDisplay };
        }

        if (this.#wantsRightIcon) {
            const sprite = this.#config.rightSprite;
            const container = this.#config.rightIcon;
            let host: Container | undefined;
            if (sprite || container) {
                host = new Container({ label: `${this.id}-right-icon-host` });
                if (sprite) {
                    if ('anchor' in sprite && sprite.anchor) {
                        sprite.anchor.set(0);
                    }
                    host.addChild(sprite);
                } else if (container) {
                    host.addChild(container);
                }
                this.#contentLayer.addChild(host);
            }
            this.#rightIcon = { key: 'rightIcon', sprite, container, host, role: 'right' };
        }
    }

    #setupInteractivity(): void {
        this.container.eventMode = this.#isDisabled ? 'none' : 'static';
        this.container.cursor = this.#isDisabled ? 'default' : 'pointer';
        this.container.on('pointerenter', this.#onPointerEnter);
        this.container.on('pointerleave', this.#onPointerLeave);
        this.container.on('pointerover', this.#onPointerEnter);
        this.container.on('pointerout', this.#onPointerLeave);
        this.container.on('pointertap', this.#onPointerTap);
    }

    #onPointerEnter = (): void => {
        if (!this.#isDisabled) {
            this.setHovered(true);
        }
    };

    #onPointerLeave = (): void => {
        if (!this.#isDisabled) {
            this.setHovered(false);
        }
    };

    #onPointerTap = (): void => {
        if (!this.#isDisabled && this.#config.onClick) {
            this.#config.onClick();
        }
    };

    #styleStates(): string[] {
        return this.#isDisabled ? ['disabled'] : (this.#isHovered ? ['hover'] : []);
    }

    #modeNouns(): string[] {
        switch (this.#mode) {
            case 'text':
                return ['text'];
            case 'inline':
                return ['inline'];
            case 'iconVertical':
                return ['icon', 'vertical'];
            case 'icon':
            default:
                return [];
        }
    }

    #resolveStyle<T = unknown>(propertyPath: string[], extraNouns: string[] = []): T | undefined {
        if (this.#box) {
            return this.#box.resolveStyle<T>(propertyPath, {
                states: this.#styleStates(),
                extraNouns,
            });
        }

        const nouns = ['button', ...extraNouns, ...propertyPath];
        const states = this.#styleStates();
        const leaf = nouns[nouns.length - 1];
        const variant = this.#config.variant;
        const withVariant = variant
            ? ['button', variant, ...extraNouns, ...propertyPath]
            : undefined;
        const queries = [
            ...(withVariant ? [{ nouns: withVariant, states }] : []),
            { nouns, states },
            ...(leaf ? [{ nouns: [leaf], states }] : []),
        ];

        for (const query of queries) {
            const result = this.#styleTree.matchHierarchy
                ? this.#styleTree.matchHierarchy(query)
                : this.#styleTree.match(query);
            if (result !== undefined) {
                return result as T;
            }
        }

        return undefined;
    }

    #getStyle<T = unknown>(...propertyPath: string[]): T | undefined {
        const modeValue = this.#resolveStyle<T>(propertyPath, this.#modeNouns());
        if (modeValue !== undefined) {
            return modeValue;
        }

        return this.#resolveStyle<T>(propertyPath);
    }

    #defaultPaddingX(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 12 : 4;
    }

    #defaultPaddingY(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 6 : 4;
    }

    #defaultIconSize(): { x: number; y: number } {
        return this.#mode === 'inline' ? { x: 16, y: 16 } : { x: 32, y: 32 };
    }

    #defaultLabelColor(): RgbColor {
        return this.#mode === 'text' || this.#mode === 'inline'
            ? { r: 1, g: 1, b: 1 }
            : { r: 0, g: 0, b: 0 };
    }

    #defaultLabelAlpha(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 1 : 0.5;
    }

    #defaultStrokeWidth(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 0 : 1;
    }

    #borderRadius(): number {
        return this.#getStyle<number>('border', 'radius') ?? 6;
    }

    #iconStyle(iconRef: IconRef): { width: number; height: number; alpha: number; tint?: RgbColor } {
        const defaults = this.#defaultIconSize();
        const sizePrefix = iconRef.role === 'right' ? ['right', 'icon'] : ['icon'];

        const width = this.#getStyle<number>(...sizePrefix, 'size', 'x') ?? defaults.x;
        const height = this.#getStyle<number>(...sizePrefix, 'size', 'y') ?? defaults.y;
        const alpha = this.#getStyle<number>(...sizePrefix, 'alpha') ?? 1;
        const tint = this.#getStyle<RgbColor>(...sizePrefix, 'tint');

        return { width, height, alpha, tint };
    }

    #labelStyle(): { textStyle: TextStyleOptions; alpha: number } {
        const fontSize = this.#getStyle<number>('label', 'font', 'size')
            ?? this.#getStyle<number>('label', 'fontSize')
            ?? 13;
        const color = this.#getStyle<RgbColor>('label', 'font', 'color')
            ?? this.#getStyle<RgbColor>('label', 'color')
            ?? this.#defaultLabelColor();
        const alpha = this.#getStyle<number>('label', 'font', 'alpha')
            ?? this.#getStyle<number>('label', 'alpha')
            ?? this.#defaultLabelAlpha();
        const visible = this.#getStyle<boolean>('label', 'font', 'visible')
            ?? this.#getStyle<boolean>('label', 'visible')
            ?? true;
        const family = this.#getStyle<string>('label', 'font', 'family')
            ?? this.#config.bitmapFont
            ?? 'Arial';

        return {
            textStyle: {
                fontSize,
                fill: rgbToHex(color),
                align: 'center',
                fontFamily: family,
            },
            alpha: this.#isDisabled ? (visible ? alpha * 0.5 : 0) : (visible ? alpha : 0),
        };
    }

    #measureLabel(textStyle: TextStyleOptions): { width: number; height: number } {
        const text = this.#config.label ?? '';
        const fallbackFontSize = typeof textStyle.fontSize === 'number' ? textStyle.fontSize : 13;
        let measuredWidth = Math.max(0, text.length * fallbackFontSize * 0.6);
        let measuredHeight = Math.max(0, fallbackFontSize * 1.2);

        if (this.#label) {
            try {
                this.#label.textDisplay.text = text;
                this.#label.textDisplay.style = new TextStyle(textStyle);
                const bounds = this.#label.textDisplay.getLocalBounds();
                if (Number.isFinite(bounds.width) && bounds.width >= 0) {
                    measuredWidth = bounds.width;
                }
                if (Number.isFinite(bounds.height) && bounds.height >= 0) {
                    measuredHeight = bounds.height;
                }
            } catch {
                // noop fallback
            }
        }

        try {
            const measured = CanvasTextMetrics.measureText(text, textStyle as never);
            if (Number.isFinite(measured.width) && measured.width >= 0) {
                measuredWidth = measured.width;
            }
            if (Number.isFinite(measured.height) && measured.height >= 0) {
                measuredHeight = measured.height;
            }
        } catch {
            // noop fallback
        }

        return {
            width: measuredWidth,
            height: measuredHeight,
        };
    }

    #backgroundStyle(): { fill?: RgbColor; fillAlpha?: number; stroke?: RgbColor; strokeAlpha: number; strokeWidth: number } {
        const fill = this.#getStyle<RgbColor>('fill', 'color')
            ?? ((this.#mode === 'text' || this.#mode === 'inline') ? { r: 0.33, g: 0.67, b: 0.6 } : undefined);
        const fillAlphaBase = this.#getStyle<number>('fill', 'alpha') ?? (fill ? 1 : undefined);
        const stroke = this.#getStyle<RgbColor>('stroke', 'color') ?? { r: 0.5, g: 0.5, b: 0.5 };
        const strokeAlphaBase = this.#getStyle<number>('stroke', 'alpha') ?? 1;
        const strokeWidth = this.#getStyle<number>('stroke', 'size')
            ?? this.#getStyle<number>('stroke', 'width')
            ?? this.#defaultStrokeWidth();

        return {
            fill,
            fillAlpha: fillAlphaBase === undefined ? undefined : (this.#isDisabled ? fillAlphaBase * 0.5 : fillAlphaBase),
            stroke,
            strokeAlpha: this.#isDisabled ? strokeAlphaBase * 0.5 : strokeAlphaBase,
            strokeWidth,
        };
    }

    #nodeSpecs(): LayoutNodeSpec[] {
        const specs: LayoutNodeSpec[] = [];

        if (this.#leftIcon) {
            const style = this.#iconStyle(this.#leftIcon);
            specs.push({
                key: 'icon',
                name: 'icon',
                width: style.width,
                height: style.height,
                content: this.#resolveIconContent(this.#leftIcon),
            });
        }

        if (this.#label) {
            const { textStyle } = this.#labelStyle();
            const measured = this.#measureLabel(textStyle);
            specs.push({
                key: 'label',
                name: 'label',
                width: measured.width,
                height: measured.height,
            });
        }

        if (this.#rightIcon) {
            const style = this.#iconStyle(this.#rightIcon);
            specs.push({
                key: 'rightIcon',
                name: 'rightIcon',
                width: style.width,
                height: style.height,
                content: this.#resolveIconContent(this.#rightIcon),
            });
        }

        return specs;
    }

    #resolveIconContent(iconRef: IconRef): BoxContentType | undefined {
        if (iconRef.sprite || iconRef.container) {
            return undefined;
        }

        const explicit = iconRef.role === 'right'
            ? this.#config.rightIconUrl
            : this.#config.iconUrl;
        const url = ButtonStore.#asNonEmptyString(explicit);
        return url ? { type: 'url', value: url } : undefined;
    }

    #gap(): number {
        const resolvedGap = this.#getStyle<number>('icon', 'gap')
            ?? this.#getStyle<number>('right', 'icon', 'gap')
            ?? this.#getStyle<number>('iconGap');
        if (this.#mode === 'iconVertical') {
            return resolvedGap ?? 4;
        }
        if (this.#mode === 'inline') {
            return resolvedGap ?? 8;
        }
        return 0;
    }

    #buildBoxCell(contentWidth: number, contentHeight: number, nodeSpecs: LayoutNodeSpec[]): BoxCellType {
        const paddingX = this.#getStyle<number>('padding', 'x') ?? this.#defaultPaddingX();
        const paddingY = this.#getStyle<number>('padding', 'y') ?? this.#defaultPaddingY();
        const x = this.#box?.value.dim.x ?? 0;
        const y = this.#box?.value.dim.y ?? 0;
        const rootWidth = Math.max(contentWidth + paddingX * 2, this.#minWidth ?? 0);
        const rootHeight = Math.max(contentHeight + paddingY * 2, this.#minHeight ?? 0);
        const isColumn = this.#mode === 'iconVertical';
        const contentChildren: BoxCellType[] = [];
        const gap = this.#gap();

        nodeSpecs.forEach((node, index) => {
            contentChildren.push({
                name: node.name,
                absolute: false,
                dim: { w: node.width, h: node.height },
                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                content: node.content,
            });
            if (gap > 0 && index < nodeSpecs.length - 1) {
                contentChildren.push({
                    name: `gap-${index}`,
                    absolute: false,
                    dim: isColumn ? { w: 0, h: gap } : { w: gap, h: 0 },
                    align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
                });
            }
        });

        return {
            name: 'button',
            absolute: true,
            variant: this.#config.variant,
            states: this.#styleStates(),
            dim: { x, y, w: rootWidth, h: rootHeight },
            align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
            children: [{
                name: this.#mode === 'icon' ? 'content' : this.#mode,
                absolute: false,
                dim: { w: contentWidth, h: contentHeight },
                align: isColumn
                    ? { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_START }
                    : { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                children: contentChildren,
            }],
        };
    }

    #layoutView(): ButtonLayoutView {
        const contentBox = this.#box.value.children?.[0];
        const contentLocation = contentBox?.location;
        const semanticChildren = contentBox?.children?.filter((child: BoxCellType) => !child.name.startsWith('gap-')) ?? [];
        const contentOriginX = contentLocation?.x ?? 0;
        const contentOriginY = contentLocation?.y ?? 0;

        return {
            contentRect: {
                x: contentOriginX,
                y: contentOriginY,
                width: contentLocation?.w ?? 0,
                height: contentLocation?.h ?? 0,
            },
            semanticChildren: semanticChildren.map((child: BoxCellType) => ({
                name: child.name,
                rect: {
                    x: (child.location?.x ?? 0) - contentOriginX,
                    y: (child.location?.y ?? 0) - contentOriginY,
                    width: child.location?.w ?? 0,
                    height: child.location?.h ?? 0,
                },
                content: child.content,
            })),
            absoluteChildren: semanticChildren.map((child: BoxCellType) => ({
                name: child.name,
                rect: {
                    x: child.location?.x ?? 0,
                    y: child.location?.y ?? 0,
                    width: child.location?.w ?? 0,
                    height: child.location?.h ?? 0,
                },
                content: child.content,
            })),
        };
    }

    #syncLayout(): void {
        const nodeSpecs = this.#nodeSpecs();
        const isRow = this.#mode !== 'iconVertical';
        const gap = this.#gap();
        const contentWidth = isRow
            ? nodeSpecs.reduce((sum, node) => sum + node.width, 0) + Math.max(0, nodeSpecs.length - 1) * gap
            : nodeSpecs.reduce((max, node) => Math.max(max, node.width), 0);
        const contentHeight = isRow
            ? nodeSpecs.reduce((max, node) => Math.max(max, node.height), 0)
            : nodeSpecs.reduce((sum, node) => sum + node.height, 0) + Math.max(0, nodeSpecs.length - 1) * gap;

        this.#box.mutate((draft: BoxCellType) => {
            Object.assign(draft, this.#buildBoxCell(contentWidth, contentHeight, nodeSpecs));
        });
        this.#box.update();

        const rootRect = this.#box.rect;
        this.container.position.set(rootRect.x, rootRect.y);
        this.container.zIndex = this.#config.order ?? 0;

        const backgroundStyle = this.#backgroundStyle();
        const borderRadius = this.#borderRadius();
        this.#background.clear();
        if (backgroundStyle.fill && backgroundStyle.fillAlpha !== undefined && backgroundStyle.fillAlpha > 0) {
            this.#background.roundRect(0, 0, rootRect.width, rootRect.height, borderRadius);
            this.#background.fill({ color: rgbToHex(backgroundStyle.fill), alpha: backgroundStyle.fillAlpha });
        }
        if (backgroundStyle.strokeWidth > 0) {
            this.#background.roundRect(0, 0, rootRect.width, rootRect.height, borderRadius);
            this.#background.stroke({
                color: rgbToHex(backgroundStyle.stroke ?? { r: 0.5, g: 0.5, b: 0.5 }),
                alpha: backgroundStyle.strokeAlpha,
                width: backgroundStyle.strokeWidth,
            });
        }

        const layout = this.#layoutView();
        this.#childViews = layout.semanticChildren;
    }

    #syncIconNode(iconRef: IconRef): void {
        const view = this.#layoutView().absoluteChildren.find((child: ButtonChildView) => child.name === iconRef.key);
        if (!view) return;

        const style = this.#iconStyle(iconRef);
        const localX = view.rect.x - this.#box.rect.x;
        const localY = view.rect.y - this.#box.rect.y;

        if (iconRef.host) {
            iconRef.host.position.set(localX, localY);
        }

        if (iconRef.sprite) {
            iconRef.sprite.width = style.width;
            iconRef.sprite.height = style.height;
            iconRef.sprite.alpha = this.#isDisabled ? style.alpha * 0.5 : style.alpha;
            iconRef.sprite.tint = style.tint ? rgbToHex(style.tint) : 0xffffff;
            return;
        }

        if (iconRef.container) {
            const bounds = iconRef.container.getLocalBounds();
            if (bounds.width > 0 && bounds.height > 0) {
                iconRef.container.scale.set(style.width / bounds.width, style.height / bounds.height);
            }
            iconRef.container.alpha = this.#isDisabled ? style.alpha * 0.5 : style.alpha;
        }
    }

    #syncLabelNode(): void {
        if (!this.#label) return;

        const view = this.#layoutView().absoluteChildren.find((child: ButtonChildView) => child.name === 'label');
        if (!view) return;

        const { textStyle, alpha } = this.#labelStyle();
        this.#label.textDisplay.text = this.#config.label ?? '';
        this.#label.textDisplay.style = new TextStyle(textStyle);
        this.#label.textDisplay.alpha = alpha;
        this.#label.host.position.set(
            view.rect.x - this.#box.rect.x,
            view.rect.y - this.#box.rect.y,
        );
    }

    protected override resolve(): void {
        this.#syncLayout();
        if (this.#leftIcon) {
            this.#syncIconNode(this.#leftIcon);
        }
        if (this.#rightIcon) {
            this.#syncIconNode(this.#rightIcon);
        }
        this.#syncLabelNode();
    }

    setHovered(isHovered: boolean): void {
        const nextHovered = this.#isDisabled ? false : isHovered;
        if (this.#isHovered === nextHovered) return;
        this.#isHovered = nextHovered;
        this.dirty();
    }

    setDisabled(isDisabled: boolean): void {
        if (this.#isDisabled === isDisabled) return;
        this.#isDisabled = isDisabled;
        if (isDisabled && this.#isHovered) {
            this.#isHovered = false;
        }
        this.container.eventMode = isDisabled ? 'none' : 'static';
        this.container.cursor = isDisabled ? 'default' : 'pointer';
        this.dirty();
    }

    setPosition(x: number, y: number): void {
        const dim = this.#box.value.dim;
        if (dim.x === x && dim.y === y) {
            return;
        }
        this.#box.mutate((draft: BoxCellType) => {
            draft.dim = {
                ...draft.dim,
                x,
                y,
            };
        });
        this.dirty();
    }

    setOrder(order: number): void {
        if ((this.#config.order ?? 0) === order) {
            return;
        }
        this.#config = {
            ...this.#config,
            order,
        };
        this.dirty();
    }

    setMinSize(minWidth?: number, minHeight?: number): boolean {
        const normalize = (value: number | undefined): number | undefined => {
            if (value === undefined) {
                return undefined;
            }
            if (!Number.isFinite(value) || value < 0) {
                throw new Error(`${this.id}: min size must be finite and >= 0`);
            }
            return value;
        };

        const nextMinWidth = normalize(minWidth);
        const nextMinHeight = normalize(minHeight);

        if (this.#minWidth === nextMinWidth && this.#minHeight === nextMinHeight) {
            return false;
        }

        this.#minWidth = nextMinWidth;
        this.#minHeight = nextMinHeight;
        this.dirty();
        return true;
    }

    getConfig(): ButtonConfig {
        return this.#config;
    }

    getPreferredSize(): { width: number; height: number } {
        const { width, height } = this.#box.rect;
        return { width, height };
    }

    override cleanup(): void {
        this.container.off('pointerenter', this.#onPointerEnter);
        this.container.off('pointerleave', this.#onPointerLeave);
        this.container.off('pointerover', this.#onPointerEnter);
        this.container.off('pointerout', this.#onPointerLeave);
        this.container.off('pointertap', this.#onPointerTap);
        super.cleanup();
    }
}
