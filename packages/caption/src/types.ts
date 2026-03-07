import { z } from 'zod';
import type { TextStyleOptions } from 'pixi.js';

export const CaptionShapeSchema = z.enum(['rect', 'oval', 'thought']);
export type CaptionShape = z.infer<typeof CaptionShapeSchema>;

export const PointSchema = z.object({
    x: z.number(),
    y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

export const RgbColorSchema = z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
});
export type RgbColor = z.infer<typeof RgbColorSchema>;

export const FillStyleSchema = z.object({
    color: RgbColorSchema.optional(),
    alpha: z.number().min(0).max(1).optional(),
});
export type FillStyle = z.infer<typeof FillStyleSchema>;

export const StrokeStyleSchema = z.object({
    color: RgbColorSchema.optional(),
    alpha: z.number().min(0).max(1).optional(),
    width: z.number().min(0).optional(),
});
export type StrokeStyle = z.infer<typeof StrokeStyleSchema>;

export const CaptionBackgroundStyleSchema = z.object({
    fill: FillStyleSchema.optional(),
    stroke: StrokeStyleSchema.optional(),
});
export type CaptionBackgroundStyle = z.infer<typeof CaptionBackgroundStyleSchema>;

export const CaptionPointerConfigSchema = z.object({
    enabled: z.boolean().default(false),
    baseWidth: z.number().positive().default(16),
    length: z.number().positive().default(24),
    speaker: PointSchema.nullable().default(null),
});
export type CaptionPointerConfig = z.infer<typeof CaptionPointerConfigSchema>;

export const CaptionThoughtConfigSchema = z.object({
    edgeCircleCount: z.number().int().min(3).default(40),
    edgeCircleRadiusRatio: z.number().positive().default(0.08),
    edgeCircleOutsetRatio: z.number().min(0).default(0.45),
});
export type CaptionThoughtConfig = z.infer<typeof CaptionThoughtConfigSchema>;

export const CaptionConfigSchema = z.object({
    id: z.string(),
    order: z.number().finite().default(0),
    text: z.string().default(''),
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().min(1).default(180),
    height: z.number().min(1).default(84),
    shape: CaptionShapeSchema.default('rect'),
    cornerRadius: z.number().min(0).default(12),
    padding: z.number().min(0).default(12),
    autoSize: z.boolean().default(true),
    pointer: CaptionPointerConfigSchema.optional(),
    thought: CaptionThoughtConfigSchema.optional(),
    backgroundStyle: CaptionBackgroundStyleSchema.optional(),
});
export type CaptionConfigInput = z.input<typeof CaptionConfigSchema> & {
    textStyle?: TextStyleOptions;
};

export interface CaptionConfig extends Omit<z.infer<typeof CaptionConfigSchema>, 'pointer' | 'thought'> {
    pointer: CaptionPointerConfig;
    thought: CaptionThoughtConfig;
    textStyle?: TextStyleOptions;
}

export interface CaptionState {
    id: string;
    order: number;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: CaptionShape;
    cornerRadius: number;
    padding: number;
    autoSize: boolean;
    pointer: CaptionPointerConfig;
    thought: CaptionThoughtConfig;
}

export const DEFAULT_CAPTION_TEXT_STYLE: TextStyleOptions = {
    fontSize: 18,
    fill: 0xffffff,
    align: 'center',
    wordWrap: true,
};

export const DEFAULT_CAPTION_BACKGROUND_STYLE: CaptionBackgroundStyle = {
    fill: {
        color: { r: 0.1, g: 0.1, b: 0.1 },
        alpha: 0.92,
    },
    stroke: {
        color: { r: 1, g: 1, b: 1 },
        alpha: 0.9,
        width: 2,
    },
};

export function rgbToNumber(rgb: RgbColor): number {
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return (r << 16) | (g << 8) | b;
}

export function mergeBackgroundStyle(
    base: CaptionBackgroundStyle,
    next?: Partial<CaptionBackgroundStyle>
): CaptionBackgroundStyle {
    if (!next) {
        return base;
    }

    return {
        fill: next.fill
            ? {
                ...base.fill,
                ...next.fill,
                color: next.fill.color ?? base.fill?.color,
            }
            : base.fill,
        stroke: next.stroke
            ? {
                ...base.stroke,
                ...next.stroke,
                color: next.stroke.color ?? base.stroke?.color,
            }
            : base.stroke,
    };
}

export function resolveCaptionConfig(config: CaptionConfigInput): CaptionConfig {
    const parsed = CaptionConfigSchema.parse(config);
    return {
        ...parsed,
        pointer: CaptionPointerConfigSchema.parse(config.pointer ?? {}),
        thought: CaptionThoughtConfigSchema.parse(config.thought ?? {}),
        textStyle: config.textStyle,
    };
}
