---
slug: ticker-forest-scale-tracking-march-2026
title: TickerForest Scale Tracking and Counter-Scale Helpers (March 2026)
tags: [ticker-forest, pixi, scale, titlebar, docs]
---

`@wonderlandlabs-pixi-ux/ticker-forest` now has first-class support for scale-aware dirty tracking and counter-scale helpers.

## What changed

- Added `dirtyOnScale` to `TickerForest` config.
- Added `getScale(): { x, y }` and `getInverseScale(): { x, y }`.
- Standardized dirty triggering through `dirty()` so store updates are coalesced into ticker-frame resolve cycles.
- Scale observer now only triggers dirtying when `isDirty()` is currently `false`, and uses axis-aware `distinctUntilChanged`.

## `dirtyOnScale` options

`dirtyOnScale: true` enables defaults:
- `watchX: true`
- `watchY: true`
- `epsilon: 0.0001`

You can also pass an object with:
- `watchX`
- `watchY`
- `epsilon`

## Why this matters

This removes repeated per-package scale observer logic and centralizes it in `TickerForest`.
Packages like `window`, `grid`, and `resizer` can now share one pattern:

1. Track container scale.
2. Mark dirty on meaningful scale deltas.
3. Re-render once on the next ticker frame.

For UI elements that should appear visually constant under zoom (for example titlebar content or handles), use `getInverseScale()` in `resolve()`.

## Titlebar pattern

For titlebar rendering under zoom:
- width should follow the window width directly
- height should be multiplied by inverse `y` scale
- content can live in a sub-container scaled by inverse `y`
- mask height should use the same inverse-scaled titlebar height

This keeps the titlebar's perceived height stable while preserving alignment with the parent window.
