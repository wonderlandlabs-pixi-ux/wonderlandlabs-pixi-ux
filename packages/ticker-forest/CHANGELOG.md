# CHANGELOG

## 1.2.1 - 2026-03-09

- Guarded scale-tracking ticker bindings to require `add`/`remove` APIs before subscribing, preventing test/runtime errors when minimal ticker mocks are used.

## 1.1.3 - 2026-03-02

- upgrade to pixi 8.16

## 1.0 initial

got rendering cycles working, removed PIXI artifacts for mid-render changes

## 1.0.1

refactored to be more ticker-centric - it can operate with ticke only;
app and containers are optional.

## 1.1.1 - 2026-02-27

- Instituted a deeper style-key pattern using dot-separated noun parts, with interCaps compatibility in style-tree.
- Raised the Node runtime baseline to `>=20.0.0`.
