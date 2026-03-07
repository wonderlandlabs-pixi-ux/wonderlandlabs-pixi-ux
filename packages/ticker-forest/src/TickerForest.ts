import {Forest, StoreParams} from '@wonderlandlabs/forestry4';
import {Application, Container, Point, Ticker} from 'pixi.js';
import {BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, pairwise, Subscription} from 'rxjs';
import {
    compareScalePoints,
    inverseScalePoint,
    isPixiApplication,
    isScaleBinding,
    isScalePoint,
    makeDirtyProps,
    readScalePoint,
} from './helpers.js';
import {DirtyOnScale} from './DirtyOnScale.js';
import type {ScalePoint, TickerForestConfig,} from './types.js';

export type {DirtyOnScaleOptions, TickerForestConfig} from './types.js';
export {DirtyOnScale} from './DirtyOnScale.js';

/** Base store for ticker-synchronized, dirty-flagged Pixi updates. */

export abstract class TickerForest<T> extends Forest<T> {
    #app?: Application;
    #ticker?: Ticker;
    #container?: Container;
    public dirtyOnScale: DirtyOnScale = DirtyOnScale.from();
    #tickerStateSubscription?: Subscription;
    #scaleSourceSubscription?: Subscription;
    #scaleDirtySubscription?: Subscription;
    #scaleTickerCleanupFn?: () => void;
    #removeTickListenerFn?: () => void;
    #containerState$ = new BehaviorSubject<Container | undefined>(undefined);
    #tickerState$ = new BehaviorSubject<Ticker | undefined>(undefined);
    #scaleState$ = new BehaviorSubject<ScalePoint | undefined>(undefined);
    protected readonly container$ = this.#containerState$.pipe(distinctUntilChanged());
    protected readonly ticker$ = this.#tickerState$.pipe(distinctUntilChanged());
    protected readonly scale$ = this.#scaleState$.asObservable();
    #dirtyProps = makeDirtyProps();
    public readonly dirty$ = this.#dirtyProps.stream$;

    constructor(args: StoreParams<T>, config: TickerForestConfig | Application = {}) {
        super(args);
        if (isPixiApplication(config)) {
            this.#app = config;
        } else {
            this.#app = config.app;
            this.#ticker = config.ticker;
            this.#container = config.container;
            this.dirtyOnScale = DirtyOnScale.from(config.dirtyOnScale);
        }
        this.#containerState$.next(this.#container);
        this.#refreshTickerState();
        this.#tickerStateSubscription = this.#tickerState$
            .pipe(filter((value) => !value))
            .subscribe(this.$.removeTickListener);
        this.#setupScaleDirtyObservers();
    }

    get application(): Application | undefined {
        const parent = this.$parent;
        if (this.#app) {
            return this.#app;
        }
        if (parent instanceof TickerForest) {
            return parent.application;
        }
        return undefined;
    }

    set application(app: Application | undefined) {
        this.#app = app;
        this.#refreshTickerState();
    }

    get app(): Application | undefined {
        return this.application;
    }

    set app(app: Application | undefined) {
        this.application = app;
    }

    get container(): Container | undefined {
        return this.#container;
    }

    set container(container: Container | undefined) {
        this.#container = container;
        this.#containerState$.next(container);
    }

