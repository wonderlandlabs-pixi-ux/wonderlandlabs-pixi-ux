import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import {
  ButtonSimpleStore,
  CONTROL_CHECKBOX,
  CONTROL_RADIO,
  EVENT_CHECK_CHANGED,
  EVENT_RADIO_SELECTED,
  ORIENTATION_VERTICAL,
  createButtonSimpleComparisonStyleTree,
  createButtonSimpleStoreClass,
  snapButtonSimpleSize,
  makeButtonStyle,
  resolveButtonSimpleStyle,
} from '../src/index.js';

function createMockApp() {
  const queuedTicks: Array<{ fn: () => void; context?: unknown }> = [];
  return {
    app: {
      render() {},
      ticker: {
        addOnce(fn: () => void, context?: unknown) {
          queuedTicks.push({ fn, context });
        },
        remove() {},
      },
    },
    flush() {
      while (queuedTicks.length > 0) {
        const next = queuedTicks.shift()!;
        next.fn.call(next.context);
      }
    },
  };
}

function createButton(
  value: ConstructorParameters<typeof ButtonSimpleStore>[0],
  options: Partial<ConstructorParameters<typeof ButtonSimpleStore>[1]> = {},
) {
  const { app, flush } = createMockApp();
  const pixi = PixiProvider.shared;
  const parent = options.parentContainer ?? new pixi.Container();
  const button = new ButtonSimpleStore(value, {
    app,
    parentContainer: parent,
    pixi,
    styleTree: createButtonSimpleComparisonStyleTree(),
    ...options,
  });
  button.kickoff();
  flush();
  return { app, button, flush, parent, pixi };
}

beforeEach(() => {
  PixiProvider.init(PixiProvider.fallbacks);
});

describe('ButtonSimpleStore', () => {
  it('uses the default label font size from the style tree', () => {
    const { button } = createButton({ label: 'Default' });
    const label = button.contentContainer.children.find((child) => child.label === 'label-label') as {
      style?: { fontSize?: number };
    } | undefined;

    expect(label?.style?.fontSize).toBe(14);
  });

  it('lays out horizontal icon + label content and snaps width', () => {
    const { button } = createButton({ label: 'Launch' });

    expect((button.container?.hitArea as { width: number }).width).toBeGreaterThan(70);
    expect((button.container?.hitArea as { height: number }).height).toBe(36);
  });

  it('lays out vertical content when the style tree changes orientation', () => {
    const tree = createButtonSimpleComparisonStyleTree();
    tree.set('button.vertical.layout.orientation', [], ORIENTATION_VERTICAL);
    tree.set('button.vertical.layout.min.width', [], 56);
    tree.set('button.vertical.layout.min.height', [], 72);
    const { button } = createButton({ label: 'Profile' }, {
      styleTree: tree,
      root: 'button.vertical',
    });

    expect((button.container?.hitArea as { width: number }).width).toBeGreaterThanOrEqual(56);
    expect((button.container?.hitArea as { height: number }).height).toBeGreaterThanOrEqual(72);
  });

  it('updates button width when the label changes', () => {
    const { button, flush } = createButton({ label: 'Go' });
    const initialWidth = (button.container?.hitArea as { width: number }).width;

    button.updateState({ label: 'Proceed Now' });
    flush();

    expect((button.container?.hitArea as { width: number }).width).toBeGreaterThan(initialWidth);
  });

  it('supports checked shape icons without image assets', () => {
    const { button } = createButton({ label: 'Select', checked: true });
    const iconHost = button.contentContainer.children.find((child) => child.label === 'icon') as {
      children?: Array<{ visible?: boolean }>;
    } | undefined;

    expect(iconHost).toBeTruthy();
    expect(iconHost?.children?.some((child) => child.visible)).toBe(true);
  });

  it('toggles checked on click and still allows external checked updates', () => {
    const { button, flush } = createButton({ label: 'Toggle', checked: false });

    button.click();
    flush();
    expect(button.value.checked).toBe(true);

    button.updateState({ checked: false });
    flush();
    expect(button.value.checked).toBe(false);
  });

  it('emits radioSelected with id and buttonValue when a radio button is selected', () => {
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container() as ReturnType<typeof PixiProvider.shared.Container> & {
      emit: ReturnType<typeof vi.fn>;
    };
    parent.emit = vi.fn();
    const { button, flush } = createButton({
      id: 'mode-login',
      label: 'Login',
      buttonValue: 'login',
      controlType: CONTROL_RADIO,
      checked: false,
    }, { parentContainer: parent });

    button.click();
    flush();

    expect(parent.emit).toHaveBeenCalledWith(EVENT_RADIO_SELECTED, expect.objectContaining({
      id: 'mode-login',
      buttonValue: 'login',
      changedButtonValue: 'login',
      checked: true,
      button,
    }));

    parent.emit.mockClear();
    button.click();
    flush();
    expect(button.value.checked).toBe(true);
    expect(parent.emit).not.toHaveBeenCalled();
  });

  it('can be deselected by a parent radio group event handler', () => {
    const { button, flush } = createButton({
      id: 'mode-register',
      label: 'Register',
      buttonValue: 'register',
      controlType: CONTROL_RADIO,
      checked: true,
    });

    button.onRadioDeselected({ id: 'mode-login' });
    flush();

    expect(button.value.checked).toBe(false);
  });

  it('emits checkChanged with the changed value and current checked values', () => {
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container() as ReturnType<typeof PixiProvider.shared.Container> & {
      emit: ReturnType<typeof vi.fn>;
    };
    parent.emit = vi.fn();
    const { button, flush } = createButton({
      id: 'feature-a',
      label: 'Feature A',
      buttonValue: 'feature-a',
      controlType: CONTROL_CHECKBOX,
      checked: false,
    }, {
      parentContainer: parent,
      getCheckedValues: () => ['feature-a', 'feature-c'],
    });

    button.click();
    flush();

    expect(parent.emit).toHaveBeenCalledWith(EVENT_CHECK_CHANGED, expect.objectContaining({
      id: 'feature-a',
      buttonValue: 'feature-a',
      changedButtonValue: 'feature-a',
      checked: true,
      checkedValues: ['feature-a', 'feature-c'],
      button,
    }));
  });

  it('uses callback boolean return to force checked state', () => {
    const { button, flush } = createButton({
      label: 'Rule',
      checked: false,
      callback: () => false,
    });

    button.click();
    flush();
    expect(button.value.checked).toBe(false);

    button.updateState({ callback: () => true });
    flush();
    button.click();
    flush();
    expect(button.value.checked).toBe(true);
  });

  it('suppresses callback execution when disabled', () => {
    const callback = vi.fn();
    const { button } = createButton({
      label: 'Save',
      disabled: true,
      callback,
    });

    button.click();
    expect(callback).not.toHaveBeenCalled();
  });

  it('uses the down background state while pressed', () => {
    const { button, flush } = createButton({ label: 'Press' });

    button.onPointerDown();
    flush();

    expect(button.backgrounds.down.visible).toBe(true);
    expect(button.backgrounds.active.visible).toBe(false);

    button.onPointerUp();
    flush();
    expect(button.backgrounds.down.visible).toBe(false);
  });

  it('defaults disabled icon alpha to 0.5', () => {
    const { button } = createButton({ label: 'Icon', disabled: true });
    const iconHost = button.contentContainer.children.find((child) => child.label === 'icon') as {
      children?: Array<{ label?: string; alpha?: number; visible?: boolean }>;
    } | undefined;
    const disabledIcon = iconHost?.children?.find((child) => child.label === 'icon-disabled');

    expect(disabledIcon?.visible).toBe(true);
    expect(disabledIcon?.alpha).toBe(0.5);
  });

  it('creates reusable style-tree-backed button classes', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const ButtonClass = createButtonSimpleStoreClass(createButtonSimpleComparisonStyleTree());
    const button = new ButtonClass({ label: 'Bound' }, { app, parentContainer: parent, pixi });

    button.kickoff();
    flush();

    expect((button.container?.hitArea as { width: number }).width).toBeGreaterThan(0);
  });
});

