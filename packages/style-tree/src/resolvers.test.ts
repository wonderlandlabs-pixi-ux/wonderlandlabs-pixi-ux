import { describe, expect, it } from 'vitest';
import { fromJSON } from './digest.js';
import {
  resolveBackgroundStyle,
  resolveBorderStyle,
  resolveFill,
  resolveFontStyle,
  resolveGap,
  resolveSpacing,
} from './resolvers.js';

describe('style resolvers', () => {
  const tree = fromJSON({
    button: {
      container: {
        background: {
          fill: {
            direction: 'vertical',
            colors: ['#112233', '#334455'],
          },
          alpha: 0.9,
          visible: true,
          padding: [6, 10],
        },
        border: {
          color: '#778899',
          width: 2,
          alpha: 0.75,
          radius: 12,
          visible: true,
        },
        gap: 8,
      },
      label: {
        font: {
          size: 15,
          family: 'IBM Plex Sans',
          color: '#ffffff',
          alpha: 0.95,
          align: 'center',
          visible: true,
        },
      },
      $hover: {
        label: {
          font: {
            color: '#ffeeaa',
          },
        },
      },
    },
    caption: {
      background: {
        fill: '#101820',
      },
      padding: {
        top: 8,
        right: 12,
        bottom: 10,
        left: 12,
      },
    },
  });

  it('resolves CSS-like spacing values from a root', () => {
    expect(resolveSpacing(tree, 'button.container')).toEqual({
      top: 6,
      right: 10,
      bottom: 6,
      left: 10,
    });

    expect(resolveSpacing(tree, 'caption', 4)).toEqual({
      top: 8,
      right: 12,
      bottom: 10,
      left: 12,
    });
  });

  it('resolves background and border objects from CSS-like roots', () => {
    expect(resolveBackgroundStyle(tree, 'button.container')).toEqual({
      fill: {
        direction: 'vertical',
        colors: ['#112233', '#334455'],
      },
      alpha: 0.9,
      visible: true,
    });

    expect(resolveBorderStyle(tree, 'button.container')).toEqual({
      color: '#778899',
      width: 2,
      alpha: 0.75,
      radius: 12,
      visible: true,
    });
  });

  it('resolves font objects with state-aware overrides', () => {
    expect(resolveFontStyle(tree, 'button.label')).toEqual({
      size: 15,
      family: 'IBM Plex Sans',
      color: '#ffffff',
      alpha: 0.95,
      align: 'center',
      weight: undefined,
      style: undefined,
      lineHeight: undefined,
      letterSpacing: undefined,
      wordWrap: undefined,
      wordWrapWidth: undefined,
      visible: true,
    });

    expect(resolveFontStyle(tree, 'button.label', {}, { states: ['hover'] }).color).toBe('#ffeeaa');
  });

  it('resolves fill and gap independently', () => {
    expect(resolveFill(tree, 'caption.background')).toBe('#101820');
    expect(resolveGap(tree, 'button.container')).toBe(8);
  });

  it('supports comma-delimited root inheritance order', () => {
    const inherited = fromJSON({
      button: {
        container: {
          padding: [6, 10],
          background: {
            fill: '#223344',
          },
          border: {
            radius: 8,
            width: 1,
          },
        },
      },
      buttonVariant: {
        container: {
          background: {
            fill: '#445566',
          },
        },
      },
      buttonDanger: {
        container: {
          border: {
            color: '#aa3333',
            width: 3,
          },
        },
      },
    });

    expect(resolveSpacing(inherited, 'button.container, buttonVariant.container')).toEqual({
      top: 6,
      right: 10,
      bottom: 6,
      left: 10,
    });
    expect(resolveBackgroundStyle(inherited, 'button.container, buttonVariant.container').fill).toBe('#445566');
    expect(resolveBorderStyle(inherited, 'button.container, buttonDanger.container')).toEqual({
      color: '#aa3333',
      width: 3,
      alpha: 1,
      radius: 8,
      visible: true,
    });
  });
});
