import {describe, expect, it} from 'vitest';
import type {StoreParams} from '@wonderlandlabs/forestry4';
import type {Container} from 'pixi.js';
import {TickerForest} from '../src/TickerForest';
import {createMockApplication, MockContainer, MockTicker} from './mocks';

type TestValue = {
    value: number;
};

class TestTickerForest extends TickerForest<TestValue> {
    resolveCount = 0;

    constructor(args: StoreParams<TestValue>, config: ConstructorParameters<typeof TickerForest<TestValue>>[1]) {
        super(args, config);
    }

    protected resolve(): void {
        this.resolveCount += 1;
    }
}

describe('TickerForest', () => {
    it('does not resolve until ticker churns after dirty calls', () => {
        const ticker = new MockTicker();
        const store = new TestTickerForest({value: {value: 1}}, {ticker: ticker.asTicker()});

        store.dirty();
        store.dirty();
        store.dirty();
        expect(store.resolveCount).toBe(0);

        ticker.tick();
        expect(store.resolveCount).toBe(1);

        store.cleanup();
    });

    it('coalesces multiple dirty calls into one resolve', () => {
        const ticker = new MockTicker();
        const store = new TestTickerForest({value: {value: 1}}, {ticker: ticker.asTicker()});

        store.dirty();
        store.dirty();
        store.dirty();

        ticker.tick();
        expect(store.resolveCount).toBe(1);

        store.cleanup();
    });

    it('does not resolve multiple times across multiple ticks from one dirty call', () => {
        const ticker = new MockTicker();
        const store = new TestTickerForest({value: {value: 1}}, {ticker: ticker.asTicker()});

        store.dirty();
        ticker.tick();
        ticker.tick();
        ticker.tick();

        expect(store.resolveCount).toBe(1);

        store.cleanup();
    });

    it('can run from a mock app ticker', () => {
        const ticker = new MockTicker();
        const app = createMockApplication(ticker);
        const store = new TestTickerForest({value: {value: 1}}, app);

        store.dirty();
        ticker.tick();

        expect(store.resolveCount).toBe(1);

        store.cleanup();
    });

    it('does not trigger dirty from scale changes when dirtyOnScale watch is disabled', () => {
        const ticker = new MockTicker();
        let scaleX = 1;
        let scaleY = 1;

        const root = new MockContainer({
            toLocal: ({x, y}) => ({x: x * scaleX, y: y * scaleY}),
        });
        const container = new MockContainer({
            parent: root,
            toGlobal: ({x, y}) => ({x, y}),
        });

        const store = new TestTickerForest(
            {value: {value: 1}},
            {
                ticker: ticker.asTicker(),
                container: container as unknown as Container,
                dirtyOnScale: {watchX: false, watchY: false},
            },
        );

        ticker.tick();
        scaleX = 2;
        scaleY = 3;
        ticker.tick();
        ticker.tick();

        expect(store.resolveCount).toBe(0);

        store.cleanup();
    });
});
