import { Color, Container, Graphics, type ColorSource } from 'pixi.js';
import type { RectStaticType } from './types.js';

export const GRAPHICS_LABEL = '$$background';

export function ensureGraphics(container: Container): Graphics {
  const existing = container.children.find((child) => child.label === GRAPHICS_LABEL);
  if (existing instanceof Graphics) {
    return existing;
  }

  const graphics = new Graphics({ label: GRAPHICS_LABEL });
  container.addChildAt(graphics, 0);
  return graphics;
}

export function drawBorderBands(
  graphics: Graphics,
  outer: RectStaticType,
  inner: RectStaticType,
  color: number,
  alpha: number,
): void {
  const top = Math.max(inner.y - outer.y, 0);
  const left = Math.max(inner.x - outer.x, 0);
  const right = Math.max((outer.x + outer.w) - (inner.x + inner.w), 0);
  const bottom = Math.max((outer.y + outer.h) - (inner.y + inner.h), 0);

  if (top > 0) {
    graphics.rect(outer.x, outer.y, outer.w, top).fill({ color, alpha });
  }
  if (bottom > 0) {
    graphics.rect(outer.x, inner.y + inner.h, outer.w, bottom).fill({ color, alpha });
  }
  if (left > 0) {
    graphics.rect(outer.x, inner.y, left, inner.h).fill({ color, alpha });
  }
  if (right > 0) {
    graphics.rect(inner.x + inner.w, inner.y, right, inner.h).fill({ color, alpha });
  }
}

export function resolvePixiColor(input: unknown): number | undefined {
  if (input === undefined || input === null || input === false) {
    return undefined;
  }
  try {
    return new Color(input as ColorSource).toNumber();
  } catch {
    return undefined;
  }
}

export function resolveNumericStyle(input: unknown): number | undefined {
  return typeof input === 'number' && Number.isFinite(input) ? input : undefined;
}

export function toLocalRect(rect: RectStaticType, parentRect?: RectStaticType): RectStaticType {
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

export function findContainerById(parent: Container | undefined, id: string): Container | undefined {
  return (parent?.getChildByLabel(id) as Container | null) ?? undefined;
}

export function createContainer(id: string): Container {
  const container = new Container();
  container.label = id;
  return container;
}

export function attachToParent(container: Container, parent: Container | undefined, id: string): Container {
  container.label = id;

  if (!parent) {
    return container;
  }

  if (container.parent !== parent) {
    parent.addChild(container);
  }

  return container;
}

export function cleanupChildren(
  parent: Container,
  desired: Set<string>,
): void {
  for (const child of [...parent.children]) {
    if (child.label === GRAPHICS_LABEL) {
      continue;
    }
    if (desired.has(child.label)) {
      continue;
    }
    parent.removeChild(child);
    child.destroy({ children: true });
  }
}
