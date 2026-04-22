# Window Titlebar Dynamics

This document describes the current titlebar mechanics in `@wonderlandlabs-pixi-ux/window`.

## Renderer Frame Of Reference

`titlebarContentRenderer(...)` keeps the same public contract for both regular and counter-scaled titlebars:

```ts
titlebarContentRenderer: ({
  titlebarStore,
  titlebarValue,
  windowStore,
  windowValue,
  contentContainer,
  localRect,
  localScale,
}) => {
  // upsert Pixi content here
}
```

The important context is:

- `contentContainer` is always the public parent container passed to the renderer
- `contentContainer` belongs to the titlebar, not the window body
- `contentContainer` uses titlebar-local coordinates with origin `(0, 0)` at the titlebar's top-left corner
- `localRect` and `localScale` are not rewritten by `CounterScalingTitlebar`
- `localRect` describes the titlebar render bounds in `contentContainer`'s local coordinate space
- `localScale` is the effective scale of `contentContainer` itself
- if a titlebar needs zoom-independent content, the renderer should explicitly choose the counter-scaled child layer

So the renderer context is always "you are drawing into the titlebar layer." It is never a window-body renderer, and
`CounterScalingTitlebar` does not silently substitute a different frame of reference.

## Titlebar Height And Anchor

`TitlebarStore.height` is the geometry source of truth for titlebar layout.

- regular titlebars return the configured titlebar height
- `CounterScalingTitlebar` overrides `height` to return the computed current visual height
- titlebar rect, pivot, background, and hit area all derive from `height`

The titlebar is anchored upward from the window origin.

- the body or window rect remains the canonical content rect
- the titlebar container is pivoted upward by its computed height
- window body renderers do not need to offset themselves by titlebar height

## Counter-Scaled Titlebars

`CounterScalingTitlebar` adds a first child inside `contentContainer` labeled `counter-scale`.

- `contentContainer` remains the root renderer target
- `contentContainer.getChildByLabel('counter-scale')` is the zoom-independent child layer
- that child is inverse-scaled during layout
- when you render into `counter-scale`, you are intentionally moving from the default titlebar-local layer into a zoom-independent inner titlebar layer

Recommended renderer pattern:

```ts
titlebarContentRenderer: ({ contentContainer }) => {
  const counterScale = contentContainer.getChildByLabel('counter-scale') as Container | null;
  const target = counterScale ?? contentContainer;

  // upsert titlebar controls into target
}
```

The stock titlebar renderer follows the same rule: when `counter-scale` exists, stock title text, icons, and buttons render there.

## Hover Dynamics

For `titlebar.mode === 'onHover'`, the titlebar uses one shared hover session across both the window body and the titlebar itself.

Current behavior:

- `pointerover` on the body shows the titlebar immediately
- `pointerover` on the titlebar also keeps it visible
- `pointerout` from either region starts a delayed unhover
- a new `pointerover` from either region cancels that pending unhover

This means the titlebar stays available while the pointer moves from body to titlebar, instead of flickering off between the two regions.

## State And Refresh Pattern

Keep titlebar updates state-first:

1. mutate titlebar or window state
2. call `dirty()` on the relevant store
3. upsert Pixi objects from `titlebarContentRenderer(...)` during resolve

Avoid treating titlebar callbacks as imperative one-off mutation hooks outside the refresh cycle.
