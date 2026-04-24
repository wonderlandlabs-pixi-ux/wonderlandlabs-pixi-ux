---
slug: pixi-provider-button-box-principles-april-2026
title: Forestry Pixi UX Notes -- Pixi Provider, Headless Tests, and the Rebuilt Button/Box Stack
tags: [utils, pixi, testing, button, box, theming, architecture]
---

This note captures a few project rules that now matter across the monorepo.

## 1. Pixi access goes through `utils`

Core packages should not reach directly into runtime Pixi classes when they need to create containers, graphics, text, sprites, textures, or related services.

Instead, they should resolve those classes through `@wonderlandlabs-pixi-ux/utils` using `PixiProvider`.

Why this matters:

- it avoids bare-metal runtime coupling to browser canvas and navigator behavior in package logic
- it keeps package code testable in headless environments
- it lets tests validate flow, layout, composition, and store behavior without depending on real Pixi rendering internals

The testing target is clear:

- tests should run with built-in mock or fallback Pixi services when they are validating package behavior rather than real rendering
- headless tests should not need real canvas setup just to verify layout, composition, or state flow

## 2. Production boot should initialize the shared provider once

At app boot, initialize the singleton with real `pixi.js` services and then let packages consume `PixiProvider.shared`.

This is the intended production and Storybook pattern.

Example adapted from the button Storybook:

```ts
import * as Pixi from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { ButtonStore, BTYPE_BASE } from '@wonderlandlabs-pixi-ux/button';

PixiProvider.init(Pixi);

const app = new Pixi.Application();
await app.init({
  width: 900,
  height: 320,
  backgroundColor: 0xf6f1e7,
  antialias: true,
});

const button = new ButtonStore({
  variant: BTYPE_BASE,
  label: 'Primary Button',
  icon: '/icons/demo-icon.png',
  size: { x: 40, y: 40, width: 220, height: 52 },
}, {
  app,
  pixi: PixiProvider.shared,
  styleTree,
  handlers: {},
});
```

That pattern is preferable to each package or consumer constructing its own direct runtime dependency path.

`pixi.js` is now a production peer dependency. The current code has been exercised against Pixi `8.x`, and some dev dependencies still load Pixi directly for Storybook and related development flows, but the intended package contract is that consumers bring their own Pixi `8.x` runtime.

## 3. `style-tree` is now a deeper part of the system

`style-tree` is no longer a niche helper around a few visual cases. It is used more broadly across package and site code, and it now carries more structural responsibility than earlier versions did.

Notable changes in direction:

- it is used more often across the site and package code
- inheritance behavior is more capable than before
- digesters for recurring style patterns now exist in the system
- a DSL for common patterns is evolving, even though that work is not complete yet

That last point matters: the DSL is moving forward, but it is not fully implemented across the whole suite. `window` is still behind the curve relative to the newer style-tree direction.

## 4. `button` and `box` have been rebuilt from the ground up

The current `button` and `box` modules are not small patch-ups of the older system. They were rebuilt around a more testable, more composable, and more style-driven model.

Important capabilities in the rebuilt stack:

- substantial theming support through layered style trees and style overrides
- button scaling through a `scale` property, allowing larger or smaller buttons without rebuilding component logic
- selective overrides by passing additional style layers so a button can adopt a variant, family, or local style treatment without forking the component

For `button`, this now includes:

- layered `styleTree` and `styleDef` inputs
- family-aware sizing and scale-aware style resolution
- runtime composition of base styles plus targeted override layers
- a more explicit family tree structure in style paths

The button family tree now has structural prefixes and layers such as:

- `button`
- variant branches like `vertical` and `text`
- a family name such as `base` or a custom theme family
- a scale token such as `100` or another numeric value in the rough `20..400` range

This lets button styling remain composable while still supporting family-specific and scale-specific overrides.

Some Storybook entries are also configuration factories, not just visual demos. If you are trying to understand the structural requirements for a button theme or override layer, these stories are useful because they emit real JSON payloads:

- the `Designer` story produces a JSON style override blob that can be copied into a custom layered theme
- the `ButtonFamily` story produces authored family JSON and shows how dynamic scale values are synthesized from the baseline family styles

That makes Storybook a practical authoring aid for style-tree work, not only a rendering showcase.

For `box`, this now includes:

- a rebuilt layout and render-model flow
- clearer separation between computed layout, style resolution, and Pixi rendering
- renderer override hooks so visual output can be specialized without collapsing layout into rendering concerns

## 5. Smaller package surface through shared utilities

A substantial amount of older package-specific code has been replaced with cross-system references to shared utilities and modules. The goal has been to reduce duplicated logic and keep the source surface smaller and easier to reason about.

In practice, the package now leans on a relatively small number of focused dependencies and shared helpers rather than carrying large copies of similar logic in each package.

## Working rule

When adding or updating package code:

- resolve Pixi runtime classes through `PixiProvider`
- initialize `PixiProvider.shared` once at production or Storybook boot
- prefer headless fallback providers in tests unless the test explicitly needs real Pixi behavior
- treat `button` and `box` as the current styling and composition foundation, not as compatibility wrappers around older APIs
