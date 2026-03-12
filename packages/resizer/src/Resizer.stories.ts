import type { Meta, StoryObj } from '@storybook/html';
import { Application, Container, Graphics, Rectangle, Text } from 'pixi.js';
import { enableHandles } from './enableHandles.js';
import { ResizerStore } from './ResizerStore.js';
import type { HandleMode } from './types.js';

interface ResizerArgs {
  constrain: boolean;
  handleSize: number;
  debug: boolean;
}

const meta: Meta<ResizerArgs> = {
  title: 'Resizer/Resizer',
  argTypes: {
    constrain: {
      control: { type: 'boolean' },
      description: 'Constrain aspect ratio during resize',
    },
    handleSize: {
      control: { type: 'range', min: 8, max: 24, step: 2 },
      description: 'Size of resize handles in pixels',
    },
    debug: {
      control: { type: 'boolean' },
      description: 'Enable resizer debug logging',
    },
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';
    const debugEnabled = args.debug || (
      typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).has('resizerDebug')
    );
    const debugLog = (phase: string, details: Record<string, unknown> = {}) => {
      if (!debugEnabled) {
        return;
      }
      console.log(`[ResizerStory] ${phase}`, details);
    };
    const targetLabel = (event: unknown): string | null => {
      const target = (event as { target?: { label?: unknown } } | undefined)?.target;
      return typeof target?.label === 'string' ? target.label : null;
    };

    // Create PixiJS app
    const app = new Application();
    app.init({ 
      width: 800, 
      height: 600, 
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(() => {
      wrapper.appendChild(app.canvas);
      app.stage.eventMode = 'static';
      app.stage.hitArea = new Rectangle(0, 0, 800, 600);
      let activeControls: ResizerStore | null = null;
      const allControls: ResizerStore[] = [];
      const setActiveControls = (nextControls: ResizerStore | null, label?: string) => {
        allControls.forEach((controls) => controls.setVisible(false));
        activeControls = nextControls;
        if (activeControls) {
          activeControls.setVisible(true);
        }
        debugLog('controls.active', { box: label ?? null });
      };
      const background = new Graphics();
      background
        .rect(0, 0, 800, 600)
        .fill({ color: 0xf0f0f0, alpha: 1 });
      background.eventMode = 'static';
      background.cursor = 'default';
      background.on('pointerdown', (event) => {
        debugLog('background.pointerdown', { target: targetLabel(event) });
        setActiveControls(null);
      });
      app.stage.addChild(background);

      // Create boxes with different colors and modes
      const boxes = [
        { x: 100, y: 100, width: 150, height: 100, color: 0xff6b6b, label: 'Red Box', mode: 'ONLY_CORNER' as HandleMode },
        { x: 300, y: 150, width: 120, height: 120, color: 0x4ecdc4, label: 'Cyan Box', mode: 'ONLY_EDGE' as HandleMode },
        { x: 500, y: 200, width: 180, height: 80, color: 0xffe66d, label: 'Yellow Box', mode: 'EDGE_AND_CORNER' as HandleMode },
      ];

      boxes.forEach(boxConfig => {
        let currentRect = new Rectangle(boxConfig.x, boxConfig.y, boxConfig.width, boxConfig.height);
        // Create container for the box at 0,0
        const boxContainer = new Container();
        boxContainer.position.set(0, 0);
        app.stage.addChild(boxContainer);

        // Create box graphic using full rect coordinates
        const boxGraphic = new Graphics();
        boxGraphic.rect(boxConfig.x, boxConfig.y, boxConfig.width, boxConfig.height);
        boxGraphic.fill({ color: boxConfig.color, alpha: 0.7 });
        boxGraphic.stroke({ color: 0x333333, width: 2 });
        boxGraphic.eventMode = 'static';
        boxGraphic.cursor = 'pointer';
        boxContainer.addChild(boxGraphic);

        // Add label (box name)
        const labelText = new Text({
          text: boxConfig.label,
          style: {
            fontSize: 16,
            fill: 0x000000,
          },
        });
        labelText.eventMode = 'none';
        labelText.anchor.set(0.5);
        labelText.position.set(boxConfig.x + boxConfig.width / 2, boxConfig.y + boxConfig.height / 2 - 10);
        boxContainer.addChild(labelText);

        // Add mode label (smaller font)
        const modeText = new Text({
          text: `(${boxConfig.mode})`,
          style: {
            fontSize: 11,
            fill: 0x666666,
          },
        });
        modeText.eventMode = 'none';
        modeText.anchor.set(0.5);
        modeText.position.set(boxConfig.x + boxConfig.width / 2, boxConfig.y + boxConfig.height / 2 + 10);
        boxContainer.addChild(modeText);

        // Make box interactive
        boxContainer.eventMode = 'static';
        boxContainer.cursor = 'pointer';

        const controls = enableHandles(boxContainer, currentRect, {
          app,
          drawRect: (newRect) => {
            // Update box graphic using full rect coordinates
            boxGraphic.clear();
            boxGraphic.rect(newRect.x, newRect.y, newRect.width, newRect.height);
            boxGraphic.fill({ color: boxConfig.color, alpha: 0.7 });
            boxGraphic.stroke({ color: 0x333333, width: 2 });
            currentRect = new Rectangle(newRect.x, newRect.y, newRect.width, newRect.height);

            // Update label position (main title)
            labelText.position.set(newRect.x + newRect.width / 2, newRect.y + newRect.height / 2 - 10);

            // Update mode text position (subtitle)
            modeText.position.set(newRect.x + newRect.width / 2, newRect.y + newRect.height / 2 + 10);
          },
          size: args.handleSize,
          color: { r: 0.2, g: 0.6, b: 1 },
          constrain: args.constrain,
          mode: boxConfig.mode,
          onHandlePointerDown: (position, handleEvent) => {
            debugLog('handle.pointerdown', {
              box: boxConfig.label,
              handle: position,
              target: targetLabel(handleEvent),
            });
          },
        });
     //   controls.setVisible(false);
        allControls.push(controls);

        const activateControls = (event: { stopPropagation: () => void; target?: unknown }) => {
          event.stopPropagation();
          debugLog('box.pointerdown', { box: boxConfig.label, target: targetLabel(event) });
          setActiveControls(controls, boxConfig.label);
        };

        // Click handler to activate handles
        boxGraphic.on('pointerdown', activateControls);
      });
    });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<ResizerArgs>;

export const PersistMode: Story = {
  args: {
    constrain: false,
    handleSize: 12,
    debug: false,
  },
};
