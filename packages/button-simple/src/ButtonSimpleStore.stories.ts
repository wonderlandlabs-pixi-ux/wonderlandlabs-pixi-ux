import type { Meta, StoryObj } from '@storybook/html';
import * as Pixi from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import {
  ButtonSimpleStore,
  ORIENTATION_HORIZONTAL,
  ORIENTATION_VERTICAL,
  createButtonSimpleStoreClass,
} from './index.js';

const PLACEHOLDER_ICON = '/icons/demo-icon.png';
const STORY_BACKGROUND = new Pixi.Color('#f3eee2').toNumber();

const meta: Meta = {
  title: 'Button Simple/ButtonSimpleStore',
};

export default meta;
type Story = StoryObj;

function createStoryShell(width: number, height: number): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.width = '100%';
  wrapper.style.height = `${height}px`;
  wrapper.style.minHeight = `${height}px`;
  wrapper.style.background = 'linear-gradient(180deg, #f9f4ea 0%, #e8efe6 100%)';
  wrapper.style.border = '1px solid #ddd4c4';
  wrapper.style.borderRadius = '16px';
  wrapper.style.padding = '12px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.dataset.width = String(width);
  wrapper.dataset.height = String(height);
  return wrapper;
}

async function createPixiApp(wrapper: HTMLDivElement): Promise<Pixi.Application> {
  PixiProvider.init(Pixi);
  const app = new Pixi.Application();
  await app.init({
    resizeTo: wrapper,
    backgroundColor: STORY_BACKGROUND,
    antialias: true,
  });
  wrapper.appendChild(app.canvas);
  return app;
}

export const HorizontalExamples: Story = {
  render: () => {
    const wrapper = createStoryShell(920, 220);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      const primary = new ButtonSimpleStore({
        label: 'Launch Sequence',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        layout: {
          x: 40,
          y: 44,
          orientation: ORIENTATION_HORIZONTAL,
          gap: 8,
          paddingX: 12,
          paddingY: 8,
          sizeIncrement: 4,
          minHeight: 40,
          borderRadius: 12,
          borderWidth: 2,
          backgroundColor: '#2f5d8a',
          hoverBackgroundColor: '#3b79b4',
          disabledBackgroundColor: '#b2bcc7',
          borderColor: '#17324b',
          hoverBorderColor: '#1f4e78',
          disabledBorderColor: '#8a93a0',
        },
        children: [
          {
            type: 'icon',
            iconType: 'image',
            id: 'icon',
            icon: PLACEHOLDER_ICON,
            width: 20,
            height: 20,
            disabledAlpha: 0.45,
          },
          {
            type: 'label',
            id: 'label',
            useButtonLabel: true,
            fontSize: 15,
            color: '#ffffff',
            hoverColor: '#ffffff',
            disabledColor: '#f4f4f4',
          },
        ],
      });

      const danger = new ButtonSimpleStore({
        label: 'Delete',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        layout: {
          x: 340,
          y: 44,
          orientation: ORIENTATION_HORIZONTAL,
          gap: 8,
          paddingX: 12,
          paddingY: 8,
          sizeIncrement: 4,
          minHeight: 40,
          borderRadius: 20,
          borderWidth: 2,
          backgroundColor: '#9b2c2c',
          hoverBackgroundColor: '#bb3b3b',
          disabledBackgroundColor: '#c8b1b1',
          borderColor: '#641f1f',
          hoverBorderColor: '#7a2424',
          disabledBorderColor: '#a18989',
        },
        children: [
          {
            type: 'label',
            id: 'label',
            useButtonLabel: true,
            fontSize: 14,
            color: '#fff6f6',
            hoverColor: '#ffffff',
            disabledColor: '#f5eded',
          },
        ],
      });

      const disabled = new ButtonSimpleStore({
        label: 'Unavailable',
        disabled: true,
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        layout: {
          x: 560,
          y: 44,
          orientation: ORIENTATION_HORIZONTAL,
          gap: 8,
          paddingX: 12,
          paddingY: 8,
          sizeIncrement: 4,
          minHeight: 40,
          borderRadius: 12,
          borderWidth: 2,
          backgroundColor: '#46604c',
          hoverBackgroundColor: '#53765d',
          disabledBackgroundColor: '#c4cdc6',
          borderColor: '#1c3420',
          hoverBorderColor: '#24472c',
          disabledBorderColor: '#97a198',
        },
        children: [
          {
            type: 'icon',
            iconType: 'image',
            id: 'icon',
            icon: PLACEHOLDER_ICON,
            width: 20,
            height: 20,
            disabledAlpha: 0.4,
          },
          {
            type: 'label',
            id: 'label',
            useButtonLabel: true,
            fontSize: 14,
            color: '#f2f8f2',
            disabledColor: '#eef0ee',
          },
        ],
      });

      [primary, danger, disabled].forEach((button) => button.kickoff());
    })();

    return wrapper;
  },
};