    #resolveParentTicker(): Ticker | undefined {
        const parent = this.$parent as unknown as {
            ticker?: Ticker;
            container?: { ticker?: Ticker };
        } | undefined;
        return parent?.ticker ?? parent?.container?.ticker;
    }

    #resolveTickerForState(): Ticker | undefined {
        return this.#ticker ?? this.#app?.ticker ?? this.#resolveParentTicker();
    }

    #refreshTickerState(): void {
        const resolved = this.#resolveTickerForState();
        if (this.#tickerState$.value !== resolved) {
            this.#tickerState$.next(resolved);
        }
    }

    get ticker(): Ticker {
        const ticker = this.#tickerState$.value;
        if (ticker) {
            return ticker;
        }
        throw new Error(
            `${this.constructor.name}: ticker is unavailable (expected config.ticker, config.app.ticker, parent.ticker, or parent.container.ticker)`,
        );
    }

    set ticker(ticker: Ticker | undefined) {
        this.#ticker = ticker;
        this.#refreshTickerState();
    }

    protected get isDirty(): boolean {
        return this.#dirtyProps.state$.value;
    }

    protected set isDirty(next: boolean) {
        if (this.#dirtyProps.state$.value === next) {
            return;
        }
        this.#dirtyProps.state$.next(next);
    }

    get #removeTickListener(): (() => void) | undefined {
        return this.#removeTickListenerFn;
    }

    set #removeTickListener(next: (() => void) | undefined) {
        this.#removeTickListenerFn?.();
        this.#removeTickListenerFn = next;
    }

    get #scaleTickerCleanup(): (() => void) | undefined {
        return this.#scaleTickerCleanupFn;
    }

    set #scaleTickerCleanup(next: (() => void) | undefined) {
        this.#scaleTickerCleanupFn?.();
        this.#scaleTickerCleanupFn = next;
    }

    public removeTickListener(): void {
        this.#removeTickListener = undefined;
    }

    #clean(): void {
        this.isDirty = false;
        this.removeTickListener();
    }

    public dirty(): void {
        if (this.isDirty) {
            return;
        }
        this.isDirty = true;
        const ticker = this.ticker;
        this.removeTickListener();
        ticker.addOnce(this.$.onTick, this);
        this.#removeTickListener = () => {
            ticker.remove(this.$.onTick, this);
        };
    }

    kickoff(): void {
        this.dirty();
    }

    #teardownScaleTickerSource(): void {
        this.#scaleTickerCleanup = undefined;
    }

    #setupScaleDirtyObservers(): void {
        const self = this;

        self.#scaleSourceSubscription = combineLatest([
            self.container$,
            self.ticker$,
        ]).pipe(
            map(([container, ticker]) => ({
                container,
                ticker,
            })),
            filter(isScaleBinding),
        ).subscribe((binding) => {
            self.#teardownScaleTickerSource();

            const onScaleTick = () => {
                if (binding.container !== self.#containerState$.value || binding.ticker !== self.#tickerState$.value) {
                    binding.ticker.remove(onScaleTick, self);
                    return;
                }
                if (!self.dirtyOnScale.enabled) {
                    return;
                }
                const scale = readScalePoint(binding.container);
                if (!scale) {
                    return;
                }
                const previous = self.#scaleState$.value;
                if (!previous || !compareScalePoints(self.dirtyOnScale, previous, scale)) {
                    self.#scaleState$.next(scale);
                }
            };

            binding.ticker.add(onScaleTick, self);
            self.#scaleTickerCleanup = () => {
                binding.ticker.remove(onScaleTick, self);
            };
        });

        self.#scaleDirtySubscription = self.scale$
            .pipe(
                pairwise(),
                filter(([previousScale, nextScale]) => {
                    if (self.isDirty) {
                        return false;
                    }
                    const prevIssValid = isScalePoint(previousScale);
                    const nextIsValid = isScalePoint(nextScale);
                    if (prevIssValid !== nextIsValid) {
                        // scale has changed - we can't compare them
                        // but they are different; we do need to re-render
                        return true;
                    } else if (!prevIssValid || !nextIsValid) {
                        // scale has been unreadable for last two cycles
                        // in most situations that means scale has not changed;
                        // do not re-render
                        return false;
                    }
                    return !compareScalePoints(self.dirtyOnScale, previousScale, nextScale);
                }),
            )
            .subscribe(self.$.dirty);
    }

    protected getScale(): ScalePoint {
        return readScalePoint(this.container) || new Point(1, 1);
    }

    protected getInverseScale(): { x: number; y: number } {
        return inverseScalePoint(this.container);
    }

    private onTick() {
        if (this.isDirty) {
            this.resolve();
            this.#clean();
        }
    };

    /** Apply pending visual updates on the ticker frame. */
    protected abstract resolve(): void;

    /** Tear down internal subscriptions and ticker listeners. */
    public cleanup(): void {
        this.#tickerStateSubscription?.unsubscribe();
        this.#tickerStateSubscription = undefined;
        this.#scaleSourceSubscription?.unsubscribe();
        this.#scaleSourceSubscription = undefined;
        this.#scaleDirtySubscription?.unsubscribe();
        this.#scaleDirtySubscription = undefined;
        this.#teardownScaleTickerSource();
        this.#clean();
        this.#containerState$.complete();
        this.#tickerState$.complete();
        this.#scaleState$.complete();
        this.#dirtyProps.state$.complete();
    }
}
