import {BehaviorSubject, filter, Subject, Subscription} from 'rxjs';
import type {DebugListener, DragOwner, PixiApplicationLike, PixiEventLike, PixiEventTargetLike, VoidFn,} from './type';
import {POINTER_EVT_DOWN, POINTER_EVT_MOVE, POINTER_EVT_UP} from './constants';

const appPointerSubject: WeakMap<object, BehaviorSubject<DragOwner>> = new WeakMap();

export default function observeDrag<PtrEvent extends PixiEventLike = PixiEventLike>(
    app: PixiApplicationLike<PtrEvent>
) {
    if (!appPointerSubject.has(app)) {
        appPointerSubject.set(app, new BehaviorSubject<DragOwner>(null));
    }
    const downPointerId$ = appPointerSubject.get(app)!;

    /**
     *
     * @param target
     * @param dragSubject
     * @param debug
     */
    function observeDragSubscriber(
        target: PixiEventTargetLike<PtrEvent>,
        dragSubject: Subject<PtrEvent>, debug?: Map<string, DebugListener>
    ) {
        let terminate: VoidFn | undefined = undefined;

        /**
         * The "Main Trigger": for each down, dynaically add listeners for move and up
         * and use subscribe to pipe them
         * @param downEvent
         */
        function handlePointerDown(downEvent: PtrEvent) {
            let watchPointerIdSub: Subscription | undefined = undefined;

            if (downPointerId$.value !== null) {
                debug?.get('pid$.terminate-early')?.(downPointerId$.value)
                return;
            }
            downPointerId$.next(downEvent.pointerId);

            const move$: Subject<PtrEvent> = new Subject();
            if (debug?.has('move$')) {
                move$.subscribe(debug.get('move$'));
            }
            move$.pipe(filter(
                (moveEvent: PtrEvent) => moveEvent.pointerId === downEvent.pointerId)
            ).subscribe(dragSubject);

            function handlePointerMove(onMoveEvent: PtrEvent) {
                move$.next(onMoveEvent);
            }

            terminate = (...args: unknown[]) => {
                const reason = args[0];
                app.stage.removeEventListener(POINTER_EVT_MOVE, handlePointerMove);
                app.stage.removeEventListener(POINTER_EVT_UP, handlePointerUp);
                terminate = undefined;
                watchPointerIdSub?.unsubscribe();
                watchPointerIdSub = undefined;
                downPointerId$.next(null);
                debug?.get('terminate')?.(reason);
            }

            /**
             * crazy-time borderline condition -
             * if for any reason the pointerId strays from the seed event,
             * terminate
             */
            watchPointerIdSub = downPointerId$.pipe(filter((pid) => pid !== downEvent.pointerId)).subscribe({
                next() {
                    terminate?.('pointerId changed');
                }
            });

            function handlePointerUp(upEvent: PtrEvent) {
                if (upEvent.pointerId === downEvent.pointerId) {
                    move$.complete();
                }
            }

            move$.subscribe({
                complete() {
                    terminate?.('move$ complete');
                }
            });


            app.stage.addEventListener(POINTER_EVT_MOVE, handlePointerMove);
            app.stage.addEventListener(POINTER_EVT_UP, handlePointerUp);

        }

        target.addEventListener(POINTER_EVT_DOWN, handlePointerDown);

        return {
            unsubscribe() {
                terminate?.();
                target.removeEventListener(POINTER_EVT_DOWN, handlePointerDown);
            }
        }
    }

    return observeDragSubscriber;
}
