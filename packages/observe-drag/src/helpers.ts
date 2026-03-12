import {BehaviorSubject, debounceTime, Subject, Subscription} from 'rxjs';
import {getSharedRenderHelper, type RenderHelper} from '@wonderlandlabs-pixi-ux/utils';
import {
    DEBUG_SOURCE,
    DRAG_INACTIVITY_TIMEOUT_MS,
    RENDER_THROTTLE_MS,
    WATCHDOG_PULSE,
    WATCHDOG_STOP,
    type PixiEventName,
    type WatchdogSignal,
} from './constants.js';
import type {
    ActivePointerLike,
    DragOwner,
    ObserveDragFactoryOptions,
    ObserveDragSubscriptionOptions,
    PixiApplicationLike,
    PixiEventLike,
    PixiEventTargetLike,
} from './type.js';

const moduleActivePointer$ = new BehaviorSubject<DragOwner>(null);

export type {RenderHelper};

export function resolveActivePointer(
    configuredActivePointer$?: ActivePointerLike,
): ActivePointerLike {
    if (configuredActivePointer$) {
        return configuredActivePointer$;
    }
    return moduleActivePointer$;
}

export interface ResolvedFactoryInputs<PtrEvent extends PixiEventLike = PixiEventLike> {
    stageTarget: PixiEventTargetLike<PtrEvent>;
    activePointer$: ActivePointerLike;
    renderHelperFactory: () => RenderHelper;
}

export interface ParsedSubscriptionOptions<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget = unknown,
> {
    abortTimeMs: number;
    logDebug(message: string, data?: unknown): void;
    dragTarget?: DragTarget;
    getDragTarget?(downEvent: PtrEvent, context: DragContext | undefined): DragTarget | undefined;
    registerReleaseSession(releaseSession: (reason?: unknown) => void): void;
    startInactivityWatchdog(pointerId: number): void;
    pulseInactivityWatchdog(): void;
    stopInactivityWatchdog(): void;
    destroy(): void;
}

export function resolveFactoryInputs<PtrEvent extends PixiEventLike = PixiEventLike>(
    factoryOptions: ObserveDragFactoryOptions<PtrEvent>,
): ResolvedFactoryInputs<PtrEvent> {
    const resolvedStage = factoryOptions.stage ?? factoryOptions.app?.stage;
    if (!resolvedStage) {
        throw new Error('observeDrag: stage is required (pass {stage} or {app})');
    }

    return {
        stageTarget: resolvedStage,
        activePointer$: resolveActivePointer(factoryOptions.activePointer$),
        renderHelperFactory: createRenderHelperFactory(
            factoryOptions.app,
            Math.max(0, factoryOptions.renderThrottleMs ?? RENDER_THROTTLE_MS),
        ),
    };
}

function createRenderHelperFactory<PtrEvent extends PixiEventLike = PixiEventLike>(
    app?: PixiApplicationLike<PtrEvent>,
    renderThrottleMs: number = RENDER_THROTTLE_MS,
): () => RenderHelper {
    return () => {
        return getSharedRenderHelper(app, {
            throttleMs: renderThrottleMs,
            trailing: false,
        });
    };
}

export function parseSubscriptionOptions<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget = unknown,
>(
    options: ObserveDragSubscriptionOptions<PtrEvent, DragContext, DragTarget> = {},
): ParsedSubscriptionOptions<PtrEvent, DragContext, DragTarget> {
    const debug = options.debug;
    const logDebug = (message: string, data?: unknown): void => {
        debug?.(DEBUG_SOURCE, message, data);
    };
    const abortTimeMs = Math.max(0, options.abortTime ?? DRAG_INACTIVITY_TIMEOUT_MS);

    let releaseSession: ((reason?: unknown) => void) | undefined;
    let inactivityPulse$: Subject<WatchdogSignal> | undefined;
    let inactivitySub: Subscription | undefined;

    const stopInactivityWatchdog = (): void => {
        inactivityPulse$?.next(WATCHDOG_STOP);
        inactivitySub?.unsubscribe();
        inactivitySub = undefined;
        inactivityPulse$?.complete();
        inactivityPulse$ = undefined;
    };

    const pulseInactivityWatchdog = (): void => {
        inactivityPulse$?.next(WATCHDOG_PULSE);
    };

    const startInactivityWatchdog = (pointerId: number): void => {
        if (abortTimeMs <= 0) {
            return;
        }

        stopInactivityWatchdog();
        inactivityPulse$ = new Subject<WatchdogSignal>();

        const terminate = (): void => {
            logDebug('pointer.timeout', {
                pointerId,
                timeoutMs: abortTimeMs,
            });
            releaseSession?.('pointer inactivity timeout');
        };

        inactivitySub = inactivityPulse$
            .pipe(debounceTime(abortTimeMs))
            .subscribe({
                next: (value) => value !== WATCHDOG_STOP ? terminate() : null,
                complete: () => null,
                error: terminate,
            });

        // Start "no-move" timeout from accepted pointerdown.
        inactivityPulse$.next(WATCHDOG_PULSE);
    };

    return {
        abortTimeMs,
        logDebug,
        dragTarget: options.dragTarget,
        getDragTarget: options.getDragTarget,
        registerReleaseSession(nextReleaseSession): void {
            releaseSession = nextReleaseSession;
        },
        startInactivityWatchdog,
        pulseInactivityWatchdog,
        stopInactivityWatchdog,
        destroy(): void {
            releaseSession = undefined;
            stopInactivityWatchdog();
        },
    };
}

export function addListener<PtrEvent extends PixiEventLike = PixiEventLike>(
    target: PixiEventTargetLike<PtrEvent>,
    eventName: PixiEventName,
    listener: (event: PtrEvent) => void,
): void {
    if (target.on) {
        target.on(eventName, listener);
    } else if (target.addEventListener) {
        target.addEventListener(eventName, listener);
    } else {
        throw new Error('observeDrag: event target must support addEventListener/removeEventListener or on/off');
    }
}

export function removeListener<PtrEvent extends PixiEventLike = PixiEventLike>(
    target: PixiEventTargetLike<PtrEvent>,
    eventName: PixiEventName,
    listener: (event: PtrEvent) => void,
): void {
    if (target.off) {
        target.off(eventName, listener);
    } else if (target.removeEventListener) {
        target.removeEventListener(eventName, listener);
    } else {
        throw new Error('observeDrag: event target must support addEventListener/removeEventListener or on/off');
    }
}
