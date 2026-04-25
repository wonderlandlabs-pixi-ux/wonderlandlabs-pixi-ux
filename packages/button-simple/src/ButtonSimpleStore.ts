import {fromJSON, StyleTree} from '@wonderlandlabs-pixi-ux/style-tree';
import defaultStylesJSON from './defaultStyles.json' with {type: 'json'};
import {
  CONTROL_BUTTON,
  CONTROL_CHECKBOX,
  CONTROL_RADIO, ICON_BOX,
  ICON_CIRCLE, ICON_FILLED_BOX,
  ICON_FILLED_CIRCLE,
  ORIENTATION_HORIZONTAL,
  PART_ICON,
  PART_LABEL,
} from './constants.js';
import {ButtonSimpleStoreBase,} from './ButtonSimpleStoreBase.js';
import type {
  ButtonSimpleChild,
  ButtonSimpleControlEvent,
  ButtonSimpleLayout,
  ButtonSimpleOptions,
  ButtonSimpleState,
} from './types.js';
import {snapButtonSimpleSize} from "./ButtonSimpleStoreBase.js";
import {makeButtonStyle, type MakeButtonStyleOptions} from "./helpers.js";

export type ButtonSimpleOptionsWithStyle = ButtonSimpleOptions & {
  styleTree?: StyleTree;
  simpleStyle?: MakeButtonStyleOptions;
  root?: string;
  x?: number;
  y?: number;
};

export class ButtonSimpleStore extends ButtonSimpleStoreBase {
  constructor(value: ButtonSimpleState, options: ButtonSimpleOptionsWithStyle) {
    const root = options.root ?? 'button.simple';
    let styleTree = options.styleTree;
    if (!styleTree && options.simpleStyle) {
      styleTree = makeButtonStyle(options.simpleStyle);
    }
    if (!styleTree) {
      styleTree = createButtonSimpleComparisonStyleTree();
    }
    const resolved = resolveButtonSimpleStyle(styleTree, root, value);
    super(value, {
      ...options,
      layout: {
        ...resolved.layout,
        x: options.x ?? 0,
        y: options.y ?? 0,
      },
      children: resolved.children,
    });
  }
}

export type ButtonSimpleStoreClass = new (value: ButtonSimpleState, options: ButtonSimpleOptions) => ButtonSimpleStore;

export function createButtonSimpleStoreClass(styleTree: StyleTree, root = 'button.simple') {
  const BoundButtonSimpleStore = class extends ButtonSimpleStore {
    constructor(value: ButtonSimpleState, options: ButtonSimpleOptions) {
      super(value, {
        ...options,
        styleTree,
        root,
      });
    }
  };
  return BoundButtonSimpleStore as ButtonSimpleStoreClass;
}

