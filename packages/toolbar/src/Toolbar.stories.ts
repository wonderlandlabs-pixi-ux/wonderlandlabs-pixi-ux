import type { Meta, StoryObj } from '@storybook/html';
import { Application, Assets, Sprite, Spritesheet } from 'pixi.js';
import { ToolbarStore } from './ToolbarStore.js';
import type { ToolbarButtonConfig } from './types.js';

interface ToolbarArgs {
  orientation: 'horizontal' | 'vertical';
  spacing: number;
}

const meta: Meta<ToolbarArgs> = {
  title: 'Toolbar',
  args: {
    orientation: 'horizontal',
    spacing: 8,
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';
    wrapper.style.position = 'relative';

    const app = new Application();
    app.init({
      width: 800,
      height: 600,
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(async () => {
      wrapper.appendChild(app.canvas);

      // Load toolbar spritesheet and bitmap font
      const [spritesheet] = await Promise.all([
        Assets.load<Spritesheet>('/toolbar-data.json'),
        Assets.load('/image_font/image_font.xml.fnt'),
      ]);

      // Create toolbar with icon buttons
      const toolbar = new ToolbarStore({
        id: 'main-toolbar',
        buttons: [
          {
            id: 'image',
            sprite: new Sprite(spritesheet.textures['ctrl-image@4x.png']),
            label: 'Image',
            mode: 'iconVertical',
            onClick: () => console.log('Image button clicked'),
          },
          {
            id: 'caption',
            sprite: new Sprite(spritesheet.textures['ctrl-caption@4x.png']),
            label: 'Caption',
            mode: 'iconVertical',
            onClick: () => console.log('Caption button clicked'),
            isDisabled: true,
          },
          {
            id: 'frame',
            sprite: new Sprite(spritesheet.textures['ctrl-frame@4x.png']),
            label: 'Frame',
            mode: 'iconVertical',
            onClick: () => console.log('Frame button clicked'),
          },
          {
            id: 'actor',
            sprite: new Sprite(spritesheet.textures['ctrl-actor@4x.png']),
            label: 'Actor',
            mode: 'iconVertical',
            onClick: () => console.log('Actor button clicked'),
          },
        ],
        spacing: args.spacing,
        orientation: args.orientation,
        bitmapFont: 'Inter_18pt-Medium',
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
    });

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

// Text-only buttons story
export const TextOnly: Story = {
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';
    wrapper.style.position = 'relative';

    const app = new Application();
    app.init({
      width: 800,
      height: 600,
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(async () => {
      wrapper.appendChild(app.canvas);

      // Create toolbar with text-only buttons (no sprites)
      const toolbar = new ToolbarStore({
        id: 'text-toolbar',
        buttons: [
          {
            id: 'image',
            label: 'Image',
            onClick: () => console.log('Image button clicked'),
          },
          {
            id: 'caption',
            label: 'Caption',
            onClick: () => console.log('Caption button clicked'),
          },
          {
            id: 'done',
            label: 'Done',
            onClick: () => console.log('Done button clicked'),
            isDisabled: true,
          },
        ],
        spacing: args.spacing,
        orientation: args.orientation,
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
    });

    return wrapper;
  },
};

export const TextOnlyVertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';
    wrapper.style.position = 'relative';

    const app = new Application();
    app.init({
      width: 800,
      height: 600,
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(async () => {
      wrapper.appendChild(app.canvas);

      const toolbar = new ToolbarStore({
        id: 'text-toolbar-vertical',
        buttons: [
          {
            id: 'image',
            label: 'Image',
            onClick: () => console.log('Image button clicked'),
          },
          {
            id: 'caption',
            label: 'Caption',
            onClick: () => console.log('Caption button clicked'),
          },
          {
            id: 'done',
            label: 'Done',
            onClick: () => console.log('Done button clicked'),
            isDisabled: true,
          },
        ],
        spacing: args.spacing,
        orientation: args.orientation,
        fillButtons: true,
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
    });

    return wrapper;
  },
};
