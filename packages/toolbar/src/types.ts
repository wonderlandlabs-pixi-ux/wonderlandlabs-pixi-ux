import {
  BTYPE_AVATAR,
  BTYPE_BASE,
  BTYPE_TEXT,
  BTYPE_VERTICAL,
} from '@wonderlandlabs-pixi-ux/button';
import type { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import { z } from 'zod';

export const ToolbarRgbColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
});

export type ToolbarRgbColor = z.infer<typeof ToolbarRgbColorSchema>;

export const FillStyleSchema = z.object({
  color: ToolbarRgbColorSchema,
  alpha: z.number().min(0).max(1).optional(),
});

export const StrokeStyleSchema = z.object({
  color: ToolbarRgbColorSchema,
  width: z.number().min(0),
  alpha: z.number().min(0).max(1).optional(),
});

export const BackgroundStyleSchema = z.object({
  fill: FillStyleSchema.optional(),
  stroke: StrokeStyleSchema.optional(),
  borderRadius: z.number().min(0).optional(),
});

export type FillStyle = z.infer<typeof FillStyleSchema>;
export type StrokeStyle = z.infer<typeof StrokeStyleSchema>;
export type BackgroundStyle = z.infer<typeof BackgroundStyleSchema>;

export type ToolbarPadding = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export const ToolbarPaddingSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
});

export const ToolbarButtonVariantSchema = z.enum([
  BTYPE_BASE,
  BTYPE_TEXT,
  BTYPE_VERTICAL,
  BTYPE_AVATAR,
]);

export const ToolbarButtonModeSchema = z.enum([
  'icon',
  'inline',
  'text',
  'iconVertical',
  'avatar',
]);

export const ToolbarButtonSizeSchema = z.object({
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const ToolbarButtonConfigSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  icon: z.string().optional(),
  variant: z.string().optional(),
  mode: ToolbarButtonModeSchema.optional(),
  modifiers: z.array(z.string()).optional(),
  state: z.string().optional(),
  isDisabled: z.boolean().optional(),
  isHovered: z.boolean().optional(),
  isDebug: z.boolean().optional(),
  size: ToolbarButtonSizeSchema.optional(),
  onClick: z.custom<() => void>((value) => typeof value === 'function').optional(),
});

export type ToolbarButtonVariant = z.infer<typeof ToolbarButtonVariantSchema>;
export type ToolbarButtonMode = z.infer<typeof ToolbarButtonModeSchema>;
export type ToolbarButtonSize = z.infer<typeof ToolbarButtonSizeSchema>;
export type ToolbarButtonConfig = z.input<typeof ToolbarButtonConfigSchema>;

export const ToolbarConfigSchema = z.object({
  id: z.string().optional(),
  order: z.number().finite().optional(),
  buttons: z.array(ToolbarButtonConfigSchema).default([]),
  spacing: z.number().min(0).default(8),
  orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
  fillButtons: z.boolean().optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  fixedSize: z.boolean().optional(),
  padding: z.union([z.number(), ToolbarPaddingSchema]).optional(),
  background: BackgroundStyleSchema.optional(),
  style: z.custom<StyleTree | StyleTree[]>((value) => !!value).optional(),
});

export type ToolbarConfig = z.input<typeof ToolbarConfigSchema>;
