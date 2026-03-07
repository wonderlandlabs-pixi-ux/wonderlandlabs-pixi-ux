import { z } from 'zod';
import type { Application, Container } from 'pixi.js';

// ============================================================================
// Grid Line Types
// ============================================================================

export interface GridLineOptions {
  x: number;
  y: number;
  color: number;
  alpha: number;
}

// Schema for grid line configuration
export const GridLineSchema = z.object({
  x: z.number().min(1).default(50),
  y: z.number().min(1).default(50),
  color: z.number().default(0xcccccc),
  alpha: z.number().min(0).max(1).default(0.5),
});

export type GridLineConfig = z.infer<typeof GridLineSchema>;

// ============================================================================
// Artboard Types
// ============================================================================

export interface ArtboardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  alpha: number;
}

// Schema for artboard configuration
export const ArtboardSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().min(1).default(800),
  height: z.number().min(1).default(600),
  color: z.number().default(0x000000),
  alpha: z.number().min(0).max(1).default(1),
});

export type ArtboardConfig = z.infer<typeof ArtboardSchema>;

// ============================================================================
// Grid Store Schema
// ============================================================================

// Schema for grid configuration
export const GridStoreSchema = z.object({
  grid: GridLineSchema,
  gridMajor: GridLineSchema.optional(),
  artboard: ArtboardSchema.optional(),
});

export type GridStoreValue = z.infer<typeof GridStoreSchema>;

// ============================================================================
// Grid Manager Types
// ============================================================================

export interface GridManagerValue {
  gridSpec: GridStoreValue;
}

export type GridRedrawReason = 'zoom' | 'drag' | 'resize' | 'spec-update' | 'init' | 'unknown';

export interface GridCacheDebugInfo {
  reason: GridRedrawReason;
  zoom: number;
  baseResolution: number;
  activeResolution: number;
  textureWidthPx: number;
  textureHeightPx: number;
  pixelCount: number;
  measuredBytes: number | null;
  measuredBytesMethod: 'resource-byteLength' | 'resource-data-byteLength' | 'unavailable';
  estimatedBytes: number;
  estimatedMiB: number;
}

export interface GridCacheDebugOptions {
  logger?: (info: GridCacheDebugInfo) => void;
  logIntervalMs?: number;
}

export interface GridCacheOptions {
  enabled?: boolean;
  resolution?: number;
  antialias?: boolean;
  debug?: boolean | GridCacheDebugOptions;
}

export interface GridManagerConfig {
  gridSpec: GridStoreValue;
  application: Application;
  zoomPanContainer: Container;
  cache?: GridCacheOptions;
}

export interface WorldBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
