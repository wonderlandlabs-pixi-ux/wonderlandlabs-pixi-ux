# @wonderlandlabs-pixi-ux/toolbar

`toolbar` helps you compose action surfaces quickly from reusable button definitions.
It is useful for editor and HUD interfaces where spacing, ordering, and styling need to stay consistent.

Toolbar composition store that manages multiple `ButtonStore` instances.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/toolbar @wonderlandlabs-pixi-ux/button @wonderlandlabs-pixi-ux/style-tree
```

## Basic Usage

```ts
import { Application } from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { ToolbarStore } from '@wonderlandlabs-pixi-ux/toolbar';

const app = new Application();
await app.init({ width: 900, height: 600 });

const style = fromJSON({
  button: {
    text: {
      padding: { $*: { x: 12, y: 6 } },
      'border.radius': { $*: 6 },
      fill: { $*: { color: { r: 0.2, g: 0.45, b: 0.7 }, alpha: 1 } },
      label: {
        font: {
          size: { $*: 13 },
          color: { $*: { r: 1, g: 1, b: 1 } },
          alpha: { $*: 1 }
        }
      }
    }
  }
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
    { id: 'select', label: 'Select', onClick: () => {} },
    { id: 'caption', label: 'Caption', onClick: () => {} },
    { id: 'done', label: 'Done', isDisabled: true },
  ],
}, app);

toolbar.container.position.set(40, 40);
app.stage.addChild(toolbar.container);
toolbar.kickoff();
```

## Toolbar Config

```ts
{
  id?: string,
  buttons?: ToolbarButtonConfig[],
  spacing?: number,
  orientation?: 'horizontal' | 'vertical',
  width?: number,
  height?: number,
  fixedSize?: boolean,
  padding?: number | { top?: number, right?: number, bottom?: number, left?: number },
  background?: { fill?: {...}, stroke?: {...}, borderRadius?: number },
  style?: StyleTree,
  bitmapFont?: string,
}
```

`ToolbarButtonConfig` is the same as `ButtonConfig` from `@wonderlandlabs-pixi-ux/button`.

## Main API

- `addButton(config)`
- `removeButton(id)`
- `getButton(id)`
- `getButtons()`
- `styleTree`
- `toolbarConfig`
- `cleanup()`
