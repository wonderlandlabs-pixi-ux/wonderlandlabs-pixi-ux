import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import type {
  Container,
  Graphics,
  TextStyleFontStyle,
  TextStyleFontWeight,
  TextStyleOptions,
  Texture,
} from 'pixi.js';
import { z } from 'zod';
import { cellLayers } from './helpers.js';
import { resolveStyleValue, styleContextForCell, type BoxStyleContext } from './styleHelpers.js';
import { drainKillList } from './toPixi.killlist.helpers.js';
import { BoxRenderModelParser, type BoxRenderNodeModel } from './renderModel.js';
import {
  attachToParent,
  CROP_MASK_LABEL,
  ensureGraphics,
  ensureGraphicsByLabel,
  ensureSprite,
  ensureText,
  fitSpriteToRect,
  insetRoundRect,
  resolveAlignedOffset,
  resolvePixiColor,
  resolvePixiFill,
  validateRendererResult,
} from './toPixi.helpers.js';
import type {
  BoxLayoutCellType,
  BoxPixiNodeContext,
  BoxPixiOptions,
  BoxPixiRenderInput,
  BoxPixiRendererManifest,
  BoxPixiRendererOverride,
  BoxStyleManagerLike,
} from './types.js';

const PixiOverrideSchema = z.object({
  renderer: z.unknown(),
});

type ContentExtent = {
  w: number;
  h: number;
};

type CachedTextLayout = {
  text: string;
  styleKey: string;
  width: number;
  height: number;
};

const textLayoutCache = new WeakMap<Container, CachedTextLayout>();

export function boxTreeToPixi(options: BoxPixiOptions): Container {
  const pixi = options.pixi ?? PixiProvider.shared;
  const parser = new BoxRenderModelParser(options.styleTree);

  drainKillList(options);
  const textMeasures = new Map<string, { w: number; h: number }>();
  const rendered = renderPixiNode({
    cell: options.root,
    parentContainer: options.parentContainer ?? options.app?.stage,
  }, options, textMeasures, parser, pixi);

  if (options.store.recordTextMeasures(textMeasures)) {
    options.observer?.({ action: 'invalidate' });
  }

  return rendered;
}

function renderPixiNode(
  { cell, parentContext, parentContainer, parentCell }: BoxPixiNodeContext,
  options: BoxPixiOptions,
  textMeasures: Map<string, { w: number; h: number }>,
  parser: BoxRenderModelParser,
  pixi: PixiProvider,
): Container {
  if (!cell.location) {
    throw new Error(`boxTreeToPixi requires location data on "${cell.name}"`);
  }

  const model = parser.parseNode({ cell, parentContext, parentCell });
  const context = styleContextForCell(cell, parentContext);
  const hostParentContainer = parentContainer ?? options.app?.stage;
  const existing = hostParentContainer?.getChildByLabel?.(cell.id) as Container | undefined;
  const container = existing ?? new pixi.Container({ label: cell.id });
  container.isRenderGroup = model.renderGroup;

  const renderInput: BoxPixiRenderInput = {
    options,
    context: {
      cell,
      parentContext,
      parentContainer,
      parentCell,
    },
    local: {
      layers: cellLayers(cell),
      path: context.nouns,
      pathString: model.pathString,
      currentContainer: container,
      location: cell.location,
      localLocation: model.localLocation,
    },
  };
  const override = resolvePixiRendererOverride(options.renderers, options.styleTree, context, cell.id);

  if (override && !override.post) {
    const result = validateRendererResult(override.renderer(renderInput), cell.name, model.pathString);
    if (result !== false) {
      const renderedOverride = attachToParent(result ?? container, hostParentContainer, cell.id);
      renderChildren(renderedOverride, cell, options, context, textMeasures, parser, pixi);
      return renderedOverride;
    }
  }

  const rendered = renderDefaultPixiNode(renderInput);
  attachToParent(rendered, hostParentContainer, cell.id);
  renderChildren(rendered, cell, options, context, textMeasures, parser, pixi);
  finalizeDefaultPixiNode({
    ...renderInput,
    local: {
      ...renderInput.local,
      currentContainer: rendered,
    },
  }, model, textMeasures, pixi);

  if (override?.post) {
    const result = validateRendererResult(override.renderer({
      ...renderInput,
      local: {
        ...renderInput.local,
        currentContainer: rendered,
      },
    }), cell.name, model.pathString);
    if (result && result !== rendered) {
      if (result.parent === hostParentContainer) {
        return result;
      }
      return attachToParent(result, hostParentContainer, cell.id);
    }
  }

  return rendered;
}

