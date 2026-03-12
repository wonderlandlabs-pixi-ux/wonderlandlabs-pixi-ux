---
slug: window-titlebar-mechanics-update-march-2026
title: Window Titlebar Mechanics Update (March 2026)
tags: [window, titlebar, hover, scale, pixi, docs]
---

`@wonderlandlabs-pixi-ux/window` now uses a simpler and more explicit titlebar mechanics model.

## Counter-scale is now an explicit inner layer

`CounterScalingTitlebar` no longer rewrites the `titlebarContentRenderer(...)` contract.

Instead, it creates a first child inside the titlebar `contentContainer` labeled `counter-scale`.

- `contentContainer` remains the public renderer input.
- Renderers that want zoom-independent titlebar content should resolve `contentContainer.getChildByLabel('counter-scale')`.
- Standard titlebar content can still render directly into `contentContainer`.

This keeps `TickerForest` responsibilities unchanged and avoids "magic" callback geometry.

## Stock titlebar renderers follow the same rule

The built-in stock titlebar renderer now checks for the `counter-scale` child and writes into it when present.

That means:

- default titlebars still work with no extra setup
- counter-scaled titlebars keep text and controls visually stable under zoom
- custom renderers can opt into the same behavior explicitly

## Hover titlebars now use a shared over/out stream

`onHover` titlebars no longer rely on independent body/titlebar timers.

The current behavior is:

- `pointerover` on either the body or the titlebar shows the titlebar immediately
- `pointerout` from either region starts a delayed unhover
- a new `pointerover` from either region cancels the pending unhover

This gives a single hover session across both regions, which makes it much easier to move from body to titlebar without flicker.

## What did not change

This update does **not** include the larger layout refactor discussed later for treating the body rect as the canonical window rect and rendering the titlebar upward from the window origin.

The changes in this update are limited to:

- explicit counter-scale layering
- stock renderer alignment with that layering
- shared hover mechanics for hover-only titlebars

## Practical renderer pattern

```ts
titlebarContentRenderer: ({ contentContainer }) => {
  const counterScale = contentContainer.getChildByLabel('counter-scale') as Container | null;
  const target = counterScale ?? contentContainer;

  // upsert titlebar controls into target
}
```

That pattern keeps the renderer honest: the renderer chooses the layer it wants to write into instead of receiving altered layout inputs.
