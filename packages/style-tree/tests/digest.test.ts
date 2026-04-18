import { describe, it, expect } from 'vitest';
import { StyleTree } from '../src/StyleTree';
import { digestJSON, fromJSON, toJSON } from '../src/digest';

describe('digest', () => {
  describe('fromJSON', () => {
    it('should require values to be under state keys like $*', () => {
      const json = {
        button: {
          '$*': {
            color: 'black',
            font: {
              size: 14,
            },
          },
          $hover: {
            color: 'blue',
          },
        },
      };

      const tree = fromJSON(json);
      // $* stores with empty states [], not ['*']
      expect(tree.get('button.color', [])).toBe('black');
      expect(tree.get('button.font.size', [])).toBe(14);
      expect(tree.get('button.color', ['hover'])).toBe('blue');
    });

    it('should handle nested noun paths', () => {
      const json = {
        navigation: {
          button: {
            text: {
              '$*': { color: 'black' },
              $hover: { color: 'blue' },
            },
          },
        },
      };

      const tree = fromJSON(json);
      // $* stores with empty states [], not ['*']
      expect(tree.get('navigation.button.text.color', [])).toBe('black');
      expect(tree.get('navigation.button.text.color', ['hover'])).toBe('blue');
    });

    it('should handle combined states', () => {
      const json = {
        button: {
          '$disabled-selected': {
            color: 'gray',
          },
        },
      };

      const tree = fromJSON(json);
      // Note: state is parsed as single string 'disabled-selected'
      expect(tree.get('button.color', ['disabled-selected'])).toBe('gray');
    });
  });

  describe('digestJSON', () => {
    it('should populate an existing StyleTree', () => {
      const tree = new StyleTree();
      tree.set('existing', [], 'value');

      digestJSON(tree, {
        button: {
          '$*': {
            color: 'red',
          },
        },
      });

      // $* stores with empty states []
      expect(tree.get('existing', [])).toBe('value');
      expect(tree.get('button.color', [])).toBe('red');
    });

    it('should support custom state prefix', () => {
      const json = {
        button: {
          '@*': {
            color: 'black',
          },
          '@hover': {
            color: 'blue',
          },
        },
      };

      const tree = fromJSON(json, { statePrefix: '@' });
      // @* stores with empty states []
      expect(tree.get('button.color', [])).toBe('black');
      expect(tree.get('button.color', ['hover'])).toBe('blue');
    });
  });

  describe('toJSON', () => {
    it('should export StyleTree with object values to JSON', () => {
      const tree = new StyleTree();
      // Empty states [] are exported as $*
      tree.set('button', [], { color: 'black', size: 14 });
      tree.set('button', ['hover'], { color: 'blue' });

      const json = toJSON(tree);
      expect(json.button['$*'].color).toBe('black');
      expect(json.button['$*'].size).toBe(14);
      expect(json.button.$hover.color).toBe('blue');
    });

    it('should export StyleTree with primitive values to JSON', () => {
      const tree = new StyleTree();
      // Empty states [] are exported as $*
      tree.set('button.color', [], 'black');
      tree.set('button.color', ['hover'], 'blue');

      const json = toJSON(tree);
      expect(json.button.color['$*']).toBe('black');
      expect(json.button.color.$hover).toBe('blue');
    });
  });
});
