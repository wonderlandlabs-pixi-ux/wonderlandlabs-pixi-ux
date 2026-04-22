import './setupNavigator';
import {describe, expect, it} from 'vitest';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import defaultStyles from '../src/defaultStyles.json';
import {resolveStyleNumber, resolveStyleValue} from '../src/helpers';
import {BTYPE_BASE, BTYPE_VERTICAL} from '../src/constants';

const styles = [fromJSON(defaultStyles)];

describe('button style resolution', () => {
    it('resolves generic and variant dimensions through variant branches', () => {
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_BASE),
        ).toBe(200);
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_VERTICAL),
        ).toBe(60);
    });

    it('stores the base resting fill as a gradient object and omits it on hover', () => {
        expect(defaultStyles.container.background.base.$start.fill).toEqual({
            direction: 'vertical',
            colors: ['#D9D9D9', '#FFFFFF', '#BFBFBF'],
        });
        expect(defaultStyles.container.background.base.$hover?.fill).toBeUndefined();
    });

    it('resolves generic disabled alpha for label and icon', () => {
        expect(
            resolveStyleValue(styles, 'label.font.alpha', ['disabled'], BTYPE_BASE),
        ).toBe(0.45);
        expect(
            resolveStyleValue(styles, 'icon.alpha', ['disabled'], BTYPE_BASE),
        ).toBe(0.45);
    });
});
