import { describe, expect, it } from 'vitest';
import { STYLE_VARIANT } from './constants.js';
import { resolveWindowStyle } from './styles.js';

describe('window style resolution', () => {
    it('inherits from default then lets the variant override it', () => {
        const style = resolveWindowStyle(STYLE_VARIANT.BLUE);

        expect(style.backgroundColor).toEqual({ r: 0.1, g: 0.15, b: 0.25 });
        expect(style.titlebarBackgroundColor).toEqual({ r: 0.2, g: 0.3, b: 0.5 });
        expect(style.label.font.family).toBe('Helvetica');
        expect(style.selectedBorderWidth).toBe(2);
    });

    it('lets custom style overrides win over inherited variant values', () => {
        const style = resolveWindowStyle(STYLE_VARIANT.BLUE, {
            backgroundColor: { r: 0.4, g: 0.5, b: 0.6 },
            borderColor: { r: 0.2, g: 0.2, b: 0.2 },
            borderWidth: 4,
            label: {
                font: {
                    size: 12,
                    family: 'Arial',
                    color: { r: 1, g: 1, b: 1 },
                    alpha: 0.8,
                    visible: true,
                },
            },
        });

        expect(style.backgroundColor).toEqual({ r: 0.4, g: 0.5, b: 0.6 });
        expect(style.borderColor).toEqual({ r: 0.2, g: 0.2, b: 0.2 });
        expect(style.borderWidth).toBe(4);
        expect(style.label.font.size).toBe(12);
        expect(style.label.font.family).toBe('Arial');
        expect(style.label.font.color).toEqual({ r: 1, g: 1, b: 1 });
        expect(style.label.font.alpha).toBe(0.8);
    });
});
