import type {
  StyleQuery,
  StyleMatch,
  StyleTreeOptions,
} from './types.js';
import type { DigestOptions } from './digest.js';
import { StyleKeySchema } from './types.js';
import { digestJSON, toJSON as exportToJSON } from './digest.js';
import {
  normalizeStates,
  calculateMatchScore,
} from './utils.js';

/**
 * StyleTree - A hierarchical style matching system
 *
 * Stores styles in a double-nested map structure:
 * Map<nounPath, Map<stateKey, value>>
 *
 * Example:
 * "nav.button.bg.color" -> {
 *   "" -> "black",           // no states
 *   "*" -> "red",            // base state
 *   "hover" -> "blue",       // single state
 *   "disabled-selected" -> "gray"  // multi-state
 * }
 *
 * Supports wildcard matching with "*" in noun paths
 * Ranks matches by: (matching nouns * 100) + matching states
 */
export class StyleTree {
  // Map<nounPath, Map<stateKey, value>>
  private styles: Map<string, Map<string, any>> = new Map();
  private options: Required<StyleTreeOptions>;
  private cache: Map<string, unknown> = new Map();

  constructor(options: StyleTreeOptions = {}) {
    this.options = {
      validateKeys: options.validateKeys ?? true,
      autoSortStates: options.autoSortStates ?? true,
      normalizeInterCaps: options.normalizeInterCaps ?? true,
      cacheLimit: options.cacheLimit ?? 30,
    };
  }

  /**
   * Set a style value
   * Note: For v1, data is assumed to be static - set once during initialization
   * If a key is set twice, a warning is logged but the override is accepted
   * @param nouns - Noun path as string (e.g., "navigation.button.icon")
   * @param states - States as array (e.g., ["disabled", "selected"], ["hover"], or [] for no states)
   * @param value - Style value (can be any type)
   * @example
   * tree.set('nav.button.bg.color', ['*'], 'red')
   * tree.set('nav.button.bg.color', ['hover'], 'blue')
   * tree.set('nav.button.bg.color', ['disabled', 'selected'], 'gray')
   * tree.set('nav.button.bg.color', [], 'black')
   */
  set(nouns: string, states: string[], value: any): void {
    const { nounKey, stateKey } = this.buildKeys(nouns, states);

    if (this.options.validateKeys) {
      const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
      StyleKeySchema.parse(fullKey);
    }

    // Get or create the state map for this noun path
    let stateMap = this.styles.get(nounKey);
    if (!stateMap) {
      stateMap = new Map();
      this.styles.set(nounKey, stateMap);
    }

    // Warn if overwriting an existing value
    if (stateMap.has(stateKey)) {
      const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
      console.warn(`StyleTree: Overwriting existing key "${fullKey}"`);
    }

    stateMap.set(stateKey, value);
    this.clearCache();
  }

  /**
   * Expand an object into one or more style keys under a base noun path.
   * Examples:
   * - setMany('button', [], { color: 'red', size: 12 })
   *   => button.color, button.size
   * - setMany('button', [], { font: { size: 12 } })
   *   => button.font.size (with recurse=true)
   *   => button.font = { size: 12 } (with recurse=false)
   */
  setMany(
    nouns: string,
    states: string[],
    values: Record<string, any>,
    recurse = true,
  ): void {
    for (const [key, value] of Object.entries(values)) {
      const nextPath = nouns ? `${nouns}.${key}` : key;
      if (recurse && isPlainObject(value)) {
        this.setMany(nextPath, states, value, true);
        continue;
      }
      this.set(nextPath, states, value);
    }
  }

  /**
   * Get a style value by exact key match
   * @param nouns - Noun path as string (e.g., "navigation.button.icon")
   * @param states - States as array (e.g., ["hover"], [] for no states)
   * @returns Style value or undefined
   */
  get(nouns: string, states: string[]): any {
    return this.withCache(`get:${this.serializeExactQuery(nouns, states)}`, () => {
      const { nounKey, stateKey } = this.buildKeys(nouns, states);
      const stateMap = this.styles.get(nounKey);
      return stateMap?.get(stateKey);
    });
  }

