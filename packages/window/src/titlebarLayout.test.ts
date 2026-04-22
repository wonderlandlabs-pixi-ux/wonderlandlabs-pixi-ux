import {describe, expect, it} from 'vitest';
import {computeTitlebarLayout} from './titlebarLayout.js';

describe('computeTitlebarLayout', () => {
    it('allocates icon, title, and close regions inside padded content space', () => {
        const layout = computeTitlebarLayout({
            width: 220,
            height: 30,
            padding: 4,
            icon: {width: 16, height: 16},
            closeButtonSize: 12,
        });

        expect(layout.contentRect).toEqual({x: 4, y: 4, w: 212, h: 22});
        expect(layout.iconRect).toEqual({x: 4, y: 7, w: 16, h: 16});
        expect(layout.closeRect).toEqual({x: 196, y: 9, w: 20, h: 12});
        expect(layout.titleRect).toEqual({x: 24, y: 4, w: 168, h: 22});
    });

    it('expands the title region when optional affordances are absent', () => {
        const layout = computeTitlebarLayout({
            width: 220,
            height: 30,
            padding: 4,
        });

        expect(layout.iconRect).toBeUndefined();
        expect(layout.closeRect).toBeUndefined();
        expect(layout.titleRect).toEqual({x: 4, y: 4, w: 212, h: 22});
    });
});
