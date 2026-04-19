import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BoxStore, prepareBoxCellTree } from '../src/BoxStore.js';

let ContainerCtor: typeof import('pixi.js').Container;
let boxTreeToPixi: typeof import('../src/toPixi.js').boxTreeToPixi;

beforeAll(async () => {
  vi.stubGlobal('navigator', { userAgent: 'vitest' });
  ({ Container: ContainerCtor } = await import('pixi.js'));
  ({ boxTreeToPixi } = await import('../src/toPixi.js'));
});

function createStore(root: ReturnType<typeof prepareBoxCellTree>) {
  const store = new BoxStore({ value: root });
  store.update();
  return store;
}

describe('toPixi renderGroup handling', () => {
  it('does NOT make the root a renderGroup by default', () => {
    const root = prepareBoxCellTree({
      name: 'root',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      location: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });

    const store = createStore(root);
    const rendered = boxTreeToPixi({ root, store });
    expect(rendered.isRenderGroup).toBe(false);
  });

  it('makes the root a renderGroup if renderGroup is set to true', () => {
    const root = prepareBoxCellTree({
      name: 'root',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      location: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
      renderGroup: true,
    });

    const store = createStore(root);
    const rendered = boxTreeToPixi({ root, store });
    expect(rendered.isRenderGroup).toBe(true);
  });

  it('does NOT make children renderGroups by default', () => {
    const root = prepareBoxCellTree({
      name: 'root',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      location: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
      children: [
        {
          name: 'child',
          absolute: true,
          dim: { x: 10, y: 10, w: 50, h: 50 },
          location: { x: 10, y: 10, w: 50, h: 50 },
          align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        }
      ]
    });

    const store = createStore(root);
    const rendered = boxTreeToPixi({ root, store });
    const child = rendered.children.find(c => c.label === root.children![0].id) as any;
    expect(child).toBeDefined();
    expect(child.isRenderGroup).toBe(false);
  });

  it('makes children renderGroups if renderGroup is set to true', () => {
    const root = prepareBoxCellTree({
      name: 'root',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      location: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
      children: [
        {
          name: 'child',
          absolute: true,
          dim: { x: 10, y: 10, w: 50, h: 50 },
          location: { x: 10, y: 10, w: 50, h: 50 },
          align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
          renderGroup: true,
        }
      ]
    });

    const store = createStore(root);
    const rendered = boxTreeToPixi({ root, store });
    const child = rendered.children.find(c => c.label === root.children![0].id) as any;
    expect(child).toBeDefined();
    expect(child.isRenderGroup).toBe(true);
  });
});
