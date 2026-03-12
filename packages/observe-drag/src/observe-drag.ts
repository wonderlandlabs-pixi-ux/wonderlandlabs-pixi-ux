import type {
    ObserveDragFactoryOptions,
    ObserveDragListeners,
    ObserveDragPhase,
    ObserveDragSubscriptionOptions,
    PixiEventLike,
    PixiEventTargetLike,
} from './type.js';
import {
    POINTER_EVT_CANCEL,
    POINTER_EVT_DOWN,
    POINTER_EVT_MOVE,
    POINTER_EVT_UP,
    POINTER_EVT_UP_OUTSIDE,
} from './constants.js';
import {
    addListener,
    parseSubscriptionOptions,
    removeListener,
    resolveFactoryInputs,
} from './helpers.js';

export default function dragObserverFactory<PtrEvent extends PixiEventLike = PixiEventLike>(
    factoryOptions: ObserveDragFactoryOptions<PtrEvent> = {},
) {
    const {stageTarget, activePointer$, renderHelperFactory} = resolveFactoryInputs(factoryOptions);

    function observeDragSubscriber<DragContext = undefined, DragTarget = undefined>(
        target: PixiEventTargetLike<PtrEvent>,
        listeners: ObserveDragListeners<PtrEvent, DragContext, DragTarget> =
            {} as ObserveDragListeners<PtrEvent, DragContext, DragTarget>,
        options: ObserveDragSubscriptionOptions<PtrEvent, DragContext, DragTarget> =
            {} as ObserveDragSubscriptionOptions<PtrEvent, DragContext, DragTarget>,
    ) {
        const renderHelper = renderHelperFactory();
        const {
            logDebug,
            dragTarget,
            getDragTarget,
            registerReleaseSession,
            startInactivityWatchdog,
            pulseInactivityWatchdog,
            stopInactivityWatchdog,
            destroy,
        } = parseSubscriptionOptions(options);
        let activeSession:
            | {
                pointerId: number;
                moveHandler: (event: PtrEvent) => void;
                endHandler: (event: PtrEvent) => void;
            }
            | undefined;

        function reportListenerError(
            error: unknown,
            phase: ObserveDragPhase,
            event?: PtrEvent,
            dragTarget?: DragTarget,
        ): void {
            logDebug('listener.error', {error, phase, event, dragTarget});
            if (listeners.onError) {
                listeners.onError(error, phase, event, dragTarget);
                return;
            }
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }

        const releaseSession = (reason?: unknown): void => {
            if (!activeSession) {
                stopInactivityWatchdog();
                return;
            }

            stopInactivityWatchdog();
            removeListener(stageTarget, POINTER_EVT_MOVE, activeSession.moveHandler);
            removeListener(stageTarget, POINTER_EVT_UP, activeSession.endHandler);
            removeListener(stageTarget, POINTER_EVT_UP_OUTSIDE, activeSession.endHandler);
            removeListener(stageTarget, POINTER_EVT_CANCEL, activeSession.endHandler);

            if (activePointer$.value === activeSession.pointerId) {
                activePointer$.next(null);
            }

            activeSession = undefined;
            logDebug('terminate', reason);
        };
        registerReleaseSession(releaseSession);

        const handlePointerDown = (downEvent: PtrEvent): void => {
            if (activePointer$.value !== null) {
                logDebug('pointer.busy', downEvent);
                try {
                    listeners.onBlocked?.(downEvent, dragTarget);
                } catch (error) {
                    reportListenerError(error, 'onBlocked', downEvent, dragTarget);
                }
                return;
            }

            let dragContext: DragContext | undefined = undefined;
            let resolvedDragTarget: DragTarget | undefined = dragTarget;

            try {
                const preStartDragTarget = getDragTarget?.(downEvent, undefined);
                if (preStartDragTarget !== undefined) {
                    resolvedDragTarget = preStartDragTarget;
                }
                dragContext = listeners.onStart?.(downEvent, resolvedDragTarget);
            } catch (error) {
                reportListenerError(error, 'onStart', downEvent, resolvedDragTarget);
                return;
            }

            try {
                const contextDragTarget = getDragTarget?.(downEvent, dragContext);
                if (contextDragTarget !== undefined) {
                    resolvedDragTarget = contextDragTarget;
                }
            } catch (error) {
                reportListenerError(error, 'onStart', downEvent, resolvedDragTarget);
                return;
            }

            const pointerId = downEvent.pointerId;
            activePointer$.next(pointerId);
            logDebug('down.accepted', downEvent);

            const moveHandler = (moveEvent: PtrEvent): void => {
                if (moveEvent.pointerId !== pointerId) {
                    return;
                }
                pulseInactivityWatchdog();
                logDebug('pointer.move', moveEvent);
                try {
                    listeners.onMove?.(moveEvent, dragContext as DragContext, resolvedDragTarget);
                    renderHelper.request();
                } catch (error) {
                    releaseSession('onMove error');
                    reportListenerError(error, 'onMove', moveEvent, resolvedDragTarget);
                }
            };

            const endHandler = (terminalEvent: PtrEvent): void => {
                if (terminalEvent.pointerId !== pointerId) {
                    return;
                }
                logDebug('pointer.terminal', terminalEvent);
                try {
                    listeners.onUp?.(terminalEvent, dragContext as DragContext, resolvedDragTarget);
                } catch (error) {
                    reportListenerError(error, 'onUp', terminalEvent, resolvedDragTarget);
                } finally {
                    renderHelper.now();
                    releaseSession('pointer terminal');
                }
            };

            activeSession = {
                pointerId,
                moveHandler,
                endHandler,
            };

            // Attach terminal/move listeners only after a successful onStart.
            addListener(stageTarget, POINTER_EVT_MOVE, moveHandler);
            addListener(stageTarget, POINTER_EVT_UP, endHandler);
            addListener(stageTarget, POINTER_EVT_UP_OUTSIDE, endHandler);
            addListener(stageTarget, POINTER_EVT_CANCEL, endHandler);
            startInactivityWatchdog(pointerId);
        };

        addListener(target, POINTER_EVT_DOWN, handlePointerDown);

        return {
            unsubscribe() {
                releaseSession('unsubscribe');
                removeListener(target, POINTER_EVT_DOWN, handlePointerDown);
                renderHelper.destroy();
                destroy();
            }
        };
    }

    return observeDragSubscriber;
}

export const observeDrag = dragObserverFactory;
