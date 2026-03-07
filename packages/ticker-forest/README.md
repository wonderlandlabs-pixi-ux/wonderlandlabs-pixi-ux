# @wonderlandlabs-pixi-ux/ticker-forest

Abstract base class for Forestry state management that synchronizes state changes with PixiJS rendering via the ticker pattern.

## Overview

This class solves the problem of PixiJS artifacts that occur when PixiJS operations are performed outside of ticker handlers. While Forestry state changes are synchronous, PixiJS-centric effects must be encapsulated inside ticker handlers to work correctly.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/ticker-forest
```

## Pattern

1. Subclass manages its own state
2. Subclass calls `this.dirty()` when PixiJS updates are needed
3. Base class schedules a ticker callback for the next frame with `ticker.addOnce(...)`
4. Ticker calls `resolve()` and clears the internal dirty flag

## Usage

Subclasses must implement `resolve()` and call `dirty()` when state changes require Pixi updates.

### Example

```typescript
import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { Application } from 'pixi.js';

interface MyState {
  position: { x: number; y: number };
}

class MyStore extends TickerForest<MyState> {
  constructor(app: Application) {
    super(
      { value: { position: { x: 0, y: 0 } } },
      { app }
    );
  }

  updatePosition(x: number, y: number) {
    this.mutate(draft => {
      draft.position.x = x;
      draft.position.y = y;
    });
    this.dirty();
  }

  protected resolve(): void {
    // Perform PixiJS operations here
    const { position } = this.value;
    this.sprite.position.set(position.x, position.y);
  }
}
```

## API

### Constructor

```typescript
constructor(
  args: StoreParams<T>,
  config?: {
    app?: Application;
    ticker?: Ticker;
    container?: Container;
    dirtyOnScale?: boolean | DirtyOnScaleOptions | DirtyOnScale;
  } | Application
)
```

- `args` - The Forestry configuration object (includes `{value: ..., res: ...}` and other Forest options)
- `config.app` - Optional PixiJS Application instance
- `config.ticker` - Optional explicit ticker override
- `config.container` - Optional container reference for consumers
- `config.dirtyOnScale` - Optional automatic dirty tracking for scale changes

Ticker resolution precedence:
1. Explicit `config.ticker` (or `store.ticker = ...`)
2. `config.app?.ticker`
3. `store.$parent?.ticker`

`dirtyOnScale` options:
- `true` enables scale tracking with defaults: `watchX: true`, `watchY: true`
- `new DirtyOnScale(...)` allows sharing one configured comparator/reader instance
- `watchX` / `watchY` select which axis contributes to dirty checks
- Set both `watchX: false` and `watchY: false` to disable tracking via object config.

### Core Methods

#### `dirty(): void`

Marks the store dirty and schedules a single resolve on the next ticker frame.
If the store is already dirty, no duplicate ticker callback is queued.

#### `kickoff(): void`

Trigger an initial resolve on the next ticker frame. Subclasses should call this in their constructor after initialization to ensure initial PixiJS operations are performed.

#### `getScale(): { x: number; y: number }`

Returns the current container scale as `{x, y}`. By default this is measured relative to the root parent, so nested transform chains are reflected in the result.

#### `getInverseScale(): { x: number; y: number }`

Returns the inverse scale of `getScale()` as `{x, y}`. This is the counter-scale value commonly used to keep UI affordances (titlebars, handles, labels) visually constant under zoom.

### Abstract Method (Must Implement)

#### `resolve(): void`

Perform PixiJS operations. This method is called inside a ticker handler, ensuring that PixiJS operations are synchronized with the rendering loop.

#### `ticker: Ticker | undefined` (getter/setter)

Direct ticker access for animation sync. This can be explicitly set or inherited from app/parent.

#### `cleanup(): void`

Cleanup method to remove ticker listeners. Subclasses should call `super.cleanup()` in their cleanup/destroy methods.

## Dependencies

- `@wonderlandlabs/forestry4` - State management
- `pixi.js` - PixiJS rendering engine

## License

MIT

# APPENDIX: Beyond PIXI 

This library was originally wrote to solve a technical problem
in PIXI. however it is also useful in any high performance animation
to establish a common pattern: 

1. Data changes flag parts of a tree as "dirty" / need re-rendering
2. Inside an animation loop the visuals are updated immediately before showing a frame

This is a useful economy; for instance say the positin of a sprite is changed
three or four times. There is no reason to recompute the sprite four times, -- only
once, _before the next frame is rendered_. That is, instead of data changes immediately
triggering a regeneration of the visuals it just notes that visual regeneration is _needed_
and is performed each frame, unless the visuals have not changed. 

Box, one of the immediate use cases of ticker-forest, was designed to 
create a "flex-like" api for Pixi, for convenience in design;
however, once the pixi elements were stripped (for ease of 
rapid development) it became clear that the math and utility of Box
was not purely confined to Pixi but could be used in any system with a render
tree. 

To this end, we are redesigning the ticker-forest class to be 
pixi-friendly, but to mainly depend on the concept fo a ticker to which
render events can be added (or removed). 

So, you can add render events to any system (svg, dom) and use the Box 
system to contain generic descriptors for styling, size, and position of a 
rectangular container in a 2d space. However while it is useable in Pixi,
your render engine can be any 2d render system you wish, and the TickerForest
class while it does depend on the Ticker interface can be used in any visualization
system you may want to.
