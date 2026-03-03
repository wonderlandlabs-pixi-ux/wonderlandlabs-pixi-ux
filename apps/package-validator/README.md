# Package Validator

React Router framework-mode app + CLI for heartbeat validation across published npm and workspace sources.

## Commands

- `yarn workspace @wonderlandlabs-pixi-ux/package-validator dev`
  - Starts the React Router framework-mode app.
- `yarn workspace @wonderlandlabs-pixi-ux/package-validator build`
  - Builds the heartbeat app.
- `yarn workspace @wonderlandlabs-pixi-ux/package-validator preview`
  - Previews the built app.
- `yarn workspace @wonderlandlabs-pixi-ux/package-validator validate:release`
  - Validates published aliases (`@published/*`) and workspace package `dist` exports for extensionless/unresolved relative imports.

## Root shortcuts

From the repo root:

- `yarn package-validator:dev`
- `yarn package-validator:build`
- `yarn package-validator:preview`
- `yarn build:validator-targets`
- `yarn validate:release`
- `yarn validate:release:built`

## Current scope

- `root-container`
- `grid`
- `drag`
- `resizer`
- `resizer-snap`
- `window-snap`

## UI route format

- `/root-container/published` loads npm latest via alias (`@published/root-container -> @wonderlandlabs-pixi-ux/root-container@latest`)
- `/root-container/workspace` loads workspace package (`@wonderlandlabs-pixi-ux/root-container`)
- Same pattern for `/grid/*`, `/resizer/*`, `/resizer-snap/*`, `/window-snap/*`, and `/drag/*`

## Release workflow

1. `yarn validate:release` to confirm current published package set has expected failures.
2. `yarn validate:release --package root-container` (or full run) after local fixes/build to confirm workspace dist passes.
3. Publish new versions, run `yarn install` to refresh `@latest`, then re-run `yarn validate:release`.

## Recommended root flow

1. `yarn validate:release:built`
2. Optional targeted rerun: `yarn validate:release --package root-container`
