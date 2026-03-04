import {z} from 'zod';
import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import {Application, Container, FederatedPointerEvent, Point} from 'pixi.js';
// Schema for drag state
const DragStoreSchema = z.object({
    isDragging: z.boolean().default(false),
    draggedItemId: z.string().nullable().default(null),
    startX: z.number().default(0),
    startY: z.number().default(0),
    currentX: z.number().default(0),
    currentY: z.number().default(0),
    deltaX: z.number().default(0),
    deltaY: z.number().default(0),
    initialItemX: z.number().default(0),
    initialItemY: z.number().default(0),
    isDragEnding: z.boolean().default(false),
    dirty: z.boolean().default(false),
});

export type DragStoreValue = z.infer<typeof DragStoreSchema>;

export interface DragCallbacks {
    onDragStart?: (itemId: string, x: number, y: number) => void;
    onDrag?: (state: DragStoreValue) => void;
    onDragEnd?: () => void;
}

export interface DragStoreConfig {
    app: Application;
    callbacks?: DragCallbacks;
}

export class DragStore extends TickerForest<DragStoreValue> {
    private callbacks: DragCallbacks = {};
    #app: Application;
    #terminate: () => void = () => {};
    #pointerCoordsFromEvent = (event: FederatedPointerEvent) => ({x: event.global.x, y: event.global.y});

    constructor(config: DragStoreConfig) {
        super(
            {
                value: {
                    isDragging: false,
                    draggedItemId: null,
                    startX: 0,
                    startY: 0,
                    currentX: 0,
                    currentY: 0,
                    deltaX: 0,
                    deltaY: 0,
                    initialItemX: 0,
                    initialItemY: 0,
                    isDragEnding: false,
                    dirty: false,
                },
            },
            { app: config.app }
        );

        this.#app = config.app;

        if (config.callbacks) {
            this.callbacks = config.callbacks;
        }

        this.mutate((draft) => {
            draft.dirty = true;
        });
        this.kickoff();
    }

    // TickerForest abstract methods implementation
    protected isDirty(): boolean {
        return this.value.dirty;
    }

    protected clearDirty(): void {
        this.mutate((draft) => {
            draft.dirty = false;
        });
    }

    protected resolve(): void {
        if (!this.isDirty()) {
            return;
        }

        const state = this.value;

        if (!state.draggedItemId) {
            return;
        }

        // If dragging has ended, call onDragEnd
        if (!state.isDragging) {
            this.callbacks.onDragEnd?.();
        } else {
            // Dragging is active - call onDrag
            // Check if this is drag start (delta is still 0)
            if (state.deltaX === 0 && state.deltaY === 0) {
                this.callbacks.onDragStart?.(state.draggedItemId, state.startX, state.startY);
            } else {
                // Ongoing drag - communicate current position
                this.callbacks.onDrag?.(state);
            }
        }

        this.clearDirty();
    }

    /**
     * Set callbacks for drag events
     */
    setCallbacks(callbacks: DragCallbacks) {
        this.callbacks = {...this.callbacks, ...callbacks};
    }

    startDragContainer(itemId: string, event: FederatedPointerEvent, target: {position: Point}) {
        const parent = target instanceof Container ? target.parent : undefined;
        if (!parent) {
            this.startDrag(
                itemId,
                event.global.x,
                event.global.y,
                target.position.x,
                target.position.y
            );
            return;
        }

        const startPoint = parent.toLocal(event.global);
        const pointerCoordsFromEvent = (pointerEvent: FederatedPointerEvent) => {
            const localPoint = parent.toLocal(pointerEvent.global);
            return {x: localPoint.x, y: localPoint.y};
        };

        this.startDrag(
            itemId,
            startPoint.x,
            startPoint.y,
            target.position.x,
            target.position.y,
            pointerCoordsFromEvent
        );
    }

