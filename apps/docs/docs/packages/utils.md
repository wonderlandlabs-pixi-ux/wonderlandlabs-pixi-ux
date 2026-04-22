---
title: utils
description: Package README for @wonderlandlabs-pixi-ux/utils
---
# @wonderlandlabs-pixi-ux/utils

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`utils` holds shared helpers that other Pixi UX packages use for render scheduling and scale-aware point reads.

Shared utility helpers for the `@wonderlandlabs-pixi-ux/*` packages.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/utils
```

## `getSharedRenderHelper(app, options?)`

Returns an app-scoped shared render helper from an internal `WeakMap`, creating it on first access.

- Key: `app` object
- Value: one shared render helper for that app
- Cache rule: first config wins per app key
  - If `getSharedRenderHelper(app, { throttleMs: 30 })` is called first, later calls with different values for the same `app` keep using `30`.

This is intended for boot-time setup where many package consumers (drag/zoom/etc.) should share one throttle stream and one render policy.

```ts
import { getSharedRenderHelper } from '@wonderlandlabs-pixi-ux/utils';

// App boot: establish the shared policy once.
const sharedRender = getSharedRenderHelper(app, { throttleMs: 30 });

// Later, other modules can fetch the same shared helper.
const sameSharedRender = getSharedRenderHelper(app);
sameSharedRender.request();
```

Singleton and lifetime rules:

1. The first call to `getSharedRenderHelper(app, options?)` for a given `app` determines the helper configuration.
2. The shared helper lives for the lifetime of that `app` and auto-cleans up when `app.destroy(...)` is called.
3. Any later call for that same `app` returns the original helper instance with that original timing/config profile.
Create or retrieve your shared helper during app boot with your desired config.

Notes:

- `destroy()` on a shared helper is intentionally a no-op so one consumer cannot tear down rendering for others.
- Shared helper internals are torn down automatically when `app.destroy(...)` is called.
- The cache uses `WeakMap`, so entries are eligible for GC when the app object is no longer referenced.

## `createRenderHelper(app, options?)`

Creates a throttled render helper for apps that expose `render()`.

Options:

- `throttleMs` (default `30`): throttle window in milliseconds for `request()`.
- `leading` (default `true`): if true, first request in a window renders immediately.
- `trailing` (default `false`): if true, emits one final render at the end of the window when additional requests arrive.

```ts
import { createRenderHelper } from '@wonderlandlabs-pixi-ux/utils';

const helper = createRenderHelper(app, {
  throttleMs: 30,
  trailing: true,
});

helper.request(); // throttled render
helper.now();     // immediate render
helper.destroy(); // cleanup queued trailing render
```

Timing behavior:

- `request()` sends a render pulse into a throttled stream (`Subject` + `throttleTime`).
- With defaults (`leading: true`, `trailing: false`), rapid calls render at most once per `throttleMs` window, and intermediate requests are dropped.
- `now()` always calls `app.render()` immediately and does not wait for throttle timing.
- `destroy()` unsubscribes and completes the stream so no further throttled renders can fire.
- If `throttleMs <= 0`, `request()` behaves like `now()` (immediate render every call).

Example timeline (`throttleMs: 30`, `leading: true`, `trailing: false`):

- `t=0ms` `request()` -> render now
- `t=8ms` `request()` -> skipped
- `t=20ms` `request()` -> skipped
- `t=31ms` `request()` -> render now

## `readScalePoint(displayObject)`

Reads a display object's effective world scale into a point-like `{ x, y }` value.

Use it when layout or interaction code needs the actual resolved scale instead of a configured local scale.

```ts
import { readScalePoint } from '@wonderlandlabs-pixi-ux/utils';

const scale = readScalePoint(container);
console.log(scale.x, scale.y);
```
