import { describe, expect, it } from 'vitest';
import { FillGradient } from 'pixi.js';
import { resolvePixiFill, resolvePixiGradient } from '../src/toPixi.helpers.js';

const SAMPLE_RECT = {
  x: 0,
  y: 0,
  w: 200,
  h: 50,
};

describe('background gradients', () => {
  it('resolves gradient from fill values', () => {
    const fillStyle = {
      direction: 'vertical',
      colors: ['#3B82F6', '#FFFFFF', '#EF4444'],
    };
    const gradient = resolvePixiFill(fillStyle, SAMPLE_RECT).gradient;

    expect(fillStyle).toEqual({
      direction: 'vertical',
      colors: ['#3B82F6', '#FFFFFF', '#EF4444'],
    });
    expect(gradient).toBeInstanceOf(FillGradient);
    expect(gradient?.colorStops).toHaveLength(3);
    expect(gradient?.start).toEqual({ x: 0, y: 0 });
    expect(gradient?.end).toEqual({ x: 0, y: 1 });
  });

  it('supports direction shortcut gradients with raw color arrays', () => {
    const gradient = resolvePixiGradient({
      direction: 'horizontal',
      colors: ['#000000', '#ffffff'],
    }, SAMPLE_RECT);

    expect(gradient).toBeInstanceOf(FillGradient);
    expect(gradient?.colorStops).toEqual([
      { offset: 0, color: '#000000ff' },
      { offset: 1, color: '#ffffffff' },
    ]);
    expect(gradient?.start).toEqual({ x: 0, y: 0 });
    expect(gradient?.end).toEqual({ x: 1, y: 0 });
  });
});
