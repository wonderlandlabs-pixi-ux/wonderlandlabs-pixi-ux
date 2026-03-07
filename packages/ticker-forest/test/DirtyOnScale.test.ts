import {describe, expect, it} from 'vitest';
import {Point} from 'pixi.js';
import {DirtyOnScale} from '../src/DirtyOnScale';

describe('DirtyOnScale', () => {
    it('derives enabled from watch flags', () => {
        expect(new DirtyOnScale({watchX: false, watchY: false}).enabled).toBe(false);
        expect(new DirtyOnScale({watchX: true, watchY: false}).enabled).toBe(true);
        expect(new DirtyOnScale({watchX: false, watchY: true}).enabled).toBe(true);
    });

    it('from(boolean) expands to expected watch flags', () => {
        const off = DirtyOnScale.from(false);
        const on = DirtyOnScale.from(true);

        expect(off.watchX).toBe(false);
        expect(off.watchY).toBe(false);
        expect(on.watchX).toBe(true);
        expect(on.watchY).toBe(true);
    });

    it('compare tracks only watched axes', () => {
        const xOnly = new DirtyOnScale({watchX: true, watchY: false});
        const prev = new Point(1, 1);

        expect(DirtyOnScale.compare(xOnly, prev, new Point(1.00001, 99))).toBe(true);
        expect(DirtyOnScale.compare(xOnly, prev, new Point(2, 1))).toBe(false);
    });

    it('compare honors optional epsilon', () => {
        const strict = new DirtyOnScale({watchX: true, watchY: false, epsilon: 0.05});
        const loose = new DirtyOnScale({watchX: true, watchY: false, epsilon: 0.5});
        const prev = new Point(1, 1);
        const next = new Point(1.2, 1);

        expect(DirtyOnScale.compare(strict, prev, next)).toBe(false);
        expect(DirtyOnScale.compare(loose, prev, next)).toBe(true);
    });
});