  /**
   * Check if a style key exists
   * @param nouns - Noun path as string
   * @param states - States as array
   * @returns True if exists
   */
  has(nouns: string, states: string[]): boolean {
    return this.withCache(`has:${this.serializeExactQuery(nouns, states)}`, () => {
      const { nounKey, stateKey } = this.buildKeys(nouns, states);
      const stateMap = this.styles.get(nounKey);
      return stateMap?.has(stateKey) ?? false;
    });
  }

  /**
   * Expand interCaps noun segments into dot-separated, lower-case parts.
   * Examples:
   * - "fontSize" -> "font.size"
   * - "iconVertical" -> "icon.vertical"
   */
  private normalizeNounSegment(segment: string): string[] {
    const trimmed = segment.trim();
    if (!trimmed) {
      return [];
    }
    if (!this.options.normalizeInterCaps || trimmed === '*') {
      return [trimmed];
    }

    const expanded = trimmed
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1.$2')
      .replace(/([a-z0-9])([A-Z])/g, '$1.$2')
      .toLowerCase();

    return expanded.split('.').filter(Boolean);
  }

  private normalizeNounKey(nouns: string): string {
    return nouns
      .split('.')
      .flatMap((segment) => this.normalizeNounSegment(segment))
      .join('.');
  }

  private normalizeNounQuery(nouns: string[]): string[] {
    return nouns
      .flatMap((segment) => segment.split('.'))
      .flatMap((segment) => this.normalizeNounSegment(segment));
  }

  /**
   * Helper method to build noun and state keys from inputs
   * @private
   */
  private buildKeys(nouns: string, states: string[]): { nounKey: string; stateKey: string } {
    const nounKey = this.normalizeNounKey(nouns);

    // Sort states if enabled
    const normalizedStates = this.options.autoSortStates ? normalizeStates(states) : states;
    const stateKey = normalizedStates.join('-');

    return { nounKey, stateKey };
  }

  /**
   * Get the total number of styles (across all noun paths and states)
   */
  get size(): number {
    let count = 0;
    for (const stateMap of this.styles.values()) {
      count += stateMap.size;
    }
    return count;
  }

  /**
   * Get all style keys in "noun.noun:state-state" format
   */
  *keys(): IterableIterator<string> {
    for (const [nounKey, stateMap] of this.styles.entries()) {
      for (const stateKey of stateMap.keys()) {
        yield stateKey ? `${nounKey}:${stateKey}` : nounKey;
      }
    }
  }

  /**
   * Get all style values
   */
  *values(): IterableIterator<any> {
    for (const stateMap of this.styles.values()) {
      yield* stateMap.values();
    }
  }

  /**
   * Get all style entries as [key, value] pairs
   */
  *entries(): IterableIterator<[string, any]> {
    for (const [nounKey, stateMap] of this.styles.entries()) {
      for (const [stateKey, value] of stateMap.entries()) {
        const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
        yield [fullKey, value];
      }
    }
  }

  /**
   * Find the best matching style for a query
   * @param query - Query with nouns and states as arrays
   * @returns Best matching style or undefined
   */
  match(query: StyleQuery): any {
    const match = this.findBestMatch(query);
    return match?.value;
  }

