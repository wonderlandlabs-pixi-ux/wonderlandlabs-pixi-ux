import type { BoxTreeStyleMap, BoxTreeUxStyleManagerLike } from './types.ux.js';

type RgbLike = {
  r: number;
  g: number;
  b: number;
};

function isRgbLike(value: unknown): value is RgbLike {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<RgbLike>;
  return typeof candidate.r === 'number'
    && typeof candidate.g === 'number'
    && typeof candidate.b === 'number';
}

function rgbToHex(rgb: RgbLike): number {
  const r = Math.round(Math.max(0, Math.min(1, rgb.r)) * 255);
  const g = Math.round(Math.max(0, Math.min(1, rgb.g)) * 255);
  const b = Math.round(Math.max(0, Math.min(1, rgb.b)) * 255);
  return (r << 16) | (g << 8) | b;
}

export function asColorNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (isRgbLike(value)) {
    return rgbToHex(value);
  }
  return undefined;
}

export function asNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, value);
}

export function styleMapEquals(a: BoxTreeStyleMap, b: BoxTreeStyleMap): boolean {
  return a.fill.color === b.fill.color
    && a.fill.alpha === b.fill.alpha
    && a.stroke.color === b.stroke.color
    && a.stroke.alpha === b.stroke.alpha
    && a.stroke.width === b.stroke.width;
}

type ResolveStylePropContext = {
  styles: BoxTreeUxStyleManagerLike;
  inlineStyle: unknown;
  styleNouns: readonly string[];
  styleName: string;
  states: readonly string[];
};

export function resolveStyleProp(
  prop: string,
  {
  styles,
  inlineStyle,
  styleNouns,
  styleName,
  states,
}: ResolveStylePropContext,
  defaultValue?: unknown,
): unknown {
  if (inlineStyle && typeof inlineStyle === 'object' && prop in inlineStyle) {
    return (inlineStyle as Record<string, unknown>)[prop];
  }

  const resolvedStates = [...states];
  const hierarchicalNouns = [...styleNouns];

  const hierarchicalProperty = styles.match({ nouns: [...hierarchicalNouns, prop], states: resolvedStates });
  if (hierarchicalProperty !== undefined) {
    return hierarchicalProperty;
  }

  const hierarchicalObject = styles.match({ nouns: hierarchicalNouns, states: resolvedStates });
  if (hierarchicalObject && typeof hierarchicalObject === 'object' && prop in hierarchicalObject) {
    return (hierarchicalObject as Record<string, unknown>)[prop];
  }

  const atomicProperty = styles.match({ nouns: [styleName, prop], states: resolvedStates });
  if (atomicProperty !== undefined) {
    return atomicProperty;
  }

  const atomicObject = styles.match({ nouns: [styleName], states: resolvedStates });
  if (atomicObject && typeof atomicObject === 'object' && prop in atomicObject) {
    return (atomicObject as Record<string, unknown>)[prop];
  }

  return defaultValue;
}
