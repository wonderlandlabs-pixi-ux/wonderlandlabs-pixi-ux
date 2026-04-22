---
title: button
description: Package README for @wonderlandlabs-pixi-ux/button
---
# @wonderlandlabs-pixi-ux/button

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`button` turns low-level Pixi interaction into a reusable UI primitive.
It combines layout from `box` and visual state rules from `style-tree` so hover, active, and disabled behavior stays consistent.

Composable Pixi button store built on nested `BoxStore` layout from `@wonderlandlabs-pixi-ux/box` and styled through `@wonderlandlabs-pixi-ux/style-tree`.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/button @wonderlandlabs-pixi-ux/style-tree
```

## Basic Usage

```ts
import { Application, Sprite, Assets } from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { ButtonStore } from '@wonderlandlabs-pixi-ux/button';

const app = new Application();
await app.init({ width: 800, height: 600 });

const styleTree = fromJSON({
  button: {
    inline: {
      padding: { $*: { x: 12, y: 6 } },
      'border.radius': { $*: 6 },
      'icon.gap': { $*: 8 },
      fill: {
        $*: { color: { r: 0.2, g: 0.55, b: 0.85 }, alpha: 1 },
        $hover: { color: { r: 0.25, g: 0.62, b: 0.9 }, alpha: 1 }
      },
      label: {
        font: {
          size: { $*: 14 },
          color: { $*: { r: 1, g: 1, b: 1 } },
          alpha: { $*: 1 }
        }
      }
    }
  }
});

const texture = await Assets.load('/placeholder-art.png');
const button = new ButtonStore({
  id: 'save',
  mode: 'inline',
  sprite: new Sprite(texture),
  label: 'Save',
  onClick: () => console.log('clicked'),
}, styleTree, app);

button.setPosition(120, 120);
app.stage.addChild(button.container);
button.kickoff();
```

## Layout Model

`ButtonStore` now builds a small nested box tree internally:

- root `button` box
- one mode/content box (`text`, `inline`, `iconVertical`, or `content`)
- semantic children such as `icon`, `label`, and `rightIcon`
- explicit gap cells when spacing is needed

That means button layout is parent-driven and no longer relies on ad hoc child position offsets.

## Button Config

```ts
{
  id: string,
  mode?: 'icon' | 'iconVertical' | 'text' | 'inline',
  sprite?: Sprite,
  icon?: Container,
  rightSprite?: Sprite,
  rightIcon?: Container,
  label?: string,
  isDisabled?: boolean,
  onClick?: () => void,
  variant?: string,
  bitmapFont?: string,
}
```

Mode behavior:
- `icon`: icon-only.
- `iconVertical`: icon with label below.
- `text`: label-only.
- `inline`: icon + label in a row (optionally right icon too).

If `mode` is omitted it is inferred from available icon/label fields.

## StyleTree Expectations

State keys are read using noun paths under `button` and optional states (`hover`, `disabled`).

Common keys:
- `button.padding.x`, `button.padding.y`
- `button.border.radius`
- `button.fill.color`, `button.fill.alpha`
- `button.stroke.color`, `button.stroke.size`, `button.stroke.alpha`
- `button.label.font.size`, `button.label.font.color`, `button.label.font.alpha`
- `button.icon.size.x`, `button.icon.size.y`, `button.icon.alpha`
- Mode-specific variants: `button.inline.*`, `button.text.*`, `button.icon.vertical.*`

Variant lookup inserts `variant` after `button` (for example `button.primary.inline.fill.color`).

The built-in Pixi renderer currently reads:

- fill color and alpha
- stroke color, size, and alpha
- border radius
- icon size, alpha, and tint
- label font size, family, color, and alpha

## Main API

- `setHovered(isHovered)`
- `setDisabled(isDisabled)`
- `isHovered`
- `isDisabled`
- `mode`
- `getConfig()`
- `getPreferredSize()`

## Notes

- `children` exposes semantic content boxes with rects relative to the content run, which is useful for tests and inspection.
- Explicit Pixi display objects win over `content` fallbacks. URL content is only used when no concrete icon display object is supplied.
