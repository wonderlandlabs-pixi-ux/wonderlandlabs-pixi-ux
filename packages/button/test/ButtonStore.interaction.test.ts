import './setupNavigator';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {PixiProvider} from '@wonderlandlabs-pixi-ux/utils';
import {ButtonStore} from '../src/ButtonStore';
import {BTYPE_BASE} from '../src/constants';

type QueuedTick = {
    fn: () => void;
    context?: unknown;
};

function createMockApp() {
    const queuedTicks: QueuedTick[] = [];
    return {
        app: {
            render() {
                // no-op for headless tests
            },
            ticker: {
                addOnce(fn: () => void, context?: unknown) {
                    queuedTicks.push({fn, context});
                },
                remove() {
                    // no-op for tests
                },
            },
        },
        flushTicker(maxTicks = 100) {
            let ticks = 0;
            while (queuedTicks.length > 0 && ticks < maxTicks) {
                ticks += 1;
                const next = queuedTicks.shift()!;
                next.fn.call(next.context);
            }
        },
    };
}

beforeEach(() => {
    PixiProvider.init(PixiProvider.fallbacks);
});

describe('ButtonStore interactions', () => {
    it('renders into a root container on kickoff', () => {
        const {app, flushTicker} = createMockApp();
        const button = new ButtonStore({
            variant: BTYPE_BASE,
            label: 'Hello',
        }, {
            app,
            handlers: {},
            styleTree: [],
            styleDef: [],
        });

        button.kickoff();
        flushTicker();

        expect(button.container).toBeDefined();
        expect(button.container?.children.length).toBeGreaterThan(0);

        button.cleanup();
    });

    it('toggles hover through the current status API', () => {
        const {app, flushTicker} = createMockApp();
        const button = new ButtonStore({
            variant: BTYPE_BASE,
            label: 'Hover',
        }, {
            app,
            handlers: {},
            styleTree: [],
            styleDef: [],
        });

        button.kickoff();
        flushTicker();

        expect(button.hasStatus('hover')).toBe(false);
        button.onPointerOver();
        expect(button.hasStatus('hover')).toBe(true);
        button.onPointerOut();
        expect(button.hasStatus('hover')).toBe(false);

        button.cleanup();
    });

    it('suppresses hover and click while disabled', () => {
        const {app, flushTicker} = createMockApp();
        const click = vi.fn();
        const button = new ButtonStore({
            variant: BTYPE_BASE,
            label: 'Disabled',
        }, {
            app,
            handlers: {click},
            styleTree: [],
            styleDef: [],
        });

        button.kickoff();
        flushTicker();

        button.setStatus('disabled', true);
        button.onPointerOver();
        button.onPointerTap();

        expect(button.hasStatus('disabled')).toBe(true);
        expect(button.hasStatus('hover')).toBe(false);
        expect(click).not.toHaveBeenCalled();

        button.setStatus('disabled', false);
        button.onPointerOver();
        button.onPointerTap();

        expect(button.hasStatus('hover')).toBe(true);
        expect(click).toHaveBeenCalledTimes(1);

        button.cleanup();
    });
});
