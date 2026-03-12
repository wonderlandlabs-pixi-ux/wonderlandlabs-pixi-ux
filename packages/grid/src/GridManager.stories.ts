import type { Meta, StoryObj } from '@storybook/html';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { GridManager } from './GridManager.js';
import {
  createRootContainer,
  createZoomPan,
  makeStageZoomable,
  makeStageDraggable,
} from '@wonderlandlabs-pixi-ux/root-container';

interface GridManagerStoryArgs {
  gridX: number;
  gridY: number;
  showMajorGrid: boolean;
  usePerAxisMajorFrequency: boolean;
  majorGridFrequency: number;
  majorGridFrequencyX: number;
  majorGridFrequencyY: number;
  showArtboard: boolean;
}

const meta: Meta<GridManagerStoryArgs> = {
  title: 'Grid/GridManager',
  argTypes: {
    gridX: {
      control: { type: 'range', min: 10, max: 100, step: 10 },
      description: 'Main grid X spacing',
    },
    gridY: {
      control: { type: 'range', min: 10, max: 100, step: 10 },
      description: 'Main grid Y spacing',
    },
    showMajorGrid: {
      control: 'boolean',
      description: 'Show major grid',
    },
    usePerAxisMajorFrequency: {
      control: 'boolean',
      description: 'Use separate X/Y major grid frequency values',
    },
    majorGridFrequency: {
      control: { type: 'range', min: 0, max: 10, step: 1 },
      description: 'Major line every N grid lines (0 disables major grid)',
    },
    majorGridFrequencyX: {
      control: { type: 'range', min: 0, max: 10, step: 1 },
      description: 'X-axis major line frequency (0 disables X majors)',
    },
    majorGridFrequencyY: {
      control: { type: 'range', min: 0, max: 10, step: 1 },
      description: 'Y-axis major line frequency (0 disables Y majors)',
    },
    showArtboard: {
      control: 'boolean',
      description: 'Show artboard',
    },
  },
  args: {
    gridX: 50,
    gridY: 50,
    showMajorGrid: true,
    usePerAxisMajorFrequency: false,
    majorGridFrequency: 4,
    majorGridFrequencyX: 4,
    majorGridFrequencyY: 4,
    showArtboard: true,
  },
};

export default meta;
type Story = StoryObj<GridManagerStoryArgs>;

export const WithZoomPan: Story = {
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.overflow = 'hidden';
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';

    // Add instructions
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <strong>Grid Manager with Zoom/Pan</strong><br>
      Scroll to zoom, drag to pan. The grid automatically resizes and counter-scales.<br>
      <em>Note: Grid uses addOnce to efficiently redraw only when needed.</em>
    `;
    instructions.style.position = 'absolute';
    instructions.style.top = '10px';
    instructions.style.left = '10px';
    instructions.style.zIndex = '1000';
    instructions.style.fontFamily = 'sans-serif';
    instructions.style.fontSize = '14px';
    instructions.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    instructions.style.padding = '10px';
    instructions.style.borderRadius = '4px';
    instructions.style.pointerEvents = 'none';
    wrapper.appendChild(instructions);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'hidden';
    wrapper.appendChild(container);

    const app = new Application();

    app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xf0f0f0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    }).then(() => {
      container.appendChild(app.canvas);
      app.canvas.style.display = 'block';
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';

      // Resize handler
      const resizeObserver = new ResizeObserver(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        app.renderer.resize(width, height);
      });
      resizeObserver.observe(container);

      // Create rootContainer container (centers origin)
      const { root } = createRootContainer(app);
      app.stage.addChild(root);

      // Create zoom/pan container
      const { zoomPan } = createZoomPan(app, root);
      root.addChild(zoomPan);

      // Add zoom and pan decorators
      makeStageZoomable(app, zoomPan, {
        minZoom: 0.1,
        maxZoom: 10,
        zoomSpeed: 0.1,
      });
      makeStageDraggable(app, zoomPan);

      // Create grid manager
      const majorGridFrequency = !args.showMajorGrid
        ? 0
        : args.usePerAxisMajorFrequency
          ? { x: args.majorGridFrequencyX, y: args.majorGridFrequencyY }
          : args.majorGridFrequency;

      const gridManager = new GridManager({
        gridSpec: {
          grid: {
            x: args.gridX,
            y: args.gridY,
            color: 0xcccccc,
            alpha: 0.5,
          },
          majorGridFrequency,
          artboard: args.showArtboard ? {
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            color: 0x000000,
            alpha: 1,
          } : undefined,
        },
        application: app,
        zoomPanContainer: zoomPan,
      });

      // Add some content to show zoom/pan working
      const circle = new Graphics();
      circle.circle(0, 0, 50);
      circle.fill({ color: 0xff6b6b, alpha: 0.8 });
      zoomPan.addChild(circle);

      const label = new Text({
        text: 'Origin (0, 0)',
        style: { fontSize: 14, fill: 0x000000 },
      });
      label.position.set(60, -10);
      zoomPan.addChild(label);

      // Cleanup
      window.addEventListener('beforeunload', () => {
        gridManager.cleanup();
        resizeObserver.disconnect();
        app.destroy(true);
      });
    });

    return wrapper;
  },
};
