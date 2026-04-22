---
title: button
description: Package README for @wonderlandlabs-pixi-ux/button
---
# @wonderlandlabs-pixi-ux/button

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`button` is the current low-level Pixi button primitive in this repo.
It renders from a `ButtonStateType`, lays itself out with `box`, and styles itself from `style-tree`.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/button @wonderlandlabs-pixi-ux/style-tree
```

## Basic Usage

```ts
import { Application } from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import {
  ButtonStore,
  BTYPE_BASE,
} from '@wonderlandlabs-pixi-ux/button';

const app = new Application();
await app.init({ width: 800, height: 600 });

const styleTree = fromJSON({
  container: {
    background: {
      padding: {
        '$*': [8, 14],
      },
      base: {
        '$*': { fill: '#2f7f74' },
        '$hover': { fill: '#379286' },
        '$disabled': { fill: '#70827e' },
      },
    },
    border: {
      radius: {
        '$*': 8,
      },
      width: {
        '$*': 0,
      },
    },
    content: {
      gap: {
        '$*': 8,
      },
    },
  },
  label: {
    font: {
      color: {
        '$*': '#ffffff',
      },
      alpha: {
        '$*': 1,
        '$disabled': 0.45,
      },
    },
    size: {
      '$*': 14,
    },
  },
  icon: {
    size: {
      width: {
        '$*': 18,
      },
      height: {
        '$*': 18,
      },
    },
  },
});

const button = new ButtonStore({
  variant: BTYPE_BASE,
  label: 'Save',
  icon: '/icons/demo-icon.png',
  size: {
    x: 120,
    y: 120,
    width: 0,
    height: 0,
  },
}, {
  app,
  styleTree,
  handlers: {
    click: () => console.log('clicked'),
  },
});

app.stage.addChild(button.container);
button.kickoff();
```

## Constructor Contract

```ts
new ButtonStore(
  value: {
    variant: 'base' | 'text' | 'vertical' | 'avatar',
    label?: string,
    icon?: string,
    state?: string,
    modifiers?: string[],
    isDisabled?: boolean,
    isHovered?: boolean,
    isDebug?: boolean,
    size?: {
      x?: number,
      y?: number,
      width?: number,
      height?: number,
    },
  },
  options: {
    app?: Application,
    styleTree?: StyleTree | StyleTree[],
    styleDef?: unknown,
    handlers: Record<string, () => void>,
  },
)
```

Notes:
- `icon` is a URL string, not a `Sprite` or `Container`.
- `variant` controls the layout shape.
- `state` and `modifiers` become style states for lookup.
- `isDisabled` and `isHovered` are convenience inputs that normalize into `state`.
- If you want the button to wrap to its content, set `size.width` and `size.height` to `0`.
- `container.background.fill` can be either a solid color or a gradient object.

## Variants

- `base`: row layout for icon + label.
- `text`: text-first layout.
- `vertical`: icon over label.
- `avatar`: centered avatar-style content.

## StyleTree Shape

The current renderer reads from these noun paths:

- `container.background.padding`
- `container.background.width`
- `container.background.height`
- `container.background.fill`
- `container.background.<variant>`
- `container.border.width`
- `container.border.color`
- `container.border.radius`
- `container.content.gap`
- `label.size`
- `label.font`
- `icon.size.width`
- `icon.size.height`
- `icon.alpha`

Example variant targeting:

```ts
{
  container: {
    background: {
      base: {
        '$*': { fill: '#2f7f74' },
        '$hover': { fill: '#379286' },
      },
      text: {
        '$*': { fill: '#4b5563' },
      },
    },
  },
}
```

Example modifier targeting:

```ts
{
  container: {
    background: {
      base: {
        '$danger': { fill: '#aa3f3f' },
      },
    },
  },
}
```

## Main API

- `kickoff()`
- `dirty()`
- `resolve()`
- `hasStatus(name)`
- `setStatus(name, enabled)`
- `set(key, value)` / `mutate(fn)` from the underlying store
- `container`

## Notes

- Hover and tap listeners are bound to the rendered button container.
- The button uses `box` layout internally; the public surface is the state object plus the Pixi container.
- The package docs and stories should use this state-driven contract as the source of truth.
