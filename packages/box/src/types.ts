import { z } from 'zod';
import {
  ALIGN,
  MEASUREMENT_ENUM_CANONICAL,
  MEASUREMENT_ENUM_INPUT,
  UNIT_BASIS,
} from './constants';
import { dictToStringArray } from './enumUtils';

export type AlignLabel = keyof typeof ALIGN;
export type MeasurementModeLabel = keyof typeof UNIT_BASIS;

export const SizeModeSchema = z.enum(dictToStringArray(MEASUREMENT_ENUM_CANONICAL));
export type SizeMode = z.infer<typeof SizeModeSchema>;

export const FractionalMeasurementModeSchema = z.literal(MEASUREMENT_ENUM_INPUT.FRACTION);
export type FractionalMeasurementMode = z.infer<typeof FractionalMeasurementModeSchema>;

export const MeasurementInputModeSchema = z.enum(dictToStringArray(MEASUREMENT_ENUM_INPUT));
export type MeasurementInputMode = z.infer<typeof MeasurementInputModeSchema>;

export const FractionalMeasurementValueSchema = z.number().finite();
export type FractionalMeasurementValue = z.infer<typeof FractionalMeasurementValueSchema>;

export const FractionalMeasurementBaseSchema = z.number().finite();
export type FractionalMeasurementBase = z.infer<typeof FractionalMeasurementBaseSchema>;

const PxMeasurementObjectSchema = z.object({
  mode: z.literal(UNIT_BASIS.PX),
  value: z.number().finite(),
});

const PercentMeasurementObjectSchema = z.object({
  mode: z.literal(UNIT_BASIS.PERCENT),
  value: z.number().finite().refine((value) => value >= 0 && value <= 1, {
    message: '% value must be between 0 and 1',
  }),
});

export const BaseMeasurementObjectSchema = z.union([
  PxMeasurementObjectSchema,
  PercentMeasurementObjectSchema,
]);

export const FractionalMeasurementObjectSchema = z.object({
  mode: FractionalMeasurementModeSchema,
  value: FractionalMeasurementValueSchema,
  base: FractionalMeasurementBaseSchema,
})
  .refine(({ base, value }) => base >= value, {
    message: '/ base must be >= value',
  })
  .refine(({ base }) => base > 0, {
    message: '/ base must be > 0',
  });

const NormalizedFractionalMeasurementSchema = FractionalMeasurementObjectSchema.transform((value) => ({
  mode: UNIT_BASIS.PERCENT,
  value: value.value / value.base,
}));

const MeasurementObjectSchema = z.union([
  BaseMeasurementObjectSchema,
  NormalizedFractionalMeasurementSchema,
]);

export const MeasurementConfigSchema = z.union([
  z.number().finite(),
  MeasurementObjectSchema,
]).transform((value) => {
  if (typeof value === 'number') {
    return { mode: UNIT_BASIS.PX, value };
  }
  return value;
});

export const MeasurementSchema = MeasurementConfigSchema;
export type Measurement = z.infer<typeof MeasurementSchema>;

export const PxValueSchema = z.number().finite();
export type PxValue = z.infer<typeof PxValueSchema>;

export const AxisConstraintSchema = z.object({
  min: PxValueSchema.optional(),
  max: PxValueSchema.optional(),
});
export type AxisConstraintLike = z.infer<typeof AxisConstraintSchema>;

export const MeasurementRatioModeSchema = FractionalMeasurementModeSchema;
export type MeasurementRatioMode = FractionalMeasurementMode;

export const MeasurementRatioValueSchema = FractionalMeasurementValueSchema;
export type MeasurementRatioValue = FractionalMeasurementValue;

export const MeasurementRatioBaseSchema = FractionalMeasurementBaseSchema;
export type MeasurementRatioBase = FractionalMeasurementBase;
