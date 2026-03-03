---
title: window
description: Package README for @wonderlandlabs-pixi-ux/window
---
# @wonderlandlabs-pixi-ux/window

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/window](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/window)

`window` packages desktop-style behaviors like selection, drag, resize, and titlebars into reusable stores.
It is designed for multi-panel Pixi tools where users manipulate independent UI surfaces.

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
  titlebar: { title: 'Notes' },
});
```

## Resize Transform Passthrough

`window` forwards `rectTransform` to the underlying `@wonderlandlabs-pixi-ux/resizer` instance.
Use this to apply snapping or coordinate transforms during resize drags.

```ts
windows.addWindow('snapped', {
  x: 120,
  y: 100,
  width: 420,
  height: 280,
  isResizeable: true,
  resizeMode: 'EDGE_AND_CORNER',
  rectTransform: ({ rect, phase, handle }) => {
    const snap = (n: number) => Math.round(n / 16) * 16;
    const min = 64;

    // Keep drag preview responsive; snap on release.
    if (phase === 'drag') return rect;

    return {
      x: snap(rect.x),
      y: snap(rect.y),
      width: Math.max(min, snap(rect.width)),
      height: Math.max(min, snap(rect.height)),
    };
  },
});
```

Callback params:
- `rect`: current rectangle candidate (`Rectangle`)
- `phase`: `'drag' | 'release'`
- `handle`: active resize handle id, or `null`

## Overview

This package provides draggable, resizable windows with titlebars, managed through a centralized `WindowsManager`. Each window is a `WindowStore` that extends `TickerForest` for synchronized PixiJS rendering.

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
