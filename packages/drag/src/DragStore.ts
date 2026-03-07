import {PointerManager} from '@wonderlandlabs-pixi-ux/ticker-forest';
import {Application, Container, FederatedPointerEvent, Point} from 'pixi.js';
import type {
    ActionFn,
    DragCallbacks,
    DragEventValues,
    DragRuntimeState,
    DragStoreActions,
    DragStoreConfig,
    DragStoreValue,
} from './types';

const BIND_EXCLUDE = 'next,isActive,value,complete'.split(',');
const EVT_POINTER_MOVE = 'pointermove';
const EVT_POINTER_UP = 'pointerup';
const EVT_POINTER_UP_OUTSIDE = 'pointerupoutside';
const EVT_POINTER_CANCEL = 'pointercancel';

function getAllMethodNames(target: object): string[] {
    const methods = new Set<string>();
    let current: object | null = target;
    while (current && current !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(current)) {
            if (key === 'constructor' || /^\$/.test(key)) {
                continue;
            }
            const descriptor = Object.getOwnPropertyDescriptor(current, key);
            if (descriptor && typeof descriptor.value === 'function') {
                methods.add(key);
            }
        }
        current = Object.getPrototypeOf(current);
    }
    return Array.from(methods);
}

function bindActions(target: object): Record<string, ActionFn> {
    return getAllMethodNames(target).reduce((acc, key) => {
        if (/^\$/.test(key) || BIND_EXCLUDE.includes(key)) {
            return acc;
        }
        const fn = (target as Record<string, unknown>)[key];
        if (typeof fn !== 'function') {
            return acc;
        }
        acc[key] = (...args: unknown[]) => (fn as ActionFn).apply(target, args);
        return acc;
    }, {} as Record<string, ActionFn>);
}

function globalPointerPoint(event: FederatedPointerEvent): {x: number; y: number} {
    return {x: event.global.x, y: event.global.y};
}

function pointerPointInSpace(event: FederatedPointerEvent, coordinateSpace?: Container | null): {x: number; y: number} {
    if (!coordinateSpace) {
        return globalPointerPoint(event);
    }
    const localPoint = coordinateSpace.toLocal(event.global);
    return {x: localPoint.x, y: localPoint.y};
}

export class DragStore {
    readonly $: DragStoreActions;
    readonly eventValues: DragEventValues = {
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0,
        initialItemX: 0,
        initialItemY: 0,
    };
    readonly state: DragRuntimeState = {
        listenersAttached: false,
        pointerTraceToken: null,
        coordinateSpace: null,
        resolveQueued: false,
        isDragging: false,
        draggedItemId: null,
        isDragEnding: false,
    };
    private callbacks: DragCallbacks = {};
    #app: Application;

    constructor(config: DragStoreConfig) {
        this.$ = bindActions(this) as DragStoreActions;
        this.#app = config.app;
        this.callbacks = config.callbacks ?? {};
    }

    get value(): DragStoreValue {
        return {
            isDragging: this.state.isDragging,
            draggedItemId: this.state.draggedItemId,
            startX: this.eventValues.startX,
            startY: this.eventValues.startY,
            currentX: this.eventValues.currentX,
            currentY: this.eventValues.currentY,
            deltaX: this.eventValues.deltaX,
            deltaY: this.eventValues.deltaY,
            initialItemX: this.eventValues.initialItemX,
            initialItemY: this.eventValues.initialItemY,
            isDragEnding: this.state.isDragEnding,
        };
    }

    queueResolve(): void {
        if (this.state.resolveQueued) {
            return;
        }
        this.state.resolveQueued = true;
        this.#app.ticker.addOnce(this.$.flush, this);
    }

    flush(): void {
        this.state.resolveQueued = false;
        this.resolve();
    }

    resolve(): void {
        if (this.state.isDragEnding) {
            this.callbacks.onDragEnd?.();
            this.state.isDragEnding = false;
            return;
        }

        if (!this.state.isDragging || !this.state.draggedItemId) {
            return;
        }

        // Dragging is active - call onDrag
        // Check if this is drag start (delta is still 0)
        if (this.eventValues.deltaX === 0 && this.eventValues.deltaY === 0) {
            this.callbacks.onDragStart?.(
                this.state.draggedItemId,
                this.eventValues.startX,
                this.eventValues.startY
            );
        } else {
            // Ongoing drag - communicate current position
            this.callbacks.onDrag?.(this.value);
        }
    }

    /**
     * Set callbacks for drag events
     */
    setCallbacks(callbacks: DragCallbacks) {
        this.callbacks = {...this.callbacks, ...callbacks};
    }

    startDragContainer(
        itemId: string,
        event: FederatedPointerEvent,
        target: {position: Point},
        coordinateSpace?: Container
    ): boolean {
        const targetContainer = target instanceof Container ? target : undefined;
        const parent = targetContainer?.parent;
        const deltaSpace = coordinateSpace ?? parent;
        if (!targetContainer || !parent || !deltaSpace) {
            const pointerPoint = globalPointerPoint(event);
            return this.startDrag(
                itemId,
                pointerPoint.x,
                pointerPoint.y,
                target.position.x,
                target.position.y,
                null,
                event.pointerId
            );
        }

        const startPoint = pointerPointInSpace(event, deltaSpace);
        const targetGlobalPoint = parent.toGlobal(targetContainer.position);
        const startItemPoint = deltaSpace.toLocal(targetGlobalPoint);

        return this.startDrag(
            itemId,
            startPoint.x,
            startPoint.y,
            startItemPoint.x,
            startItemPoint.y,
            deltaSpace,
            event.pointerId
        );
    }

