import {STYLE_VARIANT, type StyleVariant} from './constants.js';
import type {
    RgbColor,
    WindowLabelFontStyle,
    WindowLabelStyle,
    WindowStyle,
    PartialWindowStyle,
} from './types.js';
import styleVariantsJson from './styleVariants.json' with { type: 'json' };

// Style variants loaded from JSON
export const STYLE_VARIANTS = styleVariantsJson as Record<StyleVariant, WindowStyle>;

// Default style reference
export const DEFAULT_STYLE = STYLE_VARIANTS[STYLE_VARIANT.DEFAULT];

/**
 * Deep merge two RGB colors - user color takes precedence
 */
function mergeColor(base: RgbColor, override?: RgbColor): RgbColor {
    if (!override) return base;
    return override;
}

function mergeLabelFontStyle(
    base: WindowLabelFontStyle,
    override?: Partial<WindowLabelFontStyle>
): WindowLabelFontStyle {
    if (!override) {
        return base;
    }
    return {
        size: override.size ?? base.size,
        family: override.family ?? base.family,
        color: mergeColor(base.color, override.color),
        alpha: override.alpha ?? base.alpha,
        visible: override.visible ?? base.visible,
    };
}

function mergeLabelStyle(base: WindowLabelStyle, override?: PartialWindowStyle['label']): WindowLabelStyle {
    if (!override) {
        return base;
    }
    return {
        font: mergeLabelFontStyle(base.font, override.font),
    };
}

/**
 * Blend user styles with a base style (variant or default).
 * User styles take precedence over base styles.
 */
export function blendStyles(
    baseStyle: WindowStyle,
    userStyle?: PartialWindowStyle
): WindowStyle {
    if (!userStyle) return baseStyle;
    
    return {
        backgroundColor: mergeColor(baseStyle.backgroundColor, userStyle.backgroundColor),
        titlebarBackgroundColor: mergeColor(baseStyle.titlebarBackgroundColor, userStyle.titlebarBackgroundColor),
        titlebarTextColor: mergeColor(baseStyle.titlebarTextColor, userStyle.titlebarTextColor),
        label: mergeLabelStyle(baseStyle.label, userStyle.label),
        borderColor: userStyle.borderColor ?? baseStyle.borderColor,
        borderWidth: userStyle.borderWidth ?? baseStyle.borderWidth,
        selectedBorderColor: mergeColor(baseStyle.selectedBorderColor, userStyle.selectedBorderColor),
        selectedBorderWidth: userStyle.selectedBorderWidth ?? baseStyle.selectedBorderWidth,
        hoverBorderColor: userStyle.hoverBorderColor ?? baseStyle.hoverBorderColor,
        hoverBorderWidth: userStyle.hoverBorderWidth ?? baseStyle.hoverBorderWidth,
    };
}

/**
 * Get the resolved style for a window based on variant and user overrides.
 */
export function resolveWindowStyle(
    variant: StyleVariant = STYLE_VARIANT.DEFAULT,
    userStyle?: PartialWindowStyle
): WindowStyle {
    const baseStyle = STYLE_VARIANTS[variant] ?? DEFAULT_STYLE;
    return blendStyles(baseStyle, userStyle);
}
