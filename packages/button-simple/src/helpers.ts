import type {Container, FillGradient, Graphics} from "pixi.js";
import {PixiProvider} from "@wonderlandlabs-pixi-ux/utils";
import {VISUAL_STATES, VS_ACTIVE, VS_DISABLED, VS_DOWN, VS_HOVERED} from "./constants.js";
import type {ButtonVisualState} from "./parts.js";
import {
    ButtonSimpleChild,
    ButtonSimpleLayout,
    ButtonSimpleState,
    ButtonVisualStateRecord
} from "./types.js";
import {ButtonSimpleStateSchema} from "./schema.js";
import {StyleTree} from "@wonderlandlabs-pixi-ux/style-tree";
import {createButtonSimpleComparisonStyleTree} from "./ButtonSimpleStore.js";

export type MakeButtonStyleOptions = {
    baseColor?: string | number | (string | number)[];
    textColor?: string | number;
    fontSize?: number;
    padding?: { x: number; y: number } | number;
    controlColor?: string | number;
    controlSize?: number;
}

export function makeButtonStyle(options: MakeButtonStyleOptions): StyleTree {
    const {baseColor, textColor, fontSize, padding, controlColor, controlSize} = options;
    const tree = createButtonSimpleComparisonStyleTree();

    if (baseColor !== undefined) {
        const colors = Array.isArray(baseColor) ? baseColor : [baseColor];
        const isGradient = colors.length > 1;

        const baseFill = isGradient ? {colors} : colors[0];

        tree.set('button.simple.layout.background.color', [], baseFill);
    }

    if (textColor !== undefined) {
        tree.set('button.simple.label.color', [], textColor);
    }

    if (fontSize !== undefined) {
        const numFontSize = Number(fontSize);
        if (Number.isFinite(numFontSize)) {
            tree.set('button.simple.label.font.size', [], numFontSize);
        } else {
            console.warn('makeButtonStyle: invalid fontSize', fontSize);
        }
    }

    if (padding !== undefined) {
        if (typeof padding === 'number') {
            tree.set('button.simple.layout.padding.x', [], padding);
            tree.set('button.simple.layout.padding.y', [], padding);
        } else {
            if (padding.x !== undefined) tree.set('button.simple.layout.padding.x', [], Number(padding.x));
            if (padding.y !== undefined) tree.set('button.simple.layout.padding.y', [], Number(padding.y));
        }
    }

    if (controlColor !== undefined) {
        tree.set('button.simple.icon.color', [], controlColor);
        tree.set('button.simple.icon.fill.color', [], controlColor);
    }

    if (controlSize !== undefined) {
        const numSize = Number(controlSize);
        if (Number.isFinite(numSize)) {
            tree.set('button.simple.icon.width', [], numSize);
            tree.set('button.simple.icon.height', [], numSize);
        }
    }

    return tree;
}

export function initBackgrounds(root: Container, provider: PixiProvider) {
    const GraphicsClass = provider.Graphics;
    const backgrounds: Partial<ButtonVisualStateRecord> = {};
    for (const key of VISUAL_STATES) {
        const state: ButtonVisualState = key as ButtonVisualState;
        const graphics: Graphics = new GraphicsClass({label: `$$background-${key}`}) as Graphics;
        // @ts-ignore
        backgrounds[state] = graphics;
        root.addChild(graphics);
    }
    return backgrounds as ButtonVisualStateRecord;
}

export function drawButtonBackground(
    background: Graphics,
    width: number,
    height: number,
    layout: ButtonSimpleLayout,
    state: ButtonVisualState,
    pixi: PixiProvider,
): void {
    const style = layout.backgroundStyle[state] ?? layout.backgroundStyle[VS_ACTIVE];
    const fill = style.backgroundColor;
    const border = style.borderColor;

    background.clear();

    const shape = background.roundRect(0, 0, width, height, layout.borderRadius);
    const fillPaint = resolveFill(fill, width, height, pixi);

    if (fillPaint.gradient) {
        shape.fill({
            fill: fillPaint.gradient,
        });
    } else if (fillPaint.color !== undefined) {
        shape.fill({
            color: fillPaint.color,
        });
    }

    if (layout.borderWidth > 0) {
        background.roundRect(0, 0, width, height, layout.borderRadius).stroke({
            color: new pixi.Color(border).toNumber(),
            width: layout.borderWidth,
        });
    }
}

function resolveFill(
    input: unknown,
    width: number,
    height: number,
    pixi: PixiProvider
): { color?: number; gradient?: FillGradient } {
    if (typeof input === 'string' || typeof input === 'number') {
        return {color: new pixi.Color(input as any).toNumber()};
    }

    if (input && typeof input === 'object') {
        const FillGradientClass = pixi.FillGradient;
        const data = input as any;

        if (Array.isArray(data.colors)) {
            const direction = data.direction ?? 'horizontal';
            const colors = data.colors as any[];
            const lastIndex = Math.max(colors.length - 1, 1);
            const colorStops = colors.map((c, i) => {
                if (typeof c === 'object' && c !== null && 'offset' in c) {
                    return {offset: c.offset, color: new pixi.Color(c.color).toNumber()};
                }
                return {offset: i / lastIndex, color: new pixi.Color(c).toNumber()};
            });

            const gradient = new FillGradientClass({
                type: 'linear',
                textureSpace: 'local',
                start: {x: 0, y: 0},
                end: direction === 'vertical' ? {x: 0, y: 1} : {x: 1, y: 0},
                colorStops,
            });
            return {gradient};
        }

        try {
            return {color: new pixi.Color(input as any).toNumber()};
        } catch (e) {
            // ignore
        }
    }

    return {};
}