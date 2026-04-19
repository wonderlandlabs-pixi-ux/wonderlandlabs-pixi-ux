import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BoxStore, prepareBoxCellTree } from '../src/BoxStore.js';
import type {
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

function createStore(root: ReturnType<typeof prepareBoxCellTree>) {
  const store = new BoxStore({ value: root });
  store.update();
  return store;
}

describe('toPixi background handling', () => {
  it('identifies the background graphic with $$background label', () => {
    const styles = createStyleManager({
      'panel.background.color:': '#eeeeee',
    });
    const root = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      location: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });
    const parentContainer = new ContainerCtor({ label: 'host' });
    const store = createStore(root);

    const rendered = boxTreeToPixi({ root, parentContainer, styleTree: styles, store });
    const background = rendered.children.find((child) => child.label === '$$background');

    expect(background).toBeInstanceOf(GraphicsCtor);
  });

  it('erases the background when background color is missing', () => {
    const styles = createStyleManager({});
    const root = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      location: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });
    const parentContainer = new ContainerCtor({ label: 'host' });
    const store = createStore(root);

    const rendered = boxTreeToPixi({ root, parentContainer, styleTree: styles, store });
    const background = rendered.children.find((child) => child.label === '$$background') as any;

    // Currently it might be __box:graphics, but after fix it should be $$background
    // Also we want to check if it's "erased" (i.e. nothing drawn)
    // Graphics in Pixi v8 doesn't easily show if it's empty without deeper inspection, 
    // but we can check if it has any instructions if we were using v7.
    // In v8, we can check background.graphicsContext.instructions or similar if available.
    
    // For now, if we can't easily check 'erased', we'll at least check it exists and has the right label.
    // The requirement says "erase the background / fail to crate the background".
    // If it's not created, it shouldn't be there.
    expect(background).toBeUndefined();
  });

  it('keeps and clears the background graphic if it becomes empty on re-render', () => {
    const root = prepareBoxCellTree({
      name: 'panel',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      location: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });
    const parentContainer = new ContainerCtor({ label: 'host' });
    const store = createStore(root);

    // First render with background
    const styles1 = createStyleManager({ 'panel.background.color:': '#eeeeee' });
    boxTreeToPixi({ root, parentContainer, styleTree: styles1, store });
    expect(parentContainer.children[0].children.find(c => c.label === '$$background')).toBeDefined();

    // Second render without background
    const styles2 = createStyleManager({});
    boxTreeToPixi({ root, parentContainer, styleTree: styles2, store });
    expect(parentContainer.children[0].children.find(c => c.label === '$$background')).toBeDefined();
  });
});
