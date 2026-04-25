import {z} from 'zod';
import {
    CONTROL_BUTTON,
    CONTROL_CHECKBOX,
    CONTROL_RADIO,
    ICON_BOX,
    ICON_CIRCLE,
    ICON_FILLED_BOX,
    ICON_FILLED_CIRCLE,
    ICON_IMAGE,
    ORIENTATION_HORIZONTAL,
    ORIENTATION_VERTICAL,
    PART_ICON,
    PART_LABEL,
    VS_ACTIVE,
    VS_DISABLED,
    VS_DOWN,
    VS_HOVERED,
} from './constants.js';

export const ButtonSimpleOrientationSchema = z.enum([ORIENTATION_HORIZONTAL, ORIENTATION_VERTICAL]);
export const ButtonSimpleControlTypeSchema = z.enum([CONTROL_BUTTON, CONTROL_CHECKBOX, CONTROL_RADIO]);

export const ButtonSimpleStateSchema = z.object({
  id: z.string().optional(),
  label: z.string().default(''),
  buttonValue: z.unknown().optional(),
  controlType: ButtonSimpleControlTypeSchema.default(CONTROL_BUTTON),
  disabled: z.boolean().optional(),
  checked: z.boolean().optional(),
});

export const ButtonBackgroundStyleSchema = z.object({
  backgroundColor: z.union([z.string(), z.number(), z.record(z.string(), z.any())]),
  borderColor: z.union([z.string(), z.number()]),
});

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
  backgroundStyle: z.record(z.string(), ButtonBackgroundStyleSchema),
});

export const ButtonLabelStyleSchema = z.object({
  color: z.union([z.string(), z.number()]),
});

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
  labelStyle: z.record(z.string(), ButtonLabelStyleSchema),
});

export const ButtonSimpleIconGlyphSchema = z.enum([
  ICON_IMAGE,
  ICON_BOX,
  ICON_FILLED_BOX,
  ICON_CIRCLE,
  ICON_FILLED_CIRCLE,
]);

export const ButtonIconStyleSchema = z.object({
  alpha: z.number().min(0).max(1),
  color: z.union([z.string(), z.number()]).optional(),
  fillColor: z.union([z.string(), z.number()]).optional(),
});

export const ButtonSimpleIconBaseSchema = z.object({
  type: z.literal(PART_ICON),
  id: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  iconStyle: z.record(z.string(), ButtonIconStyleSchema),
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
  borderWidth: z.number().nonnegative().optional(),
});

export const ButtonSimpleIconChildSchema = z.union([
  ButtonSimpleImageIconChildSchema,
  ButtonSimpleShapeIconChildSchema,
]);

export const ButtonSimpleChildSchema = z.union([
  ButtonSimpleLabelChildSchema,
  ButtonSimpleIconChildSchema,
]);

export const ButtonVisualStateSchema = z.enum([VS_DOWN, VS_ACTIVE, VS_HOVERED, VS_DISABLED]);

export const LabelPartValueSchema = z.object({
  text: z.string(),
  state: ButtonVisualStateSchema,
});

export const IconPartValueSchema = z.object({
  state: ButtonVisualStateSchema,
  checked: z.boolean().optional(),
});

export const PixiLabelStyleSchema = z.object({
  fontSize: z.number().finite().positive(),
  fontFamily: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]).optional(),
  fontWeight: z.union([z.string().min(1), z.number().finite()]).optional(),
  fontStyle: z.string().min(1).optional(),
  letterSpacing: z.number().finite().optional(),
  lineHeight: z.number().finite().positive().optional(),
  fill: z.number().finite(),
}).transform((value) => Object.fromEntries(
  Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
));
