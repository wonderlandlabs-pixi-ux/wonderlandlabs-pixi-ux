import { describe, it, expect } from 'vitest';
import {
  parseStyleKey,
  buildStyleKey,
  normalizeStates,
  nounSegmentMatches,
  stateMatches,
  calculateMatchScore,
} from '../src/utils';

describe('utils', () => {
  describe('parseStyleKey', () => {
    it('should parse key with nouns and states', () => {
      const result = parseStyleKey('navigation.button.icon:disabled-selected');
      expect(result.nouns).toEqual(['navigation', 'button', 'icon']);
      expect(result.states).toEqual(['disabled', 'selected']);
      expect(result.key).toBe('navigation.button.icon:disabled-selected');
    });

    it('should parse key with only nouns', () => {
      const result = parseStyleKey('navigation.button.icon');
      expect(result.nouns).toEqual(['navigation', 'button', 'icon']);
      expect(result.states).toEqual([]);
    });

    it('should parse key with wildcards', () => {
      const result = parseStyleKey('base.*.label:hover');
      expect(result.nouns).toEqual(['base', '*', 'label']);
      expect(result.states).toEqual(['hover']);
    });

    it('should sort states alphabetically', () => {
      const result = parseStyleKey('button:selected-disabled-hover');
      expect(result.states).toEqual(['disabled', 'hover', 'selected']);
    });
  });

  describe('buildStyleKey', () => {
    it('should build key from nouns and states', () => {
      const key = buildStyleKey(['navigation', 'button', 'icon'], ['disabled', 'selected']);
      expect(key).toBe('navigation.button.icon:disabled-selected');
    });

    it('should build key with only nouns', () => {
      const key = buildStyleKey(['navigation', 'button', 'icon']);
      expect(key).toBe('navigation.button.icon');
    });

    it('should sort states', () => {
      const key = buildStyleKey(['button'], ['selected', 'disabled', 'hover']);
      expect(key).toBe('button:disabled-hover-selected');
    });
  });

  describe('normalizeStates', () => {
    it('should sort states alphabetically', () => {
      const result = normalizeStates(['selected', 'disabled', 'hover']);
      expect(result).toEqual(['disabled', 'hover', 'selected']);
    });

    it('should not modify original array', () => {
      const original = ['selected', 'disabled'];
      const result = normalizeStates(original);
      expect(original).toEqual(['selected', 'disabled']);
      expect(result).toEqual(['disabled', 'selected']);
    });
  });

  describe('nounSegmentMatches', () => {
    it('should match exact segments', () => {
      expect(nounSegmentMatches('button', 'button')).toBe(true);
    });

    it('should match wildcard with anything', () => {
      expect(nounSegmentMatches('*', 'button')).toBe(true);
      expect(nounSegmentMatches('*', 'anything')).toBe(true);
    });

    it('should not match different segments', () => {
      expect(nounSegmentMatches('button', 'icon')).toBe(false);
    });
  });

  describe('stateMatches', () => {
    it('should match exact states', () => {
      expect(stateMatches('hover', 'hover')).toBe(true);
    });

    it('should match base state with anything', () => {
      expect(stateMatches('*', 'hover')).toBe(true);
      expect(stateMatches('*', 'disabled')).toBe(true);
    });

    it('should not match different states', () => {
      expect(stateMatches('hover', 'active')).toBe(false);
    });
  });

  describe('calculateMatchScore', () => {
    it('should calculate score for exact match', () => {
      const result = calculateMatchScore(
        ['navigation', 'button', 'icon'],
        ['disabled', 'selected'],
        ['navigation', 'button', 'icon'],
        ['disabled', 'selected']
      );
      expect(result).toEqual({
        score: 302, // 3 nouns * 100 + 2 states
        matchingNouns: 3,
        matchingStates: 2,
      });
    });

    it('should calculate score with wildcards', () => {
      const result = calculateMatchScore(
        ['navigation', '*', 'icon'],
        ['hover'],
        ['navigation', 'button', 'icon'],
        ['hover']
      );
      expect(result).toEqual({
        score: 201, // 2 nouns * 100 + 1 state (wildcard doesn't count)
        matchingNouns: 2,
        matchingStates: 1,
      });
    });

    it('should calculate score with base state', () => {
      const result = calculateMatchScore(
        ['button', 'text'],
        ['*'],
        ['button', 'text'],
        ['disabled', 'hover']
      );
      expect(result).toEqual({
        score: 200, // 2 nouns * 100 + 0 states (base state doesn't count)
        matchingNouns: 2,
        matchingStates: 0,
      });
    });

    it('should return null for different noun lengths', () => {
      const result = calculateMatchScore(
        ['button', 'text'],
        [],
        ['button', 'text', 'color'],
        []
      );
      expect(result).toBeNull();
    });

    it('should return null for non-matching nouns', () => {
      const result = calculateMatchScore(
        ['button', 'text'],
        [],
        ['button', 'icon'],
        []
      );
      expect(result).toBeNull();
    });

    it('should return null when pattern states not in target', () => {
      const result = calculateMatchScore(
        ['button'],
        ['hover', 'active'],
        ['button'],
        ['hover'] // Missing 'active'
      );
      expect(result).toBeNull();
    });

    it('should match when pattern has no states and target has no states', () => {
      const result = calculateMatchScore(
        ['button'],
        [],
        ['button'],
        []
      );
      expect(result).toEqual({
        score: 100,
        matchingNouns: 1,
        matchingStates: 0,
      });
    });

    describe('State specificity rules', () => {
      it('should match when pattern is LESS specific (fewer states)', () => {
        // Pattern "disabled" should match target "disabled-selected"
        const result = calculateMatchScore(
          ['button'],
          ['disabled'],
          ['button'],
          ['disabled', 'selected']
        );
        expect(result).not.toBeNull();
        expect(result?.matchingStates).toBe(1);
        expect(result?.score).toBe(101);
      });

      it('should NOT match when pattern is MORE specific (more states)', () => {
        // Pattern "disabled-selected" should NOT match target "disabled"
        const result = calculateMatchScore(
          ['button'],
          ['disabled', 'selected'],
          ['button'],
          ['disabled']
        );
        expect(result).toBeNull();
      });

      it('should match when pattern has no states but target does (less specific)', () => {
        // Pattern with no states should match target with states
        const result = calculateMatchScore(
          ['button'],
          [],
          ['button'],
          ['hover', 'active']
        );
        expect(result).not.toBeNull();
        expect(result?.matchingStates).toBe(0);
        expect(result?.score).toBe(100);
      });

      it('should match when pattern has 1 state and target has 3 states', () => {
        // Pattern "hover" should match target "active-disabled-hover"
        const result = calculateMatchScore(
          ['button'],
          ['hover'],
          ['button'],
          ['active', 'disabled', 'hover']
        );
        expect(result).not.toBeNull();
        expect(result?.matchingStates).toBe(1);
      });

      it('should NOT match when pattern has 3 states and target has 1 state', () => {
        // Pattern "active-disabled-hover" should NOT match target "hover"
        const result = calculateMatchScore(
          ['button'],
          ['active', 'disabled', 'hover'],
          ['button'],
          ['hover']
        );
        expect(result).toBeNull();
      });

      it('should NOT match when pattern has 2 states and target has 1 different state', () => {
        // Pattern "disabled-hover" should NOT match target "active"
        const result = calculateMatchScore(
          ['button'],
          ['disabled', 'hover'],
          ['button'],
          ['active']
        );
        expect(result).toBeNull();
      });

      it('should match when all pattern states are in target states', () => {
        // Pattern "disabled-hover" should match target "active-disabled-hover-selected"
        const result = calculateMatchScore(
          ['button'],
          ['disabled', 'hover'],
          ['button'],
          ['active', 'disabled', 'hover', 'selected']
        );
        expect(result).not.toBeNull();
        expect(result?.matchingStates).toBe(2);
      });
    });
  });
});
