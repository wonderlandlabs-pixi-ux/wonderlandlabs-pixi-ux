import './setupNavigator';
import {beforeEach, describe, expect, it} from 'vitest';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import {PixiProvider} from '@wonderlandlabs-pixi-ux/utils';
import {createButtonFamily} from '../src/buttonFamily';
import {getStyleTree, makeStoreConfig} from '../src/helpers';
import {BTYPE_AVATAR, BTYPE_BASE, BTYPE_TEXT, BTYPE_VERTICAL} from '../src/constants';

beforeEach(() => {
    PixiProvider.init(PixiProvider.fallbacks);
});

describe('ButtonStore sizing', () => {
    it('uses the medium base family scale by default', () => {
        const styleTree = getStyleTree(BTYPE_BASE, {
            app: {},
            handlers: {},
            styleTree: [],
            styleDef: [],
        });

        const config = makeStoreConfig({
            variant: BTYPE_BASE,
            label: 'Launch',
            icon: 'https://assets.example.com/icon.png',
        }, styleTree);

        expect(config.value.dim.w).toBeCloseTo(150.38, 2);
        expect(config.value.dim.h).toBeCloseTo(30.08, 2);
        expect(config.value.gap).toBeCloseTo(4.51, 2);
        expect(config.value.children).toHaveLength(2);
    });

    it('uses explicit family scale tokens when present', () => {
        const styleTree = getStyleTree(BTYPE_BASE, {
            app: {},
            handlers: {},
            styleTree: [],
            styleDef: [],
        });

        const smallConfig = makeStoreConfig({
            variant: BTYPE_BASE,
            label: 'Small',
            scale: 50,
        }, styleTree);
        const largeConfig = makeStoreConfig({
            variant: BTYPE_BASE,
            label: 'Large',
            scale: 133,
        }, styleTree);

        expect(smallConfig.value.dim.w).toBeCloseTo(75.19, 2);
        expect(largeConfig.value.dim.w).toBe(200);
        expect(largeConfig.value.dim.h).toBe(40);
    });

    it('changes button size when a custom family scale changes', () => {
        const familyJson = createButtonFamily({
            container: {
                background: {
                    base: {
                        width: {
                            '$*': 150,
                        },
                        height: {
                            '$*': 30,
                        },
                        padding: {
                            '$*': [4, 18],
                        },
                    },
                },
                content: {
                    '$*': {
                        gap: 6,
                    },
                },
            },
            label: {
                base: {
                    size: {
                        '$*': 13,
                    },
                },
            },
            icon: {
                size: {
                    width: {
                        '$*': 16,
                    },
                    height: {
                        '$*': 16,
                    },
                },
            },
        }, [50, 100, 200], {family: 'capsule'});
        const familyStyles = fromJSON(familyJson);

        expect(familyJson.BASE).toBeDefined();
        expect(((familyJson.BASE as Record<string, unknown>).button as Record<string, unknown>).button).toBeDefined();
        expect(((((familyJson.BASE as Record<string, unknown>).button as Record<string, unknown>).button as Record<string, unknown>).capsule as Record<string, unknown>)['50']).toBeDefined();

        const smallStyleTree = getStyleTree(BTYPE_BASE, {
            app: {},
            handlers: {},
            styleTree: [familyStyles],
            styleDef: [],
        });
        const largeStyleTree = getStyleTree(BTYPE_BASE, {
            app: {},
            handlers: {},
            styleTree: [familyStyles],
            styleDef: [],
        });

        const smallConfig = makeStoreConfig({
            variant: BTYPE_BASE,
            family: 'capsule',
            scale: 50,
            label: 'Small',
            icon: 'https://assets.example.com/icon.png',
        }, smallStyleTree);
        const largeConfig = makeStoreConfig({
            variant: BTYPE_BASE,
            family: 'capsule',
            scale: 200,
            label: 'Large',
            icon: 'https://assets.example.com/icon.png',
        }, largeStyleTree);

        expect(smallConfig.value.dim.w).toBeCloseTo(75, 2);
        expect(smallConfig.value.dim.h).toBeCloseTo(15, 2);
        expect(largeConfig.value.dim.w).toBeCloseTo(300, 2);
        expect(largeConfig.value.dim.h).toBeCloseTo(60, 2);
        expect(largeConfig.value.dim.w).toBeGreaterThan(smallConfig.value.dim.w);
        expect(largeConfig.value.dim.h).toBeGreaterThan(smallConfig.value.dim.h);
    });

    it('builds a text button with label-only content sizing', () => {
        const styleTree = getStyleTree(BTYPE_TEXT, {
            app: {},
            handlers: {},
            styleTree: [],
            styleDef: [],
        });

        const config = makeStoreConfig({
            variant: BTYPE_TEXT,
            label: 'Text Link',
        }, styleTree);

        expect(config.value.variant).toBe(BTYPE_TEXT);
        expect(config.value.children).toHaveLength(1);
        expect(config.value.children?.[0].name).toBe('label');
    });

    it('builds a vertical button with stacked icon and label children', () => {
        const styleTree = getStyleTree(BTYPE_VERTICAL, {
            app: {},
            handlers: {},
            styleTree: [],
            styleDef: [],
        });

        const config = makeStoreConfig({
            variant: BTYPE_VERTICAL,
            label: 'Profile',
            icon: 'https://assets.example.com/icon.png',
        }, styleTree);

        expect(config.value.align.direction).toBe('vertical');
        expect(config.value.children?.map((child) => child.name)).toEqual(['icon', 'label']);
    });

    it('builds an avatar button around a square inner child', () => {
        const styleTree = getStyleTree(BTYPE_AVATAR, {
            app: {},
            handlers: {},
            styleTree: [],
            styleDef: [],
        });

        const config = makeStoreConfig({
            variant: BTYPE_AVATAR,
            label: 'AB',
        }, styleTree);

        expect(config.value.children).toHaveLength(1);
        expect(config.value.children?.[0].name).toBe('label');
        expect(config.value.children?.[0].dim.w).toBe(config.value.children?.[0].dim.h);
    });
});
