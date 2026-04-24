import type { Container } from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { EVENT_POINTER_OUT, EVENT_POINTER_OVER, EVENT_POINTER_TAP } from './constants.js';

export type ButtonSimpleState = {
    label: string;
    callback?: () => void;
    disabled?: boolean;
};

export type ButtonSimpleLayout = {
    x?: number;
    y?: number;
    minWidth?: number;
    minHeight?: number;
    paddingX: number;
    paddingY: number;
    widthIncrement?: number;
    borderRadius: number;
    borderWidth: number;
    backgroundColor: number | string;
    borderColor: number | string;
    labelColor: number | string;
    hoverBackgroundColor?: number | string;
    hoverBorderColor?: number | string;
    hoverLabelColor?: number | string;
    disabledBackgroundColor?: number | string;
    disabledBorderColor?: number | string;
    disabledLabelColor?: number | string;
    fontSize: number;
    fontFamily?: string | string[];
    fontWeight?: string;
    fontStyle?: string;
    letterSpacing?: number;
    lineHeight?: number;
};

export type ButtonSimpleContext = {
    state: ButtonSimpleState;
    layout: ButtonSimpleLayout;
    pixi: PixiProvider;
    host: Container;
    width: number;
    height: number;
    textWidth: number;
    textHeight: number;
    hovered: boolean;
};

export type ButtonSimplePartRenderer = (context: ButtonSimpleContext) => void;

export type ButtonSimpleOptions = {
    pixi?: PixiProvider;
};

