import {
    BOX_RENDER_CONTENT_ORDER,
    BOX_UX_LAYER,
    BoxTree,
    BoxUxPixi,
} from '@wonderlandlabs-pixi-ux/box';
import { TickerForest, type TickerForestConfig } from '@wonderlandlabs-pixi-ux/ticker-forest';
import type { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import {
    Application,
    CanvasTextMetrics,
    Container,
    Text,
    TextStyle,
    type ContainerOptions,
    type Sprite,
    type TextStyleOptions,
    type Ticker,
} from 'pixi.js';
import type { ButtonConfig, ButtonMode, RgbColor } from './types';
import { rgbToHex } from './types';

type ButtonState = Record<string, never>;

type TickerSource = Application | { ticker: Ticker };

type IconRef = {
    tree: BoxTree;
    sprite?: Sprite;
    container?: Container;
    role: 'left' | 'right';
};

type LabelRef = {
    tree: BoxTree;
    textDisplay: Text;
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

/**
 * ButtonStore - BoxTree-based button layout with Pixi rendering.
 *
 * Layout model:
 * - A root BoxTree node represents button bounds.
 * - Child BoxTree nodes represent icon/label slots in content space.
 * - Padding is applied at render placement time (child tree positions remain padding-free).
 */
export class ButtonStore extends TickerForest<ButtonState> {
    readonly id: string;

    #styleTree: StyleTree;
    #config: ButtonConfig;
    #mode: ButtonMode;
    #isHovered = false;
    #isDisabled: boolean;

    #tree: BoxTree;

    #leftIcon?: IconRef;
    #rightIcon?: IconRef;
    #label?: LabelRef;

    constructor(
        config: ButtonConfig,
        styleTree: StyleTree,
        tickerSource: TickerSource,
        rootProps?: ContainerOptions
    ) {
        const buttonContainer = new Container({
            label: `button-${config.id}`,
            ...rootProps,
        });
        super({ value: {} }, {...toTickerConfig(tickerSource), container: buttonContainer});

        this.id = config.id;
        this.#styleTree = styleTree;
        this.#config = config;
        this.#mode = ButtonStore.#resolveMode(config);
        this.#isDisabled = config.isDisabled ?? false;

        this.#tree = new BoxTree({
            id: config.id,
            styleName: 'button',
            order: config.order ?? 0,
            area: {
                x: 0,
                y: 0,
                width: { mode: 'px', value: 0 },
                height: { mode: 'px', value: 0 },
                px: 's',
                py: 's',
            },
            align: {
                x: 's',
                y: 's',
                direction: this.#mode === 'iconVertical' ? 'column' : 'row',
            },
        });

        this.#tree.assignUx((box) => new BoxUxPixi(box));
        this.#tree.styles = {
            match: ({ nouns, states }) => this.#matchBoxStyle(nouns, states),
        };

        this.container.zIndex = this.#tree.order;
        const rootUx = this.#tree.ux as BoxUxPixi | undefined;
        if (!rootUx) {
            throw new Error(`${this.id}: root BoxTree UX was not initialized`);
        }
        this.container.addChild(rootUx.container);

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
        return this.#tree.rect;
    }

    get children(): readonly BoxTree[] {
        return this.#tree.children;
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
        return this.#tree.order;
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

    #resolveIconContentUrl(role: 'left' | 'right', sprite?: Sprite, container?: Container): string | undefined {
        const explicit = role === 'right'
            ? this.#config.rightIconUrl
            : this.#config.iconUrl;

        return ButtonStore.#asNonEmptyString(explicit)
            ?? this.#extractSpriteUrl(sprite)
            ?? this.#extractContainerUrl(container);
    }

    #attachNodeContent(tree: BoxTree, host: Container): void {
        const ux = tree.ux;
        if (!(ux instanceof BoxUxPixi)) {
            throw new Error(`${tree.identityPath}: expected BoxUxPixi to attach content`);
        }
        host.zIndex = BOX_RENDER_CONTENT_ORDER.CONTENT;
        ux.contentMap.set(BOX_UX_LAYER.CONTENT, host);
    }

    #addTreeChild(key: string, order: number): BoxTree {
        return this.#tree.addChild(key, {
            id: `${this.id}-${key}`,
            order,
            area: {
                x: 0,
                y: 0,
                width: { mode: 'px', value: 0 },
                height: { mode: 'px', value: 0 },
                px: 's',
                py: 's',
            },
            align: {
                x: 's',
                y: 's',
                direction: 'column',
            },
        });
    }

    #createIconRef(role: 'left' | 'right', order: number): IconRef {
        const key = role === 'left' ? 'icon-left' : 'icon-right';
        const sprite = role === 'right' ? this.#config.rightSprite : this.#config.sprite;
        const container = role === 'right' ? this.#config.rightIcon : this.#config.icon;
        const tree = this.#addTreeChild(key, order);
        const iconUrl = this.#resolveIconContentUrl(role, sprite, container);
        const hasExplicitContent = !!sprite || !!container;
        if (iconUrl && !hasExplicitContent) {
            tree.setContent({ type: 'url', value: iconUrl });
        }

        let host: Container | undefined;
        if (hasExplicitContent) {
            host = new Container({ label: `${this.id}-${key}-host` });
            if (sprite) {
                if ('anchor' in sprite && sprite.anchor) {
                    sprite.anchor.set(0);
                }
                host.addChild(sprite);
            } else if (container) {
                host.addChild(container);
            }
            this.#attachNodeContent(tree, host);
        }
        return { tree, sprite, container, role };
    }

    #createLabelRef(order: number): LabelRef {
        const tree = this.#addTreeChild('label', order);
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
        this.#attachNodeContent(tree, host);

        return { tree, textDisplay };
    }

    #buildChildren(): void {
        let order = 0;

        if (this.#wantsLeftIcon) {
            this.#leftIcon = this.#createIconRef('left', order);
            order += 1;
        }

        if (this.#wantsLabel) {
            this.#label = this.#createLabelRef(order);
            order += 1;
        }

        if (this.#wantsRightIcon) {
            this.#rightIcon = this.#createIconRef('right', order);
        }
    }

    #setupInteractivity(): void {
        this.container.eventMode = this.#isDisabled ? 'none' : 'static';
        this.container.cursor = this.#isDisabled ? 'default' : 'pointer';

        this.#syncModeVerbs();
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

    #getCurrentStates(): string[] {
        return [...this.#tree.resolvedVerb];
    }

    #syncModeVerbs(): void {
        if (this.#isDisabled) {
            this.#tree.setModeVerb(['disabled']);
            return;
        }
        this.#tree.setModeVerb(this.#isHovered ? ['hover'] : []);
    }

    #getStyle(...propertyPath: string[]): unknown {
        return this.#getStyleForStates(this.#getCurrentStates(), ...propertyPath);
    }

    #getStyleForStates(states: readonly string[], ...propertyPath: string[]): unknown {
        const variant = this.#config.variant;

        let modePrefix: string[] = [];
        if (this.#mode === 'text') {
            modePrefix = ['text'];
        } else if (this.#mode === 'inline') {
            modePrefix = ['inline'];
        } else if (this.#mode === 'iconVertical') {
            modePrefix = ['iconVertical'];
        }

        if (variant) {
            const variantMatch = this.#styleTree.match({
                nouns: ['button', variant, ...modePrefix, ...propertyPath],
                states: [...states],
            });
            if (variantMatch !== undefined) {
                return variantMatch;
            }
        }

        return this.#styleTree.match({
            nouns: ['button', ...modePrefix, ...propertyPath],
            states: [...states],
        });
    }

    #matchBoxStyle(nouns: string[], states: string[]): unknown {
        if (nouns.length !== 2 || nouns[0] !== 'button') {
            return undefined;
        }
        const prop = nouns[nouns.length - 1];
        if (!prop) {
            return undefined;
        }

        const isDisabled = states.includes('disabled');
        const fillColor = this.#getStyleForStates(states, 'fill', 'color') as RgbColor | undefined;
        const fillAlpha = this.#getStyleForStates(states, 'fill', 'alpha') as number | undefined;
        const strokeColor = this.#getStyleForStates(states, 'stroke', 'color') as RgbColor | undefined;
        const strokeAlpha = this.#getStyleForStates(states, 'stroke', 'alpha') as number | undefined;
        const strokeWidth = (this.#getStyleForStates(states, 'stroke', 'size') as number | undefined)
            ?? (this.#getStyleForStates(states, 'stroke', 'width') as number | undefined);

        const resolvedFillColor = fillColor
            ?? (this.#mode === 'text' || this.#mode === 'inline'
                ? { r: 0.33, g: 0.67, b: 0.6 }
                : undefined);
        const resolvedFillAlphaBase = fillAlpha ?? (resolvedFillColor ? 1 : undefined);
        const resolvedFillAlpha = resolvedFillAlphaBase === undefined
            ? undefined
            : (isDisabled ? resolvedFillAlphaBase * 0.5 : resolvedFillAlphaBase);

        const resolvedStrokeColor = strokeColor ?? { r: 0.5, g: 0.5, b: 0.5 };
        const resolvedStrokeAlphaBase = strokeAlpha ?? 1;
        const resolvedStrokeAlpha = isDisabled ? resolvedStrokeAlphaBase * 0.5 : resolvedStrokeAlphaBase;
        const resolvedStrokeWidth = strokeWidth ?? this.#defaultStrokeWidth();

        if (prop === 'bgColor') return resolvedFillColor;
        if (prop === 'bgAlpha') return resolvedFillAlpha;
        if (prop === 'bgStrokeColor') return resolvedStrokeColor;
        if (prop === 'bgStrokeAlpha') return resolvedStrokeAlpha;
        if (prop === 'bgStrokeSize') return resolvedStrokeWidth;
        return undefined;
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

    #iconStyle(iconRef: IconRef): { width: number; height: number; alpha: number; tint?: RgbColor } {
        const defaults = this.#defaultIconSize();
        const isRight = iconRef.role === 'right';

        const width = isRight
            ? ((this.#getStyle('rightIcon', 'size', 'x') as number | undefined)
                ?? (this.#getStyle('icon', 'size', 'x') as number | undefined)
                ?? defaults.x)
            : ((this.#getStyle('icon', 'size', 'x') as number | undefined) ?? defaults.x);

        const height = isRight
            ? ((this.#getStyle('rightIcon', 'size', 'y') as number | undefined)
                ?? (this.#getStyle('icon', 'size', 'y') as number | undefined)
                ?? defaults.y)
            : ((this.#getStyle('icon', 'size', 'y') as number | undefined) ?? defaults.y);

        const alpha = isRight
            ? ((this.#getStyle('rightIcon', 'alpha') as number | undefined)
                ?? (this.#getStyle('icon', 'alpha') as number | undefined)
                ?? 1)
            : ((this.#getStyle('icon', 'alpha') as number | undefined) ?? 1);

        const tint = isRight
            ? ((this.#getStyle('rightIcon', 'tint') as RgbColor | undefined)
                ?? (this.#getStyle('icon', 'tint') as RgbColor | undefined))
            : (this.#getStyle('icon', 'tint') as RgbColor | undefined);

        return { width, height, alpha, tint };
    }

    #labelStyle(): { textStyle: TextStyleOptions; alpha: number } {
        const fontSize = (this.#getStyle('label', 'font', 'size') as number | undefined)
            ?? (this.#getStyle('label', 'fontSize') as number | undefined)
            ?? 13;
        const color = (this.#getStyle('label', 'font', 'color') as RgbColor | undefined)
            ?? (this.#getStyle('label', 'color') as RgbColor | undefined)
            ?? this.#defaultLabelColor();
        const alpha = (this.#getStyle('label', 'font', 'alpha') as number | undefined)
            ?? (this.#getStyle('label', 'alpha') as number | undefined)
            ?? this.#defaultLabelAlpha();
        const visible = (this.#getStyle('label', 'font', 'visible') as boolean | undefined)
            ?? (this.#getStyle('label', 'visible') as boolean | undefined)
            ?? true;
        const family = (this.#getStyle('label', 'font', 'family') as string | undefined)
            ?? this.#config.bitmapFont
            ?? 'Arial';

        const textStyle: TextStyleOptions = {
            fontSize,
            fill: rgbToHex(color),
            align: 'center',
            fontFamily: family,
        };

        return {
            textStyle,
            alpha: this.#isDisabled ? (visible ? alpha * 0.5 : 0) : (visible ? alpha : 0),
        };
    }

    #measureLabel(textStyle: TextStyleOptions): { width: number; height: number } {
        const text = this.#config.label ?? '';
        const fallbackFontSize = typeof textStyle.fontSize === 'number' ? textStyle.fontSize : 13;
        const fallbackWidth = Math.max(0, text.length * fallbackFontSize * 0.6);
        const fallbackHeight = Math.max(0, fallbackFontSize * 1.2);

        let measuredWidth = fallbackWidth;
        let measuredHeight = fallbackHeight;

        // Prefer live Pixi text bounds when available so vertical centering follows rendered extent.
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
                // Ignore and fallback to CanvasTextMetrics/fallback values.
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
            // In non-browser contexts measurement can fail; fallback remains valid.
        }

        return {
            width: measuredWidth,
            height: measuredHeight,
        };
    }

    #syncLayout(): void {
        const direction = this.#mode === 'iconVertical' ? 'column' : 'row';
        const isRow = direction === 'row';

        const resolvedGap = (this.#getStyle('icon', 'gap') as number | undefined)
            ?? (this.#getStyle('iconGap') as number | undefined);
        const gap = this.#mode === 'iconVertical'
            ? (resolvedGap ?? 4)
            : (this.#mode === 'inline' ? (resolvedGap ?? 8) : 0);

        const paddingX = (this.#getStyle('padding', 'x') as number | undefined) ?? this.#defaultPaddingX();
        const paddingY = (this.#getStyle('padding', 'y') as number | undefined) ?? this.#defaultPaddingY();

        this.#tree.setDirection(isRow ? 'row' : 'column');

        const nodes: Array<{ tree: BoxTree; width: number; height: number }> = [];

        if (this.#leftIcon) {
            const iconStyle = this.#iconStyle(this.#leftIcon);
            nodes.push({
                tree: this.#leftIcon.tree,
                width: iconStyle.width,
                height: iconStyle.height,
            });
        }

        if (this.#label) {
            const { textStyle } = this.#labelStyle();
            const measured = this.#measureLabel(textStyle);
            nodes.push({
                tree: this.#label.tree,
                width: measured.width,
                height: measured.height,
            });
        }

        if (this.#rightIcon) {
            const iconStyle = this.#iconStyle(this.#rightIcon);
            nodes.push({
                tree: this.#rightIcon.tree,
                width: iconStyle.width,
                height: iconStyle.height,
            });
        }

        const contentWidth = isRow
            ? nodes.reduce((sum, node) => sum + node.width, 0) + Math.max(0, nodes.length - 1) * gap
            : nodes.reduce((max, node) => Math.max(max, node.width), 0);

        const contentHeight = isRow
            ? nodes.reduce((max, node) => Math.max(max, node.height), 0)
            : nodes.reduce((sum, node) => sum + node.height, 0) + Math.max(0, nodes.length - 1) * gap;

        for (const [index, node] of nodes.entries()) {
            const gapOffset = index * gap;
            const x = isRow ? gapOffset : 0;
            let y = isRow ? 0 : gapOffset;
            if (isRow && this.#mode === 'inline') {
                y = Math.max(0, (contentHeight - node.height) / 2);
            }

            node.tree.setPosition(x, y);
            node.tree.setWidthPx(node.width);
            node.tree.setHeightPx(node.height);
        }

        const naturalWidth = contentWidth + (paddingX * 2);
        const naturalHeight = contentHeight + (paddingY * 2);
        this.#tree.setWidthPx(naturalWidth);
        this.#tree.setHeightPx(naturalHeight);

        const resolvedWidth = this.#tree.width;
        const resolvedHeight = this.#tree.height;

        const contentOffsetX = paddingX + Math.max(0, (resolvedWidth - naturalWidth) / 2);
        const contentOffsetY = paddingY + Math.max(0, (resolvedHeight - naturalHeight) / 2);
        const rootUx = this.#tree.ux;
        if (!(rootUx instanceof BoxUxPixi)) {
            throw new Error(`${this.id}: expected BoxUxPixi during layout sync`);
        }
        rootUx.childContainer.position.set(contentOffsetX, contentOffsetY);
    }

    #syncIconNode(iconRef: IconRef): void {
        const style = this.#iconStyle(iconRef);

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

        const { textStyle, alpha } = this.#labelStyle();
        this.#label.textDisplay.text = this.#config.label ?? '';
        this.#label.textDisplay.style = new TextStyle(textStyle);
        this.#label.textDisplay.alpha = alpha;
    }

    protected override resolve(): void {
        this.#syncLayout();
        this.container.zIndex = this.#tree.order;
        this.#tree.render();

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
        this.#syncModeVerbs();
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
        this.#syncModeVerbs();
        this.dirty();
    }

    setPosition(x: number, y: number): void {
        if (this.#tree.value.area.x === x && this.#tree.value.area.y === y) {
            return;
        }
        this.#tree.setPosition(x, y);
        this.dirty();
    }

    setOrder(order: number): void {
        if (this.#tree.order === order) {
            return;
        }
        this.#tree.setOrder(order);
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
        const current = this.#tree.value.constrain;
        const currentMinWidth = current?.x?.min;
        const currentMinHeight = current?.y?.min;

        if (currentMinWidth === nextMinWidth && currentMinHeight === nextMinHeight) {
            return false;
        }

        this.#tree.mutate((draft) => {
            const xConstrain = draft.constrain?.x ? { ...draft.constrain.x } : {};
            const yConstrain = draft.constrain?.y ? { ...draft.constrain.y } : {};

            xConstrain.min = nextMinWidth;
            yConstrain.min = nextMinHeight;

            const hasX = xConstrain.min !== undefined || xConstrain.max !== undefined;
            const hasY = yConstrain.min !== undefined || yConstrain.max !== undefined;

            if (!hasX && !hasY) {
                draft.constrain = undefined;
                return;
            }

            draft.constrain = {
                ...(hasX ? { x: xConstrain } : {}),
                ...(hasY ? { y: yConstrain } : {}),
            };
        });

        this.dirty();
        return true;
    }

    getConfig(): ButtonConfig {
        return this.#config;
    }

    getPreferredSize(): { width: number; height: number } {
        const { width, height } = this.#tree.rect;
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
