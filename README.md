# Pixi Utils - Yarn Berry Monorepo

A Yarn Berry (v4) monorepo with workspace packages for grid, drag, window, toolbar, and related Pixi utilities.

## Structure

```
wonderlandlabs-pixi-ux/
├── packages/
│   ├── grid/          # Grid component with configurable rows/cols
│   ├── window/        # Window system with drag/resize support
│   ├── caption/       # Caption bubbles and thought balloons
│   └── drag/          # Drag hook utilities
└── apps/
    └── demo/          # Vite React demo application
```

## Features

- **Yarn Berry (v4.0.2)** with `node-modules` linker for traditional node_modules everywhere
- **TypeScript** support across all packages
- **Workspace dependencies** using `workspace:^` protocol
- **Vite** for fast development and building

## Getting Started

### Prerequisites

- Node.js 18+ 
- Corepack enabled (comes with Node.js 16.10+)

### Installation

```bash
# Enable corepack if not already enabled
corepack enable

# Install dependencies
yarn install
```

### Development

```bash
# Start the demo app in development mode
yarn dev

# Build all packages
yarn build

# Clean all build artifacts
yarn clean
```

## Packages

### @wonderlandlabs-pixi-ux/grid

Grid component with configurable size and Forestry state controller.

**Component:**
```tsx
import { Grid } from '@wonderlandlabs-pixi-ux/grid';

<Grid rows={3} cols={3} gap={16}>
  {/* children */}
</Grid>
```

**Controller:**
```tsx
import { GridStore } from '@wonderlandlabs-pixi-ux/grid';

const gridStore = new GridStore({ rows: 4, cols: 4, gap: 10 });
gridStore.setRows(5);
```

### @wonderlandlabs-pixi-ux/drag

Drag hook and Forestry state controller for drag functionality.

**Hook:**
```tsx
import { useDrag } from '@wonderlandlabs-pixi-ux/drag';

const { isDragging, position, dragHandlers } = useDrag({
  onDragStart: () => console.log('Started'),
  onDragEnd: () => console.log('Ended')
});
```

**Controller:**
```tsx
import { DragStore } from '@wonderlandlabs-pixi-ux/drag';

const dragStore = new DragStore({
  onDragStart: (id, x, y) => console.log('Drag started'),
  onDrag: (id, x, y, dx, dy) => console.log('Dragging'),
  onDragEnd: (id, x, y) => console.log('Drag ended')
});
```

## Demo App

The demo app (`apps/demo`) showcases core package integrations:

- Adjust grid size (rows/columns) with input controls
- Responsive grid layout

## Forestry Controllers

All packages include Forestry4-based state controllers for reactive state management:

- **GridStore** - Manage grid configuration with rows, columns, and cell calculations
- **DragStore** - Manage drag state with callbacks

See [CONTROLLERS.md](./CONTROLLERS.md) for detailed documentation and examples.

## TickerForest Scale Tracking

`@wonderlandlabs-pixi-ux/ticker-forest` supports scale-aware dirty tracking and counter-scale helpers for zoom-stable UI rendering.

- `getScale(): { x, y }` reads the container scale (root-relative by default)
- `getInverseScale(): { x, y }` returns `1 / getScale()` per axis for counter-scaling
- `dirtyOnScale` can automatically dirty a store when observed scale changes

`dirtyOnScale` accepts:
- `true` for defaults (`watchX`, `watchY`, `epsilon: 0.0001`, root-relative)
- object config:
  - `enabled?: boolean`
  - `watchX?: boolean`
  - `watchY?: boolean`
  - `epsilon?: number`
  - `relativeToRootParent?: boolean`

Example:

```ts
new SomeStore(
  { value: initialState },
  {
    ticker,
    container,
    dirtyOnScale: {
      enabled: true,
      watchX: true,
      watchY: true,
      epsilon: 0.0001,
      relativeToRootParent: true,
    },
  }
);
```

## Scripts

- `yarn dev` - Start the demo app in development mode
- `yarn build` - Build all packages and apps
- `yarn clean` - Remove all dist folders
- `yarn workspace <workspace-name> <command>` - Run commands in specific workspaces

## Package Inter-Dependencies

Internal package dependencies (workspace-to-workspace) are:

| Package | Internal dependencies |
| --- | --- |
| `@wonderlandlabs-pixi-ux/style-tree` | _none_ |
| `@wonderlandlabs-pixi-ux/ticker-forest` | _none_ |
| `@wonderlandlabs-pixi-ux/root-container` | _none_ |
| `@wonderlandlabs-pixi-ux/box` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/button` | `@wonderlandlabs-pixi-ux/box`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/caption` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/drag` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/grid` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/resizer` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/toolbar` | `@wonderlandlabs-pixi-ux/button`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/window` | `@wonderlandlabs-pixi-ux/drag`, `@wonderlandlabs-pixi-ux/resizer`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/toolbar` |

### Manual Publish Order

If publishing manually, use this dependency-safe order:

1. `@wonderlandlabs-pixi-ux/style-tree`
2. `@wonderlandlabs-pixi-ux/ticker-forest`
3. `@wonderlandlabs-pixi-ux/root-container`
4. `@wonderlandlabs-pixi-ux/box`
5. `@wonderlandlabs-pixi-ux/drag`
6. `@wonderlandlabs-pixi-ux/button` --- this and below may have semver above the current monorepo's version
7. `@wonderlandlabs-pixi-ux/caption`
8. `@wonderlandlabs-pixi-ux/grid`
9. `@wonderlandlabs-pixi-ux/resizer`
10. `@wonderlandlabs-pixi-ux/toolbar`
11. `@wonderlandlabs-pixi-ux/window`

as we much build and link each package in order, manual build, publish for each is reccommended. 
i.e., 

1. set all packages to the next version
2. insure all imports use the same semver
3. build each package, then publish it

### semver update policy

Any time the first five packages change, the entire monorepo needs to be republished with a semver
higher than the highest current package, as they have dependencies in other packages that are 
too complex to safely synchronize. However minor changes to the other packages may slip in 
during rapid development as their interfaces are tweaked. Thus, the version of the bottom half don't necessarily
relate to anything other than indicating they depend on the packages above. 

## Configuration

### Yarn Berry

The project uses Yarn Berry with the following configuration (`.yarnrc.yml`):

```yaml
nodeLinker: node-modules
enableGlobalCache: false
```

This ensures traditional `node_modules` folders are created in each workspace.

## License

MIT
