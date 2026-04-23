import './setupNavigator';
import {describe, expect, it} from 'vitest';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import defaultStyles from '../src/defaultStyles.json';
import capsuleStyles from '../src/capsuleStyles.json';
import {getStyleTree, resolveStyleNumber, resolveStyleValue} from '../src/helpers';
import {BTYPE_BASE, BTYPE_VERTICAL} from '../src/constants';

const styles = getStyleTree(BTYPE_BASE, {handlers: {}, app: {}, styleTree: [], styleDef: []});

describe('button style resolution', () => {
    it('resolves generic and variant dimensions through variant branches', () => {
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_BASE),
        ).toBe(200);
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_VERTICAL),
        ).toBe(60);
    });

    it('stores the base resting fill as fill sub-properties and omits them on hover', () => {
        expect(
            resolveStyleValue(styles, 'container.background.fill.direction', ['start'], BTYPE_BASE),
        ).toBe('vertical');
        expect(
            resolveStyleValue(styles, 'container.background.fill.colors', ['start'], BTYPE_BASE),
        ).toEqual(['#E7E4DE', '#F4F2EE', '#FFFFFF', '#F2EFEB', '#D7D2CA']);
        expect(
            resolveStyleValue(styles, 'container.background.fill.direction', ['hover'], BTYPE_BASE),
        ).toBeUndefined();
    });

    it('resolves generic disabled alpha for label and icon', () => {
        expect(
            resolveStyleValue(styles, 'label.font.alpha', ['disabled'], BTYPE_BASE),
        ).toBe(0.45);
        expect(
            resolveStyleValue(styles, 'icon.alpha', ['disabled'], BTYPE_BASE),
        ).toBe(0.45);
    });

    it('accepts canonical container width, height, padding, and gap paths', () => {
        const canonicalStyles = [fromJSON({
            container: {
                width: 220,
                height: 44,
                padding: [7, 15],
                gap: 9,
            },
        })];

        expect(
            resolveStyleNumber(canonicalStyles, 'container.width', ['start'], 0, BTYPE_BASE),
        ).toBe(220);
        expect(
            resolveStyleNumber(canonicalStyles, 'container.height', ['start'], 0, BTYPE_BASE),
        ).toBe(44);
        expect(
            resolveStyleValue(canonicalStyles, 'container.padding', ['start'], BTYPE_BASE),
        ).toEqual([7, 15]);
        expect(
            resolveStyleNumber(canonicalStyles, 'container.gap', ['start'], 0, BTYPE_BASE),
        ).toBe(9);
    });

    it('defaults to the medium size family and supports explicit small and large size tokens', () => {
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_BASE, 100, 'base'),
        ).toBeCloseTo(150.38, 2);
        expect(
            resolveStyleNumber(styles, 'container.background.height', ['start'], 0, BTYPE_BASE, 100, 'base'),
        ).toBeCloseTo(30.08, 2);
        expect(
            resolveStyleNumber(styles, 'label.size', ['start'], 0, BTYPE_BASE, 100, 'base'),
        ).toBeCloseTo(12.78, 2);
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_BASE, 50, 'base'),
        ).toBeCloseTo(75.19, 2);
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_BASE, 133, 'base'),
        ).toBe(200);
    });

    it('supports custom families layered separately from the stock base family', () => {
        const familyStyles = getStyleTree(BTYPE_BASE, {
            handlers: {},
            app: {},
            styleDef: [],
            styleTree: [fromJSON({
                container: {
                    background: {
                        base: {
                            capsule: {
                                '100': {
                                    width: { '$*': 180 },
                                },
                            },
                        },
                    },
                },
            })],
        });

        expect(
            resolveStyleNumber(familyStyles, 'container.background.width', ['start'], 0, BTYPE_BASE, 100, 'capsule'),
        ).toBe(180);
        expect(
            resolveStyleNumber(familyStyles, 'container.background.width', ['start'], 0, BTYPE_BASE, 100, 'base'),
        ).toBeCloseTo(150.38, 2);
    });

    it('synthesizes missing family scales from the family 100 definition', () => {
        const familyStyles = getStyleTree(BTYPE_BASE, {
            handlers: {},
            app: {},
            styleDef: [],
            styleTree: [fromJSON({
                container: {
                    background: {
                        base: {
                            capsule: {
                                '100': {
                                    width: { '$*': 180 },
                                    height: { '$*': 48 },
                                    padding: { '$*': [4, 20] },
                                },
                            },
                        },
                    },
                },
                label: {
                    base: {
                        capsule: {
                            '100': {
                                size: { '$*': 16 },
                            },
                        },
                    },
                },
            })],
        });

        expect(
            resolveStyleNumber(familyStyles, 'container.background.width', ['start'], 0, BTYPE_BASE, 125, 'capsule'),
        ).toBe(225);
        expect(
            resolveStyleNumber(familyStyles, 'container.background.height', ['start'], 0, BTYPE_BASE, 125, 'capsule'),
        ).toBe(60);
        expect(
            resolveStyleValue(familyStyles, 'container.background.padding', ['start'], BTYPE_BASE, 125, 'capsule'),
        ).toEqual([5, 25]);
        expect(
            resolveStyleNumber(familyStyles, 'label.size', ['start'], 0, BTYPE_BASE, 125, 'capsule'),
        ).toBe(20);
    });

    it('prefers an explicit authored family scale over synthesized values', () => {
        const familyStyles = getStyleTree(BTYPE_BASE, {
            handlers: {},
            app: {},
            styleDef: [],
            styleTree: [fromJSON({
                container: {
                    background: {
                        base: {
                            capsule: {
                                '100': {
                                    width: { '$*': 180 },
                                },
                                '125': {
                                    width: { '$*': 240 },
                                },
                            },
                        },
                    },
                },
            })],
        });

        expect(
            resolveStyleNumber(familyStyles, 'container.background.width', ['start'], 0, BTYPE_BASE, 125, 'capsule'),
        ).toBe(240);
    });

    it('allows capsule override hover styles to differ from the resting state', () => {
        const stylesWithCapsule = getStyleTree(BTYPE_BASE, {
            handlers: {},
            app: {},
            styleTree: [fromJSON(capsuleStyles)],
            styleDef: [],
        });

        expect(
            resolveStyleValue(stylesWithCapsule, 'container.background.fill', ['start'], BTYPE_BASE),
        ).toBe('#183a37');
        expect(
            resolveStyleValue(stylesWithCapsule, 'container.background.fill', ['hover'], BTYPE_BASE),
        ).toBe('#1f3f6b');
        expect(
            resolveStyleValue(stylesWithCapsule, 'container.border.color', ['hover'], BTYPE_BASE),
        ).toBe('#4f78ad');
    });
});
