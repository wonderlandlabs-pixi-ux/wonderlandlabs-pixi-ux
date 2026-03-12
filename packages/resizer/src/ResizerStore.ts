import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import observeDrag from '@wonderlandlabs-pixi-ux/observe-drag';
import {Container, FederatedPointerEvent, Graphics, Rectangle} from 'pixi.js';
import type {
    Color,
    MinSize,
    ResizerStoreConfig,
    ResizerStoreValue,
    TrackDragResult,
} from './types.js';
import {HandleMode, HandlePosition} from './types.js';
import type {Rect} from './rectTypes.js';
import {RectSchema} from './rectTypes.js';

const RECT_KEYS = ['x', 'y', 'width', 'height'];

function rectDiff(r1: unknown, r2: unknown) {
    try {
        const rect1 = RectSchema.parse(r1);
        const rect2 = RectSchema.parse(r2);
        // @ts-ignore
        return RECT_KEYS.every((key) => rect1[key] === rect2[key]);
    } catch (err) {
        return false;
    }
}

/**
 * Forestry-based state store for resize handles.
 * Uses TickerForest to synchronize PixiJS operations with the ticker loop.
 */
export class ResizerStore extends TickerForest<ResizerStoreValue> {
    #targetContainer: Container;
    private stage?: Container;
    private drawRect?: (rect: Rectangle, container: Container) => void;
    private onRelease?: (rect: Rectangle) => void;
    private size: number;
    private color: Color;
    private constrain: boolean;
    private mode: HandleMode;
    private minSize: MinSize;

    // Drag state
    private dragHandle: HandlePosition | null = null;
    private dragStartRect: Rect | null = null;

    // Handle management
    private handles = new Map<HandlePosition, Graphics>();
    private dragTrackers = new Map<Graphics, TrackDragResult>();
    private handlesContainer: Container;
    private deltaSpace: Container;
    private ownsHandlesContainer: boolean;

    constructor(config: ResizerStoreConfig) {
        // Convert PixiJS Rectangle to ImmutRect for Immer compatibility
        super(
            {
                value: {
                    rect: RectSchema.parse(config.rect),
                    isDragging: false,
                }
            },
            {app: config.app, container: config.container}
        );

        this.#targetContainer = config.container;
        this.drawRect = config.drawRect;
        this.onRelease = config.onRelease;
        this.size = config.size ?? 12;
        this.color = config.color ?? {r: 0.2, g: 0.6, b: 1};
        this.constrain = config.constrain ?? false;
        this.mode = config.mode ?? 'ONLY_CORNER';
        this.minSize = {
            x: Math.max(0, config.minSize?.x ?? 200),
            y: Math.max(0, config.minSize?.y ?? 200),
        };

        // Get parent container for stage traversal and handle container management
        const parent = this.#targetContainer.parent;
        if (!parent) {
            throw new Error('Container must have a parent to add resize handles');
        }

        // Create or use provided handles container
        if (config.handleContainer) {
            this.handlesContainer = config.handleContainer;
            this.ownsHandlesContainer = false;
        } else {
            this.handlesContainer = new Container();
            this.handlesContainer.label = 'ResizerHandles';
            this.ownsHandlesContainer = true;
            parent.addChild(this.handlesContainer);
        }
        this.deltaSpace = config.deltaSpace ?? this.handlesContainer;

        // Find the stage (rootContainer container) for global event listeners
        this.#initHitArea();

        // Create handles
        this.createHandles();
        this.kickoff();
        this.subscribe((value) => {
            console.log('resizer value: ', JSON.stringify(value));
        })
    }

    #initHitArea() {
        this.stage = this.#targetContainer.parent ?? undefined;
        while (this.stage?.parent) {
            this.stage = this.stage.parent;
        }

