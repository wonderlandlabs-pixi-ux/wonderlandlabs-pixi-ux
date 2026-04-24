import { z } from 'zod';
import {
  ICON_BOX,
  ICON_CIRCLE,
  ICON_FILLED_BOX,
  ICON_FILLED_CIRCLE,
  ICON_IMAGE,
  ORIENTATION_HORIZONTAL,
  ORIENTATION_VERTICAL,
  PART_ICON,
  PART_LABEL,
} from './constants.js';

export const ButtonSimpleOrientationSchema = z.enum([ORIENTATION_HORIZONTAL, ORIENTATION_VERTICAL]);

export const ButtonSimpleStateSchema = z.object({
  label: z.string().default(''),
  disabled: z.boolean().optional(),
  checked: z.boolean().optional(),
});

export type ButtonSimpleState = z.infer<typeof ButtonSimpleStateSchema> & {
  callback?: () => boolean | void;
};

export const ButtonSimpleLayoutSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  orientation: ButtonSimpleOrientationSchema.default(ORIENTATION_HORIZONTAL),
  gap: z.number().nonnegative().default(0),
  paddingX: z.number().nonnegative().default(0),
  paddingY: z.number().nonnegative().default(0),
  sizeIncrement: z.number().positive().optional(),
  minWidth: z.number().nonnegative().optional(),
  minHeight: z.number().nonnegative().optional(),
  borderRadius: z.number().nonnegative().default(0),
  borderWidth: z.number().nonnegative().default(0),
  backgroundColor: z.union([z.string(), z.number()]),
  borderColor: z.union([z.string(), z.number()]),
  hoverBackgroundColor: z.union([z.string(), z.number()]).optional(),
  hoverBorderColor: z.union([z.string(), z.number()]).optional(),
  downBackgroundColor: z.union([z.string(), z.number()]).optional(),
  downBorderColor: z.union([z.string(), z.number()]).optional(),
  disabledBackgroundColor: z.union([z.string(), z.number()]).optional(),
  disabledBorderColor: z.union([z.string(), z.number()]).optional(),
});

export type ButtonSimpleLayout = z.infer<typeof ButtonSimpleLayoutSchema>;

export const ButtonSimpleLabelChildSchema = z.object({
  type: z.literal(PART_LABEL),
  id: z.string(),
  text: z.string().optional(),
  useButtonLabel: z.boolean().optional(),
  fontSize: z.number().positive().default(14),
  fontFamily: z.union([z.string(), z.array(z.string())]).optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.string().optional(),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().positive().optional(),
  color: z.union([z.string(), z.number()]),
  hoverColor: z.union([z.string(), z.number()]).optional(),
  disabledColor: z.union([z.string(), z.number()]).optional(),
});

export type ButtonSimpleLabelChild = z.infer<typeof ButtonSimpleLabelChildSchema>;

export const ButtonSimpleIconGlyphSchema = z.enum([
  ICON_IMAGE,
  ICON_BOX,
  ICON_FILLED_BOX,
  ICON_CIRCLE,
  ICON_FILLED_CIRCLE,
]);

const ButtonSimpleIconBaseSchema = z.object({
  type: z.literal(PART_ICON),
  id: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  alpha: z.number().min(0).max(1).optional(),
  hoverAlpha: z.number().min(0).max(1).optional(),
  downAlpha: z.number().min(0).max(1).optional(),
  disabledAlpha: z.number().min(0).max(1).optional(),
});

export const ButtonSimpleImageIconChildSchema = ButtonSimpleIconBaseSchema.extend({
  iconType: z.literal(ICON_IMAGE).default(ICON_IMAGE),
  icon: z.string(),
  onIconUrl: z.string().optional(),
  offIconUrl: z.string().optional(),
});

export const ButtonSimpleShapeIconChildSchema = ButtonSimpleIconBaseSchema.extend({
  iconType: ButtonSimpleIconGlyphSchema.exclude([ICON_IMAGE]),
  checkedIconType: ButtonSimpleIconGlyphSchema.exclude([ICON_IMAGE]).optional(),
  color: z.union([z.string(), z.number()]),
  hoverColor: z.union([z.string(), z.number()]).optional(),
  downColor: z.union([z.string(), z.number()]).optional(),
  disabledColor: z.union([z.string(), z.number()]).optional(),
  fillColor: z.union([z.string(), z.number()]).optional(),
  hoverFillColor: z.union([z.string(), z.number()]).optional(),
  downFillColor: z.union([z.string(), z.number()]).optional(),
  disabledFillColor: z.union([z.string(), z.number()]).optional(),
  borderWidth: z.number().nonnegative().optional(),
});

export const ButtonSimpleIconChildSchema = z.union([
  ButtonSimpleImageIconChildSchema,
  ButtonSimpleShapeIconChildSchema,
]);

export type ButtonSimpleIconChild = z.infer<typeof ButtonSimpleIconChildSchema>;
export type ButtonSimpleImageIconChild = z.infer<typeof ButtonSimpleImageIconChildSchema>;
export type ButtonSimpleShapeIconChild = z.infer<typeof ButtonSimpleShapeIconChildSchema>;

export const ButtonSimpleChildSchema = z.union([
  ButtonSimpleLabelChildSchema,
  ButtonSimpleIconChildSchema,
]);

export type ButtonSimpleChild = z.infer<typeof ButtonSimpleChildSchema>;

export type ButtonSimpleOptions = {
  app: unknown;
  parentContainer: unknown;
  pixi?: unknown;
};
