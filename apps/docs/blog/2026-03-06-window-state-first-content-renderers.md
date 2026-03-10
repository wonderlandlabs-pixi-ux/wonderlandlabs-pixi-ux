---
slug: window-state-first-content-renderers-march-2026
title: Window State-First Content Renderers (March 2026)
tags: [window, pixi, rendering, docs, pattern]
---

`@wonderlandlabs-pixi-ux/window` now documents a clear state-first pattern for runtime content updates in windows and titlebars.

## New recommended pattern

For dynamic content (toolbar actions, async updates, external events), use this flow:

1. Mutate window/titlebar state (including custom fields).
2. Request refresh by calling `dirty()` on the relevant store.
3. Upsert display objects from `windowContentRenderer` and/or `titlebarContentRenderer`.

## Why this matters

- Avoids Pixi artifacts from direct display-list mutation outside the refresh/ticker path.
- Coalesces multiple state changes between ticks into one final render snapshot.
- Prevents unnecessary add/remove churn when intermediate states cancel out before render.

## Refresh-cycle timing

- `windowContentRenderer` runs during `WindowStore.resolve()` via content refresh.
- `titlebarContentRenderer` runs during `TitlebarStore.resolve()`.

This keeps content generation deterministic and aligned with the rest of the monorepo rendering model.
