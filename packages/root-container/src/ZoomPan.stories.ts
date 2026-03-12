import type { Meta, StoryObj } from '@storybook/html';
import { Application, Graphics, Text } from 'pixi.js';
import { createRootContainer } from './RootContainer.js';
import { createZoomPan } from './ZoomPanContainer.js';
import { makeStageDraggable } from './makeStageDraggable.js';
import { makeStageZoomable } from './makeStageZoomable.js';
import type { StageDragEvent, StageZoomEvent } from './types.js';

interface ZoomPanArgs {}

const meta: Meta<ZoomPanArgs> = {
  title: 'Root Container/Zoom Pan',
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

    // Add instructions (absolute positioning)
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <strong>Zoom Only Example</strong><br>
      Scroll your mouse wheel to zoom in/out. Zooming is centered on your mouse cursor.<br>
      <em>Note: The grid stays fixed - only the content is zoomed.</em>
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

    // Create PixiJS application
    const app = new Application();

    // Initialize the app
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

      // Create rootContainer container (centers origin)
      const { root } = createRootContainer(app);
      app.stage.addChild(root);

      // Create zoom/pan container
      const { zoomPan } = createZoomPan(app, root);
      root.addChild(zoomPan);

      // Add zoom decorator only (no dragging)
      const { getZoom } = makeStageZoomable(app, zoomPan, {
        minZoom: 0.5,
        maxZoom: 5,
        zoomSpeed: 0.1,
      });

      // Listen to zoom events
      app.stage.on('stage-zoom', (event: StageZoomEvent) => {
        console.log(`Zoom: ${event.zoom.toFixed(2)}x at mouse=(${event.mousePosition.x.toFixed(1)}, ${event.mousePosition.y.toFixed(1)})`);
        zoomDisplay.text = `Zoom: ${event.zoom.toFixed(2)}x`;
      });

      // Add a grid to show the coordinate system
      const gridSize = 50;
      const gridExtent = 500;
      const gridGraphics = new Graphics();

      // Draw grid lines
      for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
        const isAxis = x === 0;
        gridGraphics.moveTo(x, -gridExtent);
        gridGraphics.lineTo(x, gridExtent);
        gridGraphics.stroke({
          color: isAxis ? 0xff0000 : 0xcccccc,
          width: isAxis ? 2 : 1,
          alpha: isAxis ? 1 : 0.5,
        });
      }

      for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
        const isAxis = y === 0;
        gridGraphics.moveTo(-gridExtent, y);
        gridGraphics.lineTo(gridExtent, y);
        gridGraphics.stroke({
          color: isAxis ? 0x00ff00 : 0xcccccc,
          width: isAxis ? 2 : 1,
          alpha: isAxis ? 1 : 0.5,
        });
      }

      zoomPan.addChild(gridGraphics);

      // Add origin marker
      const originMarker = new Graphics();
      originMarker.circle(0, 0, 10);
      originMarker.fill({ color: 0x0000ff, alpha: 0.8 });
      zoomPan.addChild(originMarker);

      // Add origin label
      const originLabel = new Text({
        text: 'Origin (0, 0)',
        style: {
          fontSize: 16,
          fill: 0x000000,
        },
      });
      originLabel.position.set(15, -5);
      zoomPan.addChild(originLabel);

      // Add some colored squares at different positions
      const squares = [
        { x: 100, y: 100, color: 0xff6b6b, label: '(100, 100)' },
        { x: -100, y: 100, color: 0x4ecdc4, label: '(-100, 100)' },
        { x: 100, y: -100, color: 0xffe66d, label: '(100, -100)' },
        { x: -100, y: -100, color: 0x95e1d3, label: '(-100, -100)' },
      ];

      squares.forEach(({ x, y, color, label }) => {
        const square = new Graphics();
        square.rect(-25, -25, 50, 50);
        square.fill({ color, alpha: 0.8 });
        square.position.set(x, y);
        zoomPan.addChild(square);

        const text = new Text({
          text: label,
          style: {
            fontSize: 12,
            fill: 0x000000,
          },
        });
        text.anchor.set(0.5);
        text.position.set(x, y);
        zoomPan.addChild(text);
      });

      // Add zoom level display
      const zoomDisplay = new Text({
        text: `Zoom: ${getZoom().toFixed(2)}x`,
        style: {
          fontSize: 14,
          fill: 0x000000,
        },
      });
      zoomDisplay.position.set(-app.screen.width / 2 + 10, -app.screen.height / 2 + 10);
      root.addChild(zoomDisplay);

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
type Story = StoryObj<ZoomPanArgs>;

