import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Application } from 'pixi.js';
import { makeStageZoomable } from './makeStageZoomable.js';

type EventListener = (event: unknown) => void;

class StageMock {
  eventMode: string | undefined;
  hitArea: unknown;
  private listeners = new Map<string, Set<EventListener>>();

  on(eventName: string, listener: EventListener): void {
    const existing = this.listeners.get(eventName);
    if (existing) {
      existing.add(listener);
      return;
    }
    this.listeners.set(eventName, new Set([listener]));
  }

  off(eventName: string, listener: EventListener): void {
    this.listeners.get(eventName)?.delete(listener);
  }

  emit(eventName: string, event: unknown): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(event);
    }
  }
}

interface ZoomContainerMock {
  scale: {
    x: number;
    y: number;
    set: (x: number, y: number) => void;
  };
  position: { x: number; y: number };
  toLocal: (point: { x: number; y: number }) => { x: number; y: number };
}

function createZoomContainerMock(): ZoomContainerMock {
  const scale = {
    x: 1,
    y: 1,
    set(x: number, y: number): void {
      scale.x = x;
      scale.y = y;
    },
  };

  const position = { x: 0, y: 0 };

  return {
    scale,
    position,
    toLocal(point) {
      return {
        x: (point.x - position.x) / scale.x,
        y: (point.y - position.y) / scale.y,
      };
    },
  };
}

function createAppMock() {
  const stage = new StageMock();
  const nativeWheelTarget = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const render = vi.fn();

  const app = {
    stage,
    screen: { width: 800, height: 600 },
    renderer: { view: nativeWheelTarget },
    ticker: {
      addOnce: (cb: () => void) => cb(),
    },
    render,
  } as unknown as Application;

  return {
    app,
    stage,
    render,
    nativeWheelTarget,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('makeStageZoomable', () => {
  it('renders the app when wheel zoom changes scale', () => {
    const { app, stage, render, nativeWheelTarget } = createAppMock();
    const container = createZoomContainerMock();
    const zoomable = makeStageZoomable(app, container as never);

    const stopPropagation = vi.fn();
    stage.emit('wheel', {
      global: { x: 100, y: 80 },
      deltaY: -1,
      stopPropagation,
    });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(container.scale.x).toBeGreaterThan(1);
    expect(render).toHaveBeenCalledTimes(1);
    expect(nativeWheelTarget.addEventListener).toHaveBeenCalledWith(
      'wheel',
      expect.any(Function),
      { passive: false },
    );

    zoomable.destroy();
  });

  it('throttles render requests from wheel zoom events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const { app, stage, render } = createAppMock();
    const container = createZoomContainerMock();
    const zoomable = makeStageZoomable(app, container as never, {
      renderThrottleMs: 30,
    });

    stage.emit('wheel', {
      global: { x: 40, y: 20 },
      deltaY: -1,
      stopPropagation: vi.fn(),
    });
    expect(render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    stage.emit('wheel', {
      global: { x: 40, y: 20 },
      deltaY: -1,
      stopPropagation: vi.fn(),
    });
    expect(render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(19);
    expect(render).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(render).toHaveBeenCalledTimes(1);

    stage.emit('wheel', {
      global: { x: 40, y: 20 },
      deltaY: -1,
      stopPropagation: vi.fn(),
    });
    expect(render).toHaveBeenCalledTimes(2);

    zoomable.destroy();
  });

  it('setZoom forces an immediate render', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const { app, stage, render } = createAppMock();
    const container = createZoomContainerMock();
    const zoomable = makeStageZoomable(app, container as never, {
      renderThrottleMs: 30,
    });

    stage.emit('wheel', {
      global: { x: 50, y: 50 },
      deltaY: -1,
      stopPropagation: vi.fn(),
    });
    expect(render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    stage.emit('wheel', {
      global: { x: 50, y: 50 },
      deltaY: -1,
      stopPropagation: vi.fn(),
    });
    expect(render).toHaveBeenCalledTimes(1);

    zoomable.setZoom(2);
    expect(container.scale.x).toBe(2);
    expect(render).toHaveBeenCalledTimes(2);

    zoomable.destroy();
  });
});
