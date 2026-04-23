import { fromJSON, resolveBackgroundStyle, resolveBorderStyle, resolveFontStyle, type StyleFillValue } from '@wonderlandlabs-pixi-ux/style-tree';
import { STYLE_VARIANT, type StyleVariant } from './constants.js';
import type {
    RgbColor,
    WindowStyle,
    PartialWindowStyle,
} from './types.js';
import styleVariantsJson from './styleVariants.json' with { type: 'json' };

type WindowStyleDslShape = {
    background?: {
        fill?: RgbColor;
    };
    titlebar?: {
        background?: {
            fill?: RgbColor;
        };
        label?: {
            font?: {
                color?: RgbColor;
            };
        };
    };
    label?: {
        font?: {
            size?: number;
            family?: string;
            color?: RgbColor;
            alpha?: number;
            visible?: boolean;
        };
    };
    border?: {
        color?: RgbColor;
        width?: number;
    };
    selected?: {
        border?: {
            color?: RgbColor;
            width?: number;
        };
    };
    hover?: {
        border?: {
            color?: RgbColor;
            width?: number;
        };
    };
};

function transformWindowStyleToDsl(style: PartialWindowStyle | WindowStyle): WindowStyleDslShape {
    return {
        background: style.backgroundColor
            ? { fill: style.backgroundColor }
            : undefined,
        titlebar: style.titlebarBackgroundColor || style.titlebarTextColor
            ? {
                background: style.titlebarBackgroundColor
                    ? { fill: style.titlebarBackgroundColor }
                    : undefined,
                label: style.titlebarTextColor
                    ? { font: { color: style.titlebarTextColor } }
                    : undefined,
            }
            : undefined,
        label: style.label
            ? {
                font: {
                    size: style.label.font?.size,
                    family: style.label.font?.family,
                    color: style.label.font?.color,
                    alpha: style.label.font?.alpha,
                    visible: style.label.font?.visible,
                },
            }
            : undefined,
        border: style.borderColor || style.borderWidth !== undefined
            ? {
                color: style.borderColor,
                width: style.borderWidth,
            }
            : undefined,
        selected: style.selectedBorderColor || style.selectedBorderWidth !== undefined
            ? {
                border: {
                    color: style.selectedBorderColor,
                    width: style.selectedBorderWidth,
                },
            }
            : undefined,
        hover: style.hoverBorderColor || style.hoverBorderWidth !== undefined
            ? {
                border: {
                    color: style.hoverBorderColor,
                    width: style.hoverBorderWidth,
                },
            }
            : undefined,
    };
}

const STYLE_VARIANTS = styleVariantsJson as Record<StyleVariant, WindowStyle>;
const DEFAULT_STYLE = STYLE_VARIANTS[STYLE_VARIANT.DEFAULT];
const STYLE_TREE = fromJSON({
    window: Object.fromEntries(
        Object.entries(STYLE_VARIANTS).map(([variant, style]) => [
            variant,
            transformWindowStyleToDsl(style),
        ]),
    ),
});

function colorFromFill(fill: StyleFillValue | undefined, fallback: RgbColor): RgbColor {
    if (!fill) {
        return fallback;
    }
    if (typeof fill === 'object' && fill !== null && 'r' in fill && 'g' in fill && 'b' in fill) {
        return {
            r: Number((fill as RgbColor).r ?? fallback.r),
            g: Number((fill as RgbColor).g ?? fallback.g),
            b: Number((fill as RgbColor).b ?? fallback.b),
        };
    }
    return fallback;
}

function resolveRoots(variant: StyleVariant): string {
    if (variant === STYLE_VARIANT.DEFAULT) {
        return 'window, window.default';
    }
    return `window, window.default, window.${variant}`;
}

function appendRootSuffix(roots: string, suffix: string): string {
    return roots
        .split(',')
        .map((root) => root.trim())
        .filter(Boolean)
        .map((root) => `${root}.${suffix}`)
        .join(', ');
}

/**
 * Get the resolved style for a window based on variant and user overrides.
 * Uses style-tree roots in explicit inheritance order: base window, then variant.
 */
export function resolveWindowStyle(
    variant: StyleVariant = STYLE_VARIANT.DEFAULT,
    userStyle?: PartialWindowStyle,
): WindowStyle {
    const roots = resolveRoots(variant);
    const layers = userStyle
        ? [
            STYLE_TREE,
            fromJSON({
                window: {
                    ...transformWindowStyleToDsl(userStyle),
                    [variant]: transformWindowStyleToDsl(userStyle),
                },
            }),
        ]
        : [STYLE_TREE];

    const background = resolveBackgroundStyle(layers, roots);
    const titlebarBackground = resolveBackgroundStyle(layers, appendRootSuffix(roots, 'titlebar'));
    const titlebarLabel = resolveFontStyle(layers, appendRootSuffix(roots, 'titlebar.label'));
    const label = resolveFontStyle(layers, appendRootSuffix(roots, 'label'), DEFAULT_STYLE.label.font);
    const border = resolveBorderStyle(layers, roots);
    const selectedBorder = resolveBorderStyle(layers, appendRootSuffix(roots, 'selected'));
    const hoverBorder = resolveBorderStyle(layers, appendRootSuffix(roots, 'hover'));

    return {
        backgroundColor: colorFromFill(background.fill, DEFAULT_STYLE.backgroundColor),
        titlebarBackgroundColor: colorFromFill(titlebarBackground.fill, DEFAULT_STYLE.titlebarBackgroundColor),
        titlebarTextColor: (titlebarLabel.color as RgbColor | undefined) ?? DEFAULT_STYLE.titlebarTextColor,
        label: {
            font: {
                size: label.size,
                family: label.family ?? DEFAULT_STYLE.label.font.family,
                color: (label.color as RgbColor | undefined) ?? DEFAULT_STYLE.label.font.color,
                alpha: label.alpha,
                visible: label.visible,
            },
        },
        borderColor: border.color as RgbColor | undefined,
        borderWidth: border.width,
        selectedBorderColor: (selectedBorder.color as RgbColor | undefined) ?? DEFAULT_STYLE.selectedBorderColor,
        selectedBorderWidth: selectedBorder.width || DEFAULT_STYLE.selectedBorderWidth,
        hoverBorderColor: hoverBorder.color as RgbColor | undefined,
        hoverBorderWidth: hoverBorder.width || undefined,
    };
}

export { STYLE_VARIANTS, DEFAULT_STYLE };
