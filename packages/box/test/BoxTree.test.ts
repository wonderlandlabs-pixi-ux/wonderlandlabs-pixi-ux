import { describe, expect, it } from 'vitest';
import { BoxTree, createBoxTreeState } from '../src/BoxTree';
import { ALIGN, UNIT_BASIS, SIZE_MODE_INPUT } from '../src/constants';

describe('BoxTree', () => {
  describe('state creation', () => {
    it('defaults order to 0, isVisible to true, and absolute to false', () => {
      const state = createBoxTreeState({
        id: 'root',
        area: { x: 0, y: 0 },
      });

      expect(state.order).toBe(0);
      expect(state.isVisible).toBe(true);
      expect(state.absolute).toBe(false);
      expect(state.modeVerb).toEqual([]);
      expect(state.globalVerb).toEqual([]);
      expect(state.align.direction).toBe('column');
    });

    it('defaults styleName from id or child key', () => {
      const rootState = createBoxTreeState({
        id: 'root-style',
        area: { x: 0, y: 0 },
      });
      const childState = createBoxTreeState({
        area: { x: 0, y: 0 },
      }, 'icon');

      expect(rootState.styleName).toBe('root-style');
      expect(childState.styleName).toBe('icon');
    });

    it('requires explicit x/y for the root area anchor', () => {
      expect(() => createBoxTreeState({
        id: 'bad-root',
        area: { width: 10, height: 10 },
      })).toThrow(/root requires explicit x and y/i);
    });

    it('supports only valid align values', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: { x: 0, y: 0 },
        align: {
          x: 'outer' as never,
        },
      })).toThrow(/invalid option|unsupported align/i);
    });

    it('supports only numeric px constrain values', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: { x: 0, y: 0 },
        constrain: {
          x: {
            min: { mode: SIZE_MODE_INPUT.HUG as never, value: 10 },
          },
        },
      })).toThrow(/number/i);
    });

    it('normalizes area pivot aliases to canonical values', () => {
      const state = createBoxTreeState({
        id: 'pivot-test',
        area: {
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          px: '>',
          py: '|',
        },
      });

      expect(state.area.px).toBe('e');
      expect(state.area.py).toBe('c');
    });

    it('accepts text and url content payloads', () => {
      const textState = createBoxTreeState({
        id: 'text-node',
        area: { x: 0, y: 0 },
        content: { type: 'text', value: 'hello' },
      });
      const urlState = createBoxTreeState({
        id: 'url-node',
        area: { x: 0, y: 0 },
        content: { type: 'url', value: 'https://example.com/image.png' },
      });

      expect(textState.content).toEqual({ type: 'text', value: 'hello' });
      expect(urlState.content).toEqual({ type: 'url', value: 'https://example.com/image.png' });
    });

    it('accepts extensible content payload fields', () => {
      const imageState = createBoxTreeState({
        id: 'image-node',
        area: { x: 0, y: 0 },
        content: {
          type: 'image',
          value: 'https://example.com/image.png',
          fit: 'cover',
          styleOverride: { tint: 0xff0000 },
        },
      });

      expect(imageState.content).toEqual(expect.objectContaining({
        type: 'image',
        value: 'https://example.com/image.png',
        fit: 'cover',
      }));
    });

    it('rejects invalid content type', () => {
      expect(() => createBoxTreeState({
        id: 'bad-content',
        area: { x: 0, y: 0 },
        content: { type: 'markdown', value: 'oops' } as never,
      })).toThrow(/invalid option|invalid enum value/i);
    });
  });

  describe('branching and identity', () => {
    it('computes full identity path from ids + child map keys', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { width: 10, height: 10 },
      });

      expect(root.identityPath).toBe('root');
      expect(child.identityPath).toBe('root/child');
    });

    it('passively creates child branches with wildcard branch params', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 500, height: 300 },
        children: new Map([
          ['a', {
            area: { width: 100, height: 50 },
          }],
        ]),
      });

      const child = root.getChild('a');
      expect(child).toBeDefined();
      expect(child?.identityPath).toBe('root/a');

      const children = root.children;
      expect(children.map((c) => c.name)).toEqual(['a']);
    });

    it('passively creates nested child branches through children.* wildcard', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 500, height: 300 },
        children: new Map([
          ['a', {
            area: { x: 0, y: 0, width: 100, height: 100 },
            children: new Map([
              ['b', {
                area: { width: 50, height: 50 },
              }],
            ]),
          }],
        ]),
      });

      const a = root.getChild('a');
      expect(a).toBeDefined();

      const b = a?.getChild('b');
      expect(b).toBeDefined();
      expect(b?.identityPath).toBe('root/a/b');
    });

    it('mappifies non-Map object children during state prep', () => {
      class ChildBag {
        alpha: { area: { width: number; height: number } };

        constructor() {
          this.alpha = { area: { width: 20, height: 10 } };
        }
      }

      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: new ChildBag() as unknown as Record<string, { area: { width: number; height: number } }>,
      });

      expect(root.value.children).toBeInstanceOf(Map);
      expect(root.value.children?.has('alpha')).toBe(true);
      expect(root.getChild('alpha')?.identityPath).toBe('root/alpha');
    });

    it('rejects object children when constructing from StoreParams value', () => {
      expect(() => new BoxTree({
        value: {
          id: 'root',
          area: { x: 0, y: 0, width: 100, height: 100 },
          align: { x: 's', y: 's', direction: 'column' },
          children: {
            alpha: {
              id: 'alpha',
              area: { x: 0, y: 0, width: 10, height: 10 },
              align: { x: 's', y: 's', direction: 'column' },
            },
          },
        } as unknown as never,
        branchParams: new Map(),
      } as never)).toThrow(/map/i);
    });
  });

  describe('geometry resolution', () => {
    it('arranges siblings in a column by default', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: {
          a: { area: { width: 10, height: 10 } },
          b: { area: { width: 10, height: 10 } },
        },
      });

      const a = root.getChild('a');
      const b = root.getChild('b');
      expect(a?.x).toBe(0);
      expect(a?.y).toBe(0);
      expect(b?.x).toBe(0);
      expect(b?.y).toBe(10);
    });

    it('arranges siblings in a row when direction is row', () => {
      const root = new BoxTree({
        id: 'root',
        align: { direction: 'row' },
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: {
          a: { area: { width: 10, height: 10 } },
          b: { area: { width: 10, height: 10 } },
        },
      });

      const a = root.getChild('a');
      const b = root.getChild('b');
      expect(a?.x).toBe(0);
      expect(a?.y).toBe(0);
      expect(b?.x).toBe(10);
      expect(b?.y).toBe(0);
    });

    it('resolves px constraints from local values', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { width: 10, height: 10 },
        constrain: {
          x: {
            min: 200,
            max: 200,
          },
          y: {
            min: 50,
            max: 50,
          },
        },
      });

      expect(child.value.area.width).toEqual({ mode: UNIT_BASIS.PX, value: 10 });
      expect(child.value.area.height).toEqual({ mode: UNIT_BASIS.PX, value: 10 });
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);

      root.setWidthPx(300);
      root.setHeightPx(120);

      expect(child.width).toBe(200);
      expect(child.height).toBe(50);
    });

    it('uses relative x/y and computes absolute world coordinates via absX/absY', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 10, y: 20, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 5, y: 6, width: 100, height: 50 },
        align: { x: ALIGN.E, y: ALIGN.C },
      });

      expect(child.x).toBe(295);
      expect(child.y).toBe(81);
      expect(child.absX).toBe(305);
      expect(child.absY).toBe(101);
    });

    it('applies area pivot offsets to resolved x/y', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 200, height: 100 },
      });

      const child = root.addChild('child', {
        area: {
          x: 40,
          y: 20,
          width: 10,
          height: 8,
          px: '>',
          py: '|',
        },
      });

      expect(child.anchorX).toBe(40);
      expect(child.anchorY).toBe(20);
      expect(child.x).toBe(30);
      expect(child.y).toBe(16);
      expect(child.absX).toBe(30);
      expect(child.absY).toBe(16);
    });

    it('supports fill alignment for child sizing', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 10, y: 20, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 2, y: 3, width: 10, height: 10 },
        align: { x: ALIGN.F, y: ALIGN.F },
      });

      expect(child.width).toBe(400);
      expect(child.height).toBe(200);
      expect(child.x).toBe(2);
      expect(child.y).toBe(3);
      expect(child.absX).toBe(12);
      expect(child.absY).toBe(23);
    });

    it('absolute children ignore align positioning and fill sizing', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 10, y: 20, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: {
          x: 7,
          y: 8,
          width: { mode: UNIT_BASIS.PERCENT, value: 0.25 },
          height: { mode: UNIT_BASIS.PERCENT, value: 0.5 },
        },
        align: { x: ALIGN.FILL, y: ALIGN.END },
        absolute: true,
      });

      expect(child.x).toBe(7);
      expect(child.y).toBe(8);
      expect(child.width).toBe(100);
      expect(child.height).toBe(100);
      expect(child.absX).toBe(17);
      expect(child.absY).toBe(28);
    });
  });

  describe('align input', () => {
    it('accepts symbol aliases for start/center/end align', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 5, y: 6, width: 100, height: 50 },
        align: { x: ALIGN.END, y: ALIGN.CENTER },
      });

      expect(child.value.align).toEqual({ x: ALIGN.E, y: ALIGN.C, direction: 'column' });
      expect(child.x).toBe(295);
      expect(child.y).toBe(81);
    });

    it('supports readable align constants', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 5, y: 6, width: 100, height: 50 },
        align: { x: ALIGN.RIGHT, y: ALIGN.MIDDLE },
      });

      expect(child.value.align).toEqual({ x: ALIGN.E, y: ALIGN.C, direction: 'column' });
      expect(child.x).toBe(295);
      expect(child.y).toBe(81);
    });

    it('accepts "<>" alias for fill align', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 2, y: 3, width: 10, height: 10 },
        align: { x: ALIGN.FILL, y: ALIGN.F },
      });

      expect(child.value.align).toEqual({ x: ALIGN.F, y: ALIGN.F, direction: 'column' });
      expect(child.width).toBe(400);
      expect(child.height).toBe(200);
    });
  });

  describe('constraints', () => {
    it('respects only min when min/max constraints are impossible', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 200, height: 100 },
      });

      const child = root.addChild('child', {
        area: { width: 5, height: 10 },
        constrain: {
          x: {
            min: 10,
            max: 8,
          },
        },
      });

      expect(child.width).toBe(10);
    });
  });

  describe('children lifecycle', () => {
    it('manages optional children map with add/remove', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      root.addChild('a', {
        area: { width: 10, height: 10 },
      });

      expect(root.value.children?.has('a')).toBe(true);

      root.removeChild('a');
      expect(root.value.children).toBeUndefined();
      expect(root.children).toEqual([]);
    });

    it('sorts children by order ascending, then key', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: {
          z: { area: { width: 10, height: 10 }, order: 2 },
          a: { area: { width: 10, height: 10 }, order: 1 },
          b: { area: { width: 10, height: 10 }, order: 1 },
        },
      });

      expect([...root.childrenMap.keys()]).toEqual(['a', 'b', 'z']);

      const z = root.getChild('z');
      expect(z).toBeDefined();
      z?.setOrder(0);

      expect([...root.childrenMap.keys()]).toEqual(['z', 'a', 'b']);
    });

    it('inherits assignUx map function to newly added children', () => {
      const calls: string[] = [];
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      root.assignUx((box) => ({
        env: 'test',
        isInitialized: false,
        init() {
          this.isInitialized = true;
        },
        render() {
          calls.push(box.identityPath);
        },
        clear() {},
        getContainer() {
          return undefined;
        },
      }));

      const child = root.addChild('child', {
        area: { width: 10, height: 10 },
      });

      expect(root.ux).toBeDefined();
      expect(child.ux).toBeDefined();

      root.render();
      child.render();

      expect(calls).toContain('root');
      expect(calls).toContain('root/child');
    });

    it('calls options.ux immediately when provided', () => {
      const calls: string[] = [];
      const ux = (box: BoxTree) => ({
        env: 'test',
        isInitialized: false,
        init() {
          this.isInitialized = true;
        },
        render() {
          calls.push(box.identityPath);
        },
        clear() {},
        getContainer() {
          return undefined;
        },
      });

      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
        ux,
      });

      expect(root.uxMapFn).toBe(ux);
      expect(root.ux).toBeDefined();

      root.render();
      expect(calls).toEqual(['root']);
    });

    it('supports assignUx(fn, false) without applying to children', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      const existing = root.addChild('existing', {
        area: { width: 10, height: 10 },
      });

      const ux = () => ({
        env: 'test',
        isInitialized: false,
        init() {
          this.isInitialized = true;
        },
        render() {},
        clear() {},
        getContainer() {
          return undefined;
        },
      });
      root.assignUx(ux, false);

      expect(root.uxMapFn).toBe(ux);
      expect(root.uxAppliesToChildren).toBe(false);
      expect(existing.uxMapFn).not.toBe(ux);

      const late = root.addChild('late', {
        area: { width: 10, height: 10 },
      });

      expect(late.uxMapFn).toBeUndefined();
    });
  });

  describe('render queue', () => {
    it('queues a single render on noun/verb changes and resolves on ticker', () => {
      const queued: Array<{ fn: () => void; ctx: unknown }> = [];
      const ticker = {
        addOnce(fn: () => void, ctx: unknown) {
          queued.push({ fn, ctx });
        },
        remove(fn: () => void, ctx: unknown) {
          const index = queued.findIndex((item) => item.fn === fn && item.ctx === ctx);
          if (index >= 0) {
            queued.splice(index, 1);
          }
        },
      } as unknown as import('pixi.js').Ticker;

      const root = new BoxTree({
        id: 'root',
        styleName: 'button',
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: {
          icon: {
            styleName: 'icon',
            area: { width: 10, height: 10 },
          },
        },
      });

      const calls: string[] = [];
      root.assignUx((box) => ({
        env: 'test',
        isInitialized: true,
        init() {},
        render() {
          calls.push(box.identityPath);
        },
        clear() {},
        getContainer() {
          return undefined;
        },
      }), false);

      root.app = { ticker } as unknown as import('pixi.js').Application;
      root.render();
      calls.length = 0;

      const icon = root.getChild('icon');
      icon?.addModeVerb('hover');
      icon?.setStyleName('glyph');
      icon?.addGlobalVerb('disabled');

      expect(root.isRenderQueued).toBe(true);
      expect(queued.length).toBe(1);
      expect(calls).toEqual([]);

      const next = queued.shift();
      next?.fn.call(next.ctx);

      expect(calls).toEqual(['root']);
      expect(root.isRenderQueued).toBe(false);

      calls.length = 0;
      root.setContent({
        type: 'image',
        value: 'https://example.com/updated.png',
        fit: 'contain',
      });

      expect(root.isRenderQueued).toBe(true);
      expect(queued.length).toBe(1);
      const contentTick = queued.shift();
      contentTick?.fn.call(contentTick.ctx);
      expect(calls).toEqual(['root']);
      expect(root.isRenderQueued).toBe(false);
    });

    it('supports manual flush when no ticker is available', () => {
      const root = new BoxTree({
        id: 'root',
        styleName: 'button',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      const calls: string[] = [];
      root.assignUx((box) => ({
        env: 'test',
        isInitialized: true,
        init() {},
        render() {
          calls.push(box.identityPath);
        },
        clear() {},
        getContainer() {
          return undefined;
        },
      }), false);

      root.render();
      calls.length = 0;

      root.setStyleName('button-next');
      expect(root.isRenderQueued).toBe(true);
      expect(calls).toEqual([]);

      root.flushRenderQueue();
      expect(calls).toEqual(['root']);
      expect(root.isRenderQueued).toBe(false);
    });
  });

  describe('measurement and setter helpers', () => {
    it('supports direction setter', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(root.direction).toBe('column');
      root.setDirection('row');
      expect(root.direction).toBe('row');
    });

    it('supports px and % setter helpers', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });
      const child = root.addChild('child', {
        area: { width: 10, height: 10 },
      });

      child.setWidthPercent(0.5);
      child.setHeightPercent(0.25);
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);

      child.setWidthPx(320);
      child.setHeightPx(180);
      expect(child.value.area.width).toEqual({ mode: UNIT_BASIS.PX, value: 320 });
      expect(child.value.area.height).toEqual({ mode: UNIT_BASIS.PX, value: 180 });
    });

    it('supports visibility setter helper', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(root.isVisible).toBe(true);
      root.setVisible(false);
      expect(root.isVisible).toBe(false);
      root.setVisible(true);
      expect(root.isVisible).toBe(true);
    });

    it('accepts "/" measurements as a % alias', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });
      const child = root.addChild('child', {
        area: {
          width: { mode: UNIT_BASIS.FRACTION, value: 1, base: 2 },
          height: { mode: UNIT_BASIS.FRACTION, value: 1, base: 4 },
        },
      });

      expect(child.value.area.width).toEqual({ mode: UNIT_BASIS.PERCENT, value: 0.5 });
      expect(child.value.area.height).toEqual({ mode: UNIT_BASIS.PERCENT, value: 0.25 });
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);
    });

    it('supports readable measurement mode constants', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });
      const child = root.addChild('child', {
        area: {
          width: { mode: UNIT_BASIS.FRACTION, value: 1, base: 2 },
          height: { mode: UNIT_BASIS.PERCENT, value: 0.25 },
        },
      });

      expect(child.value.area.width).toEqual({ mode: UNIT_BASIS.PERCENT, value: 0.5 });
      expect(child.value.area.height).toEqual({ mode: UNIT_BASIS.PERCENT, value: 0.25 });
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);
    });

    it('rejects "/" measurements when base is less than value', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: {
          x: 0,
          y: 0,
          width: { mode: UNIT_BASIS.FRACTION, value: 3, base: 2 },
        },
      })).toThrow(/base must be >= value/i);
    });

    it('requires base for "/" measurements', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: {
          x: 0,
          y: 0,
          width: { mode: UNIT_BASIS.FRACTION, value: 0.5 },
        },
      })).toThrow(/required|invalid input/i);
    });

    it('supports content setter helpers', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(root.content).toBeUndefined();

      root.setContent({ type: 'text', value: 'Caption body' });
      expect(root.content).toEqual({ type: 'text', value: 'Caption body' });

      root.setContent({ type: 'url', value: 'https://example.com/caption.svg' });
      expect(root.content).toEqual({ type: 'url', value: 'https://example.com/caption.svg' });

      root.setContent({
        type: 'image',
        value: 'https://example.com/caption.png',
        fit: 'contain',
      });
      expect(root.content).toEqual(expect.objectContaining({
        type: 'image',
        value: 'https://example.com/caption.png',
        fit: 'contain',
      }));

      root.clearContent();
      expect(root.content).toBeUndefined();
    });

    it('supports styleName setter helper', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(root.styleName).toBe('root');
      root.setStyleName('button');
      expect(root.styleName).toBe('button');
    });

    it('supports modeVerb toggles on a node', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });
      const icon = root.addChild('icon', {
        area: { width: 10, height: 10 },
      });

      expect(icon.modeVerb).toEqual([]);

      icon.addModeVerb('hover');
      expect(icon.modeVerb).toEqual(['hover']);

      icon.toggleModeVerb('selected');
      expect(icon.modeVerb).toEqual(['hover', 'selected']);

      icon.toggleModeVerb('hover');
      expect(icon.modeVerb).toEqual(['selected']);

      icon.removeModeVerb('selected');
      expect(icon.modeVerb).toEqual([]);
    });

    it('supports globalVerb toggles on the root (from any node)', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });
      const icon = root.addChild('icon', {
        area: { width: 10, height: 10 },
      });

      icon.addGlobalVerb('disabled');
      expect(root.globalVerb).toEqual(['disabled']);
      expect(icon.globalVerb).toEqual(['disabled']);

      icon.toggleGlobalVerb('active');
      expect(root.globalVerb).toEqual(['disabled', 'active']);

      icon.toggleGlobalVerb('disabled');
      expect(root.globalVerb).toEqual(['active']);
    });
  });

  describe('style resolution', () => {
    it('resolves hierarchical style nouns and falls back to atomic styleName', () => {
      const root = new BoxTree({
        id: 'root',
        styleName: 'button',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });
      const icon = root.addChild('icon', {
        styleName: 'icon',
        area: { width: 10, height: 10 },
      });

      const styleManager = {
        match(query: { nouns: string[]; states: string[] }): string | undefined {
          const key = `${query.nouns.join('.')}:${query.states.join('-')}`;
          if (key === 'button.icon:') return 'hierarchical-icon';
          if (key === 'icon:') return 'atomic-icon';
          return undefined;
        },
      };

      expect(icon.styleNouns).toEqual(['button', 'icon']);
      expect(icon.resolveStyle(styleManager)).toBe('hierarchical-icon');
    });

    it('falls back to atomic styleName when hierarchical style is not defined', () => {
      const root = new BoxTree({
        id: 'root',
        styleName: 'button',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });
      const icon = root.addChild('icon', {
        styleName: 'icon',
        area: { width: 10, height: 10 },
      });

      const styleManager = {
        match(query: { nouns: string[]; states: string[] }): string | undefined {
          const key = `${query.nouns.join('.')}:${query.states.join('-')}`;
          if (key === 'icon:') return 'atomic-icon';
          return undefined;
        },
      };

      expect(icon.resolveStyle(styleManager)).toBe('atomic-icon');
    });

    it('includes globalVerb and modeVerb in style state matching', () => {
      const root = new BoxTree({
        id: 'root',
        styleName: 'button',
        globalVerb: ['disabled'],
        area: { x: 0, y: 0, width: 100, height: 100 },
      });
      const icon = root.addChild('icon', {
        styleName: 'icon',
        modeVerb: ['hover'],
        area: { width: 10, height: 10 },
      });

      const styleManager = {
        match(query: { nouns: string[]; states: string[] }): string | undefined {
          const key = `${query.nouns.join('.')}:${query.states.sort().join('-')}`;
          if (key === 'button.icon:disabled-hover-selected') return 'stateful-style';
          return undefined;
        },
      };

      expect(icon.resolvedVerb).toEqual(['disabled', 'hover']);
      expect(icon.resolveStyle(styleManager, ['selected'])).toBe('stateful-style');
    });
  });
});
