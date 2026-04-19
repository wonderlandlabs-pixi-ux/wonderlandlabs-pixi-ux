import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BoxStore, prepareBoxCellTree } from '../src/BoxStore.js';
import type {
  BoxCellType,
  BoxPixiRendererManifest,
  BoxPixiRendererOverride,
  BoxStyleManagerLike,
  BoxStyleQueryLike,
} from '../src/types.js';

let ContainerCtor: typeof import('pixi.js').Container;
let GraphicsCtor: typeof import('pixi.js').Graphics;
let SpriteCtor: typeof import('pixi.js').Sprite;
let TextCtor: typeof import('pixi.js').Text;
let boxTreeToPixi: typeof import('../src/toPixi.js').boxTreeToPixi;

beforeAll(async () => {
  vi.stubGlobal('navigator', { userAgent: 'vitest' });
  vi.stubGlobal('CanvasRenderingContext2D', class {});
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    measureText: vi.fn(() => ({ width: 100 })),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
  })) as any;
  ({ Container: ContainerCtor, Graphics: GraphicsCtor, Sprite: SpriteCtor, Text: TextCtor } = await import('pixi.js'));
  ({ boxTreeToPixi } = await import('../src/toPixi.js'));
});

function createStyleManager(entries: Record<string, unknown>): BoxStyleManagerLike {
  const lookup = (query: BoxStyleQueryLike) => entries[`${query.nouns.join('.')}:${query.states.join(',')}`];

  return {
    match: lookup,
    matchHierarchy: lookup,
  };
}

