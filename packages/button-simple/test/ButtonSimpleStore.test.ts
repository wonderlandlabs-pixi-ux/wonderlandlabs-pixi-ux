import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { ButtonSimpleStore, createButtonSimpleStoreClass, ORIENTATION_HORIZONTAL, ORIENTATION_VERTICAL, snapButtonSimpleSize } from '../src/index.js';

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

beforeEach(() => {
  PixiProvider.init(PixiProvider.fallbacks);
});

describe('ButtonSimpleStore', () => {
  it('uses the default label font size when none is provided', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Default',
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 0,
        paddingX: 8,
        paddingY: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();

    const label = button.contentContainer.children.find((child) => child.label === 'label-label') as {
      style?: { fontSize?: number };
    } | undefined;

    expect(label?.style?.fontSize).toBe(14);
  });

  it('lays out horizontal icon + label content and snaps width by increment', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Launch',
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 8,
        paddingX: 10,
        paddingY: 6,
        sizeIncrement: 10,
        minHeight: 30,
        borderRadius: 8,
        borderWidth: 2,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'icon',
          iconType: 'image',
          id: 'left-icon',
          icon: 'https://assets.example.com/launch.png',
          width: 16,
          height: 16,
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          fontSize: 20,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();

    expect((button.container?.hitArea as { width: number }).width).toBe(120);
    expect((button.container?.hitArea as { height: number }).height).toBe(40);
  });

  it('lays out vertical content with centered cross-axis positioning', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const ButtonClass = createButtonSimpleStoreClass({
      orientation: ORIENTATION_VERTICAL,
      gap: 6,
      paddingX: 8,
      paddingY: 8,
      minWidth: 40,
      sizeIncrement: 10,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: '#334455',
      borderColor: '#111111',
    }, [
      {
        type: 'icon',
        iconType: 'image',
        id: 'icon',
        icon: 'https://assets.example.com/profile.png',
        width: 24,
        height: 24,
      },
      {
        type: 'label',
        id: 'label',
        useButtonLabel: true,
        fontSize: 12,
        color: '#ffffff',
      },
    ]);

    const button = new ButtonClass({
      label: 'Profile',
    }, {
      app,
      parentContainer: parent,
      pixi,
    });

    button.kickoff();
    flush();

    expect((button.container?.hitArea as { width: number }).width).toBe(70);
    expect((button.container?.hitArea as { height: number }).height).toBe(60);
  });

  it('updates button width when the label changes', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Go',
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 0,
        paddingX: 10,
        paddingY: 6,
        sizeIncrement: 10,
        borderRadius: 6,
        borderWidth: 1,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          fontSize: 18,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();
    const initialWidth = (button.container?.hitArea as { width: number }).width;

    button.updateState({ label: 'Proceed Now' });
    flush();
    const nextWidth = (button.container?.hitArea as { width: number }).width;

    expect(nextWidth).toBeGreaterThan(initialWidth);
  });

  it('supports checked shape icons without image assets', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Select',
      checked: true,
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 6,
        paddingX: 8,
        paddingY: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'icon',
          id: 'check',
          iconType: 'box',
          checkedIconType: 'filledBox',
          width: 14,
          height: 14,
          color: '#ffffff',
          fillColor: '#4aa36b',
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();

    const iconHost = button.contentContainer.children.find((child) => child.label === 'check') as {
      children?: Array<{ visible?: boolean }>;
    } | undefined;
    expect(iconHost).toBeTruthy();
    expect(iconHost?.children?.some((child) => child.visible)).toBe(true);
  });

  it('toggles checked on click and still allows external checked updates', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Toggle',
      checked: false,
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 6,
        paddingX: 8,
        paddingY: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'icon',
          id: 'check',
          iconType: 'box',
          checkedIconType: 'filledBox',
          width: 14,
          height: 14,
          color: '#ffffff',
          fillColor: '#4aa36b',
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();
    expect(button.value.checked).toBe(false);

    button.click();
    flush();
    expect(button.value.checked).toBe(true);

    button.updateState({ checked: false });
    flush();
    expect(button.value.checked).toBe(false);
  });

  it('uses callback boolean return to force checked state', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Rule',
      checked: false,
      callback: () => false,
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 0,
        paddingX: 8,
        paddingY: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();
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
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const callback = vi.fn();
    const button = new ButtonSimpleStore({
      label: 'Save',
      disabled: true,
      callback,
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 0,
        paddingX: 8,
        paddingY: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          fontSize: 16,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();
    button.click();
    expect(callback).not.toHaveBeenCalled();

    button.updateState({ disabled: false });
    flush();
    button.click();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('uses the down background state while pressed', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Press',
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 0,
        paddingX: 8,
        paddingY: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: '#223344',
        hoverBackgroundColor: '#334455',
        downBackgroundColor: '#445566',
        borderColor: '#112233',
        hoverBorderColor: '#223344',
        downBorderColor: '#334455',
      },
      children: [
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();
    button.onPointerDown();
    flush();

    expect(button.backgrounds.down.visible).toBe(true);
    expect(button.backgrounds.active.visible).toBe(false);

    button.onPointerUp();
    flush();

    expect(button.backgrounds.down.visible).toBe(false);
  });

  it('defaults disabled icon alpha to 0.5', () => {
    const { app, flush } = createMockApp();
    const pixi = PixiProvider.shared;
    const parent = new pixi.Container();
    const button = new ButtonSimpleStore({
      label: 'Icon',
      disabled: true,
    }, {
      app,
      parentContainer: parent,
      pixi,
      layout: {
        orientation: ORIENTATION_HORIZONTAL,
        gap: 6,
        paddingX: 8,
        paddingY: 4,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: '#223344',
        borderColor: '#112233',
      },
      children: [
        {
          type: 'icon',
          iconType: 'image',
          id: 'icon',
          icon: 'https://assets.example.com/icon.png',
          width: 16,
          height: 16,
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          color: '#ffffff',
        },
      ],
    });

    button.kickoff();
    flush();

    const iconHost = button.contentContainer.children.find((child) => child.label === 'icon') as {
      children?: Array<{ label?: string; alpha?: number; visible?: boolean }>;
    } | undefined;
    const disabledIcon = iconHost?.children?.find((child) => child.label === 'icon-disabled');
    expect(disabledIcon?.visible).toBe(true);
    expect(disabledIcon?.alpha).toBe(0.5);
  });
});

describe('snapButtonSimpleSize', () => {
  it('rounds upward to the nearest configured increment', () => {
    expect(snapButtonSimpleSize(81, 10)).toBe(90);
    expect(snapButtonSimpleSize(80, 10)).toBe(80);
    expect(snapButtonSimpleSize(81, 0)).toBe(81);
  });
});