function renderChildren(
  container: Container,
  cell: BoxLayoutCellType,
  options: BoxPixiOptions,
  context: BoxStyleContext,
  textMeasures: Map<string, { w: number; h: number }>,
  parser: BoxRenderModelParser,
  pixi: PixiProvider,
): void {
  for (const child of cell.children ?? []) {
    renderPixiNode({
      cell: child,
      parentContainer: container,
      parentContext: context,
      parentCell: cell,
    }, options, textMeasures, parser, pixi);
  }
}

function renderDefaultPixiNode(input: BoxPixiRenderInput): Container {
  const { currentContainer, localLocation } = input.local;
  currentContainer!.position.set(localLocation.x, localLocation.y);
  return currentContainer!;
}

function finalizeDefaultPixiNode(
  input: BoxPixiRenderInput,
  model: BoxRenderNodeModel,
  textMeasures: Map<string, { w: number; h: number }>,
  pixi: PixiProvider,
): void {
  const { currentContainer, localLocation } = input.local;
  const contentExtent = renderDefaultContent(input, model, pixi);
  const effectiveWidth = Math.max(localLocation.w, contentExtent.w);
  const effectiveHeight = Math.max(localLocation.h, contentExtent.h);

  if (model.content.kind === 'text') {
    textMeasures.set(input.context.cell.id, { w: contentExtent.w, h: contentExtent.h });
  }

  const fillPaint = resolvePixiFill(model.background.fill, localLocation, pixi);
  const background = ensureGraphics(currentContainer!, pixi);
  background.clear();

  if (fillPaint.gradient || fillPaint.color !== undefined) {
    background.roundRect(0, 0, effectiveWidth, effectiveHeight, model.background.borderRadius).fill(
      fillPaint.gradient
        ? {
          fill: fillPaint.gradient,
          alpha: model.background.alpha,
        }
        : {
          color: fillPaint.color,
          alpha: model.background.alpha,
        },
    );
  }

  const borderColor = resolvePixiColor(model.background.borderColor, pixi);
  if (borderColor !== undefined && model.background.borderWidth > 0) {
    const strokeShape = insetRoundRect(
      { x: 0, y: 0, w: effectiveWidth, h: effectiveHeight },
      model.background.borderRadius,
      model.background.borderWidth / 2,
    );
    background.roundRect(
      strokeShape.rect.x,
      strokeShape.rect.y,
      strokeShape.rect.w,
      strokeShape.rect.h,
      strokeShape.radius,
    );
    background.stroke({
      color: borderColor,
      width: model.background.borderWidth,
      alpha: model.background.borderAlpha,
    });
  }

  if (input.context.cell.crop) {
    const cropMask = ensureGraphicsByLabel(currentContainer!, CROP_MASK_LABEL, 0, pixi);
    cropMask.clear();
    cropMask.roundRect(0, 0, effectiveWidth, effectiveHeight, model.background.borderRadius).fill(0xffffff);
    currentContainer!.mask = cropMask;
  } else {
    const mask = currentContainer!.mask;
    if (!(mask instanceof pixi.Graphics) || mask.label !== CROP_MASK_LABEL) {
      return;
    }
    mask.clear();
    currentContainer!.mask = null;
  }
}

