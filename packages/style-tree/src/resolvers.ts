import type { StyleQuery } from './types.js';

export type StyleTreeResolverLike = {
  match?: (query: StyleQuery) => unknown;
  matchHierarchy?: (query: StyleQuery) => unknown;
};

export type StyleRoot = string;

export type StyleColorValue =
  | string
  | number
  | { r: number; g: number; b: number; a?: number };

export type StyleGradientVector = {
  x: number;
  y: number;
};

export type StyleGradientDefinition = {
  direction?: string;
  colors?: StyleColorValue[];
  from?: StyleGradientVector;
  to?: StyleGradientVector;
};

export type StyleFillValue = StyleColorValue | StyleGradientDefinition;

export type ResolvedSpacing = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ResolvedFontStyle = {
  size: number;
  family?: string;
  color?: StyleColorValue;
  alpha: number;
  align?: string;
  weight?: string | number;
  style?: string;
  lineHeight?: number;
  letterSpacing?: number;
  wordWrap?: boolean;
  wordWrapWidth?: number;
  visible: boolean;
};

export type ResolvedBorderStyle = {
  color?: StyleColorValue;
  width: number;
  alpha: number;
  radius: number;
  visible: boolean;
};

export type ResolvedBackgroundStyle = {
  fill?: StyleFillValue;
  alpha: number;
  visible: boolean;
};

export type ResolverOptions = {
  states?: string[];
};

function toLayers(input: StyleTreeResolverLike | StyleTreeResolverLike[]): StyleTreeResolverLike[] {
  return Array.isArray(input) ? input : [input];
}

function toRootPaths(root: StyleRoot): string[][] {
  return root
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split('.').filter(Boolean));
}

function getNestedValue(value: unknown, path: string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function resolveQueryValue(
  layers: StyleTreeResolverLike[],
  nouns: string[],
  states: string[],
): unknown {
  const query = { nouns, states };
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    const result = layer.matchHierarchy
      ? layer.matchHierarchy(query)
      : layer.match?.(query);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
}

function resolveStyleValue(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  path: string[],
  options: ResolverOptions = {},
): unknown {
  const layers = toLayers(input);
  const states = options.states ?? [];
  const rootPaths = toRootPaths(root);

  for (let rootIndex = rootPaths.length - 1; rootIndex >= 0; rootIndex -= 1) {
    const rootPath = rootPaths[rootIndex];
    const direct = resolveQueryValue(layers, [...rootPath, ...path], states);
    if (direct !== undefined) {
      return direct;
    }

    for (let index = path.length - 1; index >= 0; index -= 1) {
      const prefix = path.slice(0, index);
      const remainder = path.slice(index);
      const objectValue = resolveQueryValue(layers, [...rootPath, ...prefix], states);
      const nested = getNestedValue(objectValue, remainder);
      if (nested !== undefined) {
        return nested;
      }
    }
  }

  return undefined;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function resolveRgbLike(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  path: string[],
  options: ResolverOptions = {},
): StyleColorValue | undefined {
  const direct = resolveStyleValue(input, root, path, options);
  if (direct !== undefined) {
    return direct as StyleColorValue;
  }

  const r = resolveStyleValue(input, root, [...path, 'r'], options);
  const g = resolveStyleValue(input, root, [...path, 'g'], options);
  const b = resolveStyleValue(input, root, [...path, 'b'], options);
  const a = resolveStyleValue(input, root, [...path, 'a'], options);

  if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
    return {
      r,
      g,
      b,
      ...(typeof a === 'number' ? { a } : {}),
    };
  }

  return undefined;
}

export function resolveSpacing(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  fallback: number | Partial<ResolvedSpacing> = 0,
  options: ResolverOptions = {},
): ResolvedSpacing {
  const fallbackSpacing: ResolvedSpacing = typeof fallback === 'number'
    ? { top: fallback, right: fallback, bottom: fallback, left: fallback }
    : {
      top: fallback.top ?? 0,
      right: fallback.right ?? 0,
      bottom: fallback.bottom ?? 0,
      left: fallback.left ?? 0,
    };

  const value = resolveStyleValue(input, root, ['padding'], options)
    ?? resolveStyleValue(input, root, ['background', 'padding'], options);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return { top: value, right: value, bottom: value, left: value };
  }

  if (Array.isArray(value)) {
    const numbers = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
    if (numbers.length === 2) {
      return { top: numbers[0], right: numbers[1], bottom: numbers[0], left: numbers[1] };
    }
    if (numbers.length === 4) {
      return { top: numbers[0], right: numbers[1], bottom: numbers[2], left: numbers[3] };
    }
  }

  if (typeof value === 'object' && value !== null) {
    return {
      top: asNumber((value as Record<string, unknown>).top, fallbackSpacing.top),
      right: asNumber((value as Record<string, unknown>).right, fallbackSpacing.right),
      bottom: asNumber((value as Record<string, unknown>).bottom, fallbackSpacing.bottom),
      left: asNumber((value as Record<string, unknown>).left, fallbackSpacing.left),
    };
  }

  const top = resolveStyleValue(input, root, ['padding', 'top'], options)
    ?? resolveStyleValue(input, root, ['background', 'padding', 'top'], options);
  const right = resolveStyleValue(input, root, ['padding', 'right'], options)
    ?? resolveStyleValue(input, root, ['background', 'padding', 'right'], options);
  const bottom = resolveStyleValue(input, root, ['padding', 'bottom'], options)
    ?? resolveStyleValue(input, root, ['background', 'padding', 'bottom'], options);
  const left = resolveStyleValue(input, root, ['padding', 'left'], options)
    ?? resolveStyleValue(input, root, ['background', 'padding', 'left'], options);

  if (top !== undefined || right !== undefined || bottom !== undefined || left !== undefined) {
    return {
      top: asNumber(top, fallbackSpacing.top),
      right: asNumber(right, fallbackSpacing.right),
      bottom: asNumber(bottom, fallbackSpacing.bottom),
      left: asNumber(left, fallbackSpacing.left),
    };
  }

  return fallbackSpacing;
}

