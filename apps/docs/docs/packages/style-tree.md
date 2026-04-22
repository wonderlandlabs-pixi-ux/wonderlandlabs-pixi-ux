---
title: style-tree
description: Package README for @wonderlandlabs-pixi-ux/style-tree
---
# @wonderlandlabs-pixi-ux/style-tree

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


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

This package does not assume any sort of heirarchy or keys for nouns; you can organize your styles however you like.
However withn the @wonderlandlabs-pixi-ux family of modules we have established a pattern, documented below; 

```aiignore
context[.context].topic.propewrty
```
as in, window.panel (context) .font (topic) .size (property). this is comparable but not strictly analogous to the 
IBM convention Base, Element, Modifer (BEM). 


For consistency across packages, the style package now exposes canonical key conventions:
General naming rule: avoid compound keys such as `fontSize` in favor of dot-separated noun parts like `font.size`.
Nouns and verbs should be lowercase across the board, unless you expect and want to have your nouns split up.
This is true in the setter(s) and the getter(s) but it is really best if you express all noun keys in lowercase 
fully exploded termas as described below.

- `*.font.size` (number, px)
- `*.font.color` (hex string)
- `*.font.family` (string)
- `*.font.alpha` (0..1)
- `*.font.visible` (boolean)
- `*.fill.size` (number)
- `*.fill.color` (hex string)
- `*.fill.alpha` (0..1)
- `*.fill.visible` (boolean)
- `*.stroke.size` (number)
- `*.stroke.color` (hex string)
- `*.stroke.alpha` (0..1)
- `*.stroke.visible` (boolean)

Helpers:
- `normalizeStyleConvention(partial)`
- `setConvention(tree, path, states, partial)`
- `conventionKeys(path)`

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
