import {z} from 'zod';
import {Rectangle} from 'pixi.js';
import type {Application, Container, FederatedPointerEvent} from 'pixi.js';
import type {Rect} from './rectTypes.js';

// ============================================================================
// Color Types (PixiJS format: RGB values 0..1)
// ============================================================================

export const ColorSchema = z.object({
  r: z.number().min(0).max(1).default(1),
  g: z.number().min(0).max(1).default(1),
  b: z.number().min(0).max(1).default(1),
});

export type Color = z.infer<typeof ColorSchema>;
export type ColorDecimal = z.infer<typeof ColorSchema>;

// ============================================================================
// Handle Position Types
// ============================================================================

export enum HandlePosition {
  TOP_LEFT = 'top-left',
  TOP_CENTER = 'top-center',
  TOP_RIGHT = 'top-right',
  MIDDLE_LEFT = 'middle-left',
  MIDDLE_RIGHT = 'middle-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_CENTER = 'bottom-center',
  BOTTOM_RIGHT = 'bottom-right',
}

export type HandleMode = 'ONLY_EDGE' | 'ONLY_CORNER' | 'EDGE_AND_CORNER';
export type RectTransformPhase = 'drag' | 'release';
export type MinSize = {x: number; y: number};

export interface RectTransformParams {
    rect: Rectangle;
    phase: RectTransformPhase;
    handle: HandlePosition | null;
}

export type RectTransform = (params: RectTransformParams) => Rectangle | Rect;

export type TransformedRectCallback = (
    rawRect: Rectangle,
    transformedRect: Rectangle,
    phase: RectTransformPhase,
) => void;

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
    deltaSpace?: Container;
    minSize?: MinSize;
    onHandlePointerDown?: (position: HandlePosition, event: FederatedPointerEvent) => void;
}

export interface ResizerStoreValue {
    rect: Rect;
    isDragging: boolean;
}

export interface EnableHandlesConfig {
    app: Application;
    drawRect?: (rect: Rectangle, container: Container) => void;
    onRelease?: (rect: Rectangle) => void;
    size?: number;
    color?: Color;
    constrain?: boolean;
    mode?: HandleMode;
    rectTransform?: RectTransform;
    onTransformedRect?: TransformedRectCallback;
    deltaSpace?: Container;
    minSize?: MinSize;
    onHandlePointerDown?: (position: HandlePosition, event: FederatedPointerEvent) => void;
}

export interface TrackDragCallbacks {
    onDragStart?: (event: FederatedPointerEvent) => void;
    onDragMove?: (deltaX: number, deltaY: number, event: FederatedPointerEvent) => void;
    onDragEnd?: (event: FederatedPointerEvent) => void;
}

export interface TrackDragResult {
    destroy: () => void;
}
