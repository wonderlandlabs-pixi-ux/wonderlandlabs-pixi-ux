import type { Meta, StoryObj } from '@storybook/html';
import { Application, Graphics, Container, Text } from 'pixi.js';
import { createRootContainer } from './RootContainer.js';
import { makeStageDraggable } from './makeStageDraggable.js';
import { makeStageZoomable } from './makeStageZoomable.js';

interface ZoomPanDecoratorsArgs {}

const meta: Meta<ZoomPanDecoratorsArgs> = {
  title: 'Root Container/Zoom Pan Decorators',
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

      // Resize handler to prevent overflow
      const resizeObserver = new ResizeObserver(() => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        app.renderer.resize(width, height);
      });
      resizeObserver.observe(container);

      // Create rootContainer container (centered origin)
      const { root } = createRootContainer(app);
      app.stage.addChild(root);

      // Create two separate containers to demonstrate different combinations
      // Note: All dragging is stage-level, so we show zoom-only vs zoom+drag
      const containers = [
        { label: 'Zoom Only', x: -200, y: 0, enableZoom: true, enableDrag: false, color: 0xff6b6b },
        { label: 'Zoom + Drag', x: 200, y: 0, enableZoom: true, enableDrag: true, color: 0x95e1d3 },
      ];

      containers.forEach(({ label, x, y, enableZoom, enableDrag, color }) => {
        const testContainer = new Container();
        testContainer.position.set(x, y);
        root.addChild(testContainer);

        // Create a visual frame
        const frame = new Graphics();
        frame.rect(-100, -100, 200, 200);
        frame.stroke({ color: 0x333333, width: 2 });
        testContainer.addChild(frame);

        // Add colored squares
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const square = new Graphics();
            square.rect(0, 0, 40, 40);
            square.fill({ color, alpha: 0.7 });
            square.position.set(-60 + i * 50, -60 + j * 50);
            testContainer.addChild(square);
          }
        }

        // Add label
        const labelText = new Text({
          text: label,
          style: {
            fontSize: 14,
            fill: 0x000000,
            fontWeight: 'bold',
          },
        });
        labelText.anchor.set(0.5);
        labelText.position.set(0, -120);
        testContainer.addChild(labelText);

        // Add instructions
        const instructions = new Text({
          text: enableZoom && enableDrag ? 'Scroll to zoom\nDrag anywhere to pan' :
                enableZoom ? 'Scroll to zoom\n(drag disabled)' : '',
          style: {
            fontSize: 10,
            fill: 0x666666,
            align: 'center',
          },
        });
        instructions.anchor.set(0.5);
        instructions.position.set(0, 120);
        testContainer.addChild(instructions);

        // Apply decorators (stage-level only)
        if (enableDrag) {
          makeStageDraggable(app, testContainer);
        }

        if (enableZoom) {
          makeStageZoomable(app, testContainer, {
            minZoom: 0.5,
            maxZoom: 3,
            zoomSpeed: 0.15,
          });
        }
      });

      // Add title
      const title = new Text({
        text: 'Zoom & Drag Decorators - Mix and Match',
        style: {
          fontSize: 18,
          fill: 0x000000,
          fontWeight: 'bold',
        },
      });
      title.anchor.set(0.5);
      title.position.set(0, -app.screen.height / 2 + 30);
      root.addChild(title);

      // Listen to events
      app.stage.on('stage-drag', (event: any) => {
        console.log(`Drag ${event.type}: pos=(${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)})`);
      });

      app.stage.on('stage-zoom', (event: any) => {
        console.log(`Zoom: ${event.zoom.toFixed(2)}x at mouse=(${event.mousePosition.x.toFixed(1)}, ${event.mousePosition.y.toFixed(1)})`);
      });

      // Cleanup on window unload
      window.addEventListener('beforeunload', () => {
        resizeObserver.disconnect();
        app.destroy(true);
      });
    });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<ZoomPanDecoratorsArgs>;

export const Default: Story = {};
