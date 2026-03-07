import type {PixiEventName} from './constants';

export type {PixiEventName} from './constants';

export interface PixiEventLike {
    pointerId: number;
}

export interface PixiEventTargetLike<TEvent extends PixiEventLike = PixiEventLike> {
    addEventListener(type: PixiEventName, listener: (event: TEvent) => void): void;
    removeEventListener(type: PixiEventName, listener: (event: TEvent) => void): void;
}

export interface PixiApplicationLike<TEvent extends PixiEventLike = PixiEventLike> {
    stage: PixiEventTargetLike<TEvent>;
}

export type DragOwner = number | null;
export type VoidFn = (...args: unknown[]) => void;
export type DebugListener = (context: unknown) => void;
