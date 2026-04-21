import {describe, expect, it} from 'vitest';

import {cellLayers, sizeToNumber, rectToAbsolute, rectToParentSpace, insetRect} from './../src/helpers.js';
import {
    INSET_SCOPE_ALL,
    INSET_SCOPE_HORIZ,
    INSET_SCOPE_TOP,
    INSET_SCOPE_VERT,
    SIZE_PX,
    SIZE_PCT,
    DIR_HORIZ,
    DIR_VERT
} from './../src/constants.js';

const SAMPLE_PARENT =  {w: 300, h: 200, x: 10, y: 20}

describe('helpers', () => {
    describe('sizeToNumber', () => {
        it('should return numbers unchanged', () => {
            expect(sizeToNumber({input: 1})).toBe(1);
            expect(sizeToNumber({input: 2.5})).toBe(2.5);
            expect(sizeToNumber({input: 0})).toBe(0);
            expect(sizeToNumber({input: -10})).toBe(-10);
            expect(sizeToNumber({input: -10.4})).toBe(-10.4);
        });

        it('should treat explicit px objects as px values', () => {
            expect(sizeToNumber({input: {value: 1}})).toBe(1); // unspecified unit - assume px
            expect(sizeToNumber({input: {value: 1, unit: SIZE_PX}})).toBe(1);
            expect(sizeToNumber({input: {value: 2.5, unit: SIZE_PX}})).toBe(2.5);
            expect(sizeToNumber({input: {value: 0, unit: SIZE_PX}})).toBe(0);
            expect(sizeToNumber({input: {value: -10, unit: SIZE_PX}})).toBe(-10);
            expect(sizeToNumber({input: {value: -10.4, unit: SIZE_PX}})).toBe(-10.4);
        });

        it('should optionally skip fractional values', () => {
            expect(sizeToNumber({
                input: {value: 1, unit: 'fr'},
                skipFractional: true
            })).toBeNull();
        });

        it('should process percent values based on parent dimensions', () => {
            expect(sizeToNumber({
                input: {value: 50, unit: SIZE_PCT},
                parentContainer: SAMPLE_PARENT,
                direction: DIR_HORIZ
            }))
                .toEqual(150);
            expect(sizeToNumber({
                input: {value: 50, unit: SIZE_PCT},
                parentContainer: SAMPLE_PARENT,
                direction: DIR_VERT
            }))
                .toEqual(100);
        })
    });

    describe('rectToAbsolute', () => {
        it('should pas through absolute rects', () => {
            expect(rectToAbsolute({x: 10, y: 20, w: 30, h: 5})).toEqual({
                x: 10, y: 20, w: 30, h: 5
            })
            expect(rectToAbsolute({
                x: {value: 10, unit: SIZE_PX},
                y: {value: 20, unit: SIZE_PX},
                w: {value: 30, unit: SIZE_PX},
                h: {value: 5, unit: SIZE_PX}
            })).toEqual({
                x: 10, y: 20, w: 30, h: 5
            })
        });

        it('should relativize sizes based on parent', () => {
            expect(rectToAbsolute({
                x: {value: 25, unit: SIZE_PCT},
                y: {value: 25, unit: SIZE_PCT},
                w: {value: 50, unit: SIZE_PCT},
                h: {value: 50, unit: SIZE_PCT}
            }, SAMPLE_PARENT)).toEqual({
                x: 75, y: 50, w: 150, h: 100
            })
        })
    });

    describe('rectToParentSpace', () => {
        it('should resolve x and y relative to the parent origin', () => {
            expect(rectToParentSpace({
                x: {value: 25, unit: SIZE_PCT},
                y: 10,
                w: {value: 50, unit: SIZE_PCT},
                h: {value: 50, unit: SIZE_PCT}
            }, SAMPLE_PARENT)).toEqual({
                x: 75, y: 10, w: 150, h: 100
            });
        });
    });

    describe('insetRect', () => {
        it('should inset by border first and then padding', () => {
            expect(insetRect(SAMPLE_PARENT, [
                {
                    role: 'border',
                    inset: [
                        {scope: INSET_SCOPE_ALL, value: 4},
                        {scope: INSET_SCOPE_TOP, value: 8},
                    ],
                },
                {
                    role: 'padding',
                    inset: [
                        {scope: INSET_SCOPE_HORIZ, value: 10},
                        {scope: INSET_SCOPE_VERT, value: 5},
                    ],
                },
            ])).toEqual({
                x: 24,
                y: 33,
                w: 272,
                h: 178,
            });
        });
    });

    describe('cellLayers', () => {
        it('should always return outer and content layers around inset roles', () => {
            expect(cellLayers({
                location: SAMPLE_PARENT,
                insets: [
                    {
                        role: 'border',
                        inset: [
                            {scope: INSET_SCOPE_ALL, value: 4},
                            {scope: INSET_SCOPE_TOP, value: 8},
                        ],
                    },
                    {
                        role: 'padding',
                        inset: [
                            {scope: INSET_SCOPE_HORIZ, value: 10},
                            {scope: INSET_SCOPE_VERT, value: 5},
                        ],
                    },
                ],
            })).toEqual([
                {
                    role: 'outer',
                    rect: SAMPLE_PARENT,
                    insets: SAMPLE_PARENT,
                },
                {
                    role: 'border',
                    rect: SAMPLE_PARENT,
                    insets: {
                        x: 14,
                        y: 28,
                        w: 292,
                        h: 188,
                    },
                },
                {
                    role: 'padding',
                    rect: {
                        x: 14,
                        y: 28,
                        w: 292,
                        h: 188,
                    },
                    insets: {
                        x: 24,
                        y: 33,
                        w: 272,
                        h: 178,
                    },
                },
                {
                    role: 'content',
                    rect: {
                        x: 24,
                        y: 33,
                        w: 272,
                        h: 178,
                    },
                    insets: {
                        x: 24,
                        y: 33,
                        w: 272,
                        h: 178,
                    },
                },
            ]);
        });

        it('should return outer and content even without insets', () => {
            expect(cellLayers({
                location: SAMPLE_PARENT,
                insets: [],
            })).toEqual([
                {
                    role: 'outer',
                    rect: SAMPLE_PARENT,
                    insets: SAMPLE_PARENT,
                },
                {
                    role: 'content',
                    rect: SAMPLE_PARENT,
                    insets: SAMPLE_PARENT,
                },
            ]);
        });
    });
});
