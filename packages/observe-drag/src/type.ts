import type {PixiEventName} from './constants.js';

export type {PixiEventName} from './constants.js';

export interface PixiEventLike {
    pointerId: number;
}

export interface PixiEventTargetLike<TEvent extends PixiEventLike = PixiEventLike> {
    addEventListener?(type: PixiEventName, listener: (event: TEvent) => void): void;
    removeEventListener?(type: PixiEventName, listener: (event: TEvent) => void): void;
    on?(type: PixiEventName, listener: (event: TEvent) => void): void;
    off?(type: PixiEventName, listener: (event: TEvent) => void): void;
}

export interface PixiApplicationLike<TEvent extends PixiEventLike = PixiEventLike> {
    stage: PixiEventTargetLike<TEvent>;
    render?(): void;
}

export type DragOwner = number | null;
export type VoidFn = (...args: unknown[]) => void;
export type ObserveDragDebugFn = (source: string, message: string, data?: unknown) => void;
export type ActivePointerLike = {value: DragOwner; next(value: DragOwner): void};
export type DragPoint = {x: number; y: number};
export type PositionLike = DragPoint & {set?(x: number, y: number): void};
export type ParentLocalSpaceLike = {toLocal?(point: DragPoint): DragPoint};
export type DragTargetLike = {position: PositionLike; parent?: ParentLocalSpaceLike | null};
export type ResolveDragPointFn<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragTarget extends DragTargetLike = DragTargetLike,
> = (event: PtrEvent, dragTarget?: DragTarget) => DragPoint | undefined;

export type ObserveDragPhase = 'onStart' | 'onMove' | 'onUp' | 'onBlocked' | 'internal';

export interface ObserveDragFactoryOptions<TEvent extends PixiEventLike = PixiEventLike> {
    /**
     * Optional shared pointer lock. Provide this to serialize drags across
     * multiple factories/stages; otherwise lock scope defaults to this factory instance.
     */
    activePointer$?: ActivePointerLike;
    /**
     * Optional explicit stage. Use this when you want to omit the app argument and pass only event target context.
     */
    stage?: PixiEventTargetLike<TEvent>;
    /**
     * Optional app used for stage inference and throttled render requests during active drag.
     */
    app?: PixiApplicationLike<TEvent>;
    /**
     * Optional render throttle in milliseconds. Default is 30ms.
     */
    renderThrottleMs?: number;
}

export interface ObserveDragListeners<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget = unknown,
> {
    onStart?(downEvent: PtrEvent, dragTarget?: DragTarget): DragContext;
    onMove?(moveEvent: PtrEvent, context: DragContext, dragTarget?: DragTarget): void;
    onUp?(terminalEvent: PtrEvent, context: DragContext, dragTarget?: DragTarget): void;
    onBlocked?(downEvent: PtrEvent, dragTarget?: DragTarget): void;
    onError?(error: unknown, phase: ObserveDragPhase, event?: PtrEvent, dragTarget?: DragTarget): void;
}

export interface ObserveDragSubscriptionOptions<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget = unknown,
> {
    dragTarget?: DragTarget;
    getDragTarget?(downEvent: PtrEvent, context: DragContext | undefined): DragTarget | undefined;
    /**
     * Failsafe inactivity timeout in milliseconds.
     * Set to `0` to disable the inactivity watchdog.
     */
    abortTime?: number;
    debug?: ObserveDragDebugFn;
}

export interface DragDecoratorOptions<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget extends DragTargetLike = DragTargetLike,
> extends ObserveDragListeners<PtrEvent, DragContext, DragTarget> {
    transformPoint?(point: DragPoint, event: PtrEvent, context: DragContext | undefined, dragTarget?: DragTarget): DragPoint;
    resolvePoint?: ResolveDragPointFn<PtrEvent, DragTarget>;
    moveTarget?: boolean;
}

/**
 * @deprecated Use DragDecoratorOptions with top-level callbacks.
 */
export interface DragTargetDecoratorOptions<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget extends DragTargetLike = DragTargetLike,
> extends DragDecoratorOptions<PtrEvent, DragContext, DragTarget> {
    listeners?: ObserveDragListeners<PtrEvent, DragContext, DragTarget>;
}
