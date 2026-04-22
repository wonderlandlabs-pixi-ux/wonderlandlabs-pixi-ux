import { describe, expect, it } from 'vitest';
import { boxTreeToSVG } from '../src/toSVG.js';
import type { BoxLayoutCellType, BoxStyleManagerLike } from '../src/types.js';

function createStyleManager(entries: Record<string, unknown>): BoxStyleManagerLike {
    const lookup = (nouns: string[], states: string[]) => {
        const nounKey = nouns.join('.');
        const stateKey = states.join(',');
        const exactKey = `${nounKey}:${stateKey}`;
        if (exactKey in entries) {
            return entries[exactKey];
        }

        const wildcardExactKey = `*.${nounKey}:${stateKey}`;
        if (wildcardExactKey in entries) {
            return entries[wildcardExactKey];
        }

        const result: Record<string, unknown> = {};
        const prefixes = [`${nounKey}.`, `*.${nounKey}.`];
        const suffix = `:${stateKey}`;
        for (const [key, value] of Object.entries(entries)) {
            const prefix = prefixes.find((candidate) => key.startsWith(candidate) && key.endsWith(suffix));
            if (!prefix) {
                continue;
            }
            const remainder = key.slice(prefix.length, key.length - suffix.length).split('.');
            let current = result;
            remainder.forEach((segment, index) => {
                if (index === remainder.length - 1) {
                    current[segment] = value;
                    return;
                }
                current[segment] = (current[segment] as Record<string, unknown> | undefined) ?? {};
                current = current[segment] as Record<string, unknown>;
            });
        }

        return Object.keys(result).length > 0 ? result : undefined;
    };

    return {
        match: (query) => lookup(query.nouns, query.states),
        matchHierarchy: (query) => lookup(query.nouns, query.states),
    };
}

describe('toSVG', () => {
    it('resolves colors from the style manager using variant-aware queries', () => {
        const styles = createStyleManager({
            '*.button.primary.background.fill:': { r: 0.8, g: 0.2, b: 0.2 },
            '*.button.primary.border.color:': { r: 0.1, g: 0.2, b: 0.3 },
            '*.button.primary.padding.border.color:': { r: 0.2, g: 0.5, b: 0.8 },
        });

        const root: BoxLayoutCellType = {
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

        const svg = boxTreeToSVG(root, { styleTree: [styles] });

        expect(svg).toContain('fill="rgb(204, 51, 51)"');
        expect(svg).toContain('stroke="none"');
        expect(svg).toContain('stroke="rgb(51, 128, 204)"');
    });

    it('throws when required style colors are missing', () => {
        const root: BoxLayoutCellType = {
            name: 'button',
            absolute: true,
            dim: { x: 10, y: 10, w: 120, h: 40 },
            location: { x: 10, y: 10, w: 120, h: 40 },
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        };

        expect(() => boxTreeToSVG(root, {
            styleTree: [createStyleManager({})],
        })).toThrow(/background\.fill and border\.color/);
    });

    it('draws border visuals only from explicit border inset layers', () => {
        const styles = createStyleManager({
            '*.panel.background.fill:': '#eeeeee',
            '*.panel.border.color:': '#222222',
            '*.panel.border.border.color:': '#444444',
        });

        const root: BoxLayoutCellType = {
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

        const svg = boxTreeToSVG(root, { styleTree: [styles] });

        expect(svg).toContain('stroke="none"');
        expect(svg).toContain('fill="#444444"');
    });

    it('does not draw a stroke when a cell has no border layer', () => {
        const styles = createStyleManager({
            '*.panel.background.fill:': '#eeeeee',
            '*.panel.border.color:': '#222222',
        });

        const root: BoxLayoutCellType = {
            name: 'panel',
            absolute: true,
            dim: { x: 10, y: 10, w: 120, h: 80 },
            location: { x: 10, y: 10, w: 120, h: 80 },
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        };

        const svg = boxTreeToSVG(root, { styleTree: [styles] });

        expect(svg).toContain('stroke="none"');
        expect(svg).not.toContain('stroke="#222222"');
    });
});
