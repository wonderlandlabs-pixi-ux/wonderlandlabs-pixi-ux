/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { Container, Graphics, Sprite } from 'pixi.js';
import { BoxTree } from '../src/BoxTree';
import { BoxUxBase } from '../src/BoxUxBase';
import { MapEnhanced } from '../src/BoxUxContextMap';
import {
  BACKGROUND_CONTAINER,
  BOX_UX_ENV,
  BOX_UX_LAYER,
  BOX_UX_ORDER,
  BOX_RENDER_CONTENT_ORDER,
  BoxUxPixi,
  CHILD_CONTAINER,
  CONTENT_CONTAINER,
  setUxOrder,
  OVERLAY_CONTAINER,
  ROOT_CONTAINER,
  STROKE_CONTAINER,
} from '../src/BoxUx';

type Query = {
  nouns: string[];
  states: string[];
};

describe('BoxUxPixi', () => {
  it('provides renderer-agnostic lifecycle flow in BoxUxBase', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 100, height: 40 },
    });

    class TestUx extends BoxUxBase {
      readonly env = 'test';
      upCalls = 0;
      attachCalls = 0;
      detachCalls = 0;
      destroyCalls = 0;

      getContainer(_key: unknown): unknown {
        return undefined;
      }

      protected renderUp(): void {
        this.upCalls += 1;
      }

      protected override onAttach(): void {
        this.attachCalls += 1;
      }

      protected override onDetach(): void {
        this.detachCalls += 1;
      }

      protected override onDestroy(): void {
        this.destroyCalls += 1;
      }
    }

    const ux = new TestUx(root);
    ux.render();
    expect(ux.isInitialized).toBe(true);
    expect(ux.isAttached).toBe(true);
    expect(ux.upCalls).toBe(1);
    expect(ux.attachCalls).toBe(1);
    expect(ux.detachCalls).toBe(0);
    expect(ux.destroyCalls).toBe(0);

    root.setVisible(false);
    ux.render();
    expect(ux.detachCalls).toBe(1);
    expect(ux.destroyCalls).toBe(0);
    expect(ux.isAttached).toBe(false);
    expect(ux.isInitialized).toBe(true);

    ux.destroy();
    expect(ux.destroyCalls).toBe(1);
    expect(ux.isInitialized).toBe(false);
  });

  it('creates a container, composes child containers, and computes background zIndex', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 10, y: 20, width: 200, height: 100 },
      children: {
        low: {
          styleName: 'cell',
          order: -5,
          area: { width: 60, height: 30 },
        },
        high: {
          styleName: 'cell',
          order: 2,
          area: { width: 40, height: 20 },
        },
      },
    });

    const styles = {
      match(query: Query): unknown {
        const key = query.nouns.join('.');
        if (key === 'panel.bgColor') return 0x123456;
        if (key === 'panel.bgStrokeColor') return 0xffffff;
        if (key === 'panel.bgStrokeSize') return 2;
        return undefined;
      },
    };

    root.styles = styles;
    root.assignUx((box) => new BoxUxPixi(box));
    root.render();
    const ux = root.ux as BoxUxPixi | undefined;
    expect(ux).toBeDefined();
    expect(ux?.contentMap).toBeInstanceOf(MapEnhanced);
    expect(ux?.env).toBe(BOX_UX_ENV.PIXI);
    expect(ux?.getContainer(ROOT_CONTAINER)).toBe(ux?.container);
    expect(ux?.getContainer(BACKGROUND_CONTAINER)).toBe(ux?.background);
    expect(ux?.getContainer(CHILD_CONTAINER)).toBe(ux?.childContainer);
    expect(ux?.getContainer(CONTENT_CONTAINER)).toBe(ux?.contentContainer);
    expect(ux?.getContainer(OVERLAY_CONTAINER)).toBe(ux?.overlayContainer);
    expect(ux?.getContainer(STROKE_CONTAINER)).toBe(ux?.strokeGraphic);

    expect(ux?.container.position.x).toBe(10);
    expect(ux?.container.position.y).toBe(20);
    expect(ux?.container.zIndex).toBe(root.order);
    expect(ux?.background.zIndex).toBe(BOX_RENDER_CONTENT_ORDER.BACKGROUND);
    expect(ux?.childContainer.zIndex).toBe(BOX_RENDER_CONTENT_ORDER.CHILDREN);
    expect(ux?.overlayContainer.zIndex).toBe(BOX_RENDER_CONTENT_ORDER.OVERLAY);
    expect(ux?.background.visible).toBe(true);
    expect(ux?.strokeGraphic.visible).toBe(true);

    const low = ux?.getChildUx('low');
    const high = ux?.getChildUx('high');
    expect(low).toBeDefined();
    expect(high).toBeDefined();
    expect(low?.container.parent).toBe(ux?.childContainer);
    expect(high?.container.parent).toBe(ux?.childContainer);
    expect(low?.container.zIndex).toBe(-5);
    expect(high?.container.zIndex).toBe(2);
  });

  it('supports attach(targetContainer) and attach() with ux.app.stage', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 80, height: 40 },
    });

    const stage = new Container();
    const appLike = { stage } as unknown as import('pixi.js').Application;

    const ux = new BoxUxPixi(root);
    root.app = appLike;

    const other = new Container();
    ux.attach(other);
    expect(ux.container.parent).toBe(other);

    ux.attach();
    expect(ux.container.parent).toBe(stage);
  });

  it('throws on attach() when no target and no app', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 80, height: 40 },
    });
    const ux = new BoxUxPixi(root);
    expect(() => ux.attach()).toThrow(/attach requires targetContainer or ux.app/i);
  });

  it('prefers hierarchical style properties over atomic fallback', () => {
    const queries: Query[] = [];

    const root = new BoxTree({
      id: 'root',
      styleName: 'button',
      area: { x: 0, y: 0, width: 120, height: 60 },
      children: {
        icon: {
          styleName: 'icon',
          area: { width: 20, height: 20 },
        },
      },
    });

    const styles = {
      match(query: Query): unknown {
        queries.push({ nouns: [...query.nouns], states: [...query.states] });
        const key = query.nouns.join('.');
        if (key === 'button.icon.bgColor') return 0xaa0000;
        if (key === 'button.icon.bgStrokeColor') return 0x000000;
        if (key === 'button.icon.bgStrokeSize') return 1;
        if (key === 'icon.bgColor') return 0x00aa00;
        return undefined;
      },
    };

    root.styles = styles;
    root.assignUx((box) => new BoxUxPixi(box));
    root.render();
    const ux = root.ux as BoxUxPixi | undefined;
    expect(ux).toBeDefined();

    const iconUx = ux?.getChildUx('icon');
    expect(iconUx).toBeDefined();
    expect(iconUx?.background.visible).toBe(true);
    expect(iconUx?.strokeGraphic.visible).toBe(true);
    expect(
      queries.some((query) => query.nouns.join('.') === 'button.icon.bgColor'),
    ).toBe(true);
    expect(
      queries.some((query) => query.nouns.join('.') === 'icon.bgColor'),
    ).toBe(false);
  });

  it('uses globalVerb + modeVerb for style queries', () => {
    const queries: Query[] = [];

    const root = new BoxTree({
      id: 'root',
      styleName: 'button',
      globalVerb: ['disabled'],
      area: { x: 0, y: 0, width: 120, height: 60 },
      children: {
        icon: {
          styleName: 'icon',
          modeVerb: ['hover'],
          area: { width: 20, height: 20 },
        },
      },
    });

    const styles = {
      match(query: Query): unknown {
        queries.push({ nouns: [...query.nouns], states: [...query.states] });
        const key = query.nouns.join('.');
        if (key === 'button.icon.bgColor' && query.states.join('-') === 'disabled-hover') {
          return 0xabcdef;
        }
        return undefined;
      },
    };

    root.styles = styles;
    root.assignUx((box) => new BoxUxPixi(box));
    root.render();

    const iconQueries = queries.filter((query) => query.nouns.join('.') === 'button.icon.bgColor');
    expect(iconQueries.length).toBeGreaterThan(0);
    expect(iconQueries[0]?.states).toEqual(['disabled', 'hover']);
  });

  it('prepopulates default content layers and supports additional custom layers', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 120, height: 60 },
    });
    root.styles = { match: () => undefined };
    root.assignUx((box) => new BoxUxPixi(box));
    const ux = root.ux as BoxUxPixi | undefined;
    expect(ux).toBeDefined();

    const custom = new Graphics();
    custom.visible = true;
    custom.zIndex = 76;
    ux?.contentMap.set('CUSTOM', custom);
    root.render();

    expect(ux?.contentMap.has(BOX_UX_LAYER.BACKGROUND)).toBe(true);
    expect(ux?.contentMap.has(BOX_UX_LAYER.CHILDREN)).toBe(true);
    expect(ux?.contentMap.has(BOX_UX_LAYER.CONTENT)).toBe(true);
    expect(ux?.contentMap.has(BOX_UX_LAYER.OVERLAY)).toBe(true);
    expect(custom.parent).toBe(ux?.container);
    expect(custom.zIndex).toBe(76);

    expect(ux?.content).toBe(ux?.contentMap);
  });

  it('detaches when box is not visible and keeps render content for reuse', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 120, height: 60 },
    });

    root.styles = { match: () => undefined };
    root.assignUx((box) => new BoxUxPixi(box));

    const ux = root.ux as BoxUxPixi | undefined;
    expect(ux).toBeDefined();

    root.render();
    expect(ux?.contentMap.size).toBeGreaterThan(0);
    expect(ux?.container.visible).toBe(true);
    const initialSize = ux?.contentMap.size ?? 0;

    root.setVisible(false);
    root.render();
    expect(ux?.contentMap.size).toBe(initialSize);
    expect(ux?.container.visible).toBe(false);
    expect(ux?.isAttached).toBe(false);

    root.setVisible(true);
    root.render();
    expect(ux?.contentMap.size).toBe(initialSize);
    expect(ux?.container.visible).toBe(true);
    expect(ux?.isAttached).toBe(true);
  });

  it('exposes generateStyleMap and only updates layout/styles on explicit render()', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 120, height: 60 },
    });
    root.styles = {
      match(query: Query): unknown {
        const key = query.nouns.join('.');
        if (key === 'panel.bgColor') return 0x112233;
        if (key === 'panel.bgAlpha') return 0.75;
        if (key === 'panel.bgStrokeColor') return 0xaabbcc;
        if (key === 'panel.bgStrokeAlpha') return 0.5;
        if (key === 'panel.bgStrokeSize') return 3;
        return undefined;
      },
    };
    root.assignUx((box) => new BoxUxPixi(box));

    const ux = root.ux as BoxUxPixi | undefined;
    expect(ux).toBeDefined();
    root.render();

    const styleMap = ux?.generateStyleMap(root);
    expect(styleMap).toEqual({
      fill: { color: 0x112233, alpha: 0.75 },
      stroke: { color: 0xaabbcc, alpha: 0.5, width: 3 },
    });

    root.setWidthPx(130);
    expect(root.width).toBe(130);
    root.render();
    expect(root.width).toBe(130);

    root.setPosition(4, 6);
    expect(ux?.container.position.x).toBe(0);
    expect(ux?.container.position.y).toBe(0);
    root.render();
    expect(ux?.container.position.x).toBe(4);
    expect(ux?.container.position.y).toBe(6);

    root.setVisible(false);
    expect(ux?.container.visible).toBe(true);
    root.render();
    expect(ux?.container.visible).toBe(false);

    root.setWidthPx(130);

    root.addModeVerb('hover');

    root.mutate((draft) => {
      draft.style = {
        bgColor: 0x445566,
        bgAlpha: 0.6,
        bgStrokeColor: 0x111111,
        bgStrokeAlpha: 0.25,
        bgStrokeSize: 4,
      };
    });
    root.setVisible(true);
    root.render();
    expect(ux?.generateStyleMap(root)).toEqual({
      fill: { color: 0x445566, alpha: 0.6 },
      stroke: { color: 0x111111, alpha: 0.25, width: 4 },
    });
    expect(ux?.background.visible).toBe(true);
    expect(ux?.strokeGraphic.visible).toBe(true);
  });

  it('renders text and image content into the default content layer', () => {
    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 120, height: 60 },
      content: { type: 'text', value: 'hello' },
    });
    root.styles = { match: () => undefined };
    root.assignUx((box) => new BoxUxPixi(box));
    root.render();

    const ux = root.ux as BoxUxPixi | undefined;
    expect(ux?.contentContainer.children.length).toBe(1);
    expect(ux?.contentContainer.children[0]?.label).toContain('content-text');

    const spriteFrom = vi.spyOn(Sprite, 'from').mockImplementation(() => new Sprite());
    root.setContent({ type: 'image', value: 'https://example.com/image.png' });
    root.render();

    expect(spriteFrom).toHaveBeenCalledWith('https://example.com/image.png');
    expect(ux?.contentContainer.children.length).toBe(1);
    expect(ux?.contentContainer.children[0]?.label).toContain('content-image');

    spriteFrom.mockRestore();
  });

  it('supports custom UX layer orders and rejects duplicate z-index assignments', () => {
    setUxOrder('CUSTOM_LAYER', 125);
    expect(BOX_UX_ORDER.get('CUSTOM_LAYER')).toBe(125);
    expect(() => setUxOrder('CUSTOM_LAYER_CONFLICT', 125)).toThrow(/already used/i);

    const root = new BoxTree({
      id: 'root',
      styleName: 'panel',
      area: { x: 0, y: 0, width: 120, height: 60 },
    });
    root.styles = { match: () => undefined };
    root.assignUx((box) => new BoxUxPixi(box));
    const ux = root.ux as BoxUxPixi | undefined;
    expect(ux).toBeDefined();

    const custom = new Graphics();
    custom.visible = true;
    custom.zIndex = BOX_UX_ORDER.get('CUSTOM_LAYER') ?? 125;
    ux?.contentMap.set('CUSTOM_LAYER', custom);
    root.render();

    expect(custom.parent).toBe(ux?.container);
    expect(custom.zIndex).toBe(125);
  });
});
