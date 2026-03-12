import type {
    DragDecoratorOptions,
    DragPoint,
    DragTargetLike,
    ObserveDragListeners,
    PixiEventLike,
    ResolveDragPointFn,
} from './type.js';

type DecoratedContext<DragContext> = {
    userContext: DragContext | undefined;
    startPointer: DragPoint | undefined;
    startTarget: DragPoint | undefined;
};

function defaultPointFromEvent<PtrEvent extends PixiEventLike, DragTarget extends DragTargetLike>(
    event: PtrEvent,
    dragTarget?: DragTarget,
): DragPoint | undefined {
    const anyEvent = event as unknown as {
        global?: {x?: unknown; y?: unknown};
        x?: unknown;
        y?: unknown;
    };
    if (anyEvent.global && typeof anyEvent.global.x === 'number' && typeof anyEvent.global.y === 'number') {
        if (dragTarget?.parent?.toLocal) {
            const local = dragTarget.parent.toLocal({x: anyEvent.global.x, y: anyEvent.global.y});
            return {x: local.x, y: local.y};
        }
        return {x: anyEvent.global.x, y: anyEvent.global.y};
    }
    if (typeof anyEvent.x === 'number' && typeof anyEvent.y === 'number') {
        return {x: anyEvent.x, y: anyEvent.y};
    }
    return undefined;
}

function setTargetPosition<DragTarget extends DragTargetLike>(dragTarget: DragTarget, point: DragPoint): void {
    if (typeof dragTarget.position.set === 'function') {
        dragTarget.position.set(point.x, point.y);
        return;
    }
    dragTarget.position.x = point.x;
    dragTarget.position.y = point.y;
}

export function dragDecorator<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget extends DragTargetLike = DragTargetLike,
>(
    options: DragDecoratorOptions<PtrEvent, DragContext, DragTarget> = {},
): ObserveDragListeners<PtrEvent, DecoratedContext<DragContext>, DragTarget> {
    const {
        onStart,
        onMove,
        onUp,
        onBlocked,
        onError,
        transformPoint,
        resolvePoint = defaultPointFromEvent as ResolveDragPointFn<PtrEvent, DragTarget>,
        moveTarget = true,
    } = options;

    return {
        onStart(downEvent: PtrEvent, dragTarget?: DragTarget) {
            const userContext = onStart?.(downEvent, dragTarget);
            const startPointer = resolvePoint(downEvent, dragTarget);
            const startTarget = dragTarget
                ? {x: dragTarget.position.x, y: dragTarget.position.y}
                : undefined;

            return {
                userContext,
                startPointer,
                startTarget,
            };
        },
        onMove(moveEvent: PtrEvent, context: DecoratedContext<DragContext>, dragTarget?: DragTarget) {
            if (moveTarget && dragTarget && context.startPointer && context.startTarget) {
                const point = resolvePoint(moveEvent, dragTarget);
                if (point) {
                    const rawPoint = {
                        x: context.startTarget.x + (point.x - context.startPointer.x),
                        y: context.startTarget.y + (point.y - context.startPointer.y),
                    };
                    const nextPoint = transformPoint
                        ? transformPoint(rawPoint, moveEvent, context.userContext, dragTarget)
                        : rawPoint;
                    setTargetPosition(dragTarget, nextPoint);
                }
            }
            onMove?.(moveEvent, context.userContext as DragContext, dragTarget);
        },
        onUp(upEvent: PtrEvent, context: DecoratedContext<DragContext>, dragTarget?: DragTarget) {
            onUp?.(upEvent, context.userContext as DragContext, dragTarget);
        },
        onBlocked(blockedEvent: PtrEvent, dragTarget?: DragTarget) {
            onBlocked?.(blockedEvent, dragTarget);
        },
        onError(error: unknown, phase, event, dragTarget?: DragTarget) {
            onError?.(error, phase, event, dragTarget);
        },
    };
}

export const dragTarget = dragDecorator;
export default dragDecorator;
