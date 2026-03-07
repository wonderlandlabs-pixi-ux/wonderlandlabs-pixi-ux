import type { Application, Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
import { Point } from 'pixi.js';
import {PointerManager, PointerTraceToken} from '@wonderlandlabs-pixi-ux/ticker-forest';
import type { StageDraggableResult, StageDragEvent } from './types';

/**
 * Makes a container draggable via stage-level pointer events.
 * Listens on app.stage so dragging works anywhere on the canvas.
 * Emits 'stage-drag' events to the application's event stream.
 * All container updates happen in ticker handlers for clean PixiJS updates.
 *
 * @param app - The PixiJS Application instance
 * @param container - The container to make draggable
 * @returns Object with destroy function
 */
export function makeStageDraggable(
  app: Application,
  container: PixiContainer
): StageDraggableResult {
  let isDragging = false;
  let pointerTraceToken: PointerTraceToken | null = null;
  const dragStart = new Point();
  const dragOffset = new Point();
  
  // Pending updates to apply in ticker
  let pendingPosition: { x: number; y: number } | null = null;
  
  const onDragMove = (event: FederatedPointerEvent) => {
    if (!PointerManager.singleton.acceptsPointer(pointerTraceToken, event.pointerId)) {
      return;
    }
    const position = event.global;
    const dx = position.x - dragStart.x;
    const dy = position.y - dragStart.y;

    // Queue position update for next ticker
    pendingPosition = {
      x: dragOffset.x + dx,
      y: dragOffset.y + dy,
    };

    // Schedule ticker update
    app.ticker.addOnce(() => {
      if (pendingPosition) {
        container.position.set(pendingPosition.x, pendingPosition.y);

        // Emit drag-move event
        app.stage.emit('stage-drag', {
          type: 'drag-move',
          position: { x: container.position.x, y: container.position.y },
        } as StageDragEvent);

        pendingPosition = null;
      }
    });
  };

  const onDragEnd = (event: FederatedPointerEvent) => {
    if (!PointerManager.singleton.acceptsPointer(pointerTraceToken, event.pointerId)) {
      return;
    }
    isDragging = false;
    pendingPosition = null;
    PointerManager.singleton.endTrace(pointerTraceToken);
    pointerTraceToken = null;

    // Remove move/up listeners
    app.stage.off('pointermove', onDragMove);
    app.stage.off('pointerup', onDragEnd);
    app.stage.off('pointerupoutside', onDragEnd);
    app.stage.off('pointercancel', onDragEnd);

    // Emit drag-end event
    app.stage.emit('stage-drag', {
      type: 'drag-end',
      position: { x: container.position.x, y: container.position.y },
    } as StageDragEvent);
  };

  const onDragStart = (event: FederatedPointerEvent) => {
    // Prevent multiple simultaneous drags
    if (isDragging) return;
    const nextToken = PointerManager.singleton.beginTrace('StageDraggable', event.pointerId);
    if (!nextToken) {
      event.stopPropagation();
      return;
    }
    pointerTraceToken = nextToken;

    isDragging = true;

    const position = event.global;
    dragStart.set(position.x, position.y);
    dragOffset.set(container.position.x, container.position.y);

    // Attach move/up listeners only when dragging starts
    app.stage.on('pointermove', onDragMove);
    app.stage.on('pointerup', onDragEnd);
    app.stage.on('pointerupoutside', onDragEnd);
    app.stage.on('pointercancel', onDragEnd);

    // Emit drag-start event
    app.stage.emit('stage-drag', {
      type: 'drag-start',
      position: { x: container.position.x, y: container.position.y },
    } as StageDragEvent);
  };

  // Make stage interactive and attach pointerdown listener
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointerdown', onDragStart);
  
  // Cleanup function
  const destroy = () => {
    app.stage.off('pointerdown', onDragStart);
    // Also remove move/up listeners in case they're still attached
    app.stage.off('pointermove', onDragMove);
    app.stage.off('pointerup', onDragEnd);
    app.stage.off('pointerupoutside', onDragEnd);
    app.stage.off('pointercancel', onDragEnd);
    pendingPosition = null;
    PointerManager.singleton.endTrace(pointerTraceToken);
    pointerTraceToken = null;
    isDragging = false;
  };
  
  return {
    destroy,
  };
}
