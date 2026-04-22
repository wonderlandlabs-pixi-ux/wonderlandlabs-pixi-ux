---
title: grid
description: Package README for @wonderlandlabs-pixi-ux/grid
---
# @wonderlandlabs-pixi-ux/grid

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`grid` gives users a stable spatial reference for editors, maps, and canvas tools.
It keeps grid rendering and zoom/pan behavior in sync so large workspaces stay navigable.

Grid/artboard renderer for PixiJS using `GridManager`.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/grid
```

## What This Package Exports

- `GridManager`
- `GridManagerConfig`
- grid/artboard config types (`GridLineOptions`, `ArtboardOptions`, `GridStoreValue`)

## Basic Usage

```ts
import { Application } from 'pixi.js';
import { createRootContainer, createZoomPan, makeStageDraggable, makeStageZoomable } from '@wonderlandlabs-pixi-ux/root-container';
import { GridManager } from '@wonderlandlabs-pixi-ux/grid';

const app = new Application();
await app.init({ width: 1200, height: 800 });

const { root } = createRootContainer(app);
app.stage.addChild(root); // manual mount
const { zoomPan } = createZoomPan(app, root);
root.addChild(zoomPan); // manual mount
// makeStageDraggable uses observe-drag + dragTargetDecorator under the hood.
makeStageDraggable(app, zoomPan);
makeStageZoomable(app, zoomPan);

const grid = new GridManager({
  application: app,
  zoomPanContainer: zoomPan,
  cache: {
    enabled: true,
    resolution: 2,
    antialias: true,
  },
  gridSpec: {
    grid: { x: 50, y: 50, color: 0xcccccc, alpha: 0.5 },
    majorGridFrequency: 4,
    artboard: { x: 0, y: 0, width: 800, height: 600, color: 0x000000, alpha: 1 },
  },
});

// Update on demand.
grid.updateGridSpec({
  grid: { x: 40, y: 40 },
});

// Cleanup when done.
grid.cleanup();
```

## Grid Spec Shape

```ts
{
  grid: { x: number, y: number, color: number, alpha: number },
  majorGridFrequency?: number | { x: number, y: number },
  artboard?: { x: number, y: number, width: number, height: number, color: number, alpha: number },
}
```

`majorGridFrequency` semantics:

- `0` disables major grid lines.
- `1` makes every grid line a major grid line.
- `2` shows one base grid line between major lines.
- `{ x, y }` lets you control X/Y major frequency independently.

## Grid Manager Config

```ts
{
  application: Application,
  zoomPanContainer: Container,
  cache?: {
    enabled?: boolean,
    resolution?: number,
    antialias?: boolean,
    debug?: boolean | { logger?: (info) => void },
  },
  gridSpec: {
    grid: { x: number, y: number, color: number, alpha: number },
    majorGridFrequency?: number | { x: number, y: number },
    artboard?: { x: number, y: number, width: number, height: number, color: number, alpha: number },
  },
}
```

## Cache Mode

`GridManager` supports an optional cache mode for the grid container:

- `cache.enabled` (default `true`): enables Pixi `cacheAsTexture` for the grid container.
- `cache.resolution` (default `2`): base cache texture resolution multiplier (scaled by zoom).
- `cache.antialias` (default `true`): antialiasing for the cached texture.
- `cache.debug` (default `false`): logs cache texture stats on zoom redraw (`textureWidthPx`, `textureHeightPx`, `pixelCount`, measured bytes if available, and estimated memory). You can pass `cache.debug.logIntervalMs` to throttle logging.

Cache resolution scales continuously with zoom as `effectiveResolution = cache.resolution * zoom`.
Cache is refreshed automatically after redraw events (`stage-zoom`, `stage-drag`, renderer resize, or `updateGridSpec`), so you do not need to manually call `updateCacheTexture`.

```ts
// Dynamic-heavy editing mode (no cache)
new GridManager({
  application: app,
  zoomPanContainer: zoomPan,
  cache: { enabled: false },
  gridSpec,
});

// Default mode (cached @ 2x)
new GridManager({
  application: app,
  zoomPanContainer: zoomPan,
  cache: { enabled: true, resolution: 2, antialias: true },
  gridSpec,
});

// Debug mode: default console logger
new GridManager({
  application: app,
  zoomPanContainer: zoomPan,
  cache: { enabled: true, debug: true },
  gridSpec,
});

// Debug mode: custom logger
new GridManager({
  application: app,
  zoomPanContainer: zoomPan,
  cache: {
    enabled: true,
    debug: {
      logger: (info) => {
        // info.estimatedMiB, info.textureWidthPx, info.textureHeightPx, info.activeResolution, info.zoom
      },
    },
  },
  gridSpec,
});
```

## Runtime Behavior

- Listens for `stage-zoom` and `stage-drag` events from stage decorators.
- Works with `makeStageDraggable` drag ownership semantics (single active drag stream).
- Redraws visible lines directly with `Graphics` primitives.
- Draws major grid lines at `grid * majorGridFrequency` (major lines reuse grid color with stronger alpha).
- Optionally caches the rendered grid container as a texture with zoom-adaptive resolution.
- Keeps line thickness visually stable across zoom levels.
- Automatically increases effective spacing at small zoom to reduce visual clutter.
