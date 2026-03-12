import { z } from 'zod';
import { ALIGN_ENUM_ALIASES, ALIGN_ENUM_KEYWORDS, AXIS } from './constants.js';
import { dictToStringArray } from './enumUtils.js';
import {
  AxisConstraintSchema,
  MeasurementSchema,
  type AxisConstraintLike,
  type Measurement,
} from './types.js';

export type BoxStyle = Record<string, unknown>;

export const AxisSchema = z.enum(dictToStringArray(AXIS));
export type Axis = z.infer<typeof AxisSchema>;

export const DirectionSchema = z.enum(['row', 'column']);
export type Direction = z.infer<typeof DirectionSchema>;

export const BoxContentTypeSchema = z.enum(['text', 'url', 'image']);
export type BoxContentType = z.infer<typeof BoxContentTypeSchema>;

export const BoxContentSchema = z.object({
  type: BoxContentTypeSchema,
  value: z.string(),
}).passthrough();
export type BoxContent = z.infer<typeof BoxContentSchema>;

export const StyleNameSchema = z.string().min(1);
export type StyleName = z.infer<typeof StyleNameSchema>;

export const VerbSchema = z.string().min(1);
export type Verb = z.infer<typeof VerbSchema>;
export const VerbListSchema = z.array(VerbSchema).default([]);
export type VerbList = z.infer<typeof VerbListSchema>;

export const AlignmentsSchema = z.enum(dictToStringArray(ALIGN_ENUM_KEYWORDS));
export type Alignments = z.infer<typeof AlignmentsSchema>;

export const AlignKeywordSchema = AlignmentsSchema;
export type AlignKeyword = Alignments;

export const AlignAliasSchema = z.enum(dictToStringArray(ALIGN_ENUM_ALIASES));
export type AlignAlias = z.infer<typeof AlignAliasSchema>;

export const AlignInputSchema = z.union([AlignmentsSchema, AlignAliasSchema]);
export type AlignInput = z.infer<typeof AlignInputSchema>;

export const XYPositionSchema = z.object({
  x: z.number().finite().default(0),
  y: z.number().finite().default(0),
});
export type XYPosition = z.infer<typeof XYPositionSchema>;

export const BoxSizeSchema = z.object({
  width: MeasurementSchema.default({ mode: 'px', value: 0 }),
  height: MeasurementSchema.default({ mode: 'px', value: 0 }),
});
export type BoxSize2D = z.infer<typeof BoxSizeSchema>;

const AreaPivotKeywordValues = ['s', 'c', 'e'] as const;
const AreaPivotAliasValues = ['<', '|', '>'] as const;

export const AreaPivotKeywordSchema = z.enum(AreaPivotKeywordValues);
export type AreaPivotKeyword = z.infer<typeof AreaPivotKeywordSchema>;

export const AreaPivotAliasSchema = z.enum(AreaPivotAliasValues);
export type AreaPivotAlias = z.infer<typeof AreaPivotAliasSchema>;

export const AreaPivotInputSchema = z.union([AreaPivotKeywordSchema, AreaPivotAliasSchema]);
export type AreaPivotInput = z.infer<typeof AreaPivotInputSchema>;

export const AreaPivotSchema = z.object({
  px: AreaPivotKeywordSchema.default('s'),
  py: AreaPivotKeywordSchema.default('s'),
});
export type AreaPivot = z.infer<typeof AreaPivotSchema>;

export const BoxAreaSchema = XYPositionSchema.merge(BoxSizeSchema).extend({
  px: AreaPivotKeywordSchema.default('s'),
  py: AreaPivotKeywordSchema.default('s'),
});
export type BoxArea = z.infer<typeof BoxAreaSchema>;

export const BoxRectSchema = BoxAreaSchema;
export type BoxRect = BoxArea;

const MeasurementInputSchema = MeasurementSchema;

