# Style DSL

This file defines the shared style topology for the `@wonderlandlabs-pixi-ux` monorepo.

The goal is to make package styling feel close to CSS:

- use familiar buckets like `background`, `border`, `font`, `padding`, and `gap`
- keep paths dot-separated and lowercase
- allow package-specific nouns only when the concept is truly package-specific
- use `fill` instead of `color` when a value may be either a solid color or a gradient

## Core Rules

- Prefer exploded paths over compound keys.
  - Use `label.font.size`
  - Avoid `label.fontSize`
- Prefer structural nouns over package-specific nouns.
  - Use `background.fill`
  - Avoid inventing `bubble.fill` unless the geometry is truly special
- Use `fill` for paint values that may be solid or gradient.
- Keep state handling orthogonal.
  - `button.$hover.label.font.color`
  - `button.$disabled.background.alpha`

## Canonical Paths

These are the shared paths packages should converge on.

### Background

- `*.background.fill`
- `*.background.alpha`
- `*.background.visible`

`background.fill` is polymorphic:

- solid string color
- solid numeric color
- rgb object
- gradient object

Examples:

```json
{
  "button": {
    "background": {
      "fill": "#1f2937",
      "alpha": 1
    }
  }
}
```

```json
{
  "button": {
    "background": {
      "fill": {
        "direction": "vertical",
        "colors": ["#f4f4f5", "#d4d4d8"]
      }
    }
  }
}
```

### Border

- `*.border.color`
- `*.border.width`
- `*.border.alpha`
- `*.border.radius`
- `*.border.visible`

### Font / Label

- `*.label.font.size`
- `*.label.font.family`
- `*.label.font.color`
- `*.label.font.alpha`
- `*.label.font.align`
- `*.label.font.weight`
- `*.label.font.style`
- `*.label.font.lineHeight`
- `*.label.font.letterSpacing`
- `*.label.font.wordWrap`
- `*.label.font.wordWrapWidth`
- `*.label.font.visible`

For generic text surfaces that are not explicitly labels, `*.font.*` is also acceptable.

### Spacing

- `*.padding`
- `*.gap`

`padding` may be:

- a single number
- a two-value array `[vertical, horizontal]`
- a four-value array `[top, right, bottom, left]`
- an object `{ top, right, bottom, left }`

## Package-Specific Extensions

Package-specific nouns are allowed when the concept is not just a normal box/background/font concern.

Examples:

- `caption.pointer.*`
- `caption.thought.*`
- `window.titlebar.*`

These should sit beside the shared structural DSL, not replace it.

Good:

- `caption.background.fill`
- `caption.border.radius`
- `caption.pointer.length`

Avoid:

- `caption.bubble.fill`
- `caption.bubble.stroke`

unless there is a concrete reason that the package must distinguish multiple background-like surfaces.

## Targeted Resolvers

`style-tree` now exposes shared parsers for common style roots:

- `resolveSpacing(tree, root, fallback?, options?)`
- `resolveGap(tree, root, fallback?, options?)`
- `resolveFill(tree, root, fallback?, options?)`
- `resolveBackgroundStyle(tree, root, fallback?, options?)`
- `resolveBorderStyle(tree, root, fallback?, options?)`
- `resolveFontStyle(tree, root, fallback?, options?)`

These helpers take a root such as:

- `button.container`
- `button.label`
- `window.titlebar`
- `caption`

Resolvers also accept comma-delimited roots to express ordered inheritance:

- `button.container, button.variant.base.container`
- `button.container, button.variant.base.container, button.modifier.danger.container`

Later roots override earlier roots.

and return normalized typed objects instead of requiring each package to manually query:

- `background.fill`
- `border.radius`
- `label.font.size`
- `padding`

Example:

```ts
import { fromJSON, resolveBackgroundStyle, resolveFontStyle } from '@wonderlandlabs-pixi-ux/style-tree';

const tree = fromJSON({
  button: {
    container: {
      background: {
        fill: {
          direction: 'vertical',
          colors: ['#f8fafc', '#e2e8f0'],
        },
        alpha: 1,
      },
      border: {
        color: '#334155',
        width: 1,
        radius: 999,
      },
    },
    label: {
      font: {
        size: 14,
        family: 'IBM Plex Sans',
        color: '#0f172a',
      },
    },
  },
});

const background = resolveBackgroundStyle(tree, 'button.container');
const labelFont = resolveFontStyle(tree, 'button.label');
```

## Resolution Model

The style system has two distinct phases:

### 1. Digestion

Digestion normalizes authored input into addressable style-tree paths.

Examples:

- `fontColor` becomes `font.color`
- nested JSON objects become deeper noun paths
- `$hover` and other `$state` keys become state variants

Digestion is structural only.
It does **not** decide how inherited values should combine.

### 2. Inheritance Resolution

Inheritance resolution decides how values from multiple roots or layers interact.

Examples:

- base root plus variant root
- base root plus variant root plus modifier root
- base theme plus local override theme

This is where replacement and merge behavior matter.

Example:

```ts
resolveBackgroundStyle(
  tree,
  'button.container, button.variant.base.container, button.modifier.danger.container',
);
```

Meaning:

1. read `button.container`
2. apply `button.variant.base.container`
3. apply `button.modifier.danger.container`
4. later roots override earlier roots