export const VerticalExamples: Story = {
  render: () => {
    const wrapper = createStoryShell(720, 240);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      const VerticalButton = createButtonSimpleStoreClass({
        orientation: ORIENTATION_VERTICAL,
        gap: 6,
        paddingX: 10,
        paddingY: 10,
        sizeIncrement: 4,
        minWidth: 88,
        minHeight: 96,
        borderRadius: 18,
        borderWidth: 2,
        backgroundColor: '#384d62',
        hoverBackgroundColor: '#4d6986',
        disabledBackgroundColor: '#b6bec7',
        borderColor: '#1d2a37',
        hoverBorderColor: '#2b3f53',
        disabledBorderColor: '#8f98a1',
      }, [
        {
          type: 'icon',
          iconType: 'image',
          id: 'icon',
          icon: PLACEHOLDER_ICON,
          width: 24,
          height: 24,
          disabledAlpha: 0.4,
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          fontSize: 12,
          color: '#ffffff',
          disabledColor: '#eef1f4',
        },
      ]);

      const GalleryButton = createButtonSimpleStoreClass({
        orientation: ORIENTATION_VERTICAL,
        gap: 4,
        paddingX: 10,
        paddingY: 10,
        sizeIncrement: 4,
        minWidth: 96,
        minHeight: 96,
        borderRadius: 16,
        borderWidth: 2,
        backgroundColor: '#65513d',
        hoverBackgroundColor: '#82684f',
        disabledBackgroundColor: '#c8c0b8',
        borderColor: '#3e2d1e',
        hoverBorderColor: '#513726',
        disabledBorderColor: '#9e948a',
      }, [
        {
          type: 'icon',
          iconType: 'image',
          id: 'icon',
          icon: PLACEHOLDER_ICON,
          width: 24,
          height: 24,
          alpha: 0.95,
          disabledAlpha: 0.4,
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          fontSize: 12,
          color: '#fff8ef',
          disabledColor: '#f0ece7',
        },
      ]);

      const profile = new VerticalButton({
        label: 'Profile',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
      });
      profile.setPosition(64, 42);

      const gallery = new GalleryButton({
        label: 'Gallery',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
      });
      gallery.setPosition(220, 42);

      const locked = new VerticalButton({
        label: 'Locked',
        disabled: true,
      }, {
        app,
        parentContainer: app.stage,
        pixi,
      });
      locked.setPosition(388, 42);

      [profile, gallery, locked].forEach((button) => button.kickoff());
    })();

    return wrapper;
  },
};

export const DynamicLabelGrowth: Story = {
  render: () => {
    const wrapper = createStoryShell(860, 180);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      const button = new ButtonSimpleStore({
        label: 'Go',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        layout: {
          x: 40,
          y: 50,
          orientation: ORIENTATION_HORIZONTAL,
          gap: 8,
          paddingX: 12,
          paddingY: 8,
          sizeIncrement: 4,
          minHeight: 40,
          borderRadius: 14,
          borderWidth: 2,
          backgroundColor: '#5b4a7a',
          hoverBackgroundColor: '#725d98',
          disabledBackgroundColor: '#c4bdd0',
          borderColor: '#2f2246',
          hoverBorderColor: '#412c62',
          disabledBorderColor: '#978faa',
        },
        children: [
          {
            type: 'icon',
            iconType: 'image',
            id: 'icon',
            icon: PLACEHOLDER_ICON,
            width: 18,
            height: 18,
            disabledAlpha: 0.4,
          },
          {
            type: 'label',
            id: 'label',
            useButtonLabel: true,
            fontSize: 14,
            color: '#ffffff',
            disabledColor: '#f3eff8',
          },
        ],
      });

      button.kickoff();

      window.setTimeout(() => {
        button.updateState({ label: 'Proceed To Checkout' });
      }, 1200);

      window.setTimeout(() => {
        button.updateState({ label: 'Done', disabled: true });
      }, 2600);
    })();

    return wrapper;
  },
};

