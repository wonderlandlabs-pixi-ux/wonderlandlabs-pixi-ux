import type { PointerTraceToken } from '@wonderlandlabs-pixi-ux/ticker-forest';
import type { Application, Container, FederatedPointerEvent } from 'pixi.js';

export type ActionFn = (...args: unknown[]) => unknown;

export type DragStoreActions = {
  flush: () => void;
  onDragMove: (event: FederatedPointerEvent) => void;
  onDragEnd: (event: FederatedPointerEvent) => void;
};

export interface DragStoreValue {
  isDragging: boolean;
  draggedItemId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  initialItemX: number;
  initialItemY: number;
  isDragEnding: boolean;
}

export interface DragEventValues {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  initialItemX: number;
  initialItemY: number;
}

export interface DragRuntimeState {
  listenersAttached: boolean;
  pointerTraceToken: PointerTraceToken | null;
  coordinateSpace: Container | null;
  resolveQueued: boolean;
  isDragging: boolean;
  draggedItemId: string | null;
  isDragEnding: boolean;
}

export interface DragCallbacks {
  onDragStart?: (itemId: string, x: number, y: number) => void;
  onDrag?: (state: DragStoreValue) => void;
  onDragEnd?: () => void;
}

export interface DragStoreConfig {
  app: Application;
  callbacks?: DragCallbacks;
}
