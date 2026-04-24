import './setupNavigator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { createButtonSimpleClass, snapButtonSimpleSize } from '../src/ButtonSimple';

beforeEach(() => {
    PixiProvider.init(PixiProvider.fallbacks);
});

describe('ButtonSimple', () => {
    it('snaps computed width to the nearest configured increment', () => {
        const pixi = PixiProvider.shared;
        const parent = new pixi.Container();
        const ButtonSimple = createButtonSimpleClass({
            paddingX: 12,
            paddingY: 6,
            widthIncrement: 10,
            borderRadius: 8,
            borderWidth: 2,
            backgroundColor: '#223344',
            borderColor: '#111111',
            labelColor: '#ffffff',
            fontSize: 20,
            minHeight: 32,
        });

        const button = new ButtonSimple(parent, { label: 'Hello' }, { pixi });

        expect((button.host.hitArea as { width: number }).width).toBe(90);
        expect((button.host.hitArea as { height: number }).height).toBe(32);
    });

    it('grows when the label changes', () => {
        const pixi = PixiProvider.shared;
        const parent = new pixi.Container();
        const ButtonSimple = createButtonSimpleClass({
            paddingX: 10,
            paddingY: 5,
            widthIncrement: 10,
            borderRadius: 8,
            borderWidth: 1,
            backgroundColor: '#223344',
            borderColor: '#111111',
            labelColor: '#ffffff',
            fontSize: 18,
            minHeight: 28,
        });

        const button = new ButtonSimple(parent, { label: 'Go' }, { pixi });
        const initialWidth = (button.host.hitArea as { width: number }).width;

        button.setState({ label: 'Proceed Now' });
        const nextWidth = (button.host.hitArea as { width: number }).width;

        expect(nextWidth).toBeGreaterThan(initialWidth);
    });

    it('suppresses callback execution while disabled', () => {
        const pixi = PixiProvider.shared;
        const parent = new pixi.Container();
        const callback = vi.fn();
        const ButtonSimple = createButtonSimpleClass({
            paddingX: 10,
            paddingY: 5,
            widthIncrement: 10,
            borderRadius: 8,
            borderWidth: 1,
            backgroundColor: '#223344',
            borderColor: '#111111',
            labelColor: '#ffffff',
            fontSize: 18,
            minHeight: 28,
        });

        const button = new ButtonSimple(parent, { label: 'Save', callback, disabled: true }, { pixi });
        button.click();

        expect(callback).not.toHaveBeenCalled();

        button.setState({ disabled: false });
        button.click();
        expect(callback).toHaveBeenCalledTimes(1);
    });
});

describe('snapButtonSimpleSize', () => {
    it('snaps values upward to the nearest increment', () => {
        expect(snapButtonSimpleSize(81, 10)).toBe(90);
        expect(snapButtonSimpleSize(80, 10)).toBe(80);
        expect(snapButtonSimpleSize(81, 1)).toBe(81);
    });
});
