---
title: box
description: The `@wonderlandlabs-pixi-ux/box` package
---
# @wonderlandlabs-pixi-ux/box

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/box](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/box)

`box` is a render-agnostic layout tree. It gives you deterministic 2D layout (area, alignment, constraints, ordering)
without tying your state to Pixi objects.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/box
```

## Basic Usage

```ts
import {
  ALIGN,
  BoxTree,
  UNIT_BASIS,
} from '@wonderlandlabs-pixi-ux/box';

const layout = new BoxTree({
  id: 'root',
  styleName: 'button',
  globalVerb: [],
  area: {
    x: 60,
    y: 50,
    width: { mode: UNIT_BASIS.PX, value: 720 },
    height: { mode: UNIT_BASIS.PX, value: 340 },
    px: 's',
    py: 's',
  },
  align: {
    x: ALIGN.START,
    y: ALIGN.START,
    direction: 'column',
  },
  children: {
    header: {
      styleName: 'header',
      area: {
        x: 0,
        y: 0,
        width: { mode: UNIT_BASIS.PERCENT, value: 1 },
        height: { mode: UNIT_BASIS.PX, value: 60 },
        px: 's',
        py: 's',
      },
      align: { x: 's', y: 's', direction: 'row' },
    },
    icon: {
      styleName: 'icon',
      modeVerb: ['hover'],
      area: {
        x: 0,
        y: 0,
        width: { mode: UNIT_BASIS.PX, value: 24 },
        height: { mode: UNIT_BASIS.PX, value: 24 },
        px: 's',
        py: 's',
      },
      align: { x: 's', y: 's', direction: 'column' },
    },
  },
});

layout.toggleGlobalVerb('disabled');
layout.getChild('icon')?.toggleModeVerb('selected');
```

## Ux Assignment

`BoxTree` defaults to the built-in Pixi UX map. Override with `assignUx(ux, applyToChildren?)`:

```ts
import { BoxUxPixi } from '@wonderlandlabs-pixi-ux/box';

layout.styles = styles;
layout.assignUx((box) => new BoxUxPixi(box));
layout.render();
```

`addChild()` inherits the UX map function from its parent.

Constructor shortcut:

```ts
const layout = new BoxTree({
  id: 'root',
  area: { x: 0, y: 0, width: 200, height: 100 },
  ux: (box) => new BoxUxPixi(box),
});
layout.styles = styles;
```

## Style Resolution

Each node has a `styleName` and optional state verbs:

- `styleName`: style noun for the node
- `modeVerb`: node-local states (hover, selected, active, ...)
- `globalVerb`: root-wide states shared by descendants (disabled, readonly, ...)

When you call `resolveStyle(styleManager, extraStates?)`, `BoxTree` queries:

1. Hierarchical path first (`button.icon`, `toolbar.button.label`, ...)
2. Atomic fallback (`icon`, `label`, ...)

With combined states:
- `globalVerb + modeVerb + extraStates`

## Default Ux

Use `BoxUxPixi` for default Pixi rendering.

It:

- Creates a container when none is provided
- Uses public `content: MapEnhanced` (`Map<string, unknown>`)
- `content.$box` points to the owning box
- Exposes `ux.getContainer(key): unknown` for child UX handoff:
  - `ROOT_CONTAINER`, `BACKGROUND_CONTAINER`, `CHILD_CONTAINER`, `CONTENT_CONTAINER`, `OVERLAY_CONTAINER`, `STROKE_CONTAINER`
- Exposes `ux.attach(targetContainer?)`:
  - attaches root container to `targetContainer`
  - if omitted, uses `ux.app?.stage`
- Creates default layers by key when absent:
  - `BOX_RENDER_CONTENT_ORDER.BACKGROUND = 0`
  - `BOX_RENDER_CONTENT_ORDER.CHILDREN = 50`
  - `BOX_RENDER_CONTENT_ORDER.CONTENT = 75`
  - `BOX_RENDER_CONTENT_ORDER.OVERLAY = 100`
- Layer order can be looked up/extended by name:
  - `BOX_UX_ORDER` map
  - `setUxOrder(name, zIndex)` (throws on duplicate z-index)
  - `getUxOrder(name)`
- Clears/rebuilds the children layer each render cycle
- Draws background from style props:
  - `[stylePath].bgColor`
  - `[stylePath].bgAlpha`
  - `[stylePath].bgStrokeColor`
  - `[stylePath].bgStrokeAlpha`
  - `[stylePath].bgStrokeSize`
- Exposes `ux.generateStyleMap(box)`:
  - `fill: { color, alpha }`
  - `stroke: { color, alpha, width }`
- Honors `box.isVisible`:
  - `false` detaches (hides) container and keeps render content
  - `true` reuses existing layers on next render
- Iterates content map and injects non-empty items sorted by `zIndex`

```ts
import { Graphics } from 'pixi.js';
import {
  BOX_RENDER_CONTENT_ORDER,
  BoxTree,
  BoxUxPixi,
} from '@wonderlandlabs-pixi-ux/box';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const styles = fromJSON({
  panel: {
    bgColor: { $*: 0x2d3a45 },
    bgStrokeColor: { $*: 0x8fd3ff },
    bgStrokeSize: { $*: 2 },
  },
});

const root = new BoxTree({
  id: 'root',
  styleName: 'panel',
  area: { x: 20, y: 20, width: 220, height: 120 },
});

root.styles = styles;
const ux = new BoxUxPixi(root);
root.render();
ux.attach(app.stage);

const custom = new Graphics();
custom.zIndex = 76; // 75 is reserved for CONTENT
custom.visible = true;
ux.content.set('CUSTOM', custom);
ux.content.get('OVERLAY')?.visible = true;
```

## Override Points

`BoxUxBase` is the renderer-agnostic lifecycle base.
`BoxUxPixi` extends it with Pixi-specific containers/graphics/content behavior.

Build custom rendering by returning your own UX object from `assignUx((box) => ...)`:

- extend `BoxUxBase` for a non-Pixi renderer, or
- extend `BoxUxPixi` for Pixi customization.

See dedicated page:

- [Box Styles and Composition](./box-styles-composition)

## Optional Pixi Geometry Preview

```ts
import { boxTreeToPixi } from '@wonderlandlabs-pixi-ux/box';

const graphics = await boxTreeToPixi(layout, {
  includeRoot: true,
  fill: 0x2d3a45,
  fillAlpha: 0.35,
  stroke: 0x8fd3ff,
  strokeAlpha: 0.9,
  strokeWidth: 2,
});
```

## Public API Snapshot

- `BoxTree`
- `BoxUx` (UX object type)
- `BoxUxMapFn`
- `BoxRenderer` (legacy alias of `BoxUx`)
- `BoxRenderMapFn` (legacy alias of `BoxUxMapFn`)
- `MapEnhanced`
- `BoxUxBase`
- `BoxUxPixi`
- `BoxTreeRenderer` (legacy alias of `BoxUxPixi`)
- `BOX_UX_ORDER`, `getUxOrder`, `setUxOrder`
- `BOX_RENDER_CONTENT_ORDER`
- `createBoxTreeState`
- `resolveTreeMeasurement`
- `resolveMeasurementPx`
- `resolveConstraintValuePx`
- `applyAxisConstraints`
- `boxTreeToPixi`
- `boxTreeToSvg`
- `pathToString`, `pathString`, `combinePaths`
- `ALIGN`, `AXIS`, `UNIT_BASIS`, `SIZE_MODE`, `SIZE_MODE_INPUT`
