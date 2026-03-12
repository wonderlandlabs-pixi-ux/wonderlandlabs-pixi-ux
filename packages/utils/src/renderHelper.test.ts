import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRenderHelper, getSharedRenderHelper } from './renderHelper.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createRenderHelper', () => {
  it('throttles render requests by default (leading edge only)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const app = { render: vi.fn() };
    const helper = createRenderHelper(app, { throttleMs: 30 });

    helper.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    helper.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(20);
    helper.request();
    expect(app.render).toHaveBeenCalledTimes(2);

    helper.destroy();
  });

  it('supports trailing render when configured', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const app = { render: vi.fn() };
    const helper = createRenderHelper(app, { throttleMs: 30, trailing: true });

    helper.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    helper.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(19);
    expect(app.render).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(app.render).toHaveBeenCalledTimes(2);

    helper.destroy();
  });

  it('now renders immediately even when a trailing request is queued', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const app = { render: vi.fn() };
    const helper = createRenderHelper(app, { throttleMs: 30, trailing: true });

    helper.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    helper.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    helper.now();
    expect(app.render).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(50);
    expect(app.render).toHaveBeenCalledTimes(3);

    helper.destroy();
  });
});

describe('getSharedRenderHelper', () => {
  it('returns the same helper for repeated requests on the same app', () => {
    const app = { render: vi.fn() };
    const helperA = getSharedRenderHelper(app, { throttleMs: 30 });
    const helperB = getSharedRenderHelper(app, { throttleMs: 0 });

    expect(helperA).toBe(helperB);
  });

  it('uses the first config for an app key (first-config-wins)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const app = { render: vi.fn() };
    const helperA = getSharedRenderHelper(app, { throttleMs: 100 });
    const helperB = getSharedRenderHelper(app, { throttleMs: 0 });

    helperA.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    helperB.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(90);
    helperB.request();
    expect(app.render).toHaveBeenCalledTimes(2);
  });

  it('keeps shared helper alive when one consumer calls destroy()', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const app = { render: vi.fn() };
    const helperA = getSharedRenderHelper(app, { throttleMs: 30 });
    const helperB = getSharedRenderHelper(app, { throttleMs: 30 });

    helperA.destroy();
    helperB.request();

    expect(app.render).toHaveBeenCalledTimes(1);
  });

  it('coalesces request() calls across multiple consumers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const app = { render: vi.fn() };
    const helperA = getSharedRenderHelper(app, { throttleMs: 30 });
    const helperB = getSharedRenderHelper(app, { throttleMs: 30 });

    helperA.request();
    helperB.request();
    helperA.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30);
    helperB.request();
    expect(app.render).toHaveBeenCalledTimes(2);
  });

  it('auto-destroys shared helper when app.destroy() is called', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const originalDestroy = vi.fn();
    const app = {
      render: vi.fn(),
      destroy: originalDestroy,
    };
    const helper = getSharedRenderHelper(app, { throttleMs: 30, trailing: true });

    helper.request();
    expect(app.render).toHaveBeenCalledTimes(1);

    app.destroy();
    expect(originalDestroy).toHaveBeenCalledTimes(1);

    helper.request();
    vi.advanceTimersByTime(50);
    expect(app.render).toHaveBeenCalledTimes(1);
  });
});
