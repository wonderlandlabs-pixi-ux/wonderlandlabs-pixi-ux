import { Container, Graphics } from 'pixi.js';
import { z } from 'zod';
import { cellLayers } from './helpers.js';
import { resolveStyleValue, styleContextForCell, type BoxStyleContext } from './styleHelpers.js';
import {
  attachToParent,
  cleanupChildren,
  createContainer,
  drawBorderBands,
  ensureGraphics,
  findContainerById,
  resolveNumericStyle,
  resolvePixiColor,
  toLocalRect,
} from './toPixi.helpers.js';
import type {
  BoxPreparedCellType,
  BoxPixiNodeContext,
  BoxPixiOptions,
  BoxPixiRenderInput,
  BoxPixiRendererOverride,
  BoxStyleManagerLike,
} from './types.js';
const PixiContainerResult = z.custom<Container>((value) => value instanceof Container);
const PixiOverrideSchema = z.object({
  renderer: z.unknown(),
}).passthrough();

export function boxTreeToPixi(options: BoxPixiOptions): Container {
  return renderPixiNode({
    cell: options.root,
    parentContainer: options.parentContainer ?? options.app?.stage,
  }, options);
}

function renderPixiNode(
  { cell, parentContext, parentContainer, parentCell }: BoxPixiNodeContext,
  options: BoxPixiOptions,
): Container {
  if (!cell.location) {
    throw new Error(`boxTreeToPixi requires location data on "${cell.name}"`);
  }

  const context = styleContextForCell(cell, parentContext);
  const pathString = context.nouns.join('.');
  const hostParentContainer = parentContainer ?? options.app?.stage;
  const currentContainer = findContainerById(hostParentContainer, cell.id) ?? createContainer(cell.id);
  currentContainer.isRenderGroup = !!cell.renderGroup;

  const layers = cellLayers(cell);
  const localLocation = toLocalRect(cell.location, parentCell?.location);
  const renderInput: BoxPixiRenderInput = {
    options,
    context: {
      cell,
      parentContext,
      parentContainer,
      parentCell,
    },
    local: {
      layers,
      path: context.nouns,
      pathString,
      currentContainer,
      location: cell.location,
      localLocation,
    },
  };
  const override = resolvePixiRendererOverride(options.styleTree, context);

  if (override && !override.post) {
    const result = validateRendererResult(override.renderer(renderInput), cell.name, pathString);
    if (result !== false) {
      const rendered = attachToParent(result ?? currentContainer, hostParentContainer, cell.id);
      renderChildren(rendered, cell, options, context);
      return rendered;
    }
  }

  const rendered = renderDefaultPixiNode(renderInput, context);
  attachToParent(rendered, hostParentContainer, cell.id);
  renderChildren(rendered, cell, options, context);

  if (override?.post) {
    const result = validateRendererResult(override.renderer({
      ...renderInput,
      local: {
        ...renderInput.local,
        currentContainer: rendered,
      },
    }), cell.name, pathString);
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
  cell: BoxPreparedCellType,
  options: BoxPixiOptions,
  context: BoxStyleContext,
): void {
  const desired = new Set<string>();

  for (const child of cell.children ?? []) {
    const childContainer = renderPixiNode({
      cell: child,
      parentContainer: container,
      parentContext: context,
      parentCell: cell,
    }, options);
    desired.add(childContainer.label ?? '');
  }

  cleanupChildren(container, desired);
}

function renderDefaultPixiNode(
  input: BoxPixiRenderInput,
  context: BoxStyleContext,
): Container {
  const {
    currentContainer,
    layers,
    localLocation,
    location,
  } = input.local;

  const fillColor = resolvePixiColor(
    resolveStyleValue(input.options.styleTree, context, ['background', 'color'])
  );
  const fillAlpha = resolveNumericStyle(resolveStyleValue(input.options.styleTree, context, ['background', 'alpha'])) ?? 1;

  currentContainer!.position.set(localLocation.x, localLocation.y);

  if (fillColor !== undefined) {
    const background = ensureGraphics(currentContainer!);
    background.clear();
    background.roundRect(0, 0, localLocation.w, localLocation.h, 6).fill({
      color: fillColor,
      alpha: fillAlpha,
    });
  } else {
    const background = currentContainer!.children.find((child) => child.label === '$$background');
    if (background instanceof Graphics) {
      background.clear();
    }
  }

  let hasBorders = false;
  for (const layer of layers) {
    if (layer.role !== 'border') {
      continue;
    }

    const borderColor = resolvePixiColor(
      resolveStyleValue(input.options.styleTree, context, ['border', 'color'], { extraNouns: [layer.role] })
      ?? resolveStyleValue(input.options.styleTree, context, ['border', 'color'])
    );

    if (borderColor === undefined) {
      continue;
    }

    hasBorders = true;
    const borderAlpha = resolveNumericStyle(
      resolveStyleValue(input.options.styleTree, context, ['border', 'alpha'], { extraNouns: [layer.role] })
      ?? resolveStyleValue(input.options.styleTree, context, ['border', 'alpha'])
    ) ?? 1;

    const background = ensureGraphics(currentContainer!);
    drawBorderBands(background, toLocalRect(layer.rect, location), toLocalRect(layer.insets, location), borderColor, borderAlpha);
  }

  if (!fillColor && !hasBorders) {
    const background = currentContainer!.children.find((child) => child.label === '$$background');
    if (background instanceof Graphics) {
      background.clear();
    }
  }

  return currentContainer!;
}

function resolvePixiRendererOverride(
  styles: BoxStyleManagerLike | undefined,
  context: BoxStyleContext,
): BoxPixiRendererOverride | undefined {
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

function isPixiRendererOverride(value: unknown): value is BoxPixiRendererOverride {
  return PixiOverrideSchema.safeParse(value).success;
}

function validateRendererResult(
  result: Container | false | void | unknown,
  cellName: string,
  pathString: string,
): Container | false | undefined {
  if (result === undefined || result === false) {
    return result;
  }

  const parsed = PixiContainerResult.safeParse(result);
  if (parsed.success) {
    return parsed.data;
  }

  console.error(`[boxTreeToPixi] Custom renderer for "${cellName}" at "${pathString}" returned a non-Container value. Falling back to the default renderer.`, result);
  return false;
}
