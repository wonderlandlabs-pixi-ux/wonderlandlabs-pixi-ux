import { z } from 'zod';
import type { Application, Container } from 'pixi.js';
import type { BoxStore } from './BoxStore.js';
import {
  DIR_HORIZ,
  DIR_HORIZ_S,
  DIR_VERT,
  DIR_VERT_S,
  INSET_PART_BOTTOM,
  INSET_PART_LEFT,
  INSET_PART_RIGHT,
  INSET_PART_TOP,
  INSET_SCOPE_ALL,
  INSET_SCOPE_BOTTOM,
  INSET_SCOPE_HORIZ,
  INSET_SCOPE_LEFT,
  INSET_SCOPE_RIGHT,
  INSET_SCOPE_TOP,
  INSET_SCOPE_VERT,
  POS_BOTTOM,
  POS_CENTER,
  POS_CENTER_S,
  POS_END,
  POS_END_S,
  POS_FILL,
  POS_KEY_X,
  POS_KEY_Y,
  POS_LEFT,
  POS_RIGHT,
  POS_START,
  POS_START_S,
  POS_TOP,
  SIZE_FRACTION,
  SIZE_PCT,
  SIZE_PX,
  AXIS_Y, AXIS_X
} from './constants.js';
import { DIM_HORIZ_S, DIM_VERT_S } from './constants.js';

const DIR = z.enum([
  DIR_VERT,
  DIR_HORIZ,
  DIR_HORIZ_S,
  DIR_VERT_S,
]);

export const SIZE_UNIT = z.enum([SIZE_PX, SIZE_PCT, SIZE_FRACTION]);

export const BoxSizeObj = z.object({
  value: z.number(),
  unit: SIZE_UNIT.optional(),
  base: z.number().optional()
});
export type BoxSizeObjType = z.infer<typeof BoxSizeObj>;

export const BoxSizeNoFractObj = BoxSizeObj.omit({ unit: true }).extend({
  unit: z.enum([SIZE_PX, SIZE_PCT]).optional(),
});
export type BoxSizeNoFractObjType = z.infer<typeof BoxSizeNoFractObj>;

export const BoxSize = z.union([
  BoxSizeObj,
  z.number(),
]);

export type BoxSizeType = z.infer<typeof BoxSize>;

export const BoxSizeNoFract = z.union([
  BoxSizeNoFractObj,
  z.number(),
]);

export type BoxSizeNoFractType = z.infer<typeof BoxSizeNoFract>;

export const Direction = z.enum([
  DIR_HORIZ,
  DIR_VERT,
  DIR_HORIZ_S,
  DIR_VERT_S,
]);

export type DirectionType = z.infer<typeof Direction>;
export const Position = z.enum([
  POS_START,
  POS_END,
  POS_LEFT,
  POS_RIGHT,
  POS_BOTTOM,
  POS_END_S,
  POS_START_S,
  POS_CENTER,
  POS_CENTER_S,
  POS_TOP,
  POS_FILL,
]);

export const BoxAlign = z.object({
  direction: Direction,
  [POS_KEY_X]: Position.optional(),
  [POS_KEY_Y]: Position.optional(),
});
export type BoxAlignType = z.infer<typeof BoxAlign>;

export const BoxContent = z.object({
  type: z.enum(['url', 'text']),
  value: z.string(),
});
export type BoxContentType = z.infer<typeof BoxContent>;

export const InsetPart = z.enum([
  INSET_PART_TOP,
  INSET_PART_RIGHT,
  INSET_PART_BOTTOM,
  INSET_PART_LEFT,
]);
export type InsetPartType = z.infer<typeof InsetPart>;

export const InsetScope = z.enum([
  INSET_SCOPE_ALL,
  INSET_SCOPE_HORIZ,
  INSET_SCOPE_VERT,
  INSET_SCOPE_TOP,
  INSET_SCOPE_RIGHT,
  INSET_SCOPE_BOTTOM,
  INSET_SCOPE_LEFT,
]);
export type InsetScopeType = z.infer<typeof InsetScope>;

export const BoxInsetDef = z.object({
  scope: InsetScope,
  value: BoxSize,
});
export type BoxInsetDefType = z.infer<typeof BoxInsetDef>;

export const BoxInset = z.array(BoxInsetDef);
export type BoxInsetType = z.infer<typeof BoxInset>;

export const BoxInsetEntry = z.object({
  role: z.string(),
  inset: BoxInset,
});
export type BoxInsetEntryType = z.infer<typeof BoxInsetEntry>;

export const RectTemplate = z.object({
  x: BoxSize,
  y: BoxSize,
  w: BoxSize,
  h: BoxSize,
});

export const RectStatic = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export type RectStaticType = z.infer<typeof RectStatic>;
export type RectType = z.infer<typeof RectTemplate>;

export const RectPartial = RectTemplate.partial({
  x: true,
  y: true,
});

export type RectPartialType = z.infer<typeof RectPartial>;

export const BoxCellData = z.object({
  id: z.string().optional(),
  dim: RectPartial,
  location: RectStatic.optional(),
  absolute: z.boolean(),
  variant: z.string().optional(),
  states: z.array(z.string()).optional(),
  content: BoxContent.optional(),
  name: z.string(),
  align: BoxAlign,
  insets: z.array(BoxInsetEntry).optional(),
  gap: BoxSizeNoFract.optional(),
  renderGroup: z.boolean().optional(),
});

export type BoxCellDataType = z.infer<typeof BoxCellData>;

export type BoxCellNodeType = BoxCellDataType & {
  children?: BoxCellNodeType[];
};

export type BoxPreparedCellDataType = Omit<BoxCellDataType, 'id'> & {
  id: string;
};

export type BoxPreparedCellType = BoxPreparedCellDataType & {
  children?: BoxPreparedCellType[];
};

// Backward-compatible aliases while the package migrates to the data/node naming split.
export const BoxCell = BoxCellData;
export type BoxCellType = BoxCellNodeType;

export type BoxStyleQueryLike = {
  nouns: string[];
  states: string[];
};

export type BoxStyleManagerLike = {
  match: (query: BoxStyleQueryLike) => unknown;
  matchHierarchy?: (query: BoxStyleQueryLike) => unknown;
};

export type BoxLayerType = {
  role: string;
  rect: RectStaticType;
  insets: RectStaticType;
};

export type BoxPixiNodeContext = {
  cell: BoxPreparedCellType;
  parentContainer?: Container;
  parentContext?: {
    nouns: string[];
    states: string[];
    variant?: string;
  };
  parentCell?: BoxPreparedCellType;
};

export type BoxPixiRenderInput = {
  options: BoxPixiOptions;
  context: BoxPixiNodeContext;
  local: {
    layers: BoxLayerType[];
    path: string[];
    pathString: string;
    currentContainer?: Container;
    location: RectStaticType;
    localLocation: RectStaticType;
  };
};

export type BoxPixiNodeRenderer = (
  input: BoxPixiRenderInput,
) => Container | false | void;

export type BoxPixiRendererOverride = {
  renderer: BoxPixiNodeRenderer;
  post?: boolean;
};

export type BoxPixiOptions = {
  root: BoxPreparedCellType;
  app?: Application;
  parentContainer?: Container;
  store?: BoxStore;
  styleTree?: BoxStyleManagerLike;
};

export const Axes = z.enum([AXIS_Y, AXIS_X]);
export type AxesType = z.infer<typeof Axes>;

export const DimensionDirections = z.enum([DIM_HORIZ_S, DIM_VERT_S]);
export type DimensionDirectionType = z.infer<typeof DimensionDirections>;
