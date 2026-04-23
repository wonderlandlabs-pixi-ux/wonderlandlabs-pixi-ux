import { describe, expect, it } from 'vitest';
import { PixiProvider } from './pixiProvider.js';

describe('PixiProvider', () => {
  it('throws when shared is accessed before init', () => {
    expect(() => PixiProvider.shared).toThrow(/PixiProvider\.init/);
  });

  it('exposes lazy static fallbacks through provider instances', () => {
    const provider = new PixiProvider({});

    expect(provider.Graphics).toBe(PixiProvider.fallbacks.Graphics);
    expect(provider.Texture.EMPTY).toBeDefined();
  });

  it('computes aggregate local bounds from child positions and hit areas', () => {
    const provider = new PixiProvider({});
    const parent = new provider.Container();
    const child = new provider.Container();

    child.position.set(12, 18);
    child.hitArea = new provider.Rectangle(0, 0, 48, 52);
    parent.addChild(child);

    expect(parent.getLocalBounds()).toEqual({ width: 60, height: 70 });
  });
});
