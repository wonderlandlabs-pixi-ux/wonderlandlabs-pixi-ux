---
slug: window-drag-resize-validator-fixes-march-2026
title: Window Drag/Resize + Validator Source Fixes (March 2026)
tags: [window, resizer, drag, validator, pixi]
---

Today we addressed a group of related issues across `drag`, `resizer`, `window`, and the `package-validator` app:

- Fixed zoom/scaling delta mismatches for drag + resize interactions by moving pointer-delta math into the correct local coordinate space.
- Updated resizer drag flow so drag-phase transforms/snapping are committed to current rect state during drag, which keeps handles aligned with snapped geometry before release.
- Updated window-to-resizer syncing so handle positions follow full window rect changes (`x`, `y`, `width`, `height`) and use the current window rect for external repositioning.
- Added validator heartbeat coverage for:
  - scaled drag behavior
  - drag-phase snapping behavior
  - window handle updates during snap drag and external window movement
- Fixed validator source separation so `published` mode does not accidentally resolve nested imports back to workspace packages.

Result: `published` and `workspace` routes now show meaningful behavioral differences when package versions differ, and interaction fidelity under zoom/scale is consistent.
