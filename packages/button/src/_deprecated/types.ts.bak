import { z } from 'zod';
import type { Sprite, Container } from 'pixi.js';

// ==================== Button Mode ====================

/**
 * Button display modes:
 * - icon: sprite/graphic centered, no label (icon-only button)
 * - iconVertical: sprite/graphic with label below (vertical layout)
 * - text: text only, centered
 * - inline: icon + text side-by-side horizontally
 */
export const ButtonModeSchema = z.enum(['icon', 'iconVertical', 'text', 'inline']);
export type ButtonMode = z.infer<typeof ButtonModeSchema>;

// ==================== Button Config ====================

/**
 * ButtonConfig - configuration for creating a button
 */
export const ButtonConfigSchema = z.object({
    id: z.string(),
    order: z.number().finite().optional(),

    // Content - left icon (optional)
    sprite: z.custom<Sprite>().optional(),
    icon: z.custom<Container>().optional(),  // Alternative to sprite - any Container (Graphics, etc)
    iconUrl: z.string().optional(),

    // Content - right icon (optional, inline mode only)
    rightSprite: z.custom<Sprite>().optional(),
    rightIcon: z.custom<Container>().optional(),
    rightIconUrl: z.string().optional(),

    // Label
    label: z.string().optional(),

    // Mode (auto-detected if not specified)
    mode: ButtonModeSchema.optional(),

    // State
    isDisabled: z.boolean().optional().default(false),

    // Events
    onClick: z.function().optional(),

    // Variant for StyleTree matching (e.g., 'primary', 'secondary', 'danger')
    variant: z.string().optional(),

    // Optional bitmap font name for labels
    bitmapFont: z.string().optional(),
});
export type ButtonConfig = z.input<typeof ButtonConfigSchema>;

// ==================== Style Nouns ====================

/**
 * Default style noun paths for button styling via StyleTree
 *
 * Icon button (icon only, no label):
 *   button.icon.size.x, button.icon.size.y
 *   button.icon.alpha
 *   button.padding.x, button.padding.y
 *   button.stroke.color, button.stroke.alpha, button.stroke.size
 *   button.fill.color, button.fill.alpha
 *   button.border.radius
 *
 * IconVertical button (icon with label below):
 *   button.icon.vertical.icon.size.x, button.icon.vertical.icon.size.y
 *   button.icon.vertical.icon.alpha
 *   button.icon.vertical.padding.x, button.icon.vertical.padding.y
 *   button.icon.vertical.stroke.color, button.icon.vertical.stroke.alpha, button.icon.vertical.stroke.size
 *   button.icon.vertical.fill.color, button.icon.vertical.fill.alpha
 *   button.icon.vertical.border.radius
 *   button.icon.vertical.label.font.size, button.icon.vertical.label.font.color, button.icon.vertical.label.font.alpha
 *   button.icon.vertical.icon.gap (gap between icon and label)
 *
 * Text button:
 *   button.text.padding.x, button.text.padding.y
 *   button.text.fill.color, button.text.fill.alpha
 *   button.text.stroke.color, button.text.stroke.alpha, button.text.stroke.size
 *   button.text.border.radius
 *   button.text.label.font.size, button.text.label.font.color, button.text.label.font.alpha
 *
 * Inline button (icon + text side-by-side):
 *   button.inline.icon.size.x, button.inline.icon.size.y
 *   button.inline.icon.alpha
 *   button.inline.icon.gap (gap between left icon and label)
 *   button.inline.right.icon.size.x, button.inline.right.icon.size.y
 *   button.inline.right.icon.alpha
 *   button.inline.right.icon.gap (gap between label and right icon)
 *   button.inline.padding.x, button.inline.padding.y
 *   button.inline.fill.color, button.inline.fill.alpha
 *   button.inline.stroke.color, button.inline.stroke.alpha, button.inline.stroke.size
 *   button.inline.border.radius
 *   button.inline.label.font.size, button.inline.label.font.color, button.inline.label.font.alpha
 *
 * States: hover, disabled
 * Variants: primary, secondary, danger, etc. (inserted after button)
 *
 * Example with variant and state:
 *   button.primary.fill.color:hover
 */

// ==================== RGB Color (re-export from box for convenience) ====================

export const RgbColorSchema = z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
});
export type RgbColor = z.infer<typeof RgbColorSchema>;

/**
 * Convert RGB color (0-1 range) to hex number
 */
export function rgbToHex(rgb: RgbColor): number {
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return (r << 16) | (g << 8) | b;
}