        // Ensure stage has a comprehensive hit area for capturing pointer events
        if (this.stage && !this.stage?.hitArea) {
            this.stage.hitArea = new Rectangle(0, 0, 10000, 10000);
        }
    }

    protected resolve(): void {
        // Update handle positions
        this.updateHandles();
        console.log('repositioned handles')
        this.drawRect?.(this.asRect, this.#targetContainer);
    }

    /**
     * Drag start handler - bound via this.$
     */
    onDragStart(event: FederatedPointerEvent, position: HandlePosition) {
        event.stopPropagation();

        this.dragHandle = position;
        // Clone the rect using destructuring
        this.dragStartRect = {...this.value.rect};
        this.setDragging(true);
    }

    /**
     * Drag move handler - bound via this.$
     */
    onDragMove(deltaX: number, deltaY: number, event: FederatedPointerEvent) {
        event.stopPropagation();

        if (!this.dragHandle || !this.dragStartRect) {
            return;
        }
        if (!this.isHandleDragWithinSafeZone(this.dragHandle, deltaX, deltaY, this.dragStartRect)) {
            return;
        }

        const newRect = this.calculateNewRect(
            this.dragHandle,
            deltaX,
            deltaY,
            this.dragStartRect
        );

        console.log('new rect:', JSON.stringify(newRect))
        this.setRect(newRect);
        this.updateHandles();
    }

    private isHandleDragWithinSafeZone(
        position: HandlePosition,
        deltaX: number,
        deltaY: number,
        startRect: Rect
    ): boolean {
        const widthMinDelta = this.minSize.x - startRect.width;
        const widthMaxDelta = startRect.width - this.minSize.x;
        const heightMinDelta = this.minSize.y - startRect.height;
        const heightMaxDelta = startRect.height - this.minSize.y;

        switch (position) {
            case HandlePosition.TOP_LEFT:
                return deltaX <= widthMaxDelta && deltaY <= heightMaxDelta;
            case HandlePosition.TOP_CENTER:
                return deltaY <= heightMaxDelta;
            case HandlePosition.TOP_RIGHT:
                return deltaX >= widthMinDelta && deltaY <= heightMaxDelta;
            case HandlePosition.MIDDLE_RIGHT:
                return deltaX >= widthMinDelta;
            case HandlePosition.BOTTOM_RIGHT:
                return deltaX >= widthMinDelta && deltaY >= heightMinDelta;
            case HandlePosition.BOTTOM_CENTER:
                return deltaY >= heightMinDelta;
            case HandlePosition.BOTTOM_LEFT:
                return deltaX <= widthMaxDelta && deltaY >= heightMinDelta;
            case HandlePosition.MIDDLE_LEFT:
                return deltaX <= widthMaxDelta;
            default:
                return true;
        }
    }

    /**
     * Drag end handler - bound via this.$
     */
    onDragEnd(event: FederatedPointerEvent) {
        event.stopPropagation();

        let releaseRect = this.value.rect;

        this.dragHandle = null;
        this.dragStartRect = null;
        this.setDragging(false);

        // Call onRelease callback if provided
        if (this.onRelease) {
            this.onRelease(new Rectangle(releaseRect.x, releaseRect.y, releaseRect.width, releaseRect.height));
        }
    }

    get isDragging(): boolean {
        return this.value.isDragging;
    }

    get isRunning(): boolean {
        return this.value.isDragging;
    }

    private setDragging(isDragging: boolean): void {
        if (this.value.isDragging === isDragging) {
            return;
        }
        this.mutate((draft) => {
            draft.isDragging = isDragging;
        });
    }

    get asRect(): Rectangle {
        const {x, y, width, height} = this.value.rect;
        return new Rectangle(x, y, width, height);
    }

    /**
     * Get handle positions based on mode
     */
    private getHandlePositions(): HandlePosition[] {
        switch (this.mode) {
            case 'ONLY_CORNER':
                return [
                    HandlePosition.TOP_LEFT,
                    HandlePosition.TOP_RIGHT,
                    HandlePosition.BOTTOM_LEFT,
                    HandlePosition.BOTTOM_RIGHT,
                ];
            case 'ONLY_EDGE':
                return [
                    HandlePosition.TOP_CENTER,
                    HandlePosition.MIDDLE_RIGHT,
                    HandlePosition.BOTTOM_CENTER,
                    HandlePosition.MIDDLE_LEFT,
                ];
            case 'EDGE_AND_CORNER':
                return [
                    HandlePosition.TOP_LEFT,
                    HandlePosition.TOP_CENTER,
                    HandlePosition.TOP_RIGHT,
                    HandlePosition.MIDDLE_RIGHT,
                    HandlePosition.BOTTOM_RIGHT,
                    HandlePosition.BOTTOM_CENTER,
                    HandlePosition.BOTTOM_LEFT,
                    HandlePosition.MIDDLE_LEFT,
                ];
        }
    }

    /**
     * Convert color to hex
     */
    private colorToHex(color: Color): number {
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Get handle local position relative to rect
     */
    private getHandleLocalPosition(position: HandlePosition, rect?: Rect): { x: number; y: number } {
        if (!rect) {
            const rect = this.value.rect;
            if (!rect) {
                throw new Error('getHandleLocalPoisition: rect unattainable');
            }
            return this.getHandleLocalPosition(position, rect)
        }

        const {x, y, width, height} = rect;

        switch (position) {
            case HandlePosition.TOP_LEFT:
                return {x, y};
            case HandlePosition.TOP_CENTER:
                return {x: x + width / 2, y};
            case HandlePosition.TOP_RIGHT:
                return {x: x + width, y};
            case HandlePosition.MIDDLE_RIGHT:
                return {x: x + width, y: y + height / 2};
            case HandlePosition.BOTTOM_RIGHT:
                return {x: x + width, y: y + height};
            case HandlePosition.BOTTOM_CENTER:
                return {x: x + width / 2, y: y + height};
            case HandlePosition.BOTTOM_LEFT:
                return {x, y: y + height};
            case HandlePosition.MIDDLE_LEFT:
                return {x, y: y + height / 2};
            default:
                return {x, y};
        }
    }

    /**
     * Get cursor style for handle position
     */
    private getCursorForHandle(position: HandlePosition): string {
        switch (position) {
            case HandlePosition.TOP_LEFT:
            case HandlePosition.BOTTOM_RIGHT:
                return 'nwse-resize';
            case HandlePosition.TOP_RIGHT:
            case HandlePosition.BOTTOM_LEFT:
                return 'nesw-resize';
            case HandlePosition.TOP_CENTER:
            case HandlePosition.BOTTOM_CENTER:
                return 'ns-resize';
            case HandlePosition.MIDDLE_LEFT:
            case HandlePosition.MIDDLE_RIGHT:
                return 'ew-resize';
            default:
                return 'default';
        }
    }

    /**
     * Create a single handle graphic
     */
    private createHandle(position: HandlePosition): Graphics {
        const handle = new Graphics({interactive: true});
        handle.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        handle.fill(this.colorToHex(this.color));
        handle.stroke({width: 1, color: 0xffffff});

        handle.eventMode = 'static';
        handle.cursor = this.getCursorForHandle(position);
        handle.label = `Handle-${position}`;

        return handle;
    }

    /**
     * Update handle positions based on current rect
     */
    private updateHandles() {
        this.handles.forEach((handle, position) => {
            const localPos = this.getHandleLocalPosition(position);
            if (localPos.x !== handle.position.x || localPos.y !== handle.position.y) {
                console.log('shifting ', handle.position, 'to', localPos);
                handle.x = localPos.x;
                handle.y = localPos.y;
            }
        });
        this.app?.render();
    }

    /**
     * Calculate new rectangle based on drag
     */
    private calculateNewRect(
        position: HandlePosition,
        deltaX: number,
        deltaY: number,
        startRect: Rect
    ): Rect {
        // Clone the rect using spread operator
        const newRect = {...startRect};

        switch (position) {
            case HandlePosition.TOP_LEFT:
                newRect.x += deltaX;
                newRect.y += deltaY;
                newRect.width -= deltaX;
                newRect.height -= deltaY;
                break;
            case HandlePosition.TOP_CENTER:
                newRect.y += deltaY;
                newRect.height -= deltaY;
                break;
            case HandlePosition.TOP_RIGHT:
                newRect.y += deltaY;
                newRect.width += deltaX;
                newRect.height -= deltaY;
                break;
            case HandlePosition.MIDDLE_RIGHT:
                newRect.width += deltaX;
                break;
            case HandlePosition.BOTTOM_RIGHT:
                newRect.width += deltaX;
                newRect.height += deltaY;
                break;
            case HandlePosition.BOTTOM_CENTER:
                newRect.height += deltaY;
                break;
            case HandlePosition.BOTTOM_LEFT:
                newRect.x += deltaX;
                newRect.width -= deltaX;
                newRect.height += deltaY;
                break;
            case HandlePosition.MIDDLE_LEFT:
                newRect.x += deltaX;
                newRect.width -= deltaX;
                break;
        }

        // Apply constraints if enabled
        if (this.constrain && startRect.width > 0 && startRect.height > 0) {
            const aspectRatio = startRect.width / startRect.height;
            newRect.height = newRect.width / aspectRatio;
        }

        return newRect;
    }

    /**
     * Create all handles and attach drag tracking
     */
    private createHandles() {
        const observeDragApp = {stage: this.stage ?? this.#targetContainer};
        const subscribeToDown = observeDrag<FederatedPointerEvent>({
            ...observeDragApp,
            app: this.app,
        });
        const positions = this.getHandlePositions();

        positions.forEach((position) => {
            const handle = this.createHandle(position);
            this.handles.set(position, handle);
            this.handlesContainer.addChild(handle);

            const tracker = this.createHandleDragTracker(handle, position, subscribeToDown);

            this.dragTrackers.set(handle, tracker);
        });

        this.dirty();
    }

    private createHandleDragTracker(
        handle: Graphics,
        position: HandlePosition,
        subscribeToDown: ReturnType<typeof observeDrag<FederatedPointerEvent>>,
    ): TrackDragResult {
        type DragContext = {
            dragStartX: number;
            dragStartY: number;
        };

        const resolveEventPoint = (event: FederatedPointerEvent): { x: number; y: number } => {
            if (!this.deltaSpace) {
                return {x: event.global.x, y: event.global.y};
            }
            const localPoint = this.deltaSpace.toLocal(event.global);
            return {x: localPoint.x, y: localPoint.y};
        };

        const dragDownSubscription = subscribeToDown<DragContext>(handle, {
            onStart: (event) => {
                const point = resolveEventPoint(event);
                this.onDragStart(event, position);
                return {
                    dragStartX: point.x,
                    dragStartY: point.y,
                };
            },
            onMove: (event, dragContext) => {
                if (!dragContext) {
                    return;
                }
                const point = resolveEventPoint(event);
                const deltaX = point.x - dragContext.dragStartX;
                const deltaY = point.y - dragContext.dragStartY;

                this.onDragMove(deltaX, deltaY, event);
            },
            onUp: (event) => {
                this.onDragEnd(event);
            },
            onBlocked: (event) => {
                event.stopPropagation();
            },
            onError: (_error, _phase, event) => {
                event?.stopPropagation();
                this.dragHandle = null;
                this.dragStartRect = null;
                this.setDragging(false);
            },
        });

        handle.eventMode = 'static';

        return {
            destroy: () => {
                dragDownSubscription.unsubscribe();
                this.dragHandle = null;
                this.dragStartRect = null;
                this.setDragging(false);
            },
        };
    }

    /**
     * Remove all handles and cleanup
     */
    public removeHandles() {
        // Destroy all drag trackers
        this.dragTrackers.forEach((tracker) => tracker.destroy());
        this.dragTrackers.clear();

        // Remove all handles
        this.handles.forEach((handle) => {
            handle.destroy();
        });
        this.handles.clear();

        // Only destroy handles container if we created it
        if (this.ownsHandlesContainer) {
            this.handlesContainer.destroy();
        }
    }

    /**
     * Programmatically set the rectangle
     */
    public setRect(rect: Rectangle | Rect) {
        // Convert PixiJS Rectangle to ImmutRect and mark dirty
        this.mutate((draft) => {
            draft.rect = RectSchema.parse(rect);
        });
        this.dirty();
    }

    /**
     * Show or hide all resize handles
     */
    public setVisible(visible: boolean) {
        let didChange = false;
        if (this.handlesContainer.visible !== visible) {
            this.handlesContainer.visible = visible;
            didChange = true;
        }
        this.handles.forEach((handle) => {
            if (handle.visible !== visible) {
                handle.visible = visible;
                didChange = true;
            }
        });
        if (didChange) {
            this.app?.render();
        }
    }

    /**
     * Get the handle color
     */
    public getColor(): Color {
        return this.color;
    }
}