export const CheckedIcons: Story = {
  render: () => {
    const wrapper = createStoryShell(920, 220);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      const CheckboxButton = createButtonSimpleStoreClass({
        orientation: ORIENTATION_HORIZONTAL,
        gap: 10,
        paddingX: 12,
        paddingY: 8,
        sizeIncrement: 4,
        minHeight: 40,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: '#2f5d8a',
        hoverBackgroundColor: '#3b79b4',
        downBackgroundColor: '#24486a',
        disabledBackgroundColor: '#b2bcc7',
        borderColor: '#17324b',
        hoverBorderColor: '#1f4e78',
        downBorderColor: '#163752',
        disabledBorderColor: '#8a93a0',
      }, [
        {
          type: 'icon',
          id: 'check',
          iconType: 'box',
          checkedIconType: 'filledBox',
          width: 16,
          height: 16,
          color: '#ffffff',
          fillColor: '#8ec5ff',
          hoverFillColor: '#b8dcff',
          downFillColor: '#6fb2f8',
          disabledColor: '#e8edf2',
          disabledFillColor: '#cdd6df',
          borderWidth: 2,
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          fontSize: 14,
          color: '#ffffff',
          disabledColor: '#eef1f4',
        },
      ]);

      const RadioButton = createButtonSimpleStoreClass({
        orientation: ORIENTATION_HORIZONTAL,
        gap: 10,
        paddingX: 12,
        paddingY: 8,
        sizeIncrement: 4,
        minHeight: 40,
        borderRadius: 20,
        borderWidth: 2,
        backgroundColor: '#65513d',
        hoverBackgroundColor: '#82684f',
        downBackgroundColor: '#574535',
        disabledBackgroundColor: '#c8c0b8',
        borderColor: '#3e2d1e',
        hoverBorderColor: '#513726',
        downBorderColor: '#342418',
        disabledBorderColor: '#9e948a',
      }, [
        {
          type: 'icon',
          id: 'radio',
          iconType: 'circle',
          checkedIconType: 'filledCircle',
          width: 16,
          height: 16,
          color: '#fff8ef',
          fillColor: '#ffd49b',
          hoverFillColor: '#ffe2b9',
          downFillColor: '#f6c57f',
          disabledColor: '#ede7e0',
          disabledFillColor: '#d9d1ca',
          borderWidth: 2,
        },
        {
          type: 'label',
          id: 'label',
          useButtonLabel: true,
          fontSize: 14,
          color: '#fff8ef',
          disabledColor: '#f0ece7',
        },
      ]);

      const checked = new CheckboxButton({
        label: 'Checked',
        checked: true,
      }, {
        app,
        parentContainer: app.stage,
        pixi,
      });
      checked.setPosition(40, 44);

      const unchecked = new CheckboxButton({
        label: 'Unchecked',
        checked: false,
      }, {
        app,
        parentContainer: app.stage,
        pixi,
      });
      unchecked.setPosition(280, 44);

      const selected = new RadioButton({
        label: 'Selected',
        checked: true,
      }, {
        app,
        parentContainer: app.stage,
        pixi,
      });
      selected.setPosition(540, 44);

      [checked, unchecked, selected].forEach((button) => button.kickoff());
    })();

    return wrapper;
  },
};

export const PressState: Story = {
  render: () => {
    const wrapper = createStoryShell(860, 200);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      const button = new ButtonSimpleStore({
        label: 'Hold To Confirm',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        layout: {
          x: 40,
          y: 44,
          orientation: ORIENTATION_HORIZONTAL,
          gap: 8,
          paddingX: 14,
          paddingY: 10,
          sizeIncrement: 4,
          minHeight: 42,
          borderRadius: 14,
          borderWidth: 2,
          backgroundColor: '#3c6b43',
          hoverBackgroundColor: '#4a8654',
          downBackgroundColor: '#2f5535',
          disabledBackgroundColor: '#c2ccc3',
          borderColor: '#1e3b23',
          hoverBorderColor: '#28502f',
          downBorderColor: '#17301b',
          disabledBorderColor: '#95a096',
        },
        children: [
          {
            type: 'icon',
            id: 'confirm',
            iconType: 'circle',
            checkedIconType: 'filledCircle',
            width: 16,
            height: 16,
            color: '#ffffff',
            fillColor: '#d5ffd7',
            hoverFillColor: '#e8ffe9',
            downFillColor: '#a8e5ac',
            borderWidth: 2,
          },
          {
            type: 'label',
            id: 'label',
            useButtonLabel: true,
            fontSize: 14,
            color: '#ffffff',
          },
        ],
      });

      button.kickoff();

      window.setTimeout(() => {
        button.onPointerOver();
        button.onPointerDown();
      }, 800);

      window.setTimeout(() => {
        button.onPointerUp();
      }, 1800);
    })();

    return wrapper;
  },
};