export function resolveButtonSimpleStyle(
  styleTree: StyleTree,
  root = 'button.simple',
  stateInput?: ButtonSimpleState,
): { layout: ButtonSimpleLayout; children: ButtonSimpleChild[] } {
  const controlType = stateInput?.controlType ?? CONTROL_BUTTON;

  const read = <T>(path: string, fallback: T, states: string[] = []): T => {
    const rootNouns = root.split('.');
    const controlNouns = [...rootNouns];
    if (controlType === CONTROL_CHECKBOX) {
      controlNouns.push('checkbox');
    } else if (controlType === CONTROL_RADIO) {
      controlNouns.push('radio');
    }

    // 1. Try with controlType specific nouns (e.g. button.simple.checkbox.layout.padding.x)
    let result = styleTree.matchHierarchy({
      nouns: [...controlNouns, ...path.split('.')],
      states,
    });
    if (result !== undefined) {
      return result as T;
    }

    // 2. Try with base root nouns if different (e.g. button.simple.layout.padding.x)
    if (controlType !== CONTROL_BUTTON) {
      result = styleTree.matchHierarchy({
        nouns: [...rootNouns, ...path.split('.')],
        states,
      });
      if (result !== undefined) {
        return result as T;
      }
    }

    // 3. Try default style tree as secondary fallback
    const defaultTree = createButtonSimpleComparisonStyleTree();
    // 3a. Try default with controlType
    result = defaultTree.matchHierarchy({
      nouns: [...'button.simple'.split('.'), ...(controlType === CONTROL_CHECKBOX ? ['checkbox'] : controlType === CONTROL_RADIO ? ['radio'] : []), ...path.split('.')],
      states,
    });
    if (result !== undefined) {
      return result as T;
    }

    // 3b. Try default base
    result = defaultTree.matchHierarchy({
      nouns: [...'button.simple'.split('.'), ...path.split('.')],
      states,
    });

    return result === undefined ? fallback : result as T;
  };

  const children: ButtonSimpleChild[] = [];

  if (controlType === CONTROL_CHECKBOX || controlType === CONTROL_RADIO) {
    const isCheckbox = controlType === CONTROL_CHECKBOX;
    const iconChild = {
      type: PART_ICON,
      id: 'managed-icon',
      iconType: read('icon.type', isCheckbox ? ICON_BOX : ICON_CIRCLE),
      checkedIconType: read('icon.checked.type', isCheckbox ? ICON_FILLED_BOX : ICON_FILLED_CIRCLE),
      width: read('icon.width', 12),
      height: read('icon.height', 12),
      iconStyle: {
        active: {
          alpha: read('icon.alpha', 1),
          color: read('icon.color', '#ffffff'),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined),
        },
        hovered: {
          alpha: read('icon.alpha', 1, ['hovered']),
          color: read('icon.color', '#ffffff', ['hovered']),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined, ['hovered']),
        },
        down: {
          alpha: read('icon.alpha', 1, ['down']),
          color: read('icon.color', '#ffffff', ['down']),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined, ['down']),
        },
        disabled: {
          alpha: read('icon.alpha', 0.5, ['disabled']),
          color: read('icon.color', '#ffffff', ['disabled']),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined, ['disabled']),
        },
      },
      borderWidth: read('icon.border.width', 2),
    } satisfies ButtonSimpleChild;
    children.push(iconChild);
  }

  const userChildren = read<ButtonSimpleChild[] | undefined>('children', undefined);
  if (Array.isArray(userChildren)) {
    children.push(...userChildren);
  } else if (children.length === 0) {
    // default for regular button or if no user children defined
    const iconChild = {
      type: PART_ICON,
      id: 'icon',
      iconType: read('icon.type', ICON_CIRCLE),
      checkedIconType: read('icon.checked.type', ICON_FILLED_CIRCLE),
      width: read('icon.width', 12),
      height: read('icon.height', 12),
      iconStyle: {
        active: {
          alpha: read('icon.alpha', 1),
          color: read('icon.color', '#ffffff'),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined),
        },
        hovered: {
          alpha: read('icon.alpha', 1, ['hovered']),
          color: read('icon.color', '#ffffff', ['hovered']),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined, ['hovered']),
        },
        down: {
          alpha: read('icon.alpha', 1, ['down']),
          color: read('icon.color', '#ffffff', ['down']),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined, ['down']),
        },
        disabled: {
          alpha: read('icon.alpha', 0.5, ['disabled']),
          color: read('icon.color', '#ffffff', ['disabled']),
          fillColor: read<string | number | undefined>('icon.fill.color', undefined, ['disabled']),
        },
      },
      borderWidth: read('icon.border.width', 2),
    } satisfies ButtonSimpleChild;

    const labelChild = {
      type: PART_LABEL,
      id: 'label',
      useButtonLabel: true,
      fontSize: read('label.font.size', 14),
      fontFamily: read<string | undefined>('label.font.family', undefined),
      labelStyle: {
        active: { color: read('label.color', '#ffffff') },
        hovered: { color: read('label.color', '#ffffff', ['hovered']) },
        down: { color: read('label.color', '#ffffff', ['down']) },
        disabled: { color: read('label.color', '#ffffff', ['disabled']) },
      },
    } satisfies ButtonSimpleChild;

    children.push(iconChild, labelChild);
  } else {
    // for radio/checkbox, if no user children, add at least the label
    const labelChild = {
      type: PART_LABEL,
      id: 'label',
      useButtonLabel: true,
      fontSize: read('label.font.size', 14),
      fontFamily: read<string | undefined>('label.font.family', undefined),
      labelStyle: {
        active: { color: read('label.color', '#ffffff') },
        hovered: { color: read('label.color', '#ffffff', ['hovered']) },
        down: { color: read('label.color', '#ffffff', ['down']) },
        disabled: { color: read('label.color', '#ffffff', ['disabled']) },
      },
    } satisfies ButtonSimpleChild;
    children.push(labelChild);
  }

  return {
    layout: {
      orientation: read('layout.orientation', ORIENTATION_HORIZONTAL),
      gap: read('layout.gap', 8),
      paddingX: read('layout.padding.x', 10),
      paddingY: read('layout.padding.y', 6),
      sizeIncrement: read<number | undefined>('layout.size.increment', 4),
      minWidth: read<number | undefined>('layout.min.width', 0),
      minHeight: read<number | undefined>('layout.min.height', 34),
      borderRadius: read('layout.border.radius', 10),
      borderWidth: read('layout.border.width', 2),
      backgroundStyle: {
        active: {
          backgroundColor: read('layout.background.color', '#2f5d8a'),
          borderColor: read('layout.border.color', '#17324b'),
        },
        hovered: {
          backgroundColor: read('layout.background.color', '#2f5d8a', ['hovered']),
          borderColor: read('layout.border.color', '#17324b', ['hovered']),
        },
        down: {
          backgroundColor: read('layout.background.color', '#2f5d8a', ['down']),
          borderColor: read('layout.border.color', '#17324b', ['down']),
        },
        disabled: {
          backgroundColor: read('layout.background.color', '#2f5d8a', ['disabled']),
          borderColor: read('layout.border.color', '#17324b', ['disabled']),
        },
      },
    },
    children,
  };
}

export function createButtonSimpleComparisonStyleTree(): StyleTree {
  return fromJSON(defaultStylesJSON as Record<string, unknown>);
}

export {
  snapButtonSimpleSize,
  type ButtonSimpleControlEvent,
};
