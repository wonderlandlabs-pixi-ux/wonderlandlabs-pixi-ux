---
slug: resizer-updates-march-2026
title: Resizer Updates (March 2026)
tags: [resizer, pixi, docs, validation]
---

Recent updates landed for `@wonderlandlabs-pixi-ux/resizer`:

- Resize handles now remain visually consistent under parent/super-container scaling by counter-scaling against world transform.
- Added optional `rectTransform` support for coordinate transforms like snapping, with a single-argument object:
  - `rectTransform({ rect, phase, handle })`
- Added optional transformed-rectangle preview callback:
  - `onTransformedRect(rawRect, transformedRect, phase)`
- On drag release, transformed coordinates are committed before `onRelease` runs.

Validation demos in `package-validator` were also expanded:

- `/resizer/*` remains the basic always-visible handles demo.
- `/resizer-snap/*` demonstrates snapping + transformed preview with a gray marching-ants overlay.