function renderDefaultContent(
  input: BoxPixiRenderInput,
  model: BoxRenderNodeModel,
  pixi: PixiProvider,
): ContentExtent {
  const { currentContainer, localLocation } = input.local;
  const content = model.content;

  if (!currentContainer || content.kind === 'none') {
    return { w: localLocation.w, h: localLocation.h };
  }

  if (content.kind === 'url') {
    const sprite = ensureSprite(currentContainer, pixi);
    sprite.visible = true;
    sprite.alpha = content.alpha;

    if (pixi.Assets.cache.has(content.value)) {
      const cached = pixi.Assets.cache.get(content.value) as Texture | undefined;
      if (cached) {
        sprite.texture = cached;
      }
      fitSpriteToRect(sprite, cached, localLocation.w, localLocation.h, pixi);
      return { w: localLocation.w, h: localLocation.h };
    }

    sprite.texture = pixi.Texture.EMPTY;
    sprite.position.set(0, 0);
    sprite.width = 0;
    sprite.height = 0;
    void pixi.Assets.load(content.value).then((texture: Texture) => {
      if (sprite.destroyed) {
        return;
      }
      if (texture) {
        sprite.texture = texture;
      }
      fitSpriteToRect(sprite, texture, localLocation.w, localLocation.h, pixi);
      input.options.app?.render();
    }).catch((error: unknown) => {
      console.error(`[boxTreeToPixi] Failed to load texture "${content.value}"`, error);
    });
    return { w: localLocation.w, h: localLocation.h };
  }

  const fill = resolvePixiColor(content.style.fill, pixi) ?? 0x111111;
  const fontFamily = Array.isArray(content.style.fontFamily)
    ? content.style.fontFamily.join(', ')
    : content.style.fontFamily;
  const textNode = ensureText(currentContainer, {}, pixi);
  textNode.text = content.value;
  textNode.alpha = content.alpha;

  const config: TextStyleOptions = {
    fontFamily,
    fontSize: content.style.fontSize,
    fill,
    align: content.style.align,
    letterSpacing: content.style.letterSpacing ?? 0,
    lineHeight: content.style.lineHeight ?? undefined,
    wordWrap: content.style.wordWrap,
    wordWrapWidth: content.style.wordWrapWidth,
  };

  if (typeof content.style.fontWeight === 'string') {
    config.fontWeight = content.style.fontWeight as TextStyleFontWeight;
  }
  if (typeof content.style.fontStyle === 'string') {
    config.fontStyle = content.style.fontStyle as TextStyleFontStyle;
  }

  const styleKey = JSON.stringify(config);
  const cachedLayout = textLayoutCache.get(textNode);
  let boundsWidth = cachedLayout?.width ?? 0;
  let boundsHeight = cachedLayout?.height ?? 0;

  if (!cachedLayout || cachedLayout.text !== content.value || cachedLayout.styleKey !== styleKey) {
    textNode.style = new pixi.TextStyle(config);
    const bounds = textNode.getLocalBounds();
    boundsWidth = bounds.width;
    boundsHeight = bounds.height;
    textLayoutCache.set(textNode, {
      text: content.value,
      styleKey,
      width: boundsWidth,
      height: boundsHeight,
    });
  }

  textNode.position.set(
    resolveAlignedOffset(localLocation.w, boundsWidth, content.align.xPosition),
    resolveAlignedOffset(localLocation.h, boundsHeight, content.align.yPosition),
  );

  return {
    w: Math.max(localLocation.w, textNode.position.x + boundsWidth),
    h: Math.max(localLocation.h, textNode.position.y + boundsHeight),
  };
}

function resolvePixiRendererOverride(
  renderers: BoxPixiRendererManifest | undefined,
  styles: BoxStyleManagerLike[] | undefined,
  context: BoxStyleContext,
  id?: string,
): BoxPixiRendererOverride | undefined {
  const manifestOverride = resolveRendererManifestOverride(renderers, context, id);
  if (manifestOverride) {
    return manifestOverride;
  }

  if (!styles) {
    return undefined;
  }

  const rendererValue = resolveStyleValue<unknown>(styles, context, ['renderer']);
  if (isPixiRendererOverride(rendererValue)) {
    return rendererValue;
  }

  const directValue = resolveStyleValue<unknown>(styles, context, []);
  if (isPixiRendererOverride(directValue)) {
    return directValue;
  }

  return undefined;
}

function resolveRendererManifestOverride(
  renderers: BoxPixiRendererManifest | undefined,
  context: BoxStyleContext,
  id?: string,
): BoxPixiRendererOverride | undefined {
  if (!renderers) {
    return undefined;
  }

  if (id) {
    const byId = renderers.byId?.[id];
    if (byId) {
      return byId;
    }
  }

  const path = context.nouns.join('.');
  const exact = renderers.byPath?.[path];
  if (exact) {
    return exact;
  }

  if (!renderers.byPath) {
    return undefined;
  }

  for (let index = 1; index < context.nouns.length; index += 1) {
    const suffix = context.nouns.slice(index).join('.');
    const match = renderers.byPath[suffix];
    if (match) {
      return match;
    }
  }

  return undefined;
}

function isPixiRendererOverride(value: unknown): value is BoxPixiRendererOverride {
  return PixiOverrideSchema.safeParse(value).success;
}