    /**
     * Remove event listeners
     */
    private removeEventListeners() {
        this.#terminate();
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
        pointerCoordsFromEvent?: (event: FederatedPointerEvent) => {x: number; y: number}
    ) {
        this.removeEventListeners(); // on the off chance we have "overlapping drags" terminate any current drag.
        this.#pointerCoordsFromEvent = pointerCoordsFromEvent ?? ((event) => ({x: event.global.x, y: event.global.y}));
        this.mutate(draft => {
            draft.isDragging = true;
            draft.draggedItemId = itemId;
            draft.startX = clientX;
            draft.startY = clientY;
            draft.currentX = clientX;
            draft.currentY = clientY;
            draft.deltaX = 0;
            draft.deltaY = 0;
            draft.initialItemX = itemX;
            draft.initialItemY = itemY;
            draft.dirty = true;
        });
        this.queueResolve();

        // Create event handlers
        const onDragMove = (moveEvent: FederatedPointerEvent) => {
            const point = this.#pointerCoordsFromEvent(moveEvent);
            this.updateDrag(point.x, point.y);
        };

        const onDragEnd = () => {
            this.endDrag();
            this.removeEventListeners();
        };

        // Attach listeners to stage
        this.#app.stage.eventMode = 'static';
        this.#app.stage.on('pointermove', onDragMove);
        this.#app.stage.on('pointerup', onDragEnd);
        this.#app.stage.on('pointerupoutside', onDragEnd);

        // Store terminator that cleans up and resets itself
        this.#terminate = () => {
            this.#app.stage.off('pointermove', onDragMove);
            this.#app.stage.off('pointerup', onDragEnd);
            this.#app.stage.off('pointerupoutside', onDragEnd);
            this.#pointerCoordsFromEvent = (event) => ({x: event.global.x, y: event.global.y});
            this.#terminate = () => {};
        };
    }

    /**
     * Update drag position
     */
    updateDrag(clientX: number, clientY: number) {
        if (!this.value.isDragging || !this.value.draggedItemId) {
            return;
        }

        this.mutate(draft => {
            draft.currentX = clientX;
            draft.currentY = clientY;
            draft.deltaX = clientX - draft.startX;
            draft.deltaY = clientY - draft.startY;
            draft.dirty = true;
        });
        this.queueResolve();
    }

    /**
     * End dragging
     */
    endDrag() {
        if (!this.value.isDragging || !this.value.draggedItemId) {
            return;
        }

        // Mark dragging as ended and clear drag state
        this.mutate(draft => {
            draft.isDragging = false;
            draft.draggedItemId = null;
            draft.startX = 0;
            draft.startY = 0;
            draft.currentX = 0;
            draft.currentY = 0;
            draft.deltaX = 0;
            draft.deltaY = 0;
            draft.initialItemX = 0;
            draft.initialItemY = 0;
            draft.dirty = true;
        });
        this.queueResolve();
    }

    /**
     * Cancel dragging without triggering onDragEnd
     */
    cancelDrag() {
        this.removeEventListeners();
        this.mutate(draft => {
            draft.isDragging = false;
            draft.draggedItemId = null;
            draft.startX = 0;
            draft.startY = 0;
            draft.currentX = 0;
            draft.currentY = 0;
            draft.deltaX = 0;
            draft.deltaY = 0;
            draft.initialItemX = 0;
            draft.initialItemY = 0;
            draft.dirty = true;
        });
        this.queueResolve();
    }

    /**
     * Cleanup method to remove all event listeners
     */
    destroy() {
        this.removeEventListeners();
    }

    /**
     * Get the current dragged item position
     */
    getCurrentItemPosition(): { x: number; y: number } | null {
        if (!this.value.isDragging) {
            return null;
        }

        return {
            x: this.value.initialItemX + this.value.deltaX,
            y: this.value.initialItemY + this.value.deltaY,
        };
    }

    /**
     * Check if a specific item is being dragged
     */
    isItemDragging(itemId: string): boolean {
        return this.value.isDragging && this.value.draggedItemId === itemId;
    }
}
