import type { Meta, StoryObj } from '@storybook/html';
import { Application, Color } from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { ToolbarStore } from './ToolbarStore.js';

interface ToolbarArgs {
  orientation: 'horizontal' | 'vertical';
  spacing: number;
  fillButtons: boolean;
}

const PLACEHOLDER_ICON = '/icons/demo-icon.png';

function makeToolbarStyle() {
  return fromJSON({
    container: {
      background: {
        padding: {
          '$*': [4, 4],
        },
        base: {
          '$*': { fill: '#2f4858' },
          '$hover': { fill: '#35596d' },
          '$disabled': { fill: '#627a88' },
        },
        text: {
          '$*': { fill: '#2f7f74' },
          '$hover': { fill: '#379286' },
          '$disabled': { fill: '#60736f' },
          padding: {
            '$*': [6, 12],
          },
        },
        vertical: {
          '$*': { fill: '#efe7d4' },
          '$hover': { fill: '#f7efdd' },
          '$disabled': { fill: '#ddd5c3' },
          padding: {
            '$*': [4, 4],
          },
        },
      },
      border: {
        radius: {
          '$*': 6,
        },
      },
    },
    label: {
      size: {
        '$*': 13,
      },
      font: {
        color: {
          '$*': '#ffffff',
          '$hover': '#ffffff',
          '$disabled': '#b9d3d0',
        },
      },
      vertical: {
        font: {
          color: {
            '$*': '#263238',
            '$hover': '#111111',
          },
        },
      },
    },
    icon: {
      size: {
        width: {
          '$*': 18,
        },
        height: {
          '$*': 18,
        },
      },
      vertical: {
        size: {
          width: {
            '$*': 64,
          },
          height: {
            '$*': 64,
          },
        },
      },
    },
  });
}

const meta: Meta<ToolbarArgs> = {
  title: 'Toolbar',
  args: {
    orientation: 'horizontal',
    spacing: 8,
    fillButtons: false,
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';
    wrapper.style.position = 'relative';

    void (async () => {
      const app = new Application();
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: new Color('#f3eee3').toNumber(),
        antialias: true,
      });

      wrapper.appendChild(app.canvas);

      const toolbar = new ToolbarStore({
        id: 'main-toolbar',
        buttons: [
          {
            id: 'image',
            icon: PLACEHOLDER_ICON,
            label: 'Image',
            variant: 'vertical',
          },
          {
            id: 'caption',
            icon: PLACEHOLDER_ICON,
            label: 'Caption',
            variant: 'vertical',
            state: 'disabled',
          },
          {
            id: 'frame',
            icon: PLACEHOLDER_ICON,
            label: 'Frame',
            variant: 'vertical',
          },
          {
            id: 'actor',
            icon: PLACEHOLDER_ICON,
            label: 'Actor',
            variant: 'vertical',
          },
        ],
        spacing: args.spacing,
        orientation: args.orientation,
        fillButtons: args.fillButtons,
        style: makeToolbarStyle(),
        padding: 8,
        background: {
          fill: { color: { r: 0.95, g: 0.95, b: 0.95 }, alpha: 1 },
          stroke: { color: { r: 0.7, g: 0.7, b: 0.7 }, width: 1, alpha: 1 },
          borderRadius: 8,
        },
      }, app);

      toolbar.container.position.set(50, 50);
      app.stage.addChild(toolbar.container);
      toolbar.kickoff();
    })();

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<ToolbarArgs>;

export const Horizontal: Story = {};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
};

export const TextOnly: Story = {
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';
    wrapper.style.position = 'relative';

    void (async () => {
      const app = new Application();
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: new Color('#f3eee3').toNumber(),
        antialias: true,
      });

      wrapper.appendChild(app.canvas);

      const toolbar = new ToolbarStore({
        id: 'text-toolbar',
        buttons: [
          {
            id: 'image',
            label: 'Image',
            variant: 'text',
          },
          {
            id: 'caption',
            label: 'Caption',
            variant: 'text',
          },
          {
            id: 'done',
            label: 'Done',
            variant: 'text',
            state: 'disabled',
          },
        ],
        spacing: args.spacing,
        orientation: args.orientation,
        fillButtons: args.fillButtons,
        style: makeToolbarStyle(),
        padding: 8,
        background: {
          fill: { color: { r: 0.95, g: 0.95, b: 0.95 }, alpha: 1 },
          stroke: { color: { r: 0.7, g: 0.7, b: 0.7 }, width: 1, alpha: 1 },
          borderRadius: 8,
        },
      }, app);

      toolbar.container.position.set(50, 50);
      app.stage.addChild(toolbar.container);
      toolbar.kickoff();
    })();

    return wrapper;
  },
};

export const TextOnlyVertical: Story = {
  args: {
    orientation: 'vertical',
    fillButtons: true,
  },
  render: TextOnly.render,
};
