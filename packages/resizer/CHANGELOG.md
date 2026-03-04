# CHANGELOG

## 1.1.6 - 2026-03-03

- Fixed resize drag deltas under zoom/transformed parents by tracking drag in handle-container local space.
- Applied drag-phase `rectTransform` output to `setRect`, so handle positions and rendered rect follow snapped/transformed coordinates during drag (not only on release).

## 1.1.4 - 2026-03-03

- Added optional `rectTransform(rect, phase)` hook to support coordinate transforms such as snapping.
- Added optional `onTransformedRect(rawRect, transformedRect, phase)` callback for transformed-rect preview during drag.
- Applied transformed coordinates on drag release before calling `onRelease`.
- Kept resize handles visually stable across parent/super-container scaling by counter-scaling using world transform.

## 1.1.3 - 2026-03-02

- upgrade to pixi 8.16

## 1.0 

Got basic delaying of update to tie into the PIXI Ticker class's metabolism

## 1.0.1 

To diminish pixi-dependence, we are using a specific optional ticker parameter
to control the refresh timing.

## 1.1.1 - 2026-02-27

- Instituted a deeper style-key pattern using dot-separated noun parts, with interCaps compatibility in style-tree.
- Raised the Node runtime baseline to `>=20.0.0`.
