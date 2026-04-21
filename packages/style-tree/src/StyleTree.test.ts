import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StyleTree } from './StyleTree';

describe('StyleTree', () => {
  let tree: StyleTree;

  beforeEach(() => {
    tree = new StyleTree();
  });

  describe('Basic operations', () => {
    it('should set and get styles', () => {
      tree.set('button.text', ['hover'], 'blue');
      expect(tree.get('button.text', ['hover'])).toBe('blue');
    });

    it('should return undefined for non-existent keys', () => {
      expect(tree.get('nonexistent', [])).toBeUndefined();
    });

    it('should check if key exists', () => {
      tree.set('button.text', ['hover'], 'blue');
      expect(tree.has('button.text', ['hover'])).toBe(true);
      expect(tree.has('nonexistent', [])).toBe(false);
    });

    it('should auto-sort states', () => {
      tree.set('button.text', ['selected', 'disabled'], 'gray');
      tree.set('button.text', ['disabled', 'selected'], 'gray2');
      // Both should normalize to the same key (last set wins)
      expect(tree.get('button.text', ['disabled', 'selected'])).toBe('gray2');
    });

    it('should track size correctly', () => {
      tree.set('button.text', ['hover'], 'blue');
      tree.set('button.text', ['active'], 'red');
      expect(tree.size).toBe(2);
    });

    it('should normalize interCaps noun keys by default', () => {
      tree.set('button.label.fontSize', [], 13);
      expect(tree.get('button.label.font.size', [])).toBe(13);
      expect(tree.get('button.label.fontSize', [])).toBe(13);
    });

    it('should split single interCaps segments into deep noun paths', () => {
      tree.set('windowLabelFontSize', [], 10);
      expect(tree.get('window.label.font.size', [])).toBe(10);
      expect(tree.match({ nouns: ['windowLabelFontSize'], states: [] })).toBe(10);
    });

    it('should normalize interCaps nouns for matching queries', () => {
      tree.set('button.iconGap', [], 8);

      const result = tree.match({
        nouns: ['button', 'iconGap'],
        states: [],
      });

      expect(result).toBe(8);
    });
  });

  describe('query caching', () => {
    it('reuses cached best-match lookups for identical queries', () => {
      tree = new StyleTree({ cacheLimit: 30 });
      tree.set('button.text', ['hover'], 'blue');
      const spy = vi.spyOn(tree, 'findAllMatches');

      expect(tree.findBestMatch({ nouns: ['button', 'text'], states: ['hover'] })?.value).toBe('blue');
      expect(tree.findBestMatch({ nouns: ['button', 'text'], states: ['hover'] })?.value).toBe('blue');

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('evicts old query results when cache limit is exceeded', () => {
      tree = new StyleTree({ cacheLimit: 1 });
      tree.set('button.text', ['hover'], 'blue');
      const spy = vi.spyOn(tree, 'findAllMatches');

      tree.findBestMatch({ nouns: ['button', 'text'], states: ['hover'] });
      tree.findBestMatch({ nouns: ['button', 'text'], states: ['active'] });
      tree.findBestMatch({ nouns: ['button', 'text'], states: ['hover'] });

      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('disables query caching entirely when cacheLimit is 0', () => {
      tree = new StyleTree({ cacheLimit: 0 });
      tree.set('button.text', ['hover'], 'blue');
      const spy = vi.spyOn(tree, 'findAllMatches');

      tree.findBestMatch({ nouns: ['button', 'text'], states: ['hover'] });
      tree.findBestMatch({ nouns: ['button', 'text'], states: ['hover'] });

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Exact matching', () => {
    beforeEach(() => {
      tree.set('navigation.button.icon', ['disabled', 'selected'], 'value1');
      tree.set('navigation.button.text', ['hover'], 'value2');
      tree.set('navigation.button.text', [], 'value3');
    });

    it('should match exact noun path and states', () => {
      const result = tree.match({
        nouns: ['navigation', 'button', 'icon'],
        states: ['disabled', 'selected'],
      });
      expect(result).toBe('value1');
    });

    it('should match exact noun path without states', () => {
      const result = tree.match({
        nouns: ['navigation', 'button', 'text'],
        states: [],
      });
      expect(result).toBe('value3');
    });

    it('should match with different state order', () => {
      const result = tree.match({
        nouns: ['navigation', 'button', 'icon'],
        states: ['selected', 'disabled'], // Order doesn't matter - will be normalized
      });
      expect(result).toBe('value1');
    });
  });

  describe('Wildcard matching', () => {
    beforeEach(() => {
      tree.set('base.*.label', [], 'wildcard-value');
      tree.set('navigation.*.label', [], 'base-value');
      tree.set('navigation.button.label', [], 'specific-value');
      tree.set('navigation.*.text', [], 'partial-wildcard');
    });

    it('should match wildcard patterns', () => {
      const result = tree.match({
        nouns: ['base', 'anything', 'label'],
        states: [],
      });
      expect(result).toBe('wildcard-value');
    });

    it('should prefer specific matches over wildcards', () => {
      const result = tree.match({
        nouns: ['navigation', 'button', 'label'],
        states: [],
      });
      // Specific match (300 points) beats wildcard (200 points)
      expect(result).toBe('specific-value');
    });

    it('should match partial wildcards', () => {
      const result = tree.match({
        nouns: ['navigation', 'sidebar', 'text'],
        states: [],
      });
      expect(result).toBe('partial-wildcard');
    });
  });

  describe('State matching', () => {
    beforeEach(() => {
      tree.set('button.text', ['*'], 'any-state');
      tree.set('button.text', ['hover'], 'hover-state');
      tree.set('button.text', ['disabled', 'hover'], 'multi-state');
      tree.set('button.text', [], 'no-state');
    });

    it('should match base state (*) with any states', () => {
      // Query with states that don't have a specific pattern should fall back to base state
      const result = tree.match({
        nouns: ['button', 'text'],
        states: ['active'],  // Only 'active' - no specific pattern for this
      });
      expect(result).toBe('any-state');
    });

    it('should prefer exact state matches', () => {
      const result = tree.match({
        nouns: ['button', 'text'],
        states: ['hover'],
      });
      // Exact state match (100 + 1 = 101) beats base state (100 + 0 = 100)
      expect(result).toBe('hover-state');
    });

    it('should match multi-state patterns', () => {
      const result = tree.match({
        nouns: ['button', 'text'],
        states: ['disabled', 'hover'],
      });
      expect(result).toBe('multi-state');
    });

    it('should match no-state patterns when no base state exists', () => {
      // Create a new tree without base state
      const tree2 = new StyleTree();
      tree2.set('button.text', [], 'no-state');
      tree2.set('button.text', ['hover'], 'hover-state');

      const result = tree2.match({
        nouns: ['button', 'text'],
        states: [],
      });
      expect(result).toBe('no-state');
    });

    describe('State specificity - patterns can be less specific but not more', () => {
      it('should match pattern with fewer states to query with more states', () => {
        // Pattern "disabled" should match query "disabled-selected"
        tree.set('button', ['disabled'], 'disabled-only');
        const result = tree.match({ nouns: ['button'], states: ['disabled', 'selected'] });
        expect(result).toBe('disabled-only');
      });

      it('should NOT match pattern with more states to query with fewer states', () => {
        // Pattern "disabled-selected" should NOT match query "disabled"
        tree.set('button', ['disabled', 'selected'], 'disabled-selected-value');
        tree.set('button', ['disabled'], 'disabled-only');

        const result = tree.match({ nouns: ['button'], states: ['disabled'] });
        expect(result).toBe('disabled-only');
      });

      it('should match pattern with no states to query with states', () => {
        // Pattern with no states should match query with states
        tree.set('button', [], 'base-value');
        const result = tree.match({ nouns: ['button'], states: ['hover', 'active'] });
        expect(result).toBe('base-value');
      });

      it('should prefer more specific matches in ranking', () => {
        tree.set('button', [], 'no-states');
        tree.set('button', ['hover'], 'hover-only');
        tree.set('button', ['hover', 'active'], 'hover-active');

        // Query with "hover-active" should prefer exact match
        const result = tree.findBestMatch({ nouns: ['button'], states: ['hover', 'active'] });
        expect(result?.value).toBe('hover-active');
        expect(result?.score).toBe(102); // 100 + 2 states
      });

      it('should find all matches with different specificity levels', () => {
        tree.set('button', [], 'no-states');
        tree.set('button', ['hover'], 'hover-only');
        tree.set('button', ['hover', 'active'], 'hover-active');

        const matches = tree.findAllMatches({ nouns: ['button'], states: ['hover', 'active'] });

        // Should find all three matches
        expect(matches.length).toBe(3);
        expect(matches[0].value).toBe('hover-active'); // score: 102
        expect(matches[1].value).toBe('hover-only'); // score: 101
        expect(matches[2].value).toBe('no-states'); // score: 100
      });

      it('should handle complex state combinations', () => {
        tree.set('button', [], 'base');
        tree.set('button', ['disabled'], 'disabled');
        tree.set('button', ['hover'], 'hover');
        tree.set('button', ['disabled', 'hover'], 'disabled-hover');
        tree.set('button', ['disabled', 'hover', 'selected'], 'disabled-hover-selected');

        // Query with all three states
        const matches = tree.findAllMatches({ nouns: ['button'], states: ['disabled', 'hover', 'selected'] });

        expect(matches.length).toBe(5);
        expect(matches[0].value).toBe('disabled-hover-selected'); // score: 103
        expect(matches[1].value).toBe('disabled-hover'); // score: 102
        expect(matches[2].score).toBe(101); // Either disabled or hover
        expect(matches[4].value).toBe('base'); // score: 100
      });

      it('should treat query states ending in ? as optional and prefer matches that include them', () => {
        tree.set('button', ['disabled'], 'generic-disabled');
        tree.set('button', ['button', 'disabled'], 'variant-disabled');
        tree.set('button', ['button'], 'variant-base');

        const matches = tree.findAllMatches({ nouns: ['button'], states: ['button?', 'disabled'] });

        expect(matches[0].value).toBe('variant-disabled');
        expect(matches[0].score).toBe(111);
        expect(matches[1].value).toBe('generic-disabled');
        expect(matches[1].score).toBe(110);
        expect(matches[2].value).toBe('variant-base');
        expect(matches[2].score).toBe(101);
      });

      it('should still allow optional-only matches as lower-priority fallbacks', () => {
        tree.set('button', ['button'], 'variant-only');
        tree.set('button', ['disabled'], 'generic-disabled');

        const matches = tree.findAllMatches({ nouns: ['button'], states: ['button?', 'disabled'] });

        expect(matches[0].value).toBe('generic-disabled');
        expect(matches[1].value).toBe('variant-only');
      });
    });
  });

  describe('Scoring and ranking', () => {
    beforeEach(() => {
      tree.set('navigation.button.icon', ['*'], 'score-100'); // 1 noun * 100 = 100
      tree.set('navigation.*.icon', ['hover'], 'score-201'); // 2 nouns * 100 + 1 state = 201
      tree.set('navigation.button.icon', ['hover'], 'score-301'); // 3 nouns * 100 + 1 state = 301
      tree.set('navigation.button.icon', ['disabled', 'hover'], 'score-302'); // 3 nouns * 100 + 2 states = 302
    });

    it('should rank by noun matches first', () => {
      const matches = tree.findAllMatches({
        nouns: ['navigation', 'button', 'icon'],
        states: ['hover'],
      });
      expect(matches[0].value).toBe('score-301');
      expect(matches[0].score).toBe(301);
    });

    it('should rank by state matches when nouns are equal', () => {
      const matches = tree.findAllMatches({
        nouns: ['navigation', 'button', 'icon'],
        states: ['disabled', 'hover'],
      });
      expect(matches[0].value).toBe('score-302');
      expect(matches[0].score).toBe(302);
      expect(matches[1].value).toBe('score-301');
      expect(matches[1].score).toBe(301);
    });

    it('should return all matches sorted by score', () => {
      const matches = tree.findAllMatches({
        nouns: ['navigation', 'button', 'icon'],
        states: ['hover'],
      });
      expect(matches.length).toBe(3);
      expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
      expect(matches[1].score).toBeGreaterThanOrEqual(matches[2].score);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle the example from requirements', () => {
      tree.set('navigation.button.icon', ['disabled', 'selected'], 'specific');
      tree.set('navigation.*.icon', ['disabled', 'selected'], 'partial-wildcard');
      tree.set('base.*.label', [], 'base-wildcard');

      const result = tree.match({
        nouns: ['navigation', 'button', 'icon'],
        states: ['disabled', 'selected'],
      });
      // Specific match: 3 nouns * 100 + 2 states = 302
      // Partial wildcard: 2 nouns * 100 + 2 states = 202
      expect(result).toBe('specific');
    });

    it('should handle navigation.*.text.color example', () => {
      tree.set('navigation.*.text.color', ['hover'], 'wildcard-hover');
      tree.set('navigation.button.text.color', ['hover'], 'specific-hover');

      const result = tree.match({
        nouns: ['navigation', 'button', 'text', 'color'],
        states: ['hover'],
      });
      // Specific: 4 nouns * 100 + 1 state = 401
      // Wildcard: 3 nouns * 100 + 1 state = 301
      expect(result).toBe('specific-hover');
    });

    it('should not match different noun lengths', () => {
      tree.set('button.text', [], 'value');
      const result = tree.match({
        nouns: ['button', 'text', 'color'],
        states: [],
      });
      expect(result).toBeUndefined();
    });

    it('should not match when required states are missing', () => {
      tree.set('button.text', ['hover', 'active'], 'value');
      const result = tree.match({
        nouns: ['button', 'text'],
        states: ['hover'], // Missing 'active'
      });
      expect(result).toBeUndefined();
    });

    it('falls back from hierarchical nouns to atomic leaf nouns', () => {
      tree.set('icon', [], 'icon-atomic');
      const result = tree.matchHierarchy({
        nouns: ['button', 'icon'],
        states: [],
      });
      expect(result).toBe('icon-atomic');
    });

    it('prefers hierarchical match over atomic fallback', () => {
      tree.set('icon', [], 'icon-atomic');
      tree.set('button.icon', [], 'icon-hierarchical');
      const result = tree.matchHierarchy({
        nouns: ['button', 'icon'],
        states: [],
      });
      expect(result).toBe('icon-hierarchical');
    });
  });

  describe('findBestMatch', () => {
    it('should return match details', () => {
      tree.set('navigation.button.icon', ['disabled', 'selected'], 'value');
      const match = tree.findBestMatch({
        nouns: ['navigation', 'button', 'icon'],
        states: ['disabled', 'selected'],
      });
      expect(match).toBeDefined();
      expect(match?.value).toBe('value');
      expect(match?.score).toBe(302);
      expect(match?.matchingNouns).toBe(3);
      expect(match?.matchingStates).toBe(2);
    });

    it('should return undefined when no match', () => {
      const match = tree.findBestMatch({
        nouns: ['nonexistent'],
        states: [],
      });
      expect(match).toBeUndefined();
    });
  });

  describe('Iterator methods', () => {
    beforeEach(() => {
      tree.set('button.text', ['hover'], 'value1');
      tree.set('button.icon', ['active'], 'value2');
      tree.set('navigation.link', [], 'value3');
    });

    it('should iterate over keys', () => {
      const keys = Array.from(tree.keys());
      expect(keys).toHaveLength(3);
      expect(keys).toContain('button.text:hover');
      expect(keys).toContain('button.icon:active');
      expect(keys).toContain('navigation.link');
    });

    it('should iterate over values', () => {
      const values = Array.from(tree.values());
      expect(values).toHaveLength(3);
      expect(values).toContain('value1');
      expect(values).toContain('value2');
      expect(values).toContain('value3');
    });

    it('should iterate over entries', () => {
      const entries = Array.from(tree.entries());
      expect(entries).toHaveLength(3);
      expect(entries).toContainEqual(['button.text:hover', 'value1']);
      expect(entries).toContainEqual(['button.icon:active', 'value2']);
      expect(entries).toContainEqual(['navigation.link', 'value3']);
    });
  });

  describe('Edge cases', () => {
    it('should reject empty noun path when validation is enabled', () => {
      const validatedTree = new StyleTree({ validateKeys: true });
      expect(() => validatedTree.set('', [], 'value')).toThrow();
    });

    it('should handle single noun', () => {
      tree.set('button', [], 'value');
      const result = tree.match({ nouns: ['button'], states: [] });
      expect(result).toBe('value');
    });

    it('should handle very deep noun paths', () => {
      tree.set('a.b.c.d.e.f.g.h.i.j', [], 'deep-value');
      const result = tree.match({ nouns: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], states: [] });
      expect(result).toBe('deep-value');
    });

    it('should handle many states', () => {
      tree.set('button', ['active', 'disabled', 'focus', 'hover', 'pressed', 'selected'], 'multi-state');
      const result = tree.match({
        nouns: ['button'],
        states: ['active', 'disabled', 'focus', 'hover', 'pressed', 'selected'],
      });
      expect(result).toBe('multi-state');
    });

    it('should handle special characters in values', () => {
      const complexValue = { color: '#ff00ff', data: [1, 2, 3], nested: { a: 'b' } };
      tree.set('button', [], complexValue);
      expect(tree.get('button', [])).toEqual(complexValue);
    });

    it('should handle overwriting existing keys', () => {
      tree.set('button', [], 'value1');
      tree.set('button', [], 'value2');
      expect(tree.get('button', [])).toBe('value2');
      expect(tree.size).toBe(1);
    });
  });

  describe('Options', () => {
    it('should validate keys when validateKeys is true', () => {
      const strictTree = new StyleTree({ validateKeys: true });
      expect(() => strictTree.set('valid.key', [], 'value')).not.toThrow();
      expect(() => strictTree.set('invalid key!', [], 'value')).toThrow();
    });

    it('should not validate keys when validateKeys is false', () => {
      const lenientTree = new StyleTree({ validateKeys: false });
      expect(() => lenientTree.set('invalid key!', [], 'value')).not.toThrow();
    });

    it('should auto-sort states when autoSortStates is true', () => {
      const sortingTree = new StyleTree({ autoSortStates: true });
      sortingTree.set('button', ['z', 'a', 'm'], 'value');
      expect(sortingTree.get('button', ['a', 'm', 'z'])).toBe('value');
    });

    it('should not auto-sort states when autoSortStates is false', () => {
      const nonSortingTree = new StyleTree({ autoSortStates: false });
      nonSortingTree.set('button', ['z', 'a', 'm'], 'value');
      expect(nonSortingTree.get('button', ['z', 'a', 'm'])).toBe('value');
      expect(nonSortingTree.get('button', ['a', 'm', 'z'])).toBeUndefined();
    });

    it('should preserve interCaps keys when normalizeInterCaps is false', () => {
      const legacyTree = new StyleTree({ normalizeInterCaps: false });
      legacyTree.set('button.fontSize', [], 12);

      expect(legacyTree.get('button.fontSize', [])).toBe(12);
      expect(legacyTree.get('button.font.size', [])).toBeUndefined();
    });
  });
});
