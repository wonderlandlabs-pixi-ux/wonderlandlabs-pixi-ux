# @wonderlandlabs-pixi-ux/window

A window management system for PixiJS applications using Forestry state management.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/window
```

## Quick Start

```ts
import { Application, Container } from 'pixi.js';
import { WindowsManager } from '@wonderlandlabs-pixi-ux/window';

const app = new Application();
await app.init({ width: 1200, height: 800 });

const root = new Container();
app.stage.addChild(root);

const windows = new WindowsManager({
  app,
  container: root,
});

windows.addWindow('notes', {
  x: 120,
  y: 100,
  width: 420,
  height: 280,
  isDraggable: true,
  isResizeable: true,
  closable: true,
  onClose: ({ id }) => {
    console.log(`Closed ${id}`);
  },
  titlebar: { title: 'Notes' },
});
```

## Resize Coordinate Model

`window` uses `@wonderlandlabs-pixi-ux/resizer` in frame/world coordinates.

- Handles are expected to render in an untransformed front-layer handles container.
- Resizer output is treated as global/frame-space rect data.
- `WindowStore` converts between frame-space and window-local coordinates before mutating window state.
- If your consumer layout is transformed, perform conversion in the consumer layer.

## Label Styling

Window title text is styled from `window.label.*` style properties:

- `window.label.font.size`
- `window.label.font.family`
- `window.label.font.color`
- `window.label.font.alpha`
- `window.label.font.visible`

Default label style: `10px Helvetica` with black text.

```ts
windows.addWindow('notes', {
  titlebar: { title: 'Notes' },
  customStyle: {
    label: {
      font: {
        size: 12,
        family: 'Arial',
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        visible: true,
      },
    },
  },
});
```

## Overview

This package provides draggable, resizable windows with titlebars, managed through a centralized `WindowsManager`. Each window is a `WindowStore` that extends `TickerForest` for synchronized PixiJS rendering.

## Titlebar Mechanics

See [TITLEBAR_DYNAMICS.md](./TITLEBAR_DYNAMICS.md) for the current titlebar model, including:

- the renderer frame of reference
- the explicit `counter-scale` child layer used by `CounterScalingTitlebar`
- shared hover dynamics for `onHover` titlebars

## Container Hierarchy

The window system uses a nested container structure to manage rendering, events, and z-index ordering:

```
app.stage (or your root container)
  └── container (WindowsManager.container)
        │   Label: "WindowsManager"
        │   The main container passed to WindowsManager config
        │
        ├── windowsContainer (WindowsManager.windowsContainer)
        │     │   Label: "windows"
        │     │   Holds all window guardContainers, manages z-index ordering
        │     │
        │     ├── guardContainer (WindowStore.guardContainer) [per window]
        │     │     │   Label: none
        │     │     │   Outer wrapper that protects event listeners from being
        │     │     │   purged when event models change on rootContainer.
        │     │     │   No offset/mask/scale - purely structural.
        │     │     │   Used for z-index management in windowsContainer.
        │     │     │
        │     │     └── rootContainer (WindowStore.rootContainer)
        │     │           │   Label: none
        │     │           │   eventMode: "static"
        │     │           │   sortableChildren: true
        │     │           │   Main window container with drag/event handling
        │     │           │   Position set to window's (x, y)
        │     │           │
        │     │           ├── background (Graphics, zIndex: 0)
        │     │           │     Window background with rounded corners
        │     │           │
        │     │           ├── contentContainer (zIndex: 1)
        │     │           │     │   Container for user content
        │     │           │     │   Masked to window bounds
        │     │           │     │
        │     │           │     └── contentMask (Graphics)
        │     │           │           Clips content to window area
        │     │           │
        │     │           ├── selectionBorder (Graphics, zIndex: 3)
        │     │           │     Visible when window is selected
        │     │           │
        │     │           └── titlebarContainer (zIndex: 2)
        │     │                 │   Managed by TitlebarStore
        │     │                 │
        │     │                 ├── titlebarBackground (Graphics)
        │     │                 ├── titleText (Text)
        │     │                 └── [optional icons/buttons]
        │     │
        │     └── ... (more windows)
        │
        └── handlesContainer (WindowsManager.handlesContainer)
              Label: "handles"
              Sibling to windowsContainer, renders on top
              Contains resize handles for all windows
              Ensures handles are always visible regardless of window z-index
