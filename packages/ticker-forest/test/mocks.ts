import {Point, type Application, type Ticker} from 'pixi.js';
import {fromEventPattern, type Observable} from 'rxjs';

type TickerListener = {
    fn: (ticker: Ticker) => void;
    context?: unknown;
    once: boolean;
};

export class MockTicker {
    #listeners: TickerListener[] = [];
    #tickListeners = new Set<(ticker: Ticker) => void>();

    add(fn: (ticker: Ticker) => void, context?: unknown): this {
        this.#listeners.push({fn, context, once: false});
        return this;
    }

    addOnce(fn: (ticker: Ticker) => void, context?: unknown): this {
        this.#listeners.push({fn, context, once: true});
        return this;
    }

    remove(fn: (ticker: Ticker) => void, context?: unknown): this {
        this.#listeners = this.#listeners.filter((listener) => !(listener.fn === fn && listener.context === context));
        return this;
    }

    tick(): void {
        const snapshot = [...this.#listeners];

        for (const listener of snapshot) {
            const stillActive = this.#listeners.includes(listener);
            if (!stillActive) {
                continue;
            }
            if (listener.once) {
                this.#listeners = this.#listeners.filter((entry) => entry !== listener);
            }
            listener.fn.call(listener.context, this as unknown as Ticker);
        }

        for (const listener of this.#tickListeners) {
            listener(this as unknown as Ticker);
        }
    }

    onTick(listener: (ticker: Ticker) => void): void {
        this.#tickListeners.add(listener);
    }

    offTick(listener: (ticker: Ticker) => void): void {
        this.#tickListeners.delete(listener);
    }

    tick$(): Observable<Ticker> {
        return fromEventPattern<Ticker>(
            (handler) => this.onTick(handler as (ticker: Ticker) => void),
            (handler) => this.offTick(handler as (ticker: Ticker) => void),
        );
    }

    asTicker(): Ticker {
        return this as unknown as Ticker;
    }
}

export function createMockApplication(ticker = new MockTicker()): Application {
    return {
        ticker: ticker.asTicker(),
        renderer: {},
    } as unknown as Application;
}

type PointLike = { x: number; y: number };
type PointResolver = Partial<Record<string, PointLike>> | ((point: PointLike) => PointLike | undefined);

function pointKey(point: PointLike): string {
    return `${point.x},${point.y}`;
}

function resolvePoint(resolver: PointResolver | undefined, point: PointLike): PointLike {
    if (!resolver) {
        return point;
    }
    if (typeof resolver === 'function') {
        return resolver(point) ?? point;
    }
    return resolver[pointKey(point)] ?? point;
}

export class MockContainer {
    parent?: MockContainer;
    readonly #toGlobalResolver?: PointResolver;
    readonly #toLocalResolver?: PointResolver;

    constructor(args: { parent?: MockContainer; toGlobal?: PointResolver; toLocal?: PointResolver } = {}) {
        this.parent = args.parent;
        this.#toGlobalResolver = args.toGlobal;
        this.#toLocalResolver = args.toLocal;
    }

    toGlobal(point: PointLike): Point {
        const resolved = resolvePoint(this.#toGlobalResolver, point);
        return new Point(resolved.x, resolved.y);
    }

    toLocal(point: PointLike): Point {
        const resolved = resolvePoint(this.#toLocalResolver, point);
        return new Point(resolved.x, resolved.y);
    }
}

export function createScaledContainerPair(scaleX: number, scaleY: number): {
    root: MockContainer;
    container: MockContainer;
} {
    const root = new MockContainer({
        toLocal: ({x, y}) => ({x: x * scaleX, y: y * scaleY}),
    });

    const container = new MockContainer({
        parent: root,
        toGlobal: ({x, y}) => ({x, y}),
    });

    return {root, container};
}
