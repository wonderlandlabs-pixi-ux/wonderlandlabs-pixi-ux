import './setupNavigator';
import { describe, expect, it } from 'vitest';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { ToolbarStore } from '../src/ToolbarStore';

type QueuedTick = {
  fn: () => void;
  context?: unknown;
};

type TickerHost = {
  ticker: {
    addOnce: (fn: () => void, context?: unknown) => void;
    remove: () => void;
  };
};

function createMockTickerHost(): { host: TickerHost; flushTicker: (maxTicks?: number) => void } {
  const queuedTicks: QueuedTick[] = [];

  const ticker = {
    addOnce(fn: () => void, context?: unknown) {
      queuedTicks.push({ fn, context });
    },
    remove() {
      // no-op for tests
    },
  };

  const host: TickerHost = { ticker };

  const flushTicker = (maxTicks = 500) => {
    let ticks = 0;
    while (queuedTicks.length > 0 && ticks < maxTicks) {
      ticks += 1;
      const next = queuedTicks.shift()!;
      next.fn.call(next.context);
    }
  };

  return { host, flushTicker };
}

function createToolbarStyle() {
  return fromJSON({
    container: {
      background: {
        vertical: {
          '$*': { fill: '#dddddd' },
          padding: {
            '$*': [4, 4],
          },
        },
      },
    },
    icon: {
      vertical: {
        size: {
          width: {
            '$*': 40,
            '$hover': 80,
          },
          height: {
            '$*': 40,
            '$hover': 80,
          },
        },
      },
    },
  });
}

function createToolbar(orientation: 'horizontal' | 'vertical', fillButtons = false): {
  toolbar: ToolbarStore;
  flushTicker: () => void;
} {
  const { host, flushTicker } = createMockTickerHost();

  const toolbar = new ToolbarStore({
    id: `toolbar-${orientation}`,
    orientation,
    spacing: 8,
    padding: 8,
    fillButtons,
    style: createToolbarStyle(),
    buttons: [
      { id: 'one', variant: 'vertical', icon: '/icons/demo-icon.png' },
      { id: 'two', variant: 'vertical', icon: '/icons/demo-icon.png' },
      { id: 'three', variant: 'vertical', icon: '/icons/demo-icon.png' },
    ],
  }, host as never);

  toolbar.kickoff();
  flushTicker();

  return { toolbar, flushTicker };
}

describe('ToolbarStore layout dimensions', () => {
  it('computes horizontal toolbar size from child widths, gaps, and padding', () => {
    const { toolbar } = createToolbar('horizontal');

    const one = toolbar.getButtonRect('one')!;
    const two = toolbar.getButtonRect('two')!;
    const three = toolbar.getButtonRect('three')!;

    expect(one.width).toBe(48);
    expect(two.width).toBe(48);
    expect(three.width).toBe(48);
    expect(one.height).toBe(48);

    expect(one.x).toBe(8);
    expect(two.x).toBe(64);
    expect(three.x).toBe(120);

    expect(toolbar.rect.width).toBe(176);
    expect(toolbar.rect.height).toBe(64);
  });

  it('computes vertical toolbar size from child heights, gaps, and padding', () => {
    const { toolbar } = createToolbar('vertical');

    const one = toolbar.getButtonRect('one')!;
    const two = toolbar.getButtonRect('two')!;
    const three = toolbar.getButtonRect('three')!;

    expect(one.width).toBe(48);
    expect(two.width).toBe(48);
    expect(three.width).toBe(48);
    expect(one.height).toBe(48);

    expect(one.y).toBe(8);
    expect(two.y).toBe(64);
    expect(three.y).toBe(120);

    expect(toolbar.rect.width).toBe(64);
    expect(toolbar.rect.height).toBe(176);
  });

  it('reflows vertical positions when a child button height changes after initial layout', () => {
    const { toolbar, flushTicker } = createToolbar('vertical');
    const two = toolbar.getButton('two')!;

    two.set('size', {
      ...(two.value.size ?? {}),
      width: 0,
      height: 88,
    });
    two.dirty();
    flushTicker();
    flushTicker();

    const one = toolbar.getButtonRect('one')!;
    const resizedTwo = toolbar.getButtonRect('two')!;
    const three = toolbar.getButtonRect('three')!;

    expect(one.height).toBe(48);
    expect(resizedTwo.height).toBe(88);
    expect(three.y).toBe(160);
    expect(toolbar.rect.height).toBe(216);
  });

  it('fills vertical button widths to the widest child when fillButtons is enabled', () => {
    const { host, flushTicker } = createMockTickerHost();

    const toolbar = new ToolbarStore({
      id: 'toolbar-vertical-fill-width',
      orientation: 'vertical',
      spacing: 8,
      padding: 8,
      fillButtons: true,
      style: createToolbarStyle(),
      buttons: [
        { id: 'one', variant: 'vertical', icon: '/icons/demo-icon.png' },
        { id: 'two', variant: 'vertical', icon: '/icons/demo-icon.png', size: { width: 72 } },
        { id: 'three', variant: 'vertical', icon: '/icons/demo-icon.png' },
      ],
    }, host as never);

    toolbar.kickoff();
    flushTicker();

    expect(toolbar.getButtonRect('one')!.width).toBe(72);
    expect(toolbar.getButtonRect('two')!.width).toBe(72);
    expect(toolbar.getButtonRect('three')!.width).toBe(72);
    expect(toolbar.rect.width).toBe(88);
  });
});