## Atomic vs Merged Values

Not every property resolves the same way.

Some values are atomic:

- a later value replaces the earlier one as a whole

Some values are merged:

- sub-properties resolve independently

### Atomic

- `background.fill`

Reason:

- `fill` is one semantic value
- it may be a solid color or a gradient object
- a later `fill` should replace an earlier `fill` completely

Example:

```json
{
  "button": {
    "container": {
      "background": {
        "fill": {
          "direction": "vertical",
          "colors": ["#d9d9d9", "#ffffff", "#bfbfbf"]
        }
      }
    },
    "variant": {
      "capsule": {
        "container": {
          "background": {
            "fill": "#183a37"
          }
        }
      }
    }
  }
}
```

For the roots:

```ts
'button.container, button.variant.capsule.container'
```

the final fill is:

```ts
'#183a37'
```

not a hybrid of the earlier gradient and the later solid fill.

### Merged By Sub-Property

- `border`
- `label.font`

Reason:

- later `border.color` should not erase an earlier `border.width`
- later `label.font.color` should not erase an earlier `label.font.size`

Example:

```json
{
  "button": {
    "label": {
      "font": {
        "size": 14,
        "family": "IBM Plex Sans"
      }
    },
    "variant": {
      "danger": {
        "label": {
          "font": {
            "color": "#ffffff"
          }
        }
      }
    }
  }
}
```

The resolved font keeps:

- `size: 14`
- `family: "IBM Plex Sans"`
- `color: "#ffffff"`

### Normalized Shorthand / Scalar

- `padding`
- `gap`
- `background.alpha`
- `border.width`
- `label.font.alpha`

These resolve as scalar or shorthand values, not as object-merging surfaces.

## Predictability Rule

When in doubt:

- digestion tells you how authored data becomes paths
- resolution tells you how inherited paths combine
- atomic values replace as a whole
- merged values combine by sub-property

Packages should rely on the shared resolvers to enforce these semantics instead of reimplementing merge rules locally.

## Migration Guidance

When normalizing older package styles:

1. Move package-specific paint nouns toward `background.*` and `border.*`.
2. Move text styling toward `label.font.*`.
3. Preserve only truly custom geometry nouns.
4. Replace package-local parsers with the shared `style-tree` resolvers where possible.

## Digestor Options

There are several valid ways to build digestors on top of the DSL. The intent is to keep the authored style language stable while allowing different implementation layers above it.

### 1. Primitive Root Resolvers

These resolve one concern from one root.

Examples:

- `resolveSpacing(tree, 'button.container')`
- `resolveBackgroundStyle(tree, 'button.container')`
- `resolveBorderStyle(tree, 'caption')`
- `resolveFontStyle(tree, 'button.label')`
- `resolveBackgroundStyle(tree, 'button.container, button.variant.text.container')`

Use this layer when:

- a package only needs one or two style buckets
- you want minimal abstraction
- you are building or testing the lower-level primitives

This should remain the core `style-tree` API surface.

### 2. Composite Surface Digestors

These combine several primitive resolvers into one typed result for a common UI surface.

Examples:

- `resolvePanelStyles(tree, root)`
- `resolveLabelStyles(tree, root)`
- `resolveControlStyles(tree, root)`

Typical outputs:

- panel: `{ background, border, padding, gap }`
- label: `{ font, visible }`
- control: `{ background, border, padding, gap, label }`

Use this layer when:

- several packages share the same structural styling concerns
- you want to reduce repeated resolver orchestration
- the grouping is generic and not package-specific

This is the recommended next layer above the primitives.

### 3. Schema-Driven Generic Digestors

These take a mapping definition and assemble a typed result from reusable digestor units.

Conceptually:

```ts
digestStyle(tree, 'button.container', {
  background: backgroundDigestor,
  border: borderDigestor,
  padding: spacingDigestor,
});
```

With inheritance roots:

```ts
digestStyle(tree, 'button.container, button.variant.base.container, button.modifier.danger.container', {
  background: backgroundDigestor,
  border: borderDigestor,
  padding: spacingDigestor,
});
```

Use this layer when:

- you want maximum reuse
- several composite digestors are starting to repeat the same composition logic
- you want one generic mechanism for assembling typed outputs

This is a good long-term abstraction, but it is not required for the first pass.

### 4. Package Profile Digestors

These are package-aware helpers such as:

- `digestButtonStyles(...)`
- `digestCaptionStyles(...)`
- `digestWindowStyles(...)`

Use this layer sparingly.

Pros:

- easiest package adoption
- strongest local consistency

Cons:

- couples `style-tree` to downstream package semantics
- makes the style package responsible for application-specific behavior

Preferred rule:

- keep package profile digestors out of `style-tree`
- build them in the package unless multiple packages truly share the same profile

## Recommended Strategy

The preferred stack for this monorepo is:

1. Define the canonical authored DSL in CSS-like terms.
2. Keep primitive root resolvers in `style-tree`.
3. Add composite surface digestors in `style-tree` for genuinely common surfaces.
4. Keep package-specific 
5. digestors in the package layer unless they become broadly reusable.

In short:

- `style-tree` should own the language and the common parsers
- packages should own their truly package-specific geometry or behavior
