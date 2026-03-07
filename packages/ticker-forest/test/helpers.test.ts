import {describe, expect, it} from 'vitest';
import {Point, type Container} from 'pixi.js';
import {DirtyOnScale} from '../src/DirtyOnScale';
import {
    compareScalePoints,
    inverseScalePoint,
    isScalePoint,
    readScalePoint,
    resolveRootParent,
} from '../src/helpers';
import {createScaledContainerPair, MockContainer} from './mocks';

describe('ticker-forest helpers', () => {
    describe('readScalePoint', () => {
        it('reads scale from canned container transforms', () => {
            const {container} = createScaledContainerPair(2, 3);
            const scale = readScalePoint(container as unknown as Container);

            expect(scale?.x).toBeCloseTo(2);
            expect(scale?.y).toBeCloseTo(3);
        });

        it('returns undefined scale when container has no parent root', () => {
            const orphan = new MockContainer({
                toGlobal: ({x, y}) => ({x, y}),
            });

            expect(readScalePoint(orphan as unknown as Container)).toBeUndefined();
        });
    });

    describe('inverseScalePoint', () => {
        it('computes inverse scale from canned transforms', () => {
            const {container} = createScaledContainerPair(4, 5);
            const inverse = inverseScalePoint(container as unknown as Container);

            expect(inverse.x).toBeCloseTo(0.25);
            expect(inverse.y).toBeCloseTo(0.2);
        });

        it('returns identity inverse scale when scale cannot be read', () => {
            expect(inverseScalePoint(undefined)).toEqual(new Point(1, 1));

            const orphan = new MockContainer({
                toGlobal: ({x, y}) => ({x, y}),
            });
            expect(inverseScalePoint(orphan as unknown as Container)).toEqual(new Point(1, 1));
        });
    });

    describe('compareScalePoints', () => {
        it('respects DirtyOnScale watch flags and epsilon in comparisons', () => {
            const dirtyOnScale = new DirtyOnScale({watchX: true, watchY: false, epsilon: 0.2});
            const prev = new Point(1, 1);

            expect(compareScalePoints(dirtyOnScale, prev, new Point(1.1, 99))).toBe(true);
            expect(compareScalePoints(dirtyOnScale, prev, new Point(1.3, 1))).toBe(false);
        });
    });

    describe('resolveRootParent', () => {
        it('resolves the top-most root parent in a chain', () => {
            const root = new MockContainer();
            const middle = new MockContainer({parent: root});
            const leaf = new MockContainer({parent: middle});

            const resolved = resolveRootParent(leaf as unknown as Container);

            expect(resolved).toBe(root as unknown as Container);
        });
    });

    describe('isScalePoint', () => {
        it('validates scale point guard for finite x/y coordinates', () => {
            expect(isScalePoint(new Point(1, 2))).toBe(true);
            expect(isScalePoint({x: 1, y: 2})).toBe(true);
            expect(isScalePoint({x: Infinity, y: 2})).toBe(false);
            expect(isScalePoint({x: 1})).toBe(false);
            expect(isScalePoint(null)).toBe(false);
        });
    });
});
