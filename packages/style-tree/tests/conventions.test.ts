import { describe, expect, it } from 'vitest';
import { StyleTree } from '../src/StyleTree.js';
import {
  conventionKeys,
  normalizeStyleConvention,
  setConvention,
} from '../src/conventions.js';

describe('style conventions', () => {
  it('normalizes partial convention values with defaults', () => {
    const normalized = normalizeStyleConvention({
      font: { size: 10, color: '#111111' },
      stroke: { visible: false },
    });

    expect(normalized.font.size).toBe(10);
    expect(normalized.font.color).toBe('#111111');
    expect(normalized.font.family).toBe('Helvetica');
    expect(normalized.fill.visible).toBe(true);
    expect(normalized.stroke.visible).toBe(false);
  });

  it('rejects non-hex color strings', () => {
    expect(() => normalizeStyleConvention({
      font: { color: 'black' as never },
    })).toThrow();

    expect(() => normalizeStyleConvention({
      fill: { color: '#12zz89' as never },
    })).toThrow();
  });

  it('writes canonical convention keys into style tree', () => {
    const tree = new StyleTree();

    setConvention(tree, 'window.label', ['hover'], {
      font: {
        size: 10,
        color: '#000000',
        family: 'Helvetica',
        alpha: 0.9,
        visible: true,
      },
      fill: {
        size: 1,
        color: '#ffcc00',
        alpha: 0.8,
        visible: true,
      },
      stroke: {
        size: 2,
        color: '#333333',
        alpha: 1,
        visible: true,
      },
    });

    expect(tree.get('window.label.font.size', ['hover'])).toBe(10);
    expect(tree.get('window.label.font.family', ['hover'])).toBe('Helvetica');
    expect(tree.get('window.label.fill.color', ['hover'])).toBe('#ffcc00');
    expect(tree.get('window.label.stroke.size', ['hover'])).toBe(2);
  });

  it('returns the expected canonical key list', () => {
    const keys = conventionKeys(['window', 'label']);
    expect(keys).toEqual([
      'window.label.font.size',
      'window.label.font.color',
      'window.label.font.family',
      'window.label.font.alpha',
      'window.label.font.visible',
      'window.label.fill.size',
      'window.label.fill.color',
      'window.label.fill.alpha',
      'window.label.fill.visible',
      'window.label.stroke.size',
      'window.label.stroke.color',
      'window.label.stroke.alpha',
      'window.label.stroke.visible',
    ]);
  });
});
