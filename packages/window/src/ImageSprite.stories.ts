import type { Meta, StoryObj } from '@storybook/html';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { makeImageSprite } from './makeImageSprite.js';
import { DIMENSION_TYPE, LOAD_STATUS } from './constants.js';

interface ImageSpriteArgs {
  imageUrl: string;
  dimensionType: 'size' | 'scale';
  dimensionX: number;
  dimensionY: number;
}

const meta: Meta<ImageSpriteArgs> = {
  title: 'Window/ImageSprite',
  argTypes: {
    imageUrl: {
      control: { type: 'select' },
      options: [
        'https://pixijs.com/assets/bunny.png',
        'https://pixijs.com/assets/bg_rotate.jpg',
        'https://pixijs.com/assets/flowerTop.png',
      ],
      description: 'URL of the image to load',
    },
    dimensionType: {
      control: { type: 'radio' },
      options: ['size', 'scale'],
      description: 'How to interpret dimension values',
    },
    dimensionX: {
      control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
      description: 'X dimension (scale or width)',
    },
    dimensionY: {
      control: { type: 'range', min: 0.1, max: 5, step: 0.1 },
      description: 'Y dimension (scale or height)',
    },
  },
  args: {
    imageUrl: 'https://pixijs.com/assets/bunny.png',
    dimensionType: 'scale',
    dimensionX: 1,
    dimensionY: 1,
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';
    wrapper.style.position = 'relative';

    // Create PixiJS app
    const app = new Application();
    app.init({
      width: 800,
      height: 600,
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(() => {
      wrapper.appendChild(app.canvas);

      // Create container for sprites
      const container = new Container();
      container.position.set(400, 300);
      app.stage.addChild(container);

      // Status text
      const statusText = new Text({
        text: 'Loading...',
        style: {
          fontSize: 16,
          fill: 0x333333,
        },
      });
      statusText.position.set(10, 10);
      app.stage.addChild(statusText);

      // Info text
      const infoText = new Text({
        text: '',
        style: {
          fontSize: 12,
          fill: 0x666666,
        },
      });
      infoText.position.set(10, 40);
      app.stage.addChild(infoText);

      // Create image sprite
      const subject = makeImageSprite({
        url: args.imageUrl,
        x: 0,
        y: 0,
        dimension: { x: args.dimensionX, y: args.dimensionY },
        dimensionType: args.dimensionType === 'size' ? DIMENSION_TYPE.SIZE : DIMENSION_TYPE.SCALE,
      });

      // Subscribe to loading updates
      subject.subscribe({
        next: (result) => {
          const { sprite, loadStatus, nativeSize, computedSize } = result;

          if (loadStatus === LOAD_STATUS.START) {
            statusText.text = 'Loading image...';
            statusText.style.fill = 0x0066cc;
          } else if (loadStatus === LOAD_STATUS.LOADED) {
            statusText.text = '✓ Image loaded successfully';
            statusText.style.fill = 0x00aa00;

            // Add sprite to container (centered)
            sprite.anchor.set(0.5);
            container.addChild(sprite);

            // Update info text
            const dimType = args.dimensionType === 'size' ? 'Size' : 'Scale';
            infoText.text = `Native: ${nativeSize?.x}x${nativeSize?.y}\n` +
                           `${dimType}: ${args.dimensionX}x${args.dimensionY}\n` +
                           `Computed: ${computedSize.x.toFixed(1)}x${computedSize.y.toFixed(1)}`;

            // Draw bounding box
            const bbox = new Graphics();
            bbox.rect(-computedSize.x / 2, -computedSize.y / 2, computedSize.x, computedSize.y);
            bbox.stroke({ color: 0xff0000, width: 2, alpha: 0.5 });
            container.addChild(bbox);
          }
        },
        error: (err) => {
          statusText.text = '✗ Failed to load image';
          statusText.style.fill = 0xff0000;
          console.error('Image load error:', err);
        },
        complete: () => {
          console.log('Image loading complete');
        },
      });
    });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<ImageSpriteArgs>;

export const Default: Story = {};

export const ScaledUp: Story = {
  args: {
    dimensionX: 2,
    dimensionY: 2,
  },
};

export const ScaledDown: Story = {
  args: {
    dimensionX: 0.5,
    dimensionY: 0.5,
  },
};

export const FixedSize: Story = {
  args: {
    dimensionType: 'size',
    dimensionX: 200,
    dimensionY: 200,
  },
};