  /**
   * Match a noun hierarchy, then fallback to the leaf noun if no hierarchical
   * style exists. Example: ["button", "icon"] -> fallback ["icon"].
   */
  matchHierarchy(query: StyleQuery): any {
    return this.withCache(`matchHierarchy:${this.serializeQuery(query)}`, () => {
      const normalizedQuery: StyleQuery = {
        nouns: this.normalizeNounQuery(query.nouns),
        states: query.states,
      };

      const hierarchical = this.match(normalizedQuery);
      if (hierarchical !== undefined) {
        return hierarchical;
      }

      const leaf = normalizedQuery.nouns[normalizedQuery.nouns.length - 1];
      if (!leaf || normalizedQuery.nouns.length <= 1) {
        return undefined;
      }

      return this.match({
        nouns: [leaf],
        states: normalizedQuery.states,
      });
    });
  }

  /**
   * Find the best matching style with details
   * @param query - Query with nouns and states as arrays
   * @returns Best match with score details or undefined
   */
  findBestMatch(query: StyleQuery): StyleMatch | undefined {
    return this.withCache(`findBestMatch:${this.serializeQuery(query)}`, () => {
      const matches = this.findAllMatches(query);
      return matches.length > 0 ? matches[0] : undefined;
    });
  }

  /**
   * Find all matching styles, sorted by score (highest first)
   * @param query - Query with nouns and states as arrays
   * @returns Array of matches sorted by score
   */
  findAllMatches(query: StyleQuery): StyleMatch[] {
    return this.withCache(`findAllMatches:${this.serializeQuery(query)}`, () => {
      const targetNouns = this.normalizeNounQuery(query.nouns);
      const targetStates = query.states;
      const normalizedTargetStates = normalizeStates(targetStates);

      const matches: StyleMatch[] = [];

      // Iterate through all noun paths and their state maps
      for (const [nounKey, stateMap] of this.styles.entries()) {
        const patternNouns = nounKey.split('.');

        // Check each state variant for this noun path
        for (const [stateKey, value] of stateMap.entries()) {
          const patternStates = stateKey === '' ? [] : stateKey.split('-');

          const matchResult = calculateMatchScore(
            patternNouns,
            patternStates,
            targetNouns,
            normalizedTargetStates
          );

          if (matchResult) {
            const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
            matches.push({
              key: fullKey,
              value,
              score: matchResult.score,
              matchingNouns: matchResult.matchingNouns,
              matchingStates: matchResult.matchingStates,
            });
          }
        }
      }

      // Sort by score (highest first)
      matches.sort((a, b) => b.score - a.score);

      return matches;
    });
  }

  static fromJSON(json: any, options: DigestOptions = {}): StyleTree {
    const tree = new StyleTree();
    digestJSON(tree, json, options);
    return tree;
  }

  static async fromJSONUrl(
    url: string,
    options: FromJSONUrlOptions = {},
  ): Promise<StyleTree> {
    const json = options.getJson
      ? await options.getJson(url)
      : await loadJSON(url);
    return StyleTree.fromJSON(json, options);
  }

  toJSON(options: { statePrefix?: string } = {}): any {
    return exportToJSON(this, options);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private serializeQuery(query: StyleQuery): string {
    return this.serializeQueryParts(this.normalizeNounQuery(query.nouns), query.states);
  }

  private serializeExactQuery(nouns: string, states: string[]): string {
    return this.serializeQueryParts(this.normalizeNounQuery([nouns]), states);
  }

  private serializeQueryParts(nouns: string[], states: string[]): string {
    const stateParts = this.options.autoSortStates ? normalizeStates(states) : [...states];
    return `${nouns.join('.')}$${stateParts.join('.')}`;
  }

  private withCache<T>(key: string, compute: () => T): T {
    if (this.options.cacheLimit <= 0) {
      return compute();
    }

    if (this.cache.has(key)) {
      const value = this.cache.get(key) as T;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }

    const value = compute();
    this.cache.set(key, value);

    while (this.cache.size > this.options.cacheLimit) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.cache.delete(oldest);
    }

    return value;
  }
}

export type FromJSONUrlOptions = DigestOptions & {
  getJson?: (url: string) => Promise<any>;
};

async function loadJSON(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`StyleTree.fromJSONUrl failed for "${url}" with ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value);
}
