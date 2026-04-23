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
  - Known stale published issues are reported as expected baseline; unexpected published issues and any workspace issues still fail the command.

## Root shortcuts

From the repo root:

- `yarn package-validator:dev`
- `yarn package-validator:build`
- `yarn package-validator:preview`
- `yarn build:validator-targets`
- `yarn validate:release`
- `yarn validate:release:build-first`

## Current scope

- `root-container`
- `grid`
- `resizer`
- `resizer-snap`
- `window-snap`

## UI route format

- `/root-container/published` loads npm latest via alias (`@published/root-container -> @wonderlandlabs-pixi-ux/root-container@latest`)
- `/root-container/workspace` loads workspace package (`@wonderlandlabs-pixi-ux/root-container`)
- Same pattern for `/grid/*`, `/resizer/*`, `/resizer-snap/*`, and `/window-snap/*`

## Release workflow

1. `yarn validate:release` to confirm workspace `dist` exports pass and published packages have no unexpected regressions.
2. `yarn validate:release --package root-container` (or full run) after local fixes/build to confirm workspace dist passes.
3. Publish new versions, run `yarn install` to refresh the published aliases, then re-run `yarn validate:release`.

## Recommended root flow

1. `yarn validate:release:build-first`
2. Optional targeted rerun: `yarn validate:release --package root-container`
