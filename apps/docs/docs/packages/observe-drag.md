---
title: observe-drag
description: Package README for @wonderlandlabs-pixi-ux/observe-drag
---

# @wonderlandlabs-pixi-ux observe-drag

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/observe-drag](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/observe-drag)

Previous attempts to generalize drags were hitting snags; while difficult to diagnose they froze up the browser completely.
This was likely because multiple targets were receiving `pointerdown` events causing a cascade of complex updates.

To stop this, this package creates an owner `BehaviorSubject`, `drag$`.
When anyone receives a `pointerdown`, it sends a bundle to `down$` including:

```js
{
  downEvent: FederatedEvent,
  move$: Subject<MoveEvent>
}
```

`down$`'s listener terminates (calling `move$.error(MoveBusyError)`) if `drag$.value` is non-empty.

Otherwise, in closure it listens to `pointermove` and streams its data (filtered for `downEvent.pointerId`) to `move$.next()`.
It also listens to `pointerup` (filtered by `pointerId`) and other terminal events; on terminal value it:

1. calls `move$.complete()`
2. unhooks all created listeners from stage
3. completes any other scoped streams

## Implications

1. **Only one listener to a given stage can receive move events at any given time**. Other down events are ignored and no listener cluster is generated.
2. **Pointer events from other IDs are ignored inside a given closure**. Up/leave events from other pointers neither terminate scoped streams nor send coordinates to it.
3. **Move and terminal listeners are only created and added after a down is received, and only endure until termination**.
4. **All listeners and streams terminate on completion**.
