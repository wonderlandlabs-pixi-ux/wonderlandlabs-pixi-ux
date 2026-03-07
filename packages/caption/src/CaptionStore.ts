import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import {
    Application,
    Container,
    Graphics,
    Text,
    TextStyle,
    type ContainerOptions,
    type TextStyleOptions,
} from 'pixi.js';
import {
    DEFAULT_CAPTION_BACKGROUND_STYLE,
    DEFAULT_CAPTION_TEXT_STYLE,
    mergeBackgroundStyle,
    resolveCaptionConfig,
    rgbToNumber,
    type CaptionBackgroundStyle,
    type CaptionConfig,
    type CaptionConfigInput,
    type CaptionPointerConfig,
    type CaptionShape,
    type CaptionState,
    type CaptionThoughtConfig,
    type Point,
} from './types';
import {
    computePointerTriangle,
    getThoughtScallops,
    triangleToPathPoints,
    type TrianglePoints,
} from './geometry';

function mergeTextStyle(
    base: TextStyleOptions,
    next?: Partial<TextStyleOptions>
): TextStyleOptions {
    return next ? { ...base, ...next } : base;
}

function clampRadius(value: number, width: number, height: number): number {
    const max = Math.min(width, height) / 2;
    return Math.max(0, Math.min(value, max));
}

export class CaptionStore extends TickerForest<CaptionState> {
    readonly id: string;

    #bubbleFill: Graphics = new Graphics();
    #bubbleOutline: Graphics = new Graphics();
    #textDisplay: Text;
    #backgroundStyle: CaptionBackgroundStyle;
    #textStyle: TextStyleOptions;

    constructor(
        config: CaptionConfigInput,
        app: Application,
        rootProps?: ContainerOptions
    ) {
        const resolved: CaptionConfig = resolveCaptionConfig(config);
        const initialState: CaptionState = {
            id: resolved.id,
            order: resolved.order,
            text: resolved.text,
            x: resolved.x,
            y: resolved.y,
            width: resolved.width,
            height: resolved.height,
            shape: resolved.shape,
            cornerRadius: resolved.cornerRadius,
            padding: resolved.padding,
            autoSize: resolved.autoSize,
            pointer: resolved.pointer,
            thought: resolved.thought,
        };

        const captionContainer = new Container({
            label: `caption-${resolved.id}`,
            ...rootProps,
        });
        super({ value: initialState }, {app, container: captionContainer});

        this.id = resolved.id;
        this.#backgroundStyle = mergeBackgroundStyle(
            DEFAULT_CAPTION_BACKGROUND_STYLE,
            resolved.backgroundStyle
        );
        this.#textStyle = mergeTextStyle(DEFAULT_CAPTION_TEXT_STYLE, resolved.textStyle);

        this.container.position.set(initialState.x, initialState.y);
        this.container.zIndex = initialState.order;

