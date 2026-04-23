const ALIGN_START = '<';
const ALIGN_CENTER = '|';
const ALIGN_END = '>';
const ALIGN_FILL = '<>';
const AXIS_X = 'x';
const AXIS_Y = 'y';

const ALIGN_KEYWORD_START = 's';
const ALIGN_KEYWORD_CENTER = 'c';
const ALIGN_KEYWORD_END = 'e';
const ALIGN_KEYWORD_FILL = 'f';

const SIZE_MODE_PCT = 'percent';
const SIZE_MODE_PCT_FREE = 'percentFree';
const SIZE_MODE_FILL = 'fill';
const SIZE_MODE_HUG = 'hug';
const BOX_UX_LAYER_BACKGROUND = 'BACKGROUND';
const BOX_UX_LAYER_CHILDREN = 'CHILDREN';
const BOX_UX_LAYER_CONTENT = 'CONTENT';
const BOX_UX_LAYER_OVERLAY = 'OVERLAY';

export const AXIS = Object.freeze({
  X: AXIS_X,
  Y: AXIS_Y,
} as const);

export const ALIGN_ENUM_KEYWORDS = Object.freeze({
  START: ALIGN_KEYWORD_START,
  CENTER: ALIGN_KEYWORD_CENTER,
  END: ALIGN_KEYWORD_END,
  FILL: ALIGN_KEYWORD_FILL,
} as const);

export const ALIGN_ENUM_ALIASES = Object.freeze({
  START_SYMBOL: ALIGN_START,
  CENTER_SYMBOL: ALIGN_CENTER,
  END_SYMBOL: ALIGN_END,
  FILL_SYMBOL: ALIGN_FILL,
} as const);

export const ALIGN = Object.freeze({
  START: ALIGN_START,
  LEFT: ALIGN_START,
  TOP: ALIGN_START,
  CENTER: ALIGN_CENTER,
  MIDDLE: ALIGN_CENTER,
  END: ALIGN_END,
  RIGHT: ALIGN_END,
  BOTTOM: ALIGN_END,
  FILL: ALIGN_FILL,
  STRETCH: ALIGN_FILL,
  S: ALIGN_KEYWORD_START,
  C: ALIGN_KEYWORD_CENTER,
  E: ALIGN_KEYWORD_END,
  F: ALIGN_KEYWORD_FILL,
} as const);

export const UNIT_BASIS = Object.freeze({
  PX: 'px',
  PIXELS: 'px',
  PCT: '%',
  FRACTION: '/',
  STAR: '*',
} as const);

export const MEASUREMENT_ENUM_CANONICAL = Object.freeze({
  PX: UNIT_BASIS.PX,
  PCT: UNIT_BASIS.PCT,
  STAR: UNIT_BASIS.STAR,
} as const);

export const MEASUREMENT_ENUM_INPUT = Object.freeze({
  ...MEASUREMENT_ENUM_CANONICAL,
  FRACTION: UNIT_BASIS.FRACTION,
} as const);

export const SIZE_MODE_INPUT = Object.freeze({
  PX: UNIT_BASIS.PX,
  PCT: SIZE_MODE_PCT,
  STAR: UNIT_BASIS.STAR,
  PCT_FREE: SIZE_MODE_PCT_FREE,
  FILL: SIZE_MODE_FILL,
  HUG: SIZE_MODE_HUG,
} as const);

export const SIZE_MODE = Object.freeze({
  PX: UNIT_BASIS.PX,
  PCT: SIZE_MODE_PCT,
  STAR: UNIT_BASIS.STAR,
  PCT_FREE: SIZE_MODE_PCT_FREE,
  HUG: SIZE_MODE_HUG,
} as const);

export const BOX_UX_LAYER = Object.freeze({
  BACKGROUND: BOX_UX_LAYER_BACKGROUND,
  CHILDREN: BOX_UX_LAYER_CHILDREN,
  CONTENT: BOX_UX_LAYER_CONTENT,
  OVERLAY: BOX_UX_LAYER_OVERLAY,
} as const);

const BOX_UX_ORDER_MUTABLE = new Map<string, number>([
  [BOX_UX_LAYER.BACKGROUND, 0],
  [BOX_UX_LAYER.CHILDREN, 50],
  [BOX_UX_LAYER.CONTENT, 75],
  [BOX_UX_LAYER.OVERLAY, 100],
]);

export const BOX_UX_ORDER: ReadonlyMap<string, number> = BOX_UX_ORDER_MUTABLE;

export function getUxOrder(name: string): number {
  const order = BOX_UX_ORDER_MUTABLE.get(name);
  if (order === undefined) {
    throw new Error(`Unknown UX layer "${name}"`);
  }
  return order;
}

export function setUxOrder(name: string, order: number): void {
  const nextName = name.trim();
  if (!nextName.length) {
    throw new Error('Layer name must be non-empty');
  }
  if (!Number.isFinite(order)) {
    throw new Error(`Layer "${nextName}" order must be finite`);
  }

  for (const [layerName, zIndex] of BOX_UX_ORDER_MUTABLE.entries()) {
    if (layerName !== nextName && zIndex === order) {
      throw new Error(
        `Cannot set "${nextName}" to z-index ${order}; already used by "${layerName}"`,
      );
    }
  }

  BOX_UX_ORDER_MUTABLE.set(nextName, order);
}

export const BOX_UX_CONTENT_ORDER = {
  get BACKGROUND() {
    return getUxOrder(BOX_UX_LAYER.BACKGROUND);
  },
  get CHILDREN() {
    return getUxOrder(BOX_UX_LAYER.CHILDREN);
  },
  get CONTENT() {
    return getUxOrder(BOX_UX_LAYER.CONTENT);
  },
  get OVERLAY() {
    return getUxOrder(BOX_UX_LAYER.OVERLAY);
  },
} as const;

export const BOX_RENDER_CONTENT_ORDER = BOX_UX_CONTENT_ORDER;
