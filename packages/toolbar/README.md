# @wonderlandlabs-pixi-ux/toolbar

`toolbar` is now intentionally thin.
It owns a background, creates a set of current `ButtonStore` instances, and uses one `BoxStore` pass to lay those buttons out horizontally or vertically.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/toolbar @wonderlandlabs-pixi-ux/button @wonderlandlabs-pixi-ux/box @wonderlandlabs-pixi-ux/style-tree
```

## Basic Usage

```ts
import { Application } from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { ToolbarStore } from '@wonderlandlabs-pixi-ux/toolbar';

const app = new Application();
await app.init({ width: 900, height: 600 });

const style = fromJSON({
  container: {
    background: {
      padding: {
        '$*': [6, 12],
      },
      text: {
        '$*': { fill: '#2f7f74' },
        '$hover': { fill: '#379286' },
        '$done': { fill: '#666666' },
      },
    },
    border: {
      radius: {
        '$*': 6,
      },
      width: {
        '$*': 0,
        '$done': 2,
      },
      color: {
        '$done': '#aaaaaa',
      },
    },
  },
  label: {
    text: {
      size: {
        '$*': 13,
      },
      font: {
        color: {
          '$*': '#ffffff',
        },
      },
    },
  },
});

const toolbar = new ToolbarStore({
  id: 'main-toolbar',
  orientation: 'horizontal',
  spacing: 8,
  padding: 8,
  background: {
    fill: { color: { r: 0.95, g: 0.95, b: 0.95 }, alpha: 1 },
    stroke: { color: { r: 0.7, g: 0.7, b: 0.7 }, width: 1, alpha: 1 },
    borderRadius: 8,
  },
  style,
  buttons: [
    { id: 'select', label: 'Select', variant: 'text', onClick: () => {} },
    { id: 'caption', label: 'Caption', variant: 'text', onClick: () => {} },
    { id: 'done', label: 'Done', variant: 'text', modifiers: ['done'], state: 'disabled' },
  ],
}, app);

toolbar.container.position.set(40, 40);
app.stage.addChild(toolbar.container);
toolbar.kickoff();
```

## Toolbar Model

- Each toolbar button is a real `ButtonStore`.
- The toolbar measures those buttons and feeds the measurements into a `BoxStore` tree.
- The toolbar root can bloat from content or honor fixed `width` and `height`.
- By default, toolbar-created buttons get `size.width = 0` and `size.height = 0`, so they wrap to their content instead of using the button package's fallback width and height.

That "zero-size + bloat" behavior is the current replacement for the older wrap layout behavior.

## Toolbar Config

```ts
{
  id?: string,
  buttons?: ToolbarButtonConfig[],
  spacing?: number,
  orientation?: 'horizontal' | 'vertical',
  fillButtons?: boolean,
  width?: number,
  height?: number,
  fixedSize?: boolean,
  padding?: number | { top?: number, right?: number, bottom?: number, left?: number },
  background?: { fill?: {...}, stroke?: {...}, borderRadius?: number },
  style?: StyleTree | StyleTree[],
}
```

`ToolbarButtonConfig` is button-state shaped:

```ts
{
  id: string,
  label?: string,
  icon?: string,
  variant?: 'base' | 'text' | 'vertical' | 'avatar',
  modifiers?: string[],
  state?: string,
  isDisabled?: boolean,
  isHovered?: boolean,
  size?: { width?: number, height?: number },
  onClick?: () => void,
}
```

Notes:
- Toolbar owns button positioning, so `size.x` and `size.y` are ignored.
- `size.width` and `size.height` act as minimums; omitted values default to `0` for content-wrap.
- `fillButtons` equalizes the cross-axis size using the widest or tallest measured child.

## Compatibility

Toolbar still accepts a limited compatibility layer for older callers:

- `mode: 'icon' | 'inline' | 'text' | 'iconVertical' | 'avatar'`
- non-layout `variant` strings

Those are normalized like this:

- `mode` maps to the current button layout variant.
- if `variant` is not one of `base`, `text`, `vertical`, or `avatar`, toolbar treats it as an extra modifier.

That keeps older toolbar configs working while the source of truth moves to the current button contract.

## Main API

- `addButton(config)`
- `removeButton(id)`
- `getButton(id)`
- `getButtons()`
- `getButtonRect(id)`
- `styleTree`
- `toolbarConfig`
- `cleanup()`
