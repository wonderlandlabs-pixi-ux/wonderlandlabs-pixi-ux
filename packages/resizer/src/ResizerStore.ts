import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import {Application, Container, FederatedPointerEvent, Graphics, Rectangle} from 'pixi.js';
import {distinctUntilChanged} from 'rxjs';
import {trackDrag, TrackDragResult} from './trackDrag';
import type {Color, RectTransform, RectTransformPhase, TransformedRectCallback} from './types';
import {HandleMode, HandlePosition} from './types';
import type {Rect} from './rectTypes';
import {RectSchema} from './rectTypes';

export interface ResizerStoreConfig {
    container: Container;
    rect: Rectangle;
    app: Application;
    drawRect?: (rect: Rectangle, container: Container) => void;
    onRelease?: (rect: Rectangle) => void;
    size?: number;
    color?: Color;
    constrain?: boolean;
    mode?: HandleMode;
    handleContainer?: Container;
    rectTransform?: RectTransform;
    onTransformedRect?: TransformedRectCallback;
}

/**
 * State value for ResizerStore
 */
export interface ResizerStoreValue {
    rect: Rect;
    dirty: boolean;
}

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
    private rectTransform?: RectTransform;
    private onTransformedRect?: TransformedRectCallback;

    // Drag state
    private dragHandle: HandlePosition | null = null;
    private dragStartRect: Rect | null = null;

    // Handle management
    private handles = new Map<HandlePosition, Graphics>();
    private dragTrackers = new Map<Graphics, TrackDragResult>();
    private handlesContainer: Container;
    private ownsHandlesContainer: boolean;
    private lastHandleWorldScaleX = Number.NaN;
    private lastHandleWorldScaleY = Number.NaN;

    constructor(config: ResizerStoreConfig) {
        // Convert PixiJS Rectangle to ImmutRect for Immer compatibility
        super(
            {
                value: {
                    rect: RectSchema.parse(config.rect),
                    dirty: false
                }
            },
            { app: config.app, container: config.container }
        );

        this.#targetContainer = config.container;
        this.drawRect = config.drawRect;
        this.onRelease = config.onRelease;
        this.size = config.size ?? 12;
        this.color = config.color ?? {r: 0.2, g: 0.6, b: 1};
        this.constrain = config.constrain ?? false;
        this.mode = config.mode ?? 'ONLY_CORNER';
        this.rectTransform = config.rectTransform;
        this.onTransformedRect = config.onTransformedRect;

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

        // Find the stage (rootContainer container) for global event listeners
        this.#initHitArea();

        // Create handles
        this.createHandles();
        this.ticker.add(this.$.onHandleScaleTick, this);
        this.kickoff();
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
    // TickerForest abstract methods implementation
    protected isDirty(): boolean {
        return this.value.dirty;
    }

    protected clearDirty(): void {
        this.set('dirty', false)
    }

    protected resolve(): void {
        if (!this.isDirty()) {
            return;
        }

        // Update handle positions and scales
        this.updateHandles();

        this.drawRect?.(this.asRect, this.#targetContainer);
    }

    onHandleScaleTick() {
        if (this.handles.size === 0) {
            return;
        }
        const {x, y} = this.getWorldScale(this.handlesContainer);
        const changed = Math.abs(x - this.lastHandleWorldScaleX) > Number.EPSILON
            || Math.abs(y - this.lastHandleWorldScaleY) > Number.EPSILON;
        if (changed) {
            this.updateHandles({x, y});
        }
    }

    /**
     * Drag start handler - bound via this.$
     */
    onDragStart(event: FederatedPointerEvent, position: HandlePosition) {
        event.stopPropagation();

        this.dragHandle = position;
        // Clone the rect using destructuring
        this.dragStartRect = {...this.value.rect};
    }

    /**
     * Drag move handler - bound via this.$
     */
    onDragMove(deltaX: number, deltaY: number, event: FederatedPointerEvent) {
        event.stopPropagation();

        if (!this.dragHandle || !this.dragStartRect) {
            return;
        }

        const newRect = this.calculateNewRect(
            this.dragHandle,
            deltaX,
            deltaY,
            this.dragStartRect
        );

        const dragRect = this.rectTransform ? this.applyRectTransform(newRect, 'drag') : newRect;
        this.setRect(dragRect);
    }

    /**
     * Drag end handler - bound via this.$
     */
    onDragEnd(event: FederatedPointerEvent) {
        event.stopPropagation();

        let releaseRect = this.value.rect;
        if (this.rectTransform) {
            releaseRect = this.applyRectTransform(this.value.rect, 'release');
            if (!rectDiff(this.value.rect, releaseRect)) {
                this.setRect(releaseRect);
            }
        }

        this.dragHandle = null;
        this.dragStartRect = null;

        // Call onRelease callback if provided
        if (this.onRelease) {
            this.onRelease(new Rectangle(releaseRect.x, releaseRect.y, releaseRect.width, releaseRect.height));
        }
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
        const handle = new Graphics();
        handle.rect(-this.size / 2, -this.size / 2, this.size, this.size);
        handle.fill(this.colorToHex(this.color));
        handle.stroke({width: 1, color: 0xffffff});

        handle.eventMode = 'static';
        handle.cursor = this.getCursorForHandle(position);
        handle.label = `Handle-${position}`;

        return handle;
    }

    private getWorldScale(container: Container): {x: number; y: number} {
        const wt = container.worldTransform;
        const worldDx = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
        const worldDy = Math.sqrt(wt.c * wt.c + wt.d * wt.d);
        return {
            x: worldDx || 1,
            y: worldDy || 1
        };
    }

    private applyRectTransform(rect: Rect, phase: RectTransformPhase): Rect {
        if (!this.rectTransform) {
            return rect;
        }
        const rawRect = new Rectangle(rect.x, rect.y, rect.width, rect.height);
        const transformed = RectSchema.parse(this.rectTransform({
            rect: new Rectangle(rawRect.x, rawRect.y, rawRect.width, rawRect.height),
            phase,
            handle: this.dragHandle,
        }));
        this.onTransformedRect?.(
            rawRect,
            new Rectangle(transformed.x, transformed.y, transformed.width, transformed.height),
            phase
        );
        return transformed;
    }

    /**
     * Update handle positions based on current rect
     */
    private updateHandles(handleScale?: {x: number; y: number}) {
        const scale = handleScale ?? this.getWorldScale(this.handlesContainer);
        this.lastHandleWorldScaleX = scale.x;
        this.lastHandleWorldScaleY = scale.y;
        this.handles.forEach((handle, position) => {
            const localPos = this.getHandleLocalPosition(position);

            handle.position.set(localPos.x, localPos.y);
            // Counter-scale to maintain constant size
            handle.scale.set(1 / scale.x, 1 / scale.y);
        });
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
        const positions = this.getHandlePositions();

        positions.forEach((position) => {
            const handle = this.createHandle(position);
            this.handles.set(position, handle);
            this.handlesContainer.addChild(handle);

            // Attach drag tracking using bound methods
            const tracker = trackDrag(
                handle,
                {
                    onDragStart: (event) => this.$.onDragStart(event, position),
                    onDragMove: this.$.onDragMove,
                    onDragEnd: this.$.onDragEnd
                },
                this.stage,
                this.handlesContainer
            );

            this.dragTrackers.set(handle, tracker);
        });

        this.set('dirty', true)
    }

    /**
     * Remove all handles and cleanup
     */
    public removeHandles() {
        this.ticker.remove(this.$.onHandleScaleTick, this);

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
            draft.dirty = true;
        });
        this.queueResolve();
    }

    /**
     * Show or hide all resize handles
     */
    public setVisible(visible: boolean) {
        this.handles.forEach((handle) => {
            handle.visible = visible;
        });
    }

    /**
     * Get the handle color
     */
    public getColor(): Color {
        return this.color;
    }
}
