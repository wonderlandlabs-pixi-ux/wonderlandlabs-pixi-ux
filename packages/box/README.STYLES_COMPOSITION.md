# Box Styles and Composition

This document describes how the default `BoxUxPixi` composes layers and how styles are resolved.

Every root `BoxTree` has a style value set in options from `@wonderlandlabs-pixi-ux/style-tree` that defines how the
background and border of the box are visualized: colors, stroke color and width, and alpha. Individual children are
given `styleName` values and state verbs that can change during interaction such as hover and click to give visual cues.

In the style tree you can style specific paths such as `topPanel.button` or generic wildcards such as `topPanel.*.button`.
You can also create tree-wide targets like `icon` that are true for icons throughout the tree regardless of location.

The principles here are similar to CSS specificity: you can create a generic color like `button.bgColor` and an override
like `button.bgColor + hover` with verbs that reflect interaction or state changes such as `disabled` or `primary`.

## Style Resolution

Each node contributes:

- `styleName`
- `modeVerb[]`
- root `globalVerb[]`

The UX resolves each style property using this order:

1. Hierarchical property path such as `button.icon.bgColor`
2. Hierarchical object such as `button.icon -> bgColor`
3. Atomic property path such as `icon.bgColor`
4. Atomic object such as `icon -> bgColor`

State list used in lookups:

- `globalVerb + modeVerb`

## Default Style Properties

The default UX reads:

- `bgColor`
- `bgAlpha`
- `bgStrokeColor`
- `bgStrokeAlpha`
- `bgStrokeSize`

## UX Pairing

`BoxTree` state is renderer-agnostic. It is not designed to be specific to HTML, Pixi, three.js, SVG, or any one system.
Instead it provides universal positioning and sizing semantics that a renderer can consume.

Each box has a `.ux` object that renders all content for the box. By default that is the Pixi renderer.
That renderer produces a background graphic for coloring a rectangle behind all content, a child collection
for injecting all children of the associated `BoxTree`, and an overlay container for the graphic that draws a
border outline over the rest of the layer.

### Custom Layers

A custom system can add other layers around these ones, for instance for a shadow or a tinted cover. These can be injected
into the content map of the renderer by:

1. creating a custom string key to insert content into the content map
2. defining an order for that key
3. manually creating content and injecting it into the content map

You may want to create a superclass of the renderer.

Built-in layer keys for the Pixi renderer:

- `BOX_RENDER_CONTENT_ORDER.BACKGROUND = 0`
- `BOX_RENDER_CONTENT_ORDER.CHILDREN = 50`
- `BOX_RENDER_CONTENT_ORDER.CONTENT = 75`
- `BOX_RENDER_CONTENT_ORDER.OVERLAY = 100`
- `BOX_UX_ORDER` maps layer names to z-indexes
- `setUxOrder(name, zIndex)` adds or updates a named layer order and throws on duplicate z-index
- `getUxOrder(name)` resolves named layer order

Each render cycle:

1. built-ins are created if absent
2. child UX instances are resolved
3. the children container is cleared and repopulated from current child UX containers
4. optional `box.content` is rendered into the `CONTENT` layer
5. background and stroke graphics are redrawn
6. content map items are sorted by `zIndex` and non-empty items are attached to the root container

Render queueing is handled by `BoxTree` state watchers, not by `BoxUxPixi`.

## Built-In Content Items

- `BACKGROUND`: fill graphic from `bgColor`
- `CHILDREN`: child UX container host
- `CONTENT`: optional node content host from `box.content`
- `OVERLAY`: container that holds stroke graphics from `bgStrokeColor` and `bgStrokeSize`

## Adding Your Own Layers

```ts
import { Graphics } from 'pixi.js';
import { BoxUxPixi } from '@wonderlandlabs-pixi-ux/box';

box.styles = styles;
const ux = new BoxUxPixi(box);
const customLayer = new Graphics();
customLayer.zIndex = 76; // 75 is reserved for CONTENT
customLayer.visible = true;

ux.content.set('CUSTOM', customLayer);
ux.box.render();
```

Use any string key and set `zIndex` on the display object to place custom layers.
