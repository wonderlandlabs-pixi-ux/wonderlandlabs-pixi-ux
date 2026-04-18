import { describe, expect, it } from 'vitest';
import { boxTreeToSVG } from '../src/toSVG.js';
import type { BoxCellType, BoxStyleManagerLike, BoxStyleQueryLike } from '../src/types.js';

function createStyleManager(entries: Record<string, unknown>): BoxStyleManagerLike {
    const lookup = (query: BoxStyleQueryLike) => entries[`${query.nouns.join('.')}:${query.states.join(',')}`];

    return {
        match: lookup,
        matchHierarchy: lookup,
    };
}

describe('toSVG', () => {
    it('resolves colors from the style manager using variant-aware queries', () => {
        const styles = createStyleManager({
            'button.primary.background.color:': { r: 0.8, g: 0.2, b: 0.2 },
            'button.primary.border.color:': { r: 0.1, g: 0.2, b: 0.3 },
            'button.primary.padding.border.color:': { r: 0.2, g: 0.5, b: 0.8 },
        });

        const root: BoxCellType = {
            name: 'button',
            absolute: true,
            variant: 'primary',
            dim: { x: 10, y: 10, w: 120, h: 40 },
            location: { x: 10, y: 10, w: 120, h: 40 },
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
            insets: [{
                role: 'padding',
                inset: [{ scope: 'all', value: 4 }],
            }],
        };

        const svg = boxTreeToSVG(root, { styleTree: styles });

        expect(svg).toContain('fill="rgb(204, 51, 51)"');
        expect(svg).toContain('stroke="none"');
        expect(svg).toContain('stroke="rgb(51, 128, 204)"');
    });

    it('throws when required style colors are missing', () => {
        const root: BoxCellType = {
            name: 'button',
            absolute: true,
            dim: { x: 10, y: 10, w: 120, h: 40 },
            location: { x: 10, y: 10, w: 120, h: 40 },
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        };

        expect(() => boxTreeToSVG(root, {
            styleTree: createStyleManager({}),
        })).toThrow(/background\.color and border\.color/);
    });

    it('draws border visuals only from explicit border inset layers', () => {
        const styles = createStyleManager({
            'panel.background.color:': '#eeeeee',
            'panel.border.color:': '#222222',
            'panel.border.border.color:': '#444444',
        });

        const root: BoxCellType = {
            name: 'panel',
            absolute: true,
            dim: { x: 10, y: 10, w: 120, h: 80 },
            location: { x: 10, y: 10, w: 120, h: 80 },
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
            insets: [{
                role: 'border',
                inset: [{ scope: 'all', value: 8 }],
            }],
        };

        const svg = boxTreeToSVG(root, { styleTree: styles });

        expect(svg).toContain('stroke="none"');
        expect(svg).toContain('fill="#444444"');
    });

    it('does not draw a stroke when a cell has no border layer', () => {
        const styles = createStyleManager({
            'panel.background.color:': '#eeeeee',
            'panel.border.color:': '#222222',
        });

        const root: BoxCellType = {
            name: 'panel',
            absolute: true,
            dim: { x: 10, y: 10, w: 120, h: 80 },
            location: { x: 10, y: 10, w: 120, h: 80 },
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        };

        const svg = boxTreeToSVG(root, { styleTree: styles });

        expect(svg).toContain('stroke="none"');
        expect(svg).not.toContain('stroke="#222222"');
    });
});
