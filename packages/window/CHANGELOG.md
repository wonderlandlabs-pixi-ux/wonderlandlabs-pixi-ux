# CHANGELOG

## 1.1.6 - 2026-03-03

- Synced window resizer handles from full window rect changes (`x`, `y`, `width`, `height`) so handle positions follow window moves immediately.
- When windows are moved externally/repositioned, resizer rect sync now uses current window rect directly (skips rect-transform filtering).

## 1.1.5 - 2026-03-03

- Added `rectTransform` passthrough in `WindowsManager.addWindow(...)` so window resize handles can apply coordinate transforms/snapping via `@wonderlandlabs-pixi-ux/resizer`.
- patched a setStore error where window snaps to 0,0 when resizing
## 1.1.4 - 2026-03-03

- Bumped package version to align with `@wonderlandlabs-pixi-ux/resizer@1.1.4`.

## 1.1.3 - 2026-03-02

- upgrade to Pixi 8.16

## 1.1.1 - 2026-02-27

- Instituted a deeper style-key pattern using dot-separated noun parts, with interCaps compatibility in style-tree.
- Raised the Node runtime baseline to `>=20.0.0`.
