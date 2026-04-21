# TODO

## Scale Observation

- Extract scale observation from `@wonderlandlabs-pixi-ux/ticker-forest` into a dedicated observer package.
- Define a clean observer API for reading effective container scale and subscribing to scale changes independently of `TickerForest`.
- Refactor `TickerForest` to consume the observer package instead of owning scale observation directly.
- Audit current scale-aware consumers and migrate them to the observer package where that improves separation of concerns.

## Grid

- Evaluate moving grid redraw/invalidations further into `TickerForest` conventions.
- Specifically assess whether `GridManager` should rely more on `TickerForest` dirty scheduling and scale-driven invalidation instead of separate zoom/drag wiring.
- If the refactor is worthwhile, align grid scale handling with `dirtyOnScale` rather than keeping parallel scale observation logic.

## Box

- Add a `rotation` parameter to `box`.
- Add a `rotationPoint` parameter to `box`.
- Define how `rotationPoint` interacts with positioning, bounds, and existing layout assumptions before implementation.
- Add a `wrap` layout strategy for `box`.
- Define `wrap` as: lay out children first from a top-left origin, then wrap the parent box around the final child extents.
- Decide how `wrap` should interact with `bloat`, absolute children, padding/insets, and future virtual-box collapsing before implementation.
- Revisit `BoxTree.children` input types. Consider dropping plain object support in favor of ordered inputs only (`Map` or tuple arrays) so child iteration order is always explicit and not subject to JS object key ordering rules for numeric-like keys.
- Add Pixi injection seams around `boxTreeToPixi` / button rendering so traversal, measurement, and invalidation order can be tested without deep Pixi mocking.
- Evaluate adapter or engine patterns that let a non-rendering test harness stub container/text/graphics creation while preserving the real layout/update flow.
