---
slug: /intro
title: Introduction
---

`@wonderlandlabs-pixi-ux` is an attempt to make PixiJS feel more like building for the browser:
drop-in components, predictable state, and structured layout/styling patterns. It is not a full-fledged
UX toolkit but it has some fundamental building blocks for application development. 

The goal is not to replace Pixi. The goal is to add a practical layer on top of it so teams can
build larger UI systems with familiar conventions from web development:

- CSS-style definitions (`style-tree`) for reusable visual rules
- flexbox-like layout ideas (`box`) for composition and alignment
- state-driven interaction primitives (`observe-drag`, `resizer`, `window`, `toolbar`, `button`)

In truth it began as an attempt to patch a system developed in Pixi that was demonstrating graphic artifacts
because graphic elements were being modified outside of the ticker refresh cycle. The ticker-forest module was
the first element of the system; others grew to prove the utility and ease the adaption of it as a holistic
base to any visual manipulation. 

## Underlying Technology

At the rendering layer, this project uses **[PixiJS](https://pixijs.com/)**, a high-performance 2D toolkit built on WebGL
(with modern GPU backends in newer versions). Pixi gives us fast scene graphs, textures, graphics,
text rendering, and interaction primitives, but it intentionally stays low-level about UI patterns.

Pixi is an animation and rendering language similar to the deprecated Flash system or Canvas; it uses a canvas
as a bridge but its underlying work is done in WebGL. Pixi.js is a seen describing language to make complex 
graphics - from graphs and charts to full blown video games - developable in the browser. 

At the state layer, this project uses **[Forestry](https://forestry-4-docs.netlify.app/)**. Forestry provides structured stores, branch-based
composition, and predictable mutation flows, which makes complex UI trees easier to reason about than
ad hoc object graphs and event wiring.

Forestry is an enterprise grade store system comparable to the Redux Toolkit; it is synchronous, schema driven,
branchable and testable class instances that supply Streaming data via RxJS to interested subscribers. 

`@wonderlandlabs-pixi-ux` sits between those two layers. Packages such as `ticker-forest` connect
Forestry state updates to Pixi's frame/ticker lifecycle so render work happens at the right time,
while higher-level modules (`box`, `button`, `toolbar`, `window`) build browser-inspired conventions
on top of that foundation.

## How To Use This Site

- Use the **Package Docs** section in the left sidebar for all package pages.
- Open any package page for API usage and examples mirrored from the package README.

## Package Set

<!-- PACKAGE_TABLE_START -->
| Package | Version | Docs | GitHub |
| --- | --- | --- | --- |
| `@wonderlandlabs-pixi-ux/box`<br/><sub>Tree-based layout engine for measurable areas, alignment, constraints, and BoxTree traversal.</sub> | `1.2.3` | [View Docs](/packages/box) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/box) |
| `@wonderlandlabs-pixi-ux/button`<br/><sub>Button store that composes BoxTree layout with StyleTree-driven visual states.</sub> | `1.2.3` | [View Docs](/packages/button) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/button) |
| `@wonderlandlabs-pixi-ux/caption`<br/><sub>Caption/speech/thought bubble rendering with configurable geometry and text styling.</sub> | `1.2.3` | [View Docs](/packages/caption) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/caption) |
| `@wonderlandlabs-pixi-ux/grid`<br/><sub>Zoom-aware Pixi grid rendering manager for infinite canvas and artboard use cases.</sub> | `1.2.3` | [View Docs](/packages/grid) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/grid) |
| `@wonderlandlabs-pixi-ux/observe-drag`<br/><sub>Serialized pointer-drag observer utilities with optional decorators for target motion.</sub> | `1.2.3` | [View Docs](/packages/observe-drag) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/observe-drag) |
| `@wonderlandlabs-pixi-ux/resizer`<br/><sub>Interactive resize handles and rectangle mutation flow for Pixi containers.</sub> | `1.2.3` | [View Docs](/packages/resizer) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/resizer) |
| `@wonderlandlabs-pixi-ux/root-container`<br/><sub>Root container utilities for centered stage coordinates with zoom/pan behavior.</sub> | `1.2.3` | [View Docs](/packages/root-container) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/root-container) |
| `@wonderlandlabs-pixi-ux/style-tree`<br/><sub>Hierarchical style matching engine keyed by noun paths and state selectors.</sub> | `1.2.3` | [View Docs](/packages/style-tree) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/style-tree) |
| `@wonderlandlabs-pixi-ux/ticker-forest`<br/><sub>Forestry base class that schedules dirty-state resolve work on a Pixi ticker.</sub> | `1.2.3` | [View Docs](/packages/ticker-forest) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/ticker-forest) |
| `@wonderlandlabs-pixi-ux/toolbar`<br/><sub>Toolbar composition store for arranging and styling groups of buttons.</sub> | `1.2.3` | [View Docs](/packages/toolbar) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/toolbar) |
| `@wonderlandlabs-pixi-ux/utils`<br/><sub>-</sub> | `1.2.3` | [View Docs](/packages/utils) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/utils) |
| `@wonderlandlabs-pixi-ux/window`<br/><sub>Window manager and window store primitives with titlebar, drag, and resize support.</sub> | `1.2.4` | [View Docs](/packages/window) | [![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/window) |
<!-- PACKAGE_TABLE_END -->

_This table is generated from `packages/*/package.json` via `yarn workspace @wonderlandlabs-pixi-ux/docs sync:intro-package-table`._

## Cross Dependencies

- `style-tree` is used directly by `box`, `button`, `caption`, and `window`.
- `box` is used by `caption`, `window`, and `button`.
- `observe-drag` and `resizer` are the recommended drag/resize primitives across packages.
- `ticker-forest` is used directly by `box`.
- `button` is used directly by `toolbar`.

## Documentation Source

Most package pages are generated from source READMEs in `/packages/*/README.md`.
