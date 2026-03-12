import dragDecorator from './dragDecorator.js';
import type {
    DragTargetDecoratorOptions,
    DragTargetLike,
    ObserveDragListeners,
    PixiEventLike,
} from './type.js';

/**
 * @deprecated Use dragDecorator(...) from './dragDecorator.js' instead.
 *
 * Compatibility behavior:
 * - Supports legacy `listeners: { ... }` nesting.
 * - Supports new top-level listener callbacks.
 */
export function dragTargetDecorator<
    PtrEvent extends PixiEventLike = PixiEventLike,
    DragContext = unknown,
    DragTarget extends DragTargetLike = DragTargetLike,
>(
    options: DragTargetDecoratorOptions<PtrEvent, DragContext, DragTarget> = {},
) {
    const legacyListeners = (options.listeners ?? {}) as ObserveDragListeners<PtrEvent, DragContext, DragTarget>;
    return dragDecorator<PtrEvent, DragContext, DragTarget>({
        ...legacyListeners,
        ...options,
        onStart: options.onStart ?? legacyListeners.onStart,
        onMove: options.onMove ?? legacyListeners.onMove,
        onUp: options.onUp ?? legacyListeners.onUp,
        onBlocked: options.onBlocked ?? legacyListeners.onBlocked,
        onError: options.onError ?? legacyListeners.onError,
    });
}

/**
 * @deprecated Use dragTarget exported from './dragDecorator.js' instead.
 */
export const dragTarget = dragTargetDecorator;

export default dragTargetDecorator;
