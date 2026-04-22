---
title: caption
description: Package README for @wonderlandlabs-pixi-ux/caption
---
# @wonderlandlabs-pixi-ux/caption

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`caption` is for dialogue and annotation UI where readability and pointer geometry matter.
It packages speech and thought-bubble variants into one API so you can drop narrative UI into scenes quickly.

Caption bubbles for PixiJS with:

- rectangular text boxes with optional corner radius
- oval speech bubbles
- thought bubbles (ellipse + border circles)
- optional pointer triangles that aim toward a speaker point
- text and background styling APIs

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/caption
```

## Basic usage

```ts
import { Application } from 'pixi.js';
import { CaptionStore } from '@wonderlandlabs-pixi-ux/caption';

const app = new Application();
await app.init({ width: 800, height: 600 });

const caption = new CaptionStore({
  id: 'npc-caption',
  text: 'Follow me.',
  x: 160,
  y: 120,
  shape: 'oval',
  pointer: {
    enabled: true,
    speaker: { x: 420, y: 300 },
    baseWidth: 16,
    length: 28,
  },
  backgroundStyle: {
    fill: { color: { r: 0.1, g: 0.1, b: 0.1 }, alpha: 0.95 },
    stroke: { color: { r: 1, g: 1, b: 1 }, width: 2, alpha: 0.9 },
  },
  textStyle: {
    fontSize: 20,
    fill: 0xffffff,
    align: 'center',
    wordWrap: true,
  },
}, app);

app.stage.addChild(caption.container);
```

## Notes

- `pointer.speaker` is in the same coordinate space as the caption's parent container.
- Pointer tails always terminate at `pointer.speaker`.
- `pointer.baseWidth` controls tail thickness per-caption.
- `autoSize` defaults to `true` and sizes the bubble around text + padding.
- Calling `setSize(width, height)` turns `autoSize` off for manual sizing.
- `shape: 'thought'` uses `thought.edgeCircleCount` and `thought.edgeCircleRadiusRatio` to control border circles.
- Circle radius is computed as `min(width, height) * edgeCircleRadiusRatio`.
