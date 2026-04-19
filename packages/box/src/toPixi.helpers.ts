import { Color, Container, Graphics, Sprite, Text, TextStyle, Texture, type ColorSource, type TextStyleOptions } from 'pixi.js';
import { z } from 'zod';
import type { RectStaticType } from './types.js';

export const GRAPHICS_LABEL = '$$background';
export const CONTENT_LABEL = '$$content';
const ContainerLikeSchema = z.object({
  addChild: z.function(),
  addChildAt: z.function(),
  removeChild: z.function(),
  getChildIndex: z.function(),
  destroy: z.function(),
  children: z.array(z.any()),
  label: z.string().optional(),
  parent: z.any().optional(),
  zIndex: z.number().optional(),
  position: z.object({
    set: z.function(),
  }).optional(),
});

const PixiContainerResult = z.custom<Container>((value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return ContainerLikeSchema.safeParse(value).success;
});

export function ensureGraphics(container: Container): Graphics {
  return ensureChild(
    container,
    GRAPHICS_LABEL,
    (child): child is Graphics => child instanceof Graphics,
    () => new Graphics({ label: GRAPHICS_LABEL }),
    0,
  );
}

export function ensureText(
  container: Container,
  style: TextStyleOptions = {},
): Text {
  return ensureChild(
    container,
    CONTENT_LABEL,
    (child): child is Text => child instanceof Text,
    () => new Text({
      text: '',
      style: new TextStyle(style),
    }),
  );
}

export function ensureSprite(container: Container): Sprite {
  return ensureChild(
    container,
    CONTENT_LABEL,
    (child): child is Sprite => child instanceof Sprite,
    () => new Sprite(Texture.EMPTY),
  );
}

export function fitSpriteToRect(
  sprite: Sprite,
  texture: Texture,
  width: number,
  height: number,
): void {
  const sourceWidth = texture.width || width || 1;
  const sourceHeight = texture.height || height || 1;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const fittedWidth = sourceWidth * scale;
  const fittedHeight = sourceHeight * scale;

  sprite.width = fittedWidth;
  sprite.height = fittedHeight;
  sprite.position.set(
    Math.max(0, (width - fittedWidth) / 2),
    Math.max(0, (height - fittedHeight) / 2),
  );
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

export function attachToParent(container: Container, parent: Container | undefined, id: string): Container {
  container.label = id;
  if (parent && container.parent !== parent) {
    parent.addChild(container);
  }
  return container;
}

export function resolveAlignedOffset(
  outerSize: number,
  innerSize: number,
  position: string | undefined,
): number {
  if (position === 'center') {
    return Math.max(0, (outerSize - innerSize) / 2);
  }
  if (position === 'end' || position === 'right' || position === 'bottom') {
    return Math.max(0, outerSize - innerSize);
  }
  return 0;
}

export function validateRendererResult(
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

function ensureChild<T extends Container>(
  container: Container,
  label: string,
  isExpected: (child: Container) => child is T,
  factory: () => T,
  defaultZIndex = 0,
): T {
  const existing = container.children.find((child) => child.label === label);
  if (existing) {
    if (isExpected(existing)) {
      return existing;
    }
    return replaceChild(container, existing, label, factory, defaultZIndex);
  }

  return addChild(container, label, factory, defaultZIndex);
}

function replaceChild<T extends Container>(
  container: Container,
  existing: Container,
  label: string,
  factory: () => T,
  defaultZIndex: number,
): T {
  const zIndex = Number.isFinite(existing.zIndex) ? existing.zIndex : defaultZIndex;
  const childIndex = container.getChildIndex(existing);
  container.removeChild(existing);
  existing.destroy({ children: true });

  return addChild(container, label, factory, zIndex, childIndex);
}

function addChild<T extends Container>(
  container: Container,
  label: string,
  factory: () => T,
  zIndex: number,
  childIndex?: number,
): T {
  const next = factory();
  next.label = label;
  next.zIndex = zIndex;
  if (typeof childIndex === 'number') {
    container.addChildAt(next, Math.min(childIndex, container.children.length));
  } else if (zIndex === 0) {
    container.addChildAt(next, 0);
  } else {
    container.addChild(next);
  }
  return next;
}
