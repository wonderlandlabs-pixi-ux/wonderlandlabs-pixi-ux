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
