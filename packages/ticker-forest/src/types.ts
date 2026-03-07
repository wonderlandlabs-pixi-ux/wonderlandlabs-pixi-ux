import type {Application, Container, Point, Ticker} from 'pixi.js';
import type {BehaviorSubject, Observable} from 'rxjs';
import type {DirtyOnScale} from './DirtyOnScale.js';

export interface DirtyOnScaleOptions {
    watchX?: boolean;
    watchY?: boolean;
    epsilon?: number;
}

export type DirtyOnScaleInput = boolean | DirtyOnScaleOptions | DirtyOnScale;

export interface TickerForestConfig {
    app?: Application;
    ticker?: Ticker;
    container?: Container;
    dirtyOnScale?: DirtyOnScaleInput;
}

export type ScalePoint = Point;

export type DirtyProps = {
    state$: BehaviorSubject<boolean>;
    stream$: Observable<boolean>;
};

export type MaybeScaleBinding = {
    container: Container | undefined;
    ticker: Ticker | undefined;
};

export type ScaleBinding = {
    container: Container;
    ticker: Ticker;
};