describe('snapButtonSimpleSize', () => {
  it('rounds upward to the nearest configured increment', () => {
    expect(snapButtonSimpleSize(81, 10)).toBe(90);
    expect(snapButtonSimpleSize(80, 10)).toBe(80);
    expect(snapButtonSimpleSize(81, 0)).toBe(81);
  });
});

describe('makeButtonStyle', () => {
  it('creates a style tree with overridden baseColor', () => {
    const styleTree = makeButtonStyle({ baseColor: '#ff0000' });
    expect(styleTree.match({ nouns: ['button', 'simple', 'layout', 'background', 'color'], states: [] })).toBe('#ff0000');
  });

  it('creates a style tree with overridden textColor', () => {
    const styleTree = makeButtonStyle({ textColor: '#00ff00' });
    expect(styleTree.match({ nouns: ['button', 'simple', 'label', 'color'], states: [] })).toBe('#00ff00');
  });

  it('creates a style tree with overridden fontSize', () => {
    const styleTree = makeButtonStyle({ fontSize: 20 });
    expect(styleTree.match({ nouns: ['button', 'simple', 'label', 'font', 'size'], states: [] })).toBe(20);
  });

  it('creates a style tree with overridden padding', () => {
    const styleTree = makeButtonStyle({ padding: { x: 30, y: 40 } });
    expect(styleTree.match({ nouns: ['button', 'simple', 'layout', 'padding', 'x'], states: [] })).toBe(30);
    expect(styleTree.match({ nouns: ['button', 'simple', 'layout', 'padding', 'y'], states: [] })).toBe(40);
  });

  it('creates a style tree with gradient baseColor', () => {
    const styleTree = makeButtonStyle({ baseColor: ['#ff0000', '#00ff00'] });
    const color = styleTree.match({ nouns: ['button', 'simple', 'layout', 'background', 'color'], states: [] });
    expect(color).toEqual({ colors: ['#ff0000', '#00ff00'] });
  });

  it('applies padding from makeButtonStyle to checkboxes', () => {
    const styleTree = makeButtonStyle({
      padding: 50
    });
    const { layout } = resolveButtonSimpleStyle(styleTree, 'button.simple', { controlType: CONTROL_CHECKBOX });
    expect(layout.paddingX).toBe(50);
    expect(layout.paddingY).toBe(50);
  });
});