const BoxAreaConfigSchema = z.object({
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  width: MeasurementInputSchema.optional(),
  height: MeasurementInputSchema.optional(),
  px: AreaPivotInputSchema.optional(),
  py: AreaPivotInputSchema.optional(),
});

export const ResolvedAreaSchema = XYPositionSchema.merge(z.object({
  width: z.number().finite(),
  height: z.number().finite(),
}));
export type ResolvedArea = z.infer<typeof ResolvedAreaSchema>;

export const ResolvedRectSchema = ResolvedAreaSchema;
export type ResolvedRect = ResolvedArea;

export const AxisAlignmentsSchema = z.object({
  x: AlignmentsSchema.default('s'),
  y: AlignmentsSchema.default('s'),
  direction: DirectionSchema.default('column'),
});
export type AxisAlignments = z.infer<typeof AxisAlignmentsSchema>;

export const BoxAlignSchema = AxisAlignmentsSchema;
export type BoxAlign = AxisAlignments;

const BoxAlignConfigSchema = z.object({
  x: AlignInputSchema.optional(),
  y: AlignInputSchema.optional(),
  direction: DirectionSchema.optional(),
});

const AxisConstrainConfigSchema = z.object({
  min: z.unknown().optional(),
  max: z.unknown().optional(),
});

export type BoxSize = Measurement;
export type AxisConstrain = AxisConstraintLike;

export const AxisConstraintsByAxisSchema = z.object({
  x: AxisConstraintSchema.optional(),
  y: AxisConstraintSchema.optional(),
});
export type AxisConstraintsByAxis = z.infer<typeof AxisConstraintsByAxisSchema>;

export const BoxConstrainSchema = AxisConstraintsByAxisSchema;
export type BoxConstrain = AxisConstraintsByAxis;

export const BoxTreeStateBaseSchema = z.object({
  area: BoxAreaSchema,
  align: AxisAlignmentsSchema,
  content: BoxContentSchema.optional(),
  styleName: StyleNameSchema,
  modeVerb: VerbListSchema,
  globalVerb: VerbListSchema,
  order: z.number().finite().default(0),
  isVisible: z.boolean().default(true),
  absolute: z.boolean().default(false),
  constrain: BoxConstrainSchema.optional(),
  style: z.custom<BoxStyle>().optional(),
  id: z.string().optional(),
});
export type BoxTreeNodeState = z.infer<typeof BoxTreeStateBaseSchema>;

export type BoxTreeState = BoxTreeNodeState & {
  children?: Map<string, BoxTreeState>;
};

export const BoxTreeNodeStateSchema = BoxTreeStateBaseSchema;

export const BoxTreeStateSchema: z.ZodType<BoxTreeState> = z.lazy(() =>
  BoxTreeStateBaseSchema.extend({
    children: z.map(z.string(), BoxTreeStateSchema).optional(),
  }),
);

export const BoxConstraint = z.object({
  x: AxisConstrainConfigSchema.optional(),
  y: AxisConstrainConfigSchema.optional(),
}).optional()

export const BoxTreeNodeConfigSchema = z.object({
  area: BoxAreaConfigSchema.optional(),
  align: BoxAlignConfigSchema.optional(),
  content: BoxContentSchema.optional(),
  styleName: StyleNameSchema.optional(),
  modeVerb: z.array(VerbSchema).optional(),
  globalVerb: z.array(VerbSchema).optional(),
  order: z.number().finite().optional(),
  isVisible: z.boolean().optional(),
  absolute: z.boolean().optional(),
  constrain: BoxConstraint,
  style: z.custom<BoxStyle>().optional(),
  id: z.string().optional(),
});
export type BoxTreeNodeConfig = z.input<typeof BoxTreeNodeConfigSchema>;

export type BoxTreeConfig = BoxTreeNodeConfig & {
  children?: Map<string, BoxTreeConfig> | Record<string, BoxTreeConfig>;
};