export function resolveGap(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  fallback = 0,
  options: ResolverOptions = {},
): number {
  return asNumber(resolveStyleValue(input, root, ['gap'], options), fallback);
}

export function resolveFill(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  fallback?: StyleFillValue,
  options: ResolverOptions = {},
): StyleFillValue | undefined {
  const value = resolveStyleValue(input, root, ['fill'], options);
  if (value !== undefined) {
    return value as StyleFillValue;
  }

  const direction = resolveStyleValue(input, root, ['fill', 'direction'], options);
  const colors = resolveStyleValue(input, root, ['fill', 'colors'], options);
  const from = resolveStyleValue(input, root, ['fill', 'from'], options);
  const to = resolveStyleValue(input, root, ['fill', 'to'], options);
  const color = resolveStyleValue(input, root, ['fill', 'color'], options);
  const r = resolveStyleValue(input, root, ['fill', 'r'], options);
  const g = resolveStyleValue(input, root, ['fill', 'g'], options);
  const b = resolveStyleValue(input, root, ['fill', 'b'], options);
  const a = resolveStyleValue(input, root, ['fill', 'a'], options);

  if (direction !== undefined || colors !== undefined || from !== undefined || to !== undefined) {
    return {
      direction: asString(direction),
      colors: Array.isArray(colors) ? colors as StyleColorValue[] : undefined,
      from: (typeof from === 'object' && from !== null) ? from as StyleGradientVector : undefined,
      to: (typeof to === 'object' && to !== null) ? to as StyleGradientVector : undefined,
    };
  }

  if (color !== undefined) {
    return color as StyleFillValue;
  }

  if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
    return {
      r,
      g,
      b,
      ...(typeof a === 'number' ? { a } : {}),
    };
  }

  return fallback;
}

export function resolveBackgroundStyle(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  fallback: Partial<ResolvedBackgroundStyle> = {},
  options: ResolverOptions = {},
): ResolvedBackgroundStyle {
  return {
    fill: resolveFill(
      input,
      toRootPaths(root).map((path) => [...path, 'background'].join('.')).join(', '),
      fallback.fill,
      options,
    ),
    alpha: asNumber(resolveStyleValue(input, root, ['background', 'alpha'], options), fallback.alpha ?? 1),
    visible: asBoolean(resolveStyleValue(input, root, ['background', 'visible'], options), fallback.visible ?? true),
  };
}

export function resolveBorderStyle(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  fallback: Partial<ResolvedBorderStyle> = {},
  options: ResolverOptions = {},
): ResolvedBorderStyle {
  return {
    color: resolveRgbLike(input, root, ['border', 'color'], options) ?? fallback.color,
    width: asNumber(resolveStyleValue(input, root, ['border', 'width'], options), fallback.width ?? 0),
    alpha: asNumber(resolveStyleValue(input, root, ['border', 'alpha'], options), fallback.alpha ?? 1),
    radius: asNumber(resolveStyleValue(input, root, ['border', 'radius'], options), fallback.radius ?? 0),
    visible: asBoolean(resolveStyleValue(input, root, ['border', 'visible'], options), fallback.visible ?? true),
  };
}

export function resolveFontStyle(
  input: StyleTreeResolverLike | StyleTreeResolverLike[],
  root: StyleRoot,
  fallback: Partial<ResolvedFontStyle> = {},
  options: ResolverOptions = {},
): ResolvedFontStyle {
  return {
    size: asNumber(resolveStyleValue(input, root, ['font', 'size'], options), fallback.size ?? 14),
    family: asString(resolveStyleValue(input, root, ['font', 'family'], options)) ?? fallback.family,
    color: resolveRgbLike(input, root, ['font', 'color'], options) ?? fallback.color,
    alpha: asNumber(resolveStyleValue(input, root, ['font', 'alpha'], options), fallback.alpha ?? 1),
    align: asString(resolveStyleValue(input, root, ['font', 'align'], options)) ?? fallback.align,
    weight: resolveStyleValue(input, root, ['font', 'weight'], options) as string | number | undefined ?? fallback.weight,
    style: asString(resolveStyleValue(input, root, ['font', 'style'], options)) ?? fallback.style,
    lineHeight: resolveStyleValue(input, root, ['font', 'lineHeight'], options) as number | undefined ?? fallback.lineHeight,
    letterSpacing: resolveStyleValue(input, root, ['font', 'letterSpacing'], options) as number | undefined ?? fallback.letterSpacing,
    wordWrap: resolveStyleValue(input, root, ['font', 'wordWrap'], options) as boolean | undefined ?? fallback.wordWrap,
    wordWrapWidth: resolveStyleValue(input, root, ['font', 'wordWrapWidth'], options) as number | undefined ?? fallback.wordWrapWidth,
    visible: asBoolean(resolveStyleValue(input, root, ['font', 'visible'], options), fallback.visible ?? true),
  };
}
