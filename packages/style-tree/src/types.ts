import { z } from 'zod';

/**
 * A style key is composed of:
 * - Noun path: dot-separated hierarchy (e.g., "navigation.button.icon")
 * - States: colon-separated, alphabetically ordered (e.g., ":disabled-selected")
 * 
 * Examples:
 * - "navigation.button.icon:disabled-selected"
 * - "base.*.label:hover"
 * - "navigation.button.text.color"  (no states)
 * - "button:*"  (any state)
 */
export type StyleKey = string;

/**
 * Style value can be any type
 */
export type StyleValue = unknown;

/**
 * Parsed style key components
 */
export interface ParsedStyleKey {
  /** Noun path segments (e.g., ["navigation", "button", "icon"]) */
  nouns: string[];
  /** State segments, alphabetically sorted (e.g., ["disabled", "selected"]) */
  states: string[];
  /** Original key string */
  key: string;
}

/**
 * Match result with score
 */
export interface StyleMatch {
  /** The matching style key (e.g., "nav.button:hover") */
  key: string;
  /** The style value (can be any type) */
  value: any;
  /** Match score: (matching nouns * 100) + matching states */
  score: number;
  /** Number of matching noun segments */
  matchingNouns: number;
  /** Number of matching state segments */
  matchingStates: number;
}

/**
 * Query for finding styles
 */
export interface StyleQuery {
  /** Noun path as array (e.g., ["navigation", "button", "icon"]) */
  nouns: string[];
  /** States as array (e.g., ["disabled", "selected"], or [] for no states) */
  states: string[];
}

/**
 * Schema for validating style keys
 */
export const StyleKeySchema = z.string().refine(
  (key) => {
    // Must contain only alphanumeric, dots, colons, hyphens, asterisks
    return /^[a-zA-Z0-9.*:-]+$/.test(key);
  },
  { message: 'Style key must contain only alphanumeric characters, dots, colons, hyphens, and asterisks' }
);

/**
 * Options for StyleTree
 */
export interface StyleTreeOptions {
  /** Whether to validate keys on set (default: true) */
  validateKeys?: boolean;
  /** Whether to auto-sort states (default: true) */
  autoSortStates?: boolean;
  /** Whether to normalize interCaps nouns into dot-separated parts (default: true) */
  normalizeInterCaps?: boolean;
  /** Number of retrieval query results to memoize per tree (default: 30, 0 disables caching) */
  cacheLimit?: number;
}

/**
 * Wildcard constant
 */
export const WILDCARD = '*';

/**
 * Base state constant (matches any state)
 */
export const BASE_STATE = '*';