        this.#textDisplay = new Text({
            text: initialState.text,
            style: new TextStyle(this.#textStyle),
        });

        // Layer order: stroke behind fill, text on top.
        this.container.addChild(this.#bubbleOutline);
        this.container.addChild(this.#bubbleFill);
        this.container.addChild(this.#textDisplay);

        this.kickoff();
    }

    get container(): Container {
        const container = super.container;
        if (!container) {
            throw new Error('CaptionStore: container unavailable');
        }
        return container;
    }

    set container(container: Container | undefined) {
        super.container = container;
    }

    get textDisplay(): Text {
        return this.#textDisplay;
    }

    get backgroundStyle(): CaptionBackgroundStyle {
        return this.#backgroundStyle;
    }

    get textStyle(): TextStyleOptions {
        return this.#textStyle;
    }

    setText(text: string): void {
        if (this.value.text === text) return;
        this.mutate((draft) => {
            draft.text = text;
        });
        this.dirty();
    }

    setPosition(x: number, y: number): void {
        if (this.value.x === x && this.value.y === y) return;
        this.mutate((draft) => {
            draft.x = x;
            draft.y = y;
        });
        this.dirty();
    }

    setOrder(order: number): void {
        if (!Number.isFinite(order)) return;
        if (this.value.order === order) return;
        this.mutate((draft) => {
            draft.order = order;
        });
        this.dirty();
    }

    setSize(width: number, height: number): void {
        if (width <= 0 || height <= 0) return;
        if (this.value.width === width && this.value.height === height) return;
        this.mutate((draft) => {
            draft.width = width;
            draft.height = height;
            draft.autoSize = false;
        });
        this.dirty();
    }

    setShape(shape: CaptionShape): void {
        if (this.value.shape === shape) return;
        this.mutate((draft) => {
            draft.shape = shape;
        });
        this.dirty();
    }

    setCornerRadius(cornerRadius: number): void {
        if (this.value.cornerRadius === cornerRadius) return;
        this.mutate((draft) => {
            draft.cornerRadius = Math.max(0, cornerRadius);
        });
        this.dirty();
    }

    setPadding(padding: number): void {
        if (this.value.padding === padding) return;
        this.mutate((draft) => {
            draft.padding = Math.max(0, padding);
        });
        this.dirty();
    }

    setAutoSize(autoSize: boolean): void {
        if (this.value.autoSize === autoSize) return;
        this.mutate((draft) => {
            draft.autoSize = autoSize;
        });
        this.dirty();
    }

    setPointer(pointer: Partial<CaptionPointerConfig>): void {
        this.mutate((draft) => {
            draft.pointer = {
                ...draft.pointer,
                ...pointer,
                speaker: pointer.speaker !== undefined ? pointer.speaker : draft.pointer.speaker,
            };
        });
        this.dirty();
    }

    setThoughtConfig(thought: Partial<CaptionThoughtConfig>): void {
        this.mutate((draft) => {
            draft.thought = {
                ...draft.thought,
                ...thought,
            };
        });
        this.dirty();
    }

    setSpeakerPoint(point: Point | null): void {
        this.mutate((draft) => {
            draft.pointer.speaker = point;
        });
        this.dirty();
    }

    setBackgroundStyle(style: Partial<CaptionBackgroundStyle>): void {
        this.#backgroundStyle = mergeBackgroundStyle(this.#backgroundStyle, style);
        this.dirty();
    }

    setTextStyle(style: Partial<TextStyleOptions>): void {
        this.#textStyle = mergeTextStyle(this.#textStyle, style);
        this.#textDisplay.style = new TextStyle(this.#textStyle);
        this.dirty();
    }

    #drawBubbleBody(
        target: Graphics,
        width: number,
        height: number,
        shape: CaptionShape,
        cornerRadius: number,
        thought: CaptionThoughtConfig
    ): void {
        if (shape === 'thought') {
            target.ellipse(width / 2, height / 2, width / 2, height / 2);
            const scallops = getThoughtScallops(width, height, thought);
            for (const scallop of scallops) {
                target.circle(scallop.x, scallop.y, scallop.radius);
            }
            return;
        }
        if (shape === 'oval') {
            target.ellipse(width / 2, height / 2, width / 2, height / 2);
            return;
        }
        target.roundRect(0, 0, width, height, clampRadius(cornerRadius, width, height));
    }

    #appendBubbleGeometry(
        target: Graphics,
        width: number,
        height: number,
        shape: CaptionShape,
        cornerRadius: number,
        thought: CaptionThoughtConfig,
        triangle: TrianglePoints | null
    ): void {
        this.#drawBubbleBody(target, width, height, shape, cornerRadius, thought);
        if (triangle) {
            target.poly(triangleToPathPoints(triangle));
        }
    }

    #drawBubble(): void {
        const { width, height, shape, cornerRadius, x, y, pointer, thought } = this.value;
        const fill = this.#backgroundStyle.fill;
        const stroke = this.#backgroundStyle.stroke;

        this.#bubbleFill.clear();
        this.#bubbleOutline.clear();

        let triangle: TrianglePoints | null = null;
        if (pointer.enabled && pointer.speaker) {
            const localSpeaker = {
                x: pointer.speaker.x - x,
                y: pointer.speaker.y - y,
            };
            triangle = computePointerTriangle({
                shape,
                width,
                height,
                speaker: localSpeaker,
                baseWidth: pointer.baseWidth,
                length: pointer.length,
            });
        }

        if (fill?.color) {
            this.#appendBubbleGeometry(
                this.#bubbleFill,
                width,
                height,
                shape,
                cornerRadius,
                thought,
                triangle
            );
            this.#bubbleFill.fill({
                color: rgbToNumber(fill.color),
                alpha: fill.alpha ?? 1,
            });
        }

        if (stroke?.color && (stroke.width ?? 0) > 0) {
            const strokeColor = rgbToNumber(stroke.color);
            const strokeAlpha = stroke.alpha ?? 1;
            const strokeWidth = stroke.width ?? 0;

            this.#appendBubbleGeometry(
                this.#bubbleOutline,
                width,
                height,
                shape,
                cornerRadius,
                thought,
                triangle
            );
            this.#bubbleOutline.stroke({
                color: strokeColor,
                alpha: strokeAlpha,
                width: strokeWidth,
            });
        }
    }

    #measureText(): { width: number; height: number } {
        const bounds = this.#textDisplay.getLocalBounds();
        return {
            width: Math.max(1, Math.ceil(bounds.width)),
            height: Math.max(1, Math.ceil(bounds.height)),
        };
    }

    #maybeAutoSize(): void {
        const { autoSize, padding, width, height } = this.value;
        if (!autoSize) return;

        const measured = this.#measureText();
        const nextWidth = Math.max(1, measured.width + padding * 2);
        const nextHeight = Math.max(1, measured.height + padding * 2);

        if (nextWidth === width && nextHeight === height) return;
        this.mutate((draft) => {
            draft.width = nextWidth;
            draft.height = nextHeight;
        });
    }

    #layoutText(): void {
        const { width, height, padding } = this.value;
        const contentWidth = Math.max(1, width - padding * 2);
        const contentHeight = Math.max(1, height - padding * 2);

        this.#textDisplay.style = new TextStyle({
            ...this.#textStyle,
            wordWrapWidth: contentWidth,
        });

        const bounds = this.#textDisplay.getLocalBounds();
        const x = padding + (contentWidth - bounds.width) / 2 - bounds.x;
        const y = padding + (contentHeight - bounds.height) / 2 - bounds.y;
        this.#textDisplay.position.set(x, y);
    }

    protected resolve(): void {
        this.#textDisplay.text = this.value.text;
        this.#maybeAutoSize();
        this.container.position.set(this.value.x, this.value.y);
        this.container.zIndex = this.value.order;
        this.#layoutText();
        this.#drawBubble();
    }

    cleanup(): void {
        super.cleanup();
        const container = super.container;
        if (container) {
            container.destroy({children: true});
            this.container = undefined;
        }
    }
}