```

## Titlebar Mechanics Summary

- Titlebar geometry derives from `TitlebarStore.height`.
- The titlebar is anchored upward from the window origin, so the body rect remains canonical content space.
- `titlebarContentRenderer(...)` keeps the same public inputs for regular and counter-scaled titlebars.
- `CounterScalingTitlebar` adds a first child labeled `counter-scale` inside `contentContainer`.
- Renderers should explicitly render zoom-independent titlebar content into `contentContainer.getChildByLabel('counter-scale')`
  when present.
- `onHover` titlebars use a shared body/titlebar hover session so moving from body to titlebar does not immediately hide the titlebar.

## State-First Content Updates (Required Pattern)

For runtime content changes (toolbar clicks, async results, external events), use this flow:

1. Mutate store state (including custom fields) on the relevant `WindowStore` / `TitlebarStore`.
2. Mark the store dirty by calling `dirty()` on the store.
3. Use `windowContentRenderer` and/or `titlebarContentRenderer` to upsert `Graphics`/`Container`/`Text` nodes into
   the provided `contentContainer` during the refresh cycle.

Do not directly add/remove Pixi content from event handlers as your primary update path.

Renderer timing in the current implementation:

- `onResolve(state)` runs first in `WindowStore.resolveComponents(...)` for window-level pre-render work.
- `WindowStore.resolve()` calls `resolveComponents(...)`, which calls `#refreshContentContainer()`, which calls
  `#applyWindowContentRenderer()`.
- `TitlebarStore.resolve()` calls `resolveComponents()`, which invokes `titlebarContentRenderer(...)` when set.

Why this pattern is required:

- Pixi mutations outside the ticker-driven refresh path can cause visual artifacts.
- Multiple state changes between ticks are naturally coalesced to one final render snapshot.
- If content is added then removed before the next tick, the renderer can resolve to "no-op" instead of doing
  unnecessary add/remove churn.

### Titlebar Content Hook Pattern

Use `addWindow(..., { titlebarContentRenderer })` as the hook for zoom-independent titlebar UI.
Keep the renderer idempotent (upsert by label), then call `dirty()` whenever external
state changes. Use `configureTitlebar` for one-time setup after the titlebar store is created.
Use `modifyInitialTitlebarParams` for a startup-only functional parameter transform:
`modifyInitialTitlebarParams: ({ state, config }) => ({ state, config })`.
Use `onResolve` for general window-level pre-render logic that should run before content renderers:
`onResolve: (state) => { ... }`.

Renderer signature:

```ts
titlebarContentRenderer: ({
  titlebarStore,
  titlebarValue,
  windowStore,
  windowValue,
  contentContainer,
  localRect,
  localScale,
}) => {
  // add/update contentContainer children
}

windowContentRenderer: ({
  windowStore,
  windowValue,
  contentContainer,
  localRect,
  localScale,
}) => {
  // add/update contentContainer children
}

onResolve: (state) => {
  // window-level pre-render hook
}
```

- `localRect` is the known render bounds in the renderer container's local coordinate space.
- `localScale` is the renderer container's effective local scale (`x`, `y`) for scale-aware layout.
- For counter-scaled titlebars, `contentContainer` may expose a first child labeled `counter-scale`.
  Render into that child when you want zoom-independent titlebar content.

