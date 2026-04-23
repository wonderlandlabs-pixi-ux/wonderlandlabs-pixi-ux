import { describe, expect, it } from 'vitest';
import { boxTreeToJSON, type BoxLayoutCellType, type BoxStyleManagerLike } from '../src/index.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import defaultButtonStyles from '../../button/src/defaultStyles.json' with { type: 'json' };
import capsuleButtonStyles from '../../button/src/capsuleStyles.json' with { type: 'json' };

function createStyleManager(entries: Record<string, unknown>): BoxStyleManagerLike {
  const lookup = (nouns: string[], states: string[]) => {
    const nounKey = nouns.join('.');
    const stateKey = states.join(',');
    const exactKey = `${nounKey}:${stateKey}`;
    if (exactKey in entries) {
      return entries[exactKey];
    }

    const result: Record<string, unknown> = {};
    const prefixes = [`${nounKey}.`, `*.${nounKey}.`];
    const suffix = `:${stateKey}`;
    for (const [key, value] of Object.entries(entries)) {
      const prefix = prefixes.find((candidate) => key.startsWith(candidate) && key.endsWith(suffix));
      if (!prefix) {
        continue;
      }
      const remainder = key.slice(prefix.length, key.length - suffix.length).split('.');
      let current = result;
      remainder.forEach((segment, index) => {
        if (index === remainder.length - 1) {
          current[segment] = value;
          return;
        }
        current[segment] = (current[segment] as Record<string, unknown> | undefined) ?? {};
        current = current[segment] as Record<string, unknown>;
      });
    }

    return Object.keys(result).length > 0 ? result : undefined;
  };

  return {
    match: (query) => lookup(query.nouns, query.states),
    matchHierarchy: (query) => lookup(query.nouns, query.states),
  };
}

describe('boxTreeToJSON', () => {
  it('parses fill and text styling without Pixi', () => {
    const styles = createStyleManager({
      '*.button.primary.background.fill.direction:': 'vertical',
      '*.button.primary.background.fill.colors:': ['#111111', '#eeeeee'],
      '*.button.primary.border.color:': '#333333',
      '*.button.primary.border.width:': 2,
      '*.button.primary.font.color:': '#ffffff',
      '*.button.primary.font.size:': 18,
      '*.button.primary.font.align:': 'center',
    });

    const root: BoxLayoutCellType = {
      id: 'button-background',
      name: 'button',
      absolute: true,
      variant: 'primary',
      dim: { x: 10, y: 20, w: 200, h: 48 },
      location: { x: 10, y: 20, w: 200, h: 48 },
      align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
      content: {
        type: 'text',
        value: 'Launch',
      },
    };

    const model = boxTreeToJSON(root, [styles]);

    expect(model.background.fill).toEqual({
      direction: 'vertical',
      colors: ['#111111', '#eeeeee'],
    });
    expect(model.background.borderColor).toBe('#333333');
    expect(model.background.borderWidth).toBe(2);
    expect(model.content.kind).toBe('text');
    if (model.content.kind !== 'text') {
      throw new Error('expected text content');
    }
    expect(model.content.style.fill).toBe('#ffffff');
    expect(model.content.style.fontSize).toBe(18);
    expect(model.content.style.align).toBe('center');
  });

  it('prefers a later solid fill override over inherited gradient leaf values', () => {
    const baseStyles = createStyleManager({
      '*.container.base.background.fill.direction:start': 'vertical',
      '*.container.base.background.fill.colors:start': ['#d9d9d9', '#ffffff', '#bfbfbf'],
    });
    const overrideStyles = createStyleManager({
      '*.container.base.background.fill:start': '#183a37',
    });

    const root: BoxLayoutCellType = {
      id: 'button-background',
      name: 'container',
      absolute: true,
      variant: 'base',
      verbs: ['start'],
      dim: { x: 0, y: 0, w: 220, h: 52 },
      location: { x: 0, y: 0, w: 220, h: 52 },
      align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
    };

    const model = boxTreeToJSON(root, [baseStyles, overrideStyles]);

    expect(model.background.fill).toBe('#183a37');
  });

  it('resolves a direct solid background.fill leaf for variant-scoped container styles', () => {
    const styles = createStyleManager({
      '*.container.background.base.fill:start': '#183a37',
      '*.container.border.base.color:start': '#183a37',
      '*.label.base.font.color:start': '#f7f4ea',
    });

    const root: BoxLayoutCellType = {
      id: 'button-background',
      name: 'container',
      absolute: true,
      variant: 'base',
      verbs: ['start'],
      dim: { x: 0, y: 0, w: 220, h: 52 },
      location: { x: 0, y: 0, w: 220, h: 52 },
      align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
      children: [{
        id: 'button-label',
        name: 'label',
        absolute: false,
        variant: 'base',
        dim: { w: 100, h: 20 },
        location: { x: 60, y: 16, w: 100, h: 20 },
        align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
        content: { type: 'text', value: 'Partial Capsule' },
      }],
    };

    const model = boxTreeToJSON(root, [styles]);

    expect(model.background.fill).toBe('#183a37');
    expect(model.children[0]?.content.kind).toBe('text');
    if (model.children[0]?.content.kind !== 'text') {
      throw new Error('expected text content');
    }
    expect(model.children[0].content.style.fill).toBe('#f7f4ea');
  });

  it('keeps the default button base gradient while allowing later capsule overrides to replace it', () => {
    const defaultStyle = fromJSON(defaultButtonStyles) as unknown as BoxStyleManagerLike;
    const capsuleStyle = fromJSON(capsuleButtonStyles) as unknown as BoxStyleManagerLike;

    const root: BoxLayoutCellType = {
      id: 'button-background',
      name: 'container',
      absolute: true,
      variant: 'base',
      verbs: ['start'],
      dim: { x: 0, y: 0, w: 220, h: 52 },
      location: { x: 0, y: 0, w: 220, h: 52 },
      align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
    };

    const baseModel = boxTreeToJSON(root, [defaultStyle]);
    expect(baseModel.background.fill).toEqual({
      direction: 'vertical',
      colors: ['#E7E4DE', '#F4F2EE', '#FFFFFF', '#F2EFEB', '#D7D2CA'],
    });

    const overrideModel = boxTreeToJSON(root, [defaultStyle, capsuleStyle]);
    expect(overrideModel.background.fill).toBe('#183a37');
  });
});