function createStore(root: BoxCellType) {
  const store = new BoxStore({ value: root });
  store.update();
  return store;
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
    const store = createStore(root);

    const first = boxTreeToPixi({ root, parentContainer, styleTree: styles, store });
    const second = boxTreeToPixi({ root, parentContainer, styleTree: styles, store });

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

    const fallbackStore = createStore(fallback);
    const rendered = boxTreeToPixi({ root: panel, styleTree: styles, store });
    const fallbackRendered = boxTreeToPixi({ root: fallback, styleTree: styles, store: fallbackStore });

    expect(renderer).toHaveBeenCalled();
    expect(renderer.mock.calls[0]?.[0].options.store).toBe(store);
    expect(renderer.mock.calls[0]?.[0].context.cell).toBe(panel);
    expect(renderer.mock.calls[0]?.[0].options.root).toBe(panel);
    expect(rendered.alpha).toBe(0.5);
    expect(fallbackRendered.children.some((child) => child instanceof GraphicsCtor)).toBe(true);
  });

  it('supports renderer manifests separate from the style tree', () => {
    const renderer = vi.fn(({ local }) => {
      local.currentContainer!.alpha = 0.25;
      return local.currentContainer;
    });
    const renderers: BoxPixiRendererManifest = {
      byId: {
        'panel-id': { renderer },
      },
    };
    const styles = createStyleManager({
      'panel.background.color:': '#eeeeee',
      'panel.border.color:': '#222222',
    });
    const panel = prepareBoxCellTree({
      id: 'panel-id',
      name: 'panel',
      absolute: true,
      dim: { x: 10, y: 10, w: 120, h: 80 },
      location: { x: 10, y: 10, w: 120, h: 80 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });
    const store = createStore(panel);

    const rendered = boxTreeToPixi({ root: panel, styleTree: styles, renderers, store });

    expect(renderer).toHaveBeenCalled();
    expect(rendered.alpha).toBe(0.25);
  });

  it('actively removes orphaned child containers through the store bridge kill set', () => {
    const styles = createStyleManager({
      'panel.background.color:': '#eeeeee',
      'label.font.color:': '#224466',
    });
    const store = new BoxStore({
      value: {
        id: 'panel-id',
        name: 'panel',
        absolute: true,
        dim: { x: 0, y: 0, w: 160, h: 60 },
        align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        children: [{
          id: 'label-id',
          name: 'label',
          absolute: false,
          dim: { w: 80, h: 24 },
          align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
          content: { type: 'text', value: 'Hello' },
        }],
      },
    });
    const parentContainer = new ContainerCtor({ label: 'host' });

    store.update();
    const first = boxTreeToPixi({ root: store.value, parentContainer, styleTree: styles, store });
    expect(first.getChildByLabel('label-id')).toBeInstanceOf(ContainerCtor);

    store.mutate((draft) => {
      draft.children = [];
    });
    store.update();
    const second = boxTreeToPixi({ root: store.value, parentContainer, styleTree: styles, store });

    expect(second.getChildByLabel('label-id')).toBeNull();
  });

  it('renders text content with default text styling from the style tree', () => {
    const styles = createStyleManager({
      'label.font.color:': '#224466',
      'label.font.size:': 18,
      'label.font.family:': 'Georgia',
      'label.font.align:': 'center',
    });
    const label = prepareBoxCellTree({
      name: 'label',
      absolute: true,
      dim: { x: 0, y: 0, w: 160, h: 48 },
      location: { x: 0, y: 0, w: 160, h: 48 },
      align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
      content: { type: 'text', value: 'Hello' },
    });
    const store = createStore(label);

    const rendered = boxTreeToPixi({ root: label, styleTree: styles, store });
    const textChild = rendered.children.find((child) => child instanceof TextCtor);

    expect(textChild).toBeInstanceOf(TextCtor);
    expect((textChild as import('pixi.js').Text).text).toBe('Hello');
  });

  it('renders url content as a sprite sized to the content container', () => {
    const styles = createStyleManager({});
    const icon = prepareBoxCellTree({
      name: 'icon',
      absolute: true,
      dim: { x: 0, y: 0, w: 32, h: 24 },
      location: { x: 0, y: 0, w: 32, h: 24 },
      align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
      content: { type: 'url', value: '/placeholder-art.png' },
    });
    const store = createStore(icon);

    const rendered = boxTreeToPixi({ root: icon, styleTree: styles, store });
    const spriteChild = rendered.children.find((child) => child instanceof SpriteCtor) as import('pixi.js').Sprite | undefined;

    expect(spriteChild).toBeInstanceOf(SpriteCtor);
    expect(spriteChild?.width).toBe(32);
    expect(spriteChild?.height).toBe(24);
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
    const store = createStore(panel);

    const rendered = boxTreeToPixi({ root: panel, styleTree: styles, store });

    expect(errorSpy).toHaveBeenCalledWith(
      '[boxTreeToPixi] Custom renderer for "panel" at "panel" returned a non-Container value. Falling back to the default renderer.',
      { nope: true },
    );
    expect(rendered.children.some((child) => child instanceof GraphicsCtor)).toBe(true);

    errorSpy.mockRestore();
  });

  it('accepts a non-Container object that matches the Container-like schema in a custom renderer', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const mockContainer = {
      addChild: vi.fn(),
      addChildAt: vi.fn(),
      removeChild: vi.fn(),
      getChildIndex: vi.fn(),
      destroy: vi.fn(),
      children: [],
      label: 'mock',
      parent: null,
      zIndex: 0,
      position: { set: vi.fn() },
    };

    const styles = createStyleManager({
      'panel.renderer:': {
        renderer: () => mockContainer as unknown as import('pixi.js').Container,
      } satisfies BoxPixiRendererOverride,
    });
    const panel = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 10, y: 10, w: 120, h: 80 },
      location: { x: 10, y: 10, w: 120, h: 80 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });
    const store = createStore(panel);

    const rendered = boxTreeToPixi({ root: panel, styleTree: styles, store });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(rendered).toBe(mockContainer);

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
    const store = createStore(panel);

    const rendered = boxTreeToPixi({ root: panel, app, styleTree: styles, store });

    expect(renderer).toHaveBeenCalled();
    expect(rendered.parent).toBe(stage);
    expect(stage.children.filter((child) => child.label === panel.id)).toHaveLength(1);
  });
});
