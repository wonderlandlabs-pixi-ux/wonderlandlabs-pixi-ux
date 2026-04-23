# @wonderlandlabs-pixi-ux/style-tree

A hierarchical style matching system with noun paths and state arrays.

## Features

- Hierarchical noun paths (`navigation.button.icon`)
- State-based selection (`hover`, `disabled`, `selected`, ...)
- Wildcard matching in noun segments (`base.*.label`)
- Base-state matching with `*` state
- Automatic interCaps normalization (`fontSize` -> `font.size`)
- Hierarchical-to-atomic fallback via `matchHierarchy()`
- Ranking by specificity

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/style-tree
```

See [Style DSL](/packages/style-tree-style-dsl) for the shared monorepo styling vocabulary and the common parser helpers.

## Usage

```typescript
import { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';

const tree = new StyleTree();

// Prefer dot-separated noun parts over compound keys:
// use "font.size" instead of "fontSize".
tree.set('base.*.label.font.size', [], 12);
tree.set('base.*.label.font.color', [], '#666');
tree.set('navigation.button.text.font.size', [], 14);
tree.set('navigation.button.text.font.color', [], '#000');
tree.set('navigation.button.text.font.color', ['hover'], '#0066cc');
tree.set('navigation.button.text.font.color', ['disabled', 'selected'], '#999');

const style = tree.match({
  nouns: ['navigation', 'button', 'text', 'font', 'color'],
  states: ['hover'],
});

const match = tree.findBestMatch({
  nouns: ['navigation', 'button', 'text', 'font', 'color'],
  states: ['hover'],
});

// Hierarchical first, then leaf fallback.
// Example: if "button.icon" is missing, fallback to "icon".
const iconStyle = tree.matchHierarchy({
  nouns: ['button', 'icon'],
  states: ['disabled'],
});

// Legacy interCaps keys are normalized automatically.
tree.set('button.label.fontSize', [], 12);
tree.get('button.label.font.size', []); // 12
tree.set('windowLabelFontSize', [], 10);
tree.get('window.label.font.size', []); // 10
```

## `setMany()`

Use `setMany()` when you want to expand an object into multiple style keys under a shared noun path.
This is especially handy for grouped values like `background`, `border`, `font`, and `fill`.

```typescript
import { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';

const tree = new StyleTree();

tree.setMany('button', [], {
  background: {
    color: '#ffffff',
    alpha: 1,
  },
  border: {
    color: '#222222',
    alpha: 0.8,
  },
});

tree.get('button.background.color', []); // '#ffffff'
tree.get('button.border.alpha', []); // 0.8
```

By default, `setMany()` recurses through nested plain objects and explodes them into deeper paths.

```typescript
tree.setMany('button', [], {
  font: {
    family: 'Helvetica',
    size: 12,
  },
});

tree.get('button.font.family', []); // 'Helvetica'
tree.get('button.font.size', []); // 12
```

If you pass `false` as the fourth argument, only the first level is expanded and nested objects are stored as-is.

```typescript
tree.setMany('button', [], {
  font: {
    family: 'Helvetica',
    size: 12,
  },
}, false);

tree.get('button.font', []); // { family: 'Helvetica', size: 12 }
tree.get('button.font.size', []); // undefined
```

## Matching Rules

Score: `(matching nouns * 100) + matching states`

- Wildcard nouns (`*`) match any segment but do not add score.
- State `*` is a base state that matches any query states.
- State patterns can be less specific than query states:
  - `['disabled']` matches query `['disabled', 'selected']`
  - `['disabled', 'selected']` does not match query `['disabled']`

## API

Constructor:
- `new StyleTree(options?)`
  - `validateKeys?: boolean` (default `true`)
  - `autoSortStates?: boolean` (default `true`)
  - `normalizeInterCaps?: boolean` (default `true`)

Methods:
- `set(nouns: string, states: string[], value: unknown): void`
- `setMany(nouns: string, states: string[], values: Record<string, unknown>, recurse?: boolean): void`
- `get(nouns: string, states: string[]): unknown`
- `has(nouns: string, states: string[]): boolean`
- `match(query: { nouns: string[]; states: string[] }): unknown`
- `matchHierarchy(query: { nouns: string[]; states: string[] }): unknown`
- `findBestMatch(query): StyleMatch | undefined`
- `findAllMatches(query): StyleMatch[]`
- `toJSON(options?: { statePrefix?: string }): unknown`

Static methods:
- `StyleTree.fromJSON(json, options?): StyleTree`
- `StyleTree.fromJSONUrl(url, options?): Promise<StyleTree>`
  - `options` extends the normal digest options with:
  - `getJson?: (url: string) => Promise<unknown>`

## Canonical Style Conventions

The tree itself is noun-agnostic, but the monorepo now standardizes on a CSS-like topology:

- `background.fill`
- `background.alpha`
- `border.color`
- `border.width`
- `border.radius`
- `padding`
- `gap`
- `label.font.size`
- `label.font.family`
- `label.font.color`
- `label.font.alpha`

Use dot-separated lowercase nouns and avoid compound keys such as `fontSize`.
Use `fill` when a value may be either a solid color or a gradient.
See [Style DSL](/packages/style-tree-style-dsl) for the full shared vocabulary and migration guidance.
The Style DSL doc also explains the resolution split explicitly: digestion normalizes authored data into paths, while inherited-root resolution defines whether values replace atomically or merge by sub-property.

Helpers:
- `normalizeStyleConvention(partial)`
- `setConvention(tree, path, states, partial)`
- `conventionKeys(path)`
- `resolveSpacing(tree, root, fallback?, options?)`
- `resolveGap(tree, root, fallback?, options?)`
- `resolveFill(tree, root, fallback?, options?)`
- `resolveBackgroundStyle(tree, root, fallback?, options?)`
- `resolveBorderStyle(tree, root, fallback?, options?)`
- `resolveFontStyle(tree, root, fallback?, options?)`

## Inherited Roots

The shared resolver helpers accept a `root` string that can describe either:

- one root, such as `button.container`
- or an ordered inheritance chain, such as `button.container, button.variant.base.container, button.modifier.danger.container`

Concept:

- earlier roots provide defaults
- later roots override earlier roots
- states still apply orthogonally

This is the preferred way to model style layering such as:

- base -> variant
- base -> variant -> modifier
- base -> variant -> local override

Example:

```ts
import { fromJSON, resolveBackgroundStyle } from '@wonderlandlabs-pixi-ux/style-tree';

const tree = fromJSON({
  button: {
    container: {
      background: {
        fill: '#e5e7eb',
      },
    },
    variant: {
      base: {
        container: {
          background: {
            fill: '#2f7f74',
          },
        },
      },
    },
    modifier: {
      danger: {
        container: {
          border: {
            color: '#aa3f3f',
            width: 2,
          },
        },
      },
    },
  },
});

const background = resolveBackgroundStyle(
  tree,
  'button.container, button.variant.base.container',
);
```

Implementation rule:

- use a comma-delimited root string
- roots are read left to right
- the resolver applies them right to left internally so the last root wins

So this:

```ts
'button.container, button.variant.base.container, button.modifier.danger.container'
```

means:

1. start with `button.container`
2. apply `button.variant.base.container`
3. apply `button.modifier.danger.container`

Use this whenever you want inheritance without inventing package-specific merge code.

### Example

```typescript
import { StyleTree, setConvention } from '@wonderlandlabs-pixi-ux/style-tree';

const tree = new StyleTree();
setConvention(tree, 'window.label', [], {
  font: {
    size: 10,
    family: 'Helvetica',
    color: '#000000',
    alpha: 1,
    visible: true,
  },
  fill: {
    size: 0,
    color: '#000000',
    alpha: 1,
    visible: true,
  },
  stroke: {
    size: 1,
    color: '#000000',
    alpha: 1,
    visible: true,
  },
});
```

## JSON Tree Digestion

`fromJSON()` converts nested JSON into tree entries.
Plain keys build noun paths; `$` keys create state variants.
If you want object expansion from data files rather than method calls, `fromJSON()` and `digestJSON()` are still the best fit.
You can use either the free functions or the class conveniences:
- `fromJSON(json)`
- `StyleTree.fromJSON(json)`
- `tree.toJSON()`
- `StyleTree.fromJSONUrl(url, { getJson })`

### Example

```typescript
import { StyleTree, fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const themeJSON = {
  button: {
    icon: {
      fill: {
        $*: { color: { r: 1, g: 1, b: 1 }, alpha: 1 },
        $disabled: { color: { r: 0.5, g: 0.5, b: 0.5 }, alpha: 1 },
      },
    },
  },
};

const tree = fromJSON(themeJSON);
const sameTree = StyleTree.fromJSON(themeJSON);
const roundTripped = sameTree.toJSON();
```

### Loading From URL

```typescript
import { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';

const browserTree = await StyleTree.fromJSONUrl('/theme.json');

const nodeTree = await StyleTree.fromJSONUrl('https://example.com/theme.json', {
  getJson: async (url) => {
    const response = await myCustomFetcher(url);
    return response.json();
  },
});
```

## A note on stored values

This library does not make any assumptions about which values should be stored in which keys; type validation
must be done by the using context. (hint - Zod can take a lot of pain out of the process.)

## License

MIT
