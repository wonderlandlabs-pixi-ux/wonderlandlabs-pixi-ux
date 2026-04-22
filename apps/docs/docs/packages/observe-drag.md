---
title: observe-drag
description: Package README for @wonderlandlabs-pixi-ux/observe-drag
---
# @wonderlandlabs-pixi-ux/observe-drag

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`observe-drag` enforces a single active drag owner via a module-level pointer lock by default.

## Behavior

1. A `pointerdown` is accepted only when no active pointer is in progress.
2. Accepted drags forward matching `pointermove` events (`pointerId` must match the accepted down).
3. `pointerup`, `pointerupoutside`, or `pointercancel` ends the active drag and releases ownership.
4. Competing `pointerdown` events while busy call `onBlocked`.
5. A configurable inactivity watchdog auto-releases ownership if no matching `pointermove` is seen (`abortTime`, default `1000ms`; set `abortTime: 0` to disable).
6. You can inject your own lock (`activePointer$`) at factory creation to override the default module singleton lock.
7. If an app with `render()` is provided, drag moves trigger a throttled render (default `30ms`, configurable via `renderThrottleMs`) and drag terminal events (`pointerup`, `pointerupoutside`, `pointercancel`) force a final render.

## Usage
`dragDecorator` wraps your listeners and handles Pixi container movement with default assumptions:

1. target is a Pixi `Container`-like object (`position`, optional `parent.toLocal`)
2. pointer coordinates come from Pixi events (`event.global`)
3. movement is calculated in parent-local space when possible (`parent.toLocal(globalPoint)`)

### 1. Simple Dragging

```ts
import dragObserverFactory, {dragDecorator} from '@wonderlandlabs-pixi-ux/observe-drag';

const observeDown = dragObserverFactory({stage: app.stage, app});
const sub = observeDown(target, dragDecorator(), {dragTarget: myContainer});
```

### 2. Custom Listeners

```ts
const sub = observeDown(
  target,
  dragDecorator({
    onStart(event, dragTarget) {
      // optional domain setup
    },
    onMove(event, context, dragTarget) {
      // extra side effects after default movement
    },
    onUp(event, context, dragTarget) {
      // drag finished
    },
    onBlocked(event, dragTarget) {
      // another drag currently owns the stage
    },
    onError(error, phase, event, dragTarget) {
      // listener threw; handle safely
    },
  }),
  {
    dragTarget: myContainer,
    abortTime: 1500,
    getDragTarget(downEvent) {
      // optional dynamic target resolution
      return downEvent.pointerId === 2 ? altContainer : myContainer;
    },
    debug(source, message, data) {
      if (message === 'pointer.busy') {
        console.warn(source, message, data);
        return;
      }
      console.log(source, message, data);
    },
  },
);
```

### 3. Snapping / Transform

```ts
const sub = observeDown(
  target,
  dragDecorator({
    transformPoint(point) {
      return {
        x: Math.round(point.x / 10) * 10,
        y: Math.round(point.y / 10) * 10,
      };
    },
  }),
  {dragTarget: myContainer},
);
```

## Notes

- You do not need to re-subscribe after each `pointerup`; one subscription handles repeated drag cycles.
- Returning context from `onStart` is optional.
- Receiving context in `onMove` and `onUp` is optional; if `onStart` returns nothing, context is `undefined`.
- If returned, `onStart` context can be any object and is passed into `onMove` and `onUp`.
- Core observe-drag does not move targets by itself; use `dragDecorator()` for default target motion, or move the target in your own listeners.
- Subscription options support `dragTarget` (static), `getDragTarget(downEvent, context)` (dynamic), and `abortTime` (watchdog timeout in ms; `0` disables it).
- Factory options support `activePointer$` so you can provide your own lock instead of using the default module singleton.
- Factory options also support `stage` (when `app` is not provided), optional `app` for drag render calls, and `renderThrottleMs` to tune render throttle (default `30`).
- Drag render throttling uses an app-scoped shared helper cache (`WeakMap`), so multiple drag/zoom consumers on the same app share one throttle stream.
- The first shared helper retrieval/config for a given app wins; later retrievals use that same timing profile.
- Shared helper internals live for the app lifetime and auto-clean on `app.destroy(...)`.
- `dragDecorator()` provides default Pixi container dragging using parent-local coordinates, then delegates to your wrapped listeners.
- `dragDecorator()` works with no parameters.
- `dragTargetDecorator()` is deprecated and remains as a compatibility wrapper.
- `debug` is part of the options object (`{ debug(source, message, data) {} }`), not a separate third-arg overload.
- `onError` is reserved for thrown listener errors and internal callback failures. Busy contention uses `onBlocked`, not `onError`.