```ts
import { Graphics, Text } from 'pixi.js';

windows.addWindow('notes', {
  x: 120,
  y: 100,
  width: 420,
  height: 280,
  isDraggable: true,
  titlebar: { title: 'Notes', height: 30 },
  titlebarContentRenderer: ({ windowValue, contentContainer }) => {
    const countLabel = 'titlebar-count';
    let countText = contentContainer.getChildByLabel(countLabel) as Text | null;
    if (!countText) {
      countText = new Text({
        text: '',
        style: { fontSize: 12, fill: 0xffffff },
      });
      countText.label = countLabel;
      countText.position.set(340, -6);
      contentContainer.addChild(countText);
    }

    const pinLabel = 'titlebar-pin';
    let pin = contentContainer.getChildByLabel(pinLabel) as Graphics | null;
    if (!pin) {
      pin = new Graphics({ label: pinLabel });
      pin.circle(0, 0, 5).fill(0xffcc00);
      pin.position.set(320, 0);
      contentContainer.addChild(pin);
    }

    // Update values each render.
    countText.text = `W:${Math.round(windowValue.width)}`;
  },
});
```

```ts
windows.addWindow('notes', {
  x: 120,
  y: 100,
  width: 420,
  height: 280,
  modifyInitialTitlebarParams: ({ state, config }) => ({
    state: {
      ...state,
      title: `${config.id.toUpperCase()} (${config.width}x${config.height})`,
    },
  }),
});
```

### Content Generator Function Example

Use a generator/factory to produce a renderer that writes multiple items into the titlebar
`contentContainer` in one place.

```ts
import { Text } from 'pixi.js';

type TitlebarItem = {
  id: string;
  text: string;
  x: number;
  y: number;
};

function makeTitlebarContentRenderer(getItems: () => TitlebarItem[]) {
  return ({ contentContainer }) => {
    const active = new Set<string>();

    for (const item of getItems()) {
      const label = `tb-item-${item.id}`;
      active.add(label);

      let node = contentContainer.getChildByLabel(label) as Text | null;
      if (!node) {
        node = new Text({
          text: '',
          style: { fontSize: 11, fill: 0xffffff },
        });
        node.label = label;
        contentContainer.addChild(node);
      }

      node.text = item.text;
      node.position.set(item.x, item.y);
    }

    // Optional cleanup for removed items.
    for (const child of contentContainer.children.slice()) {
      const label = child.label ?? '';
      if (label.startsWith('tb-item-') && !active.has(label)) {
        contentContainer.removeChild(child);
        child.destroy();
      }
    }
  };
}

const getTitlebarItems = () => [
  { id: 'status', text: 'READY', x: 300, y: -6 },
  { id: 'count', text: '3', x: 370, y: -6 },
];

windows.addWindow('notes', {
  x: 120,
  y: 100,
  width: 420,
  height: 280,
  modifyInitialTitlebarParams: ({ state, config }) => ({
    state: { ...state, title: `Doc: ${config.id}` },
  }),
  titlebarContentRenderer: makeTitlebarContentRenderer(getTitlebarItems),
});
```

### Window-Level Misc Hook (`onResolve`)

Use `onResolve` for window-level custom logic that should run before content renderers, without requiring a custom
`WindowStore` subclass or post-construction branch mutation.

```ts
import { Text } from 'pixi.js';

const snapshot = { renderCount: 0, width: 0, height: 0 };

windows.addWindow('notes', {
  x: 120,
  y: 100,
  width: 420,
  height: 280,
  onResolve: (state) => {
    snapshot.renderCount += 1;
    snapshot.width = Math.round(state.width);
    snapshot.height = Math.round(state.height);
  },
  titlebarContentRenderer: ({ contentContainer }) => {
    const label = 'tb-size';
    let text = contentContainer.getChildByLabel(label) as Text | null;
    if (!text) {
      text = new Text({ text: '', style: { fontSize: 11, fill: 0xffffff } });
      text.label = label;
      text.position.set(300, -6);
      contentContainer.addChild(text);
    }
    text.text = `${snapshot.width}x${snapshot.height}`;
  },
});
```

### Complete Example: `addWindow` + zoom-independent titlebar

Use `CounterScalingTitlebar` when titlebar content should remain visually stable under zoom.
The renderer contract stays the same; the renderer explicitly targets the `counter-scale` child when present.