    terminate() {
        if (this.state.listenersAttached) {
            this.#app.stage.off(EVT_POINTER_MOVE, this.$.onDragMove);
            this.#app.stage.off(EVT_POINTER_UP, this.$.onDragEnd);
            this.#app.stage.off(EVT_POINTER_UP_OUTSIDE, this.$.onDragEnd);
            this.#app.stage.off(EVT_POINTER_CANCEL, this.$.onDragEnd);
            this.state.listenersAttached = false;
        }
        this.state.coordinateSpace = null;
        this.#releasePointerTrace();
    }

    #releasePointerTrace() {
        if (this.state.pointerTraceToken === null) {
            return;
        }
        PointerManager.singleton.endTrace(this.state.pointerTraceToken);
        this.state.pointerTraceToken = null;
    }

    /**
     * Start dragging an item
     */
    startDrag(
        itemId: string,
        clientX: number,
        clientY: number,
        itemX: number = 0,
        itemY: number = 0,
        coordinateSpace?: Container | null,
        pointerId?: number | null
    ): boolean {
        this.terminate(); // on the off chance we have "overlapping drags" terminate any current drag.
        const pointerTraceToken = PointerManager.singleton.beginTrace(`DragStore:${itemId}`, pointerId);
        if (!pointerTraceToken) {
            return false;
        }
        this.state.pointerTraceToken = pointerTraceToken;
        this.state.coordinateSpace = coordinateSpace ?? null;
        this.state.isDragging = true;
        this.state.draggedItemId = itemId;
        this.eventValues.startX = clientX;
        this.eventValues.startY = clientY;
        this.eventValues.currentX = clientX;
        this.eventValues.currentY = clientY;
        this.eventValues.deltaX = 0;
        this.eventValues.deltaY = 0;
        this.eventValues.initialItemX = itemX;
        this.eventValues.initialItemY = itemY;
        this.state.isDragEnding = false;
        this.queueResolve();

        // Attach listeners to stage
        this.#app.stage.eventMode = 'static';
        this.#app.stage.on(EVT_POINTER_MOVE, this.$.onDragMove);
        this.#app.stage.on(EVT_POINTER_UP, this.$.onDragEnd);
        this.#app.stage.on(EVT_POINTER_UP_OUTSIDE, this.$.onDragEnd);
        this.#app.stage.on(EVT_POINTER_CANCEL, this.$.onDragEnd);
        this.state.listenersAttached = true;
        return true;
    }

    onDragMove(moveEvent: FederatedPointerEvent) {
        if (!PointerManager.singleton.acceptsPointer(this.state.pointerTraceToken, moveEvent.pointerId)) {
            return;
        }
        const point = pointerPointInSpace(moveEvent, this.state.coordinateSpace);
        this.updateDrag(point.x, point.y);
    }

    onDragEnd(event: FederatedPointerEvent) {
        if (!PointerManager.singleton.acceptsPointer(this.state.pointerTraceToken, event.pointerId)) {
            return;
        }
        this.endDrag();
    }

    /**
     * Update drag position
     */
    updateDrag(clientX: number, clientY: number) {
        if (!this.state.isDragging || !this.state.draggedItemId) {
            return;
        }

        this.eventValues.currentX = clientX;
        this.eventValues.currentY = clientY;
        this.eventValues.deltaX = clientX - this.eventValues.startX;
        this.eventValues.deltaY = clientY - this.eventValues.startY;
        this.queueResolve();
    }

    /**
     * End dragging
     */
    endDrag() {
        if (!this.state.isDragging || !this.state.draggedItemId) {
            return;
        }

        // Mark dragging as ended and clear drag state
        this.state.isDragging = false;
        this.state.draggedItemId = null;
        this.eventValues.startX = 0;
        this.eventValues.startY = 0;
        this.eventValues.currentX = 0;
        this.eventValues.currentY = 0;
        this.eventValues.deltaX = 0;
        this.eventValues.deltaY = 0;
        this.eventValues.initialItemX = 0;
        this.eventValues.initialItemY = 0;
        this.state.isDragEnding = true;
        this.queueResolve();
        this.terminate();
    }

    /**
     * Cancel dragging without triggering onDragEnd
     */
    cancelDrag() {
        this.terminate();
        this.state.isDragging = false;
        this.state.draggedItemId = null;
        this.eventValues.startX = 0;
        this.eventValues.startY = 0;
        this.eventValues.currentX = 0;
        this.eventValues.currentY = 0;
        this.eventValues.deltaX = 0;
        this.eventValues.deltaY = 0;
        this.eventValues.initialItemX = 0;
        this.eventValues.initialItemY = 0;
        this.state.isDragEnding = false;
        this.queueResolve();
    }

    /**
     * Cleanup method to remove all event listeners
     */
    destroy() {
        this.cleanup();
    }

    cleanup() {
        this.terminate();
        if (this.state.resolveQueued) {
            this.#app.ticker.remove(this.$.flush, this);
            this.state.resolveQueued = false;
        }
    }

    /**
     * Get the current dragged item position
     */
    getCurrentItemPosition(): { x: number; y: number } | null {
        if (!this.state.isDragging) {
            return null;
        }

        return {
            x: this.eventValues.initialItemX + this.eventValues.deltaX,
            y: this.eventValues.initialItemY + this.eventValues.deltaY,
        };
    }

    /**
     * Check if a specific item is being dragged
     */
    isItemDragging(itemId: string): boolean {
        return this.state.isDragging && this.state.draggedItemId === itemId;
    }
}
