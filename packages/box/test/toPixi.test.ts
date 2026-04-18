import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BoxStore, prepareBoxCellTree } from '../src/BoxStore.js';
import type {
  BoxCellType,
  BoxPixiRendererOverride,
  BoxStyleManagerLike,
  BoxStyleQueryLike,
} from '../src/types.js';

let ContainerCtor: typeof import('pixi.js').Container;
let GraphicsCtor: typeof import('pixi.js').Graphics;
let boxTreeToPixi: typeof import('../src/toPixi.js').boxTreeToPixi;

beforeAll(async () => {
  vi.stubGlobal('navigator', { userAgent: 'vitest' });
  ({ Container: ContainerCtor, Graphics: GraphicsCtor } = await import('pixi.js'));
  ({ boxTreeToPixi } = await import('../src/toPixi.js'));
});

function createStyleManager(entries: Record<string, unknown>): BoxStyleManagerLike {
  const lookup = (query: BoxStyleQueryLike) => entries[`${query.nouns.join('.')}:${query.states.join(',')}`];

  return {
    match: lookup,
    matchHierarchy: lookup,
  };
}

describe('toPixi', () => {
  it('reuses an existing container when rendering into the same parent container', () => {
    const styles = createStyleManager({
      'panel.background.color:': '#eeeeee',
      'panel.border.color:': '#222222',
      'panel.border.border.color:': '#444444',
    });
    const root = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 10, y: 10, w: 120, h: 80 },
      location: { x: 10, y: 10, w: 120, h: 80 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
      insets: [{
        role: 'border',
        inset: [{ scope: 'all', value: 8 }],
      }],
    });
    const parentContainer = new ContainerCtor({ label: 'host' });

    const first = boxTreeToPixi({ root, parentContainer, styleTree: styles });
    const second = boxTreeToPixi({ root, parentContainer, styleTree: styles });

    expect(first).toBe(second);
    expect(parentContainer.children.filter((child) => child.label === root.id)).toHaveLength(1);
  });

  it('supports style-tree renderer overrides and false fallback', () => {
    const store = new BoxStore({
      value: {
        name: 'store-root',
        absolute: true,
        dim: { x: 0, y: 0, w: 10, h: 10 },
        align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
      },
    });
    const renderer = vi.fn(({ local }) => {
      local.currentContainer!.alpha = 0.5;
      return local.currentContainer;
    });
    const override: BoxPixiRendererOverride = { renderer };
    const styles = createStyleManager({
      'panel.background.color:': '#eeeeee',
      'panel.border.color:': '#222222',
      'panel.renderer:': override,
      'fallback.background.color:': '#ffffff',
      'fallback.border.color:': '#111111',
      'fallback.renderer:': { renderer: () => false } satisfies BoxPixiRendererOverride,
    });

    const panel = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 10, y: 10, w: 120, h: 80 },
      location: { x: 10, y: 10, w: 120, h: 80 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });
    const fallback = prepareBoxCellTree({
      name: 'fallback',
      absolute: true,
      dim: { x: 10, y: 10, w: 120, h: 80 },
      location: { x: 10, y: 10, w: 120, h: 80 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });

    const rendered = boxTreeToPixi({ root: panel, styleTree: styles, store });
    const fallbackRendered = boxTreeToPixi({ root: fallback, styleTree: styles });

    expect(renderer).toHaveBeenCalled();
    expect(renderer.mock.calls[0]?.[0].options.store).toBe(store);
    expect(renderer.mock.calls[0]?.[0].context.cell).toBe(panel);
    expect(renderer.mock.calls[0]?.[0].options.root).toBe(panel);
    expect(rendered.alpha).toBe(0.5);
    expect(fallbackRendered.children.some((child) => child instanceof GraphicsCtor)).toBe(true);
  });

  it('logs and falls back when a custom renderer returns a non-container value', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const styles = createStyleManager({
      'panel.background.color:': '#eeeeee',
      'panel.border.color:': '#222222',
      'panel.renderer:': { renderer: () => ({ nope: true }) as unknown as false } satisfies BoxPixiRendererOverride,
    });
    const panel = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 10, y: 10, w: 120, h: 80 },
      location: { x: 10, y: 10, w: 120, h: 80 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });

    const rendered = boxTreeToPixi({ root: panel, styleTree: styles });

    expect(errorSpy).toHaveBeenCalledWith(
      '[boxTreeToPixi] Custom renderer for "panel" at "panel" returned a non-Container value. Falling back to the default renderer.',
      { nope: true },
    );
    expect(rendered.children.some((child) => child instanceof GraphicsCtor)).toBe(true);

    errorSpy.mockRestore();
  });

  it('uses the app stage as the outer parent when no parent container is provided', () => {
    const stage = new ContainerCtor({ label: 'stage' });
    const app = { stage } as unknown as import('pixi.js').Application;
    const renderer = vi.fn(({ options, local, context }) => {
      expect(options.app).toBe(app);
      expect(options.parentContainer).toBeUndefined();
      expect(context.cell).toBe(panel);
      expect(context.parentContainer).toBe(stage);
      return local.currentContainer;
    });
    const styles = createStyleManager({
      'panel.background.color:': '#eeeeee',
      'panel.border.color:': '#222222',
      'panel.renderer:': { renderer } satisfies BoxPixiRendererOverride,
    });
    const panel = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 10, y: 10, w: 120, h: 80 },
      location: { x: 10, y: 10, w: 120, h: 80 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });

    const rendered = boxTreeToPixi({ root: panel, app, styleTree: styles });

    expect(renderer).toHaveBeenCalled();
    expect(rendered.parent).toBe(stage);
    expect(stage.children.filter((child) => child.label === panel.id)).toHaveLength(1);
  });
});