```ts
import { Application, Container, Graphics, Text } from 'pixi.js';
import { CounterScalingTitlebar, WindowsManager } from '@wonderlandlabs-pixi-ux/window';

const app = new Application();
await app.init({ width: 1200, height: 800 });

// Simulate editor zoom by scaling the parent container.
const zoomLayer = new Container();
zoomLayer.scale.set(1.75, 1.75);
app.stage.addChild(zoomLayer);

const windows = new WindowsManager({
  app,
  container: zoomLayer,
});

windows.addWindow('notes', {
  x: 120,
  y: 100,
  width: 420,
  height: 280,
  isDraggable: true,
  isResizeable: true,
  titlebarStoreClass: CounterScalingTitlebar,
  titlebar: {
    title: 'Notes',
    height: 30,
  },
  titlebarContentRenderer: ({ contentContainer }) => {
    const counterScale = contentContainer.getChildByLabel('counter-scale') as Container | null;
    const target = counterScale ?? contentContainer;
    const pin = target.getChildByLabel('pin-btn') as Graphics | null;
    if (!pin) {
      const nextPin = new Graphics({ label: 'pin-btn' });
      nextPin.circle(0, 0, 6).fill(0xffcc00);
      nextPin.position.set(380, 0);
      target.addChild(nextPin);
    }
  },
  windowContentRenderer: ({ contentContainer }) => {
    const body = contentContainer.getChildByLabel('body-title') as Text | null;
    if (!body) {
      const text = new Text({
        text: 'Body content via windowContentRenderer',
        style: { fontSize: 14, fill: 0xffffff },
      });
      text.label = 'body-title';
      text.position.set(12, 12);
      contentContainer.addChild(text);
    }
  },
});

// Later, if external data changes and titlebar content must refresh:
const titlebarStore = windows.windowBranch('notes')?.titlebarStore;
titlebarStore?.dirty();
```

## Why guardContainer?

The `guardContainer` exists to protect event listeners on `rootContainer` from being purged when PixiJS event models are changed. By wrapping `rootContainer` in a plain container with no event configuration, we ensure that:

1. Event model changes on `rootContainer` don't affect parent containers
2. Child event listeners remain intact when parent event modes change
3. Z-index management operates on `guardContainer` (what's in `windowsContainer`)

## Key Classes

### WindowsManager

Central manager for all windows. Extends `Forest` for state management.

```typescript
const manager = new WindowsManager({
    app: pixiApp,
    container: parentContainer,
    textures: [{ id: 'icon', url: '/icon.png' }]
});

manager.addWindow('myWindow', {
    x: 100, y: 100,
    width: 400, height: 300,
    titlebar: { title: 'My Window' }
});
```

### WindowStore

Individual window state and rendering. Extends `TickerForest`.

- Manages window position, size, and appearance
- Handles drag behavior (optional)
- Creates and manages titlebar via `TitlebarStore`
- Integrates with `ResizerStore` for resize handles

### TitlebarStore

Titlebar state and rendering. Extends `TickerForest`.

- Renders title text and background
- Supports custom render functions
- Can include icons and buttons

## Texture Management

WindowsManager provides centralized texture loading:

```typescript
// Add textures to state
manager.mutate(draft => {
    draft.textures.push({ id: 'myIcon', url: '/icon.png' });
});

// Load pending textures
manager.loadTextures();

// Check status
const status = manager.getTextureStatus('myIcon');
// Returns: 'missing' | 'pending' | 'loading' | 'loaded' | 'error'

// Use loaded texture
if (status === 'loaded') {
    const texture = Assets.get('myIcon');
}
```

## Z-Index Management

Windows support z-index ordering via the `zIndex` property:

```typescript
manager.addWindow('back', { zIndex: 0, ... });
manager.addWindow('front', { zIndex: 10, ... });
```

The `updateZIndices()` method reorders `guardContainer`s within `windowsContainer`.

## Selection

Windows can be selected/deselected:

```typescript
manager.selectWindow('myWindow');
manager.deselectWindow('myWindow');
manager.setSelectedWindow('myWindow'); // Exclusive selection
manager.toggleWindowSelection('myWindow');

const isSelected = manager.isWindowSelected('myWindow');
const selected = manager.getSelectedWindows(); // ReadonlySet<string>
```

Selected windows show a selection border and their resize handles become visible.