export function createButtonSimpleClass(
    layout: ButtonSimpleLayout,
    partRenderers: ButtonSimplePartRenderer[] = [],
) {
    const staticLayout = Object.freeze({
        ...layout,
        widthIncrement: layout.widthIncrement ?? 10,
        minWidth: layout.minWidth ?? 0,
        minHeight: layout.minHeight ?? 0,
    });

    return class ButtonSimple {
        readonly pixi: PixiProvider;
        readonly host: Container;
        readonly background: Container;
        readonly labelDisplay: Container;
        #state: ButtonSimpleState;
        #hovered = false;

        constructor(parent: Container, state: ButtonSimpleState, options: ButtonSimpleOptions = {}) {
            this.pixi = options.pixi ?? PixiProvider.shared;
            const ContainerClass = this.pixi.Container;
            const GraphicsClass = this.pixi.Graphics;
            const TextClass = this.pixi.Text;
            const TextStyleClass = this.pixi.TextStyle;

            this.host = new ContainerClass({
                x: staticLayout.x ?? 0,
                y: staticLayout.y ?? 0,
            });
            this.background = new GraphicsClass({ label: '$$background' });
            this.labelDisplay = new TextClass({
                text: '',
                style: new TextStyleClass({}),
            });
            this.#state = normalizeSimpleState(state);

            this.host.addChild(this.background);
            this.host.addChild(this.labelDisplay);
            this.host.eventMode = 'static';
            parent.addChild(this.host);

            this.host.on(EVENT_POINTER_OVER, this.#onPointerOver);
            this.host.on(EVENT_POINTER_OUT, this.#onPointerOut);
            this.host.on(EVENT_POINTER_TAP, this.#onPointerTap);

            this.render(partRenderers);
        }

        get state(): ButtonSimpleState {
            return this.#state;
        }

        setState(next: Partial<ButtonSimpleState>): void {
            this.#state = normalizeSimpleState({
                ...this.#state,
                ...next,
            });
            this.render(partRenderers);
        }

        setPosition(x: number, y: number): void {
            this.host.position.set(x, y);
        }

        click(): void {
            if (!this.#state.disabled) {
                this.#state.callback?.();
            }
        }

        render(renderers = partRenderers): void {
            const textNode = this.labelDisplay as unknown as {
                text: string;
                style: unknown;
                alpha: number;
                position: { set(x: number, y: number): void };
                getLocalBounds(): { width: number; height: number };
            };
            const TextStyleClass = this.pixi.TextStyle;

            textNode.text = this.#state.label;
            textNode.style = new TextStyleClass({
                fontSize: staticLayout.fontSize,
                fontFamily: staticLayout.fontFamily,
                fontWeight: staticLayout.fontWeight,
                fontStyle: staticLayout.fontStyle,
                letterSpacing: staticLayout.letterSpacing ?? 0,
                lineHeight: staticLayout.lineHeight,
                fill: resolveButtonSimpleColor(this.#resolveLabelColor(), this.pixi),
            });

            const bounds = textNode.getLocalBounds();
            const width = snapButtonSimpleSize(
                Math.max(
                    staticLayout.minWidth ?? 0,
                    bounds.width + staticLayout.paddingX * 2,
                ),
                staticLayout.widthIncrement ?? 10,
            );
            const height = Math.max(
                staticLayout.minHeight ?? 0,
                bounds.height + staticLayout.paddingY * 2,
            );

            textNode.position.set(
                Math.max(0, (width - bounds.width) / 2),
                Math.max(0, (height - bounds.height) / 2),
            );

            const background = this.background as unknown as {
                clear(): void;
                roundRect(x: number, y: number, w: number, h: number, r: number): { fill(input: unknown): void; stroke(input: unknown): void };
            };
            background.clear();
            background.roundRect(0, 0, width, height, staticLayout.borderRadius).fill({
                color: resolveButtonSimpleColor(this.#resolveBackgroundColor(), this.pixi),
            });
            background.roundRect(0, 0, width, height, staticLayout.borderRadius).stroke({
                color: resolveButtonSimpleColor(this.#resolveBorderColor(), this.pixi),
                width: staticLayout.borderWidth,
            });

            this.host.eventMode = this.#state.disabled ? 'none' : 'static';
            this.host.cursor = this.#state.disabled ? 'default' : 'pointer';
            this.host.hitArea = new this.pixi.Rectangle(0, 0, width, height);

            const context: ButtonSimpleContext = {
                state: this.#state,
                layout: staticLayout,
                pixi: this.pixi,
                host: this.host,
                width,
                height,
                textWidth: bounds.width,
                textHeight: bounds.height,
                hovered: this.#hovered,
            };
            renderers.forEach((renderer) => renderer(context));
        }

        #onPointerOver = (): void => {
            if (!this.#state.disabled && !this.#hovered) {
                this.#hovered = true;
                this.render(partRenderers);
            }
        };

        #onPointerOut = (): void => {
            if (this.#hovered) {
                this.#hovered = false;
                this.render(partRenderers);
            }
        };

        #onPointerTap = (): void => {
            this.click();
        };

        #resolveBackgroundColor(): number | string {
            if (this.#state.disabled) {
                return staticLayout.disabledBackgroundColor ?? staticLayout.backgroundColor;
            }
            if (this.#hovered) {
                return staticLayout.hoverBackgroundColor ?? staticLayout.backgroundColor;
            }
            return staticLayout.backgroundColor;
        }

        #resolveBorderColor(): number | string {
            if (this.#state.disabled) {
                return staticLayout.disabledBorderColor ?? staticLayout.borderColor;
            }
            if (this.#hovered) {
                return staticLayout.hoverBorderColor ?? staticLayout.borderColor;
            }
            return staticLayout.borderColor;
        }

        #resolveLabelColor(): number | string {
            if (this.#state.disabled) {
                return staticLayout.disabledLabelColor ?? staticLayout.labelColor;
            }
            if (this.#hovered) {
                return staticLayout.hoverLabelColor ?? staticLayout.labelColor;
            }
            return staticLayout.labelColor;
        }
    };
}

export function snapButtonSimpleSize(value: number, increment: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }
    if (!Number.isFinite(increment) || increment <= 1) {
        return Math.ceil(value);
    }
    return Math.ceil(value / increment) * increment;
}

function normalizeSimpleState(state: ButtonSimpleState): ButtonSimpleState {
    return {
        label: state.label ?? '',
        callback: state.callback,
        disabled: !!state.disabled,
    };
}

function resolveButtonSimpleColor(value: number | string, pixi: PixiProvider): number {
    return new pixi.Color(value).toNumber();
}
