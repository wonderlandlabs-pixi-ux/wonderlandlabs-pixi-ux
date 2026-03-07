# @wonderlandlabs-pixi-ux/observe-drag

Previous attempts to generalize drags hit snags and, while difficult to diagnose, could freeze the browser completely.
This appears to happen when multiple targets receive down events and trigger a cascade of complex updates.

To avoid that congestion, this package creates an owner `BehaviorSubject`, `drag$`.
When anyone receives a `pointerDown`, it sends a bundle to `down$` including:
```js
{
  downEvent: FederatedEvent,
  move$: Subject<MoveEvent>
}
```

`down$`'s listener terminates (calling `move$.error(MoveBusyError)`) if `drag$.value` is non-empty.

Otherwise, in closure it listens to `pointermove` and streams its data (filtered for `downEvent.pointerId`) to `move$.next()`.
It also listens to `pointerup` (filtered for `pointerId`) and several other terminal events; on receiving a value it:
1. calls move$.complete()
2. unhooks all created listeners from stage
3. completes any other scoped streams

## Implications

1. **Only one listener to a given stage can receive move events at any given time**. Other down events are ignored and no listener cluster is generated.
2. **Pointer events from other IDs are ignored inside a given closure**. Up/leave events from other pointers neither terminate scoped streams nor send coordinates to them.
3. **Move and terminal listeners are only created after a down is received, and only endure until termination**.
4. **All listeners and streams terminate on completion**.
