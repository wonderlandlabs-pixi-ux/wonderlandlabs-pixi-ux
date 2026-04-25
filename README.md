# Wonderlandlabs Pixi UX Monorepo

Reusable PixiJS UI/state packages for windows, drag/resize flows, layout, and rendering helpers.
This repo publishes the `@wonderlandlabs-pixi-ux/*` package set and keeps versions aligned for coordinated releases.

## Pixi Provider Model

Unit tests cannot be executed with Pixi in scope; it uses canvas and navigator 
resources from Pixi. For this reason Pixi is provided to the applciation via a `PixiProvider` singleton.

PixiProvider has a singleton that can be provided with the core classes in runtime;
it can also, for testing, be set to use fallback mocks so that Pixi itself can be
avoideed in unit tst context. 

The current rendering direction is:

- core packages treat `pixi.js` as a `peerDependency`
- runtime Pixi access goes through `PixiProvider`
- callers either pass a provider explicitly or initialize `PixiProvider.shared`
- tests can use the built-in headless fallbacks to inspect rendered trees without creating a real Pixi canvas

That lets packages like `box`, `button`, and `toolbar` keep Pixi-backed rendering behavior while avoiding direct runtime Pixi imports in the core modules.

Practical usage rule:

- production and Storybook: call `PixiProvider.init(Pixi)` once at boot
- local tests: either call `PixiProvider.init(Pixi)` in setup, or inject `new PixiProvider(...)` directly into the unit under test

For the shared package-level explanation and test patterns, see [packages/utils/README.md](./packages/utils/README.md).

## Repository Layout

```text
wonderlandlabs-pixi-ux/
├── packages/                # publishable packages
│   ├── observe-drag/
│   ├── root-container/
│   ├── resizer/
│   ├── window/
│   ├── utils/
│   └── ...
└── apps/
    ├── docs/                # Docusaurus docs/blog
    ├── package-validator/   # integration/validation app
    └── reveal/              # Reveal.js presentation app
```

## Package Focus

- `@wonderlandlabs-pixi-ux/observe-drag`: serialized pointer drag ownership + drag decorators.
- `@wonderlandlabs-pixi-ux/root-container`: centered root + zoom/pan decorators.
- `@wonderlandlabs-pixi-ux/resizer`: interactive handle-based resize system.
- `@wonderlandlabs-pixi-ux/window`: draggable/resizable windows with titlebar/content renderers.
- `@wonderlandlabs-pixi-ux/button-simple`: direct Pixi button runtime for dense or high-frequency button use cases.
- `@wonderlandlabs-pixi-ux/ticker-forest`: ticker-synchronized resolve/dirty base class.
- `@wonderlandlabs-pixi-ux/utils`: shared runtime helpers (including shared render-helper singleton/lifecycle behavior).

See [CONTROLLERS.md](./CONTROLLERS.md) for controller conventions and usage patterns.

## Versioning and Release Policy

- Global alignment releases should update:
1. all `packages/*/package.json` versions
2. all internal `@wonderlandlabs-pixi-ux/*` dependency pins
3. the root [package.json](./package.json) version
- For the shared render-helper model:
1. first shared-helper retrieval for an app sets that app’s timing config
2. the helper lives for the app lifetime and auto-cleans on `app.destroy(...)`
3. later retrievals for the same app reuse that first helper/config

## Internal Dependency Topology

| Package | Internal dependencies |
| --- | --- |
| `@wonderlandlabs-pixi-ux/style-tree` | _none_ |
| `@wonderlandlabs-pixi-ux/ticker-forest` | `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/utils` | _none_ |
| `@wonderlandlabs-pixi-ux/observe-drag` | `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/root-container` | `@wonderlandlabs-pixi-ux/observe-drag`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/box` | `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/button-simple` | `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/button` | `@wonderlandlabs-pixi-ux/box`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/caption` | `@wonderlandlabs-pixi-ux/box`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/grid` | `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/resizer` | `@wonderlandlabs-pixi-ux/observe-drag`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/toolbar` | `@wonderlandlabs-pixi-ux/box`, `@wonderlandlabs-pixi-ux/button`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/window` | `@wonderlandlabs-pixi-ux/box`, `@wonderlandlabs-pixi-ux/observe-drag`, `@wonderlandlabs-pixi-ux/resizer`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/toolbar`, `@wonderlandlabs-pixi-ux/utils` |

## Manual Publish Order

1. `@wonderlandlabs-pixi-ux/style-tree`
2. `@wonderlandlabs-pixi-ux/utils`
3. `@wonderlandlabs-pixi-ux/observe-drag`
4. `@wonderlandlabs-pixi-ux/ticker-forest`
5. `@wonderlandlabs-pixi-ux/root-container`
6. `@wonderlandlabs-pixi-ux/box`
7. `@wonderlandlabs-pixi-ux/button-simple`
8. `@wonderlandlabs-pixi-ux/button`
9. `@wonderlandlabs-pixi-ux/caption`
10. `@wonderlandlabs-pixi-ux/grid`
11. `@wonderlandlabs-pixi-ux/resizer`
12. `@wonderlandlabs-pixi-ux/toolbar`
13. `@wonderlandlabs-pixi-ux/window`

## Workspace Tooling (Yarn)

### Prerequisites

- Node.js `>=20`
- Corepack enabled

### Install

```bash
corepack enable
yarn install
```

### Common Commands

```bash
yarn build
yarn clean
yarn test
yarn docs:dev
yarn reveal:dev
yarn package-validator:dev
```

### Yarn Configuration

From `.yarnrc.yml`:

```yaml
nodeLinker: node-modules
enableGlobalCache: false
```

## License

MIT
