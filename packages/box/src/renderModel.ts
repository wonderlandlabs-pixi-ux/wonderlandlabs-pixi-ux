import type {
  BoxLayoutCellType,
  BoxStyleManagerLike,
  RectStaticType,
} from './types.js';
import { resolveStyleValue, styleContextForCell, type BoxStyleContext } from './styleHelpers.js';

export type BoxRenderBackgroundModel = {
  fill?: unknown;
  alpha: number;
  borderRadius: number;
  borderColor?: unknown;
  borderWidth: number;
  borderAlpha: number;
};

export type BoxRenderTextContentModel = {
  kind: 'text';
  value: string;
  alpha: number;
  style: {
    fill?: unknown;
    fontSize: number;
    fontFamily: string | string[];
    fontWeight?: unknown;
    fontStyle?: unknown;
    align: 'left' | 'center' | 'right';
    letterSpacing?: number;
    lineHeight?: number;
    wordWrap: boolean;
    wordWrapWidth: number;
  };
  align: {
    xPosition?: string;
    yPosition?: string;
  };
  rect: RectStaticType;
};

export type BoxRenderUrlContentModel = {
  kind: 'url';
  value: string;
  alpha: number;
  rect: RectStaticType;
};

export type BoxRenderContentModel =
  | { kind: 'none' }
  | BoxRenderTextContentModel
  | BoxRenderUrlContentModel;

export type BoxRenderNodeModel = {
  id: string;
  name: string;
  path: string[];
  pathString: string;
  location: RectStaticType;
  localLocation: RectStaticType;
  crop: boolean;
  renderGroup: boolean;
  background: BoxRenderBackgroundModel;
  content: BoxRenderContentModel;
  children: BoxRenderNodeModel[];
};

export type BoxRenderNodeInput = {
  cell: BoxLayoutCellType;
  parentContext?: BoxStyleContext;
  parentCell?: BoxLayoutCellType;
};

export class BoxRenderModelParser {
  constructor(
    protected readonly styleTree?: BoxStyleManagerLike[],
  ) {}

  parseTree(root: BoxLayoutCellType): BoxRenderNodeModel {
    return this.parseNode({ cell: root });
  }

  parseNode(input: BoxRenderNodeInput): BoxRenderNodeModel {
    const { cell, parentContext, parentCell } = input;
    if (!cell.location) {
      throw new Error(`BoxRenderModelParser requires location data on "${cell.name}"`);
    }

    const context = styleContextForCell(cell, parentContext);
    const localLocation = toLocalRect(cell.location, parentCell?.location);

    return {
      id: cell.id,
      name: cell.name,
      path: context.nouns,
      pathString: context.nouns.join('.'),
      location: cell.location,
      localLocation,
      crop: !!cell.crop,
      renderGroup: !!cell.renderGroup,
      background: this.parseBackground(context, localLocation),
      content: this.parseContent(cell, context, localLocation),
      children: (cell.children ?? []).map((child) => this.parseNode({
        cell: child,
        parentContext: context,
        parentCell: cell,
      })),
    };
  }

  protected parseBackground(
    context: BoxStyleContext,
    localLocation: RectStaticType,
  ): BoxRenderBackgroundModel {
    const backgroundStyle = resolveStyleValue<Record<string, unknown> | undefined>(
      this.styleTree,
      context,
      ['background'],
    );

    return {
      fill: resolveBackgroundFillStyle(this.styleTree, context, backgroundStyle),
      alpha: resolveNumericStyle(
        backgroundStyle?.alpha
        ?? resolveStyleValue(this.styleTree, context, ['background', 'alpha']),
      ) ?? 1,
      borderRadius: Math.max(
        0,
        Math.min(
          resolveNumericStyle(resolveStyleValue(this.styleTree, context, ['border', 'radius'])) ?? 6,
          Math.min(localLocation.w, localLocation.h) / 2,
        ),
      ),
      borderColor: resolveStyleValue(this.styleTree, context, ['border', 'color']),
      borderWidth: resolveNumericStyle(resolveStyleValue(this.styleTree, context, ['border', 'width'])) ?? 0,
      borderAlpha: resolveNumericStyle(resolveStyleValue(this.styleTree, context, ['border', 'alpha'])) ?? 1,
    };
  }