export const ZoomOnly: Story = {};

export const ZoomAndPan: Story = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.overflow = 'hidden';
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';

    // Add instructions (absolute positioning)
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <strong>Zoom + Pan Combined Example</strong><br>
      Scroll your mouse wheel to zoom in/out. Drag anywhere to pan the viewport.<br>
      <em>Note: The grid stays fixed - only the content is zoomed and panned.</em>
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

    // Create PixiJS application
    const app = new Application();

    // Initialize the app
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

      // Create rootContainer container (centers origin)
      const { root } = createRootContainer(app);
      app.stage.addChild(root);

      // Create zoom/pan container
      const { zoomPan } = createZoomPan(app, root);
      root.addChild(zoomPan);

      // Add both decorators
      const { getZoom } = makeStageZoomable(app, zoomPan, {
        minZoom: 0.5,
        maxZoom: 5,
        zoomSpeed: 0.1,
      });
      makeStageDraggable(app, zoomPan);

      // Listen to zoom events
      app.stage.on('stage-zoom', (event: StageZoomEvent) => {
        console.log(`Zoom: ${event.zoom.toFixed(2)}x`);
        zoomDisplay.text = `Zoom: ${event.zoom.toFixed(2)}x`;
      });

      // Listen to drag events
      app.stage.on('stage-drag', (event: StageDragEvent) => {
        console.log(`Drag ${event.type}: pos=(${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)})`);
      });

      // Add a grid to show the coordinate system
      const gridSize = 50;
      const gridExtent = 500;
      const gridGraphics = new Graphics();

      // Draw grid lines
      for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
        const isAxis = x === 0;
        gridGraphics.moveTo(x, -gridExtent);
        gridGraphics.lineTo(x, gridExtent);
        gridGraphics.stroke({
          color: isAxis ? 0xff0000 : 0xcccccc,
          width: isAxis ? 2 : 1,
          alpha: isAxis ? 1 : 0.5,
        });
      }

      for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
        const isAxis = y === 0;
        gridGraphics.moveTo(-gridExtent, y);
        gridGraphics.lineTo(gridExtent, y);
        gridGraphics.stroke({
          color: isAxis ? 0x00ff00 : 0xcccccc,
          width: isAxis ? 2 : 1,
          alpha: isAxis ? 1 : 0.5,
        });
      }

      zoomPan.addChild(gridGraphics);

      // Add origin marker
      const originMarker = new Graphics();
      originMarker.circle(0, 0, 10);
      originMarker.fill({ color: 0x0000ff, alpha: 0.8 });
      zoomPan.addChild(originMarker);

      // Add origin label
      const originLabel = new Text({
        text: 'Origin (0, 0)',
        style: {
          fontSize: 16,
          fill: 0x000000,
        },
      });
      originLabel.position.set(15, -5);
      zoomPan.addChild(originLabel);

      // Add some colored squares at different positions
      const squares = [
        { x: 100, y: 100, color: 0xff6b6b, label: '(100, 100)' },
        { x: -100, y: 100, color: 0x4ecdc4, label: '(-100, 100)' },
        { x: 100, y: -100, color: 0xffe66d, label: '(100, -100)' },
        { x: -100, y: -100, color: 0x95e1d3, label: '(-100, -100)' },
        { x: 200, y: 0, color: 0xa8e6cf, label: '(200, 0)' },
        { x: -200, y: 0, color: 0xffd3b6, label: '(-200, 0)' },
      ];

      squares.forEach(({ x, y, color, label }) => {
        const square = new Graphics();
        square.rect(-25, -25, 50, 50);
        square.fill({ color, alpha: 0.8 });
        square.position.set(x, y);
        zoomPan.addChild(square);

        const text = new Text({
          text: label,
          style: {
            fontSize: 12,
            fill: 0x000000,
          },
        });
        text.anchor.set(0.5);
        text.position.set(x, y);
        zoomPan.addChild(text);
      });

      // Add zoom level display
      const zoomDisplay = new Text({
        text: `Zoom: ${getZoom().toFixed(2)}x`,
        style: {
          fontSize: 14,
          fill: 0x000000,
        },
      });
      zoomDisplay.position.set(-app.screen.width / 2 + 10, -app.screen.height / 2 + 10);
      root.addChild(zoomDisplay);

      // Cleanup on window unload
      window.addEventListener('beforeunload', () => {
        resizeObserver.disconnect();
        app.destroy(true);
      });
    });

    return wrapper;
  },
};

