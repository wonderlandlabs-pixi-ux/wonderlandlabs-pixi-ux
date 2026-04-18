import { describe, expect, it } from 'vitest';
import { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import { resolveStyleValue, styleContextForCell } from '../src/styleHelpers.js';

describe('styleHelpers', () => {
  it('falls back to the local cell path for wildcard style lookups', () => {
    const styles = new StyleTree();
    styles.set('*.background.color', [], 'rgb(244, 246, 251)');
    styles.set('*.border.color', [], 'rgb(37, 44, 62)');

    const root = styleContextForCell({ name: 'root' });
    const sidebar = styleContextForCell({ name: 'sidebar' }, root);
    const logo = styleContextForCell({ name: 'logo' }, sidebar);

    expect(resolveStyleValue(styles, logo, ['background', 'color'])).toBe('rgb(244, 246, 251)');
    expect(resolveStyleValue(styles, logo, ['border', 'color'])).toBe('rgb(37, 44, 62)');
  });

  it('reads nested properties from object-backed style entries', () => {
    const styles = new StyleTree();
    styles.set('*.logo', [], {
      background: { color: 'rgb(222, 232, 255)' },
      border: { color: 'rgb(48, 71, 118)' },
    });

    const root = styleContextForCell({ name: 'root' });
    const sidebar = styleContextForCell({ name: 'sidebar' }, root);
    const logo = styleContextForCell({ name: 'logo' }, sidebar);

    expect(resolveStyleValue(styles, logo, ['background', 'color'])).toBe('rgb(222, 232, 255)');
    expect(resolveStyleValue(styles, logo, ['border', 'color'])).toBe('rgb(48, 71, 118)');
  });
});