  protected parseContent(
    cell: BoxLayoutCellType,
    context: BoxStyleContext,
    localLocation: RectStaticType,
  ): BoxRenderContentModel {
    const content = cell.content;
    if (!content) {
      return { kind: 'none' };
    }

    if (content.type === 'url') {
      return {
        kind: 'url',
        value: content.value,
        alpha: resolveNumericStyle(resolveStyleValue(this.styleTree, context, ['alpha'])) ?? 1,
        rect: localLocation,
      };
    }

    if (content.type !== 'text') {
      return { kind: 'none' };
    }

    const fill = resolveStyleValue(this.styleTree, context, ['font', 'color'])
      ?? resolveStyleValue(this.styleTree, context, ['color']);
    const alpha = resolveNumericStyle(
      resolveStyleValue(this.styleTree, context, ['font', 'alpha'])
      ?? resolveStyleValue(this.styleTree, context, ['alpha']),
    ) ?? 1;
    const fontSize = resolveNumericStyle(
      resolveStyleValue(this.styleTree, context, ['font', 'size'])
      ?? resolveStyleValue(this.styleTree, context, ['size']),
    ) ?? 14;
    const fontFamilyValue = resolveStyleValue<unknown>(this.styleTree, context, ['font', 'family'])
      ?? resolveStyleValue<unknown>(this.styleTree, context, ['font'])
      ?? 'Arial';
    const fontWeight = resolveStyleValue<unknown>(this.styleTree, context, ['font', 'weight']);
    const fontStyle = resolveStyleValue<unknown>(this.styleTree, context, ['font', 'style']);
    const alignValue = resolveStyleValue<unknown>(this.styleTree, context, ['font', 'align']);
    const letterSpacing = resolveNumericStyle(resolveStyleValue(this.styleTree, context, ['font', 'letterSpacing']));
    const lineHeight = resolveNumericStyle(resolveStyleValue(this.styleTree, context, ['font', 'lineHeight']));
    const wordWrap = resolveStyleValue<unknown>(this.styleTree, context, ['font', 'wordWrap']);
    const wordWrapWidth = resolveNumericStyle(
      resolveStyleValue(this.styleTree, context, ['font', 'wordWrapWidth']),
    ) ?? Math.max(1, localLocation.w);

    return {
      kind: 'text',
      value: content.value,
      alpha,
      style: {
        fill,
        fontSize,
        fontFamily: Array.isArray(fontFamilyValue) || typeof fontFamilyValue === 'string'
          ? fontFamilyValue
          : 'Arial',
        fontWeight,
        fontStyle,
        align: alignValue === 'center' || alignValue === 'right' ? alignValue : 'left',
        letterSpacing: letterSpacing ?? 0,
        lineHeight,
        wordWrap: wordWrap === true,
        wordWrapWidth,
      },
      align: {
        xPosition: cell.align.xPosition,
        yPosition: cell.align.yPosition,
      },
      rect: localLocation,
    };
  }
}

export function boxTreeToJSON(
  root: BoxLayoutCellType,
  styleTree?: BoxStyleManagerLike[],
): BoxRenderNodeModel {
  return new BoxRenderModelParser(styleTree).parseTree(root);
}

function resolveBackgroundFillStyle(
  styles: BoxStyleManagerLike[] | undefined,
  context: BoxStyleContext,
  backgroundStyle?: Record<string, unknown>,
): unknown {
  for (let index = (styles?.length ?? 0) - 1; index >= 0; index -= 1) {
    const layerResult = resolveBackgroundFillFromLayer(styles?.[index], context);
    if (layerResult !== undefined) {
      return layerResult;
    }
  }

  if (backgroundStyle?.fill !== undefined) {
    return backgroundStyle.fill;
  }

  return undefined;
}

function resolveBackgroundFillFromLayer(
  style: BoxStyleManagerLike | undefined,
  context: BoxStyleContext,
): unknown {
  if (!style) {
    return undefined;
  }

  const backgroundStyle = resolveStyleValue<Record<string, unknown> | undefined>(
    [style],
    context,
    ['background'],
  );
  if (backgroundStyle?.fill !== undefined && isGradientFillObject(backgroundStyle.fill)) {
    return backgroundStyle.fill;
  }

  const direction = resolveStyleValue([style], context, ['background', 'fill', 'direction']);
  const colors = resolveStyleValue([style], context, ['background', 'fill', 'colors']);
  const from = resolveStyleValue([style], context, ['background', 'fill', 'from']);
  const to = resolveStyleValue([style], context, ['background', 'fill', 'to']);

  if (
    direction !== undefined
    || colors !== undefined
    || from !== undefined
    || to !== undefined
  ) {
    return {
      ...(direction !== undefined ? { direction } : {}),
      ...(colors !== undefined ? { colors } : {}),
      ...(from !== undefined ? { from } : {}),
      ...(to !== undefined ? { to } : {}),
    };
  }

  if (backgroundStyle?.fill !== undefined) {
    return backgroundStyle.fill;
  }

  const directFill = resolveStyleValue([style], context, ['background', 'fill']);
  if (directFill !== undefined) {
    return directFill;
  }

  return undefined;
}

function isGradientFillObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return false;
  }

  return 'colors' in input || 'direction' in input || 'from' in input || 'to' in input;
}

function resolveNumericStyle(input: unknown): number | undefined {
  return typeof input === 'number' && Number.isFinite(input) ? input : undefined;
}

function toLocalRect(rect: RectStaticType, parentRect?: RectStaticType): RectStaticType {
  if (!parentRect) {
    return { ...rect };
  }

  return {
    x: rect.x - parentRect.x,
    y: rect.y - parentRect.y,
    w: rect.w,
    h: rect.h,
  };
}