export const PanOnly: Story = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.overflow = 'hidden';
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';

    // Add instructions (absolute positioning)
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <strong>Pan Only Example</strong><br>
      Drag anywhere on the canvas to pan the viewport.<br>
      <em>Note: The grid stays fixed - only the content is panned.</em>
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

    // Create PixiJS application
    const app = new Application();

    // Initialize the app
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

      // Add STATIC elements directly to stage (before rootContainer)
      // These will NOT move when dragging - they show the stage is stationary
      const staticLayer = new Graphics();
      staticLayer.eventMode = 'none'; // Make it non-interactive so it doesn't block events
      staticLayer.label = 'StaticLayer';

      const { width, height } = app.screen;

      // Draw a subtle grid
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        staticLayer.moveTo(x, 0);
        staticLayer.lineTo(x, height);
        staticLayer.stroke({ color: 0xcccccc, width: 1, alpha: 0.5 });
      }

      for (let y = 0; y <= height; y += gridSize) {
        staticLayer.moveTo(0, y);
        staticLayer.lineTo(width, y);
        staticLayer.stroke({ color: 0xcccccc, width: 1, alpha: 0.5 });
      }

      // Add corner markers (STATIC - attached to stage)
      const cornerSize = 20;
      const corners = [
        { x: 0, y: 0, label: 'TL' },
        { x: width - cornerSize, y: 0, label: 'TR' },
        { x: 0, y: height - cornerSize, label: 'BL' },
        { x: width - cornerSize, y: height - cornerSize, label: 'BR' },
      ];

      corners.forEach(({ x, y, label }) => {
        staticLayer.rect(x, y, cornerSize, cornerSize);
        staticLayer.fill({ color: 0xff0000, alpha: 0.5 });

        const text = new Text({
          text: label,
          style: { fontSize: 10, fill: 0x000000 },
        });
        text.position.set(x + 5, y + 5);
        text.eventMode = 'none';
        staticLayer.addChild(text);
      });

      // Add big label
      const staticLabel = new Text({
        text: '🔒 STATIC LAYER (attached to stage - does NOT move)',
        style: {
          fontSize: 14,
          fill: 0xff0000,
          fontWeight: 'bold',
        },
      });
      staticLabel.position.set(width / 2 - 200, 20);
      staticLabel.eventMode = 'none';
      staticLayer.addChild(staticLabel);

      app.stage.addChild(staticLayer);

      // Create rootContainer container (centers origin)
      const { root } = createRootContainer(app);
      app.stage.addChild(root);

      // Create zoom/pan container
      const { zoomPan } = createZoomPan(app, root);
      root.addChild(zoomPan);

      // Make it draggable via stage (no zoom for this example)
      makeStageDraggable(app, zoomPan);

      // Add reference graphics

      // Center crosshair
      const crosshair = new Graphics();
      crosshair.moveTo(-20, 0);
      crosshair.lineTo(20, 0);
      crosshair.moveTo(0, -20);
      crosshair.lineTo(0, 20);
      crosshair.stroke({ color: 0xffffff, width: 2 });
      crosshair.circle(0, 0, 5);
      crosshair.fill({ color: 0xff0000 });
      zoomPan.addChild(crosshair);

      // Add some reference circles in a pattern
      const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xa8e6cf, 0xffd3b6];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 150;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const circle = new Graphics();
        circle.circle(0, 0, 30);
        circle.fill({ color: colors[i], alpha: 0.8 });
        circle.position.set(x, y);
        zoomPan.addChild(circle);

        const label = new Text({
          text: `${i + 1}`,
          style: {
            fontSize: 20,
            fill: 0xffffff,
            fontWeight: 'bold',
          },
        });
        label.anchor.set(0.5);
        label.position.set(x, y);
        zoomPan.addChild(label);
      }

      // Add a rectangle frame
      const frame = new Graphics();
      frame.rect(-200, -200, 400, 400);
      frame.stroke({ color: 0x666666, width: 2, alpha: 0.5 });
      zoomPan.addChild(frame);

      // Add position display
      const posDisplay = new Text({
        text: `Position: (0, 0)`,
        style: {
          fontSize: 14,
          fill: 0x000000,
        },
      });
      posDisplay.position.set(-app.screen.width / 2 + 10, -app.screen.height / 2 + 10);
      root.addChild(posDisplay);

      // Update position display on drag
      app.stage.on('stage-drag', (event: StageDragEvent) => {
        if (event.type === 'drag-move' || event.type === 'drag-end') {
          posDisplay.text = `Position: (${Math.round(event.position.x)}, ${Math.round(event.position.y)})`;
        }
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
