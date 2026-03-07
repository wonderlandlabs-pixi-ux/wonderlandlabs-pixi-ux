import { Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
import {PointerManager, PointerTraceToken} from '@wonderlandlabs-pixi-ux/ticker-forest';
import type { TrackDragCallbacks, TrackDragResult } from './types';

/**
 * Track drag events on a PixiJS container.
 *
 * Pattern:
 * - pointerdown on target element starts drag
 * - pointermove/pointerup listeners attached to stage (or target if no stage) during drag
 * - Listeners removed when drag ends
 *
 * @param target - The PixiJS container to track drag on
 * @param callbacks - Drag event callbacks
 * @param stage - Optional stage to attach move/up listeners to (for global tracking)
 * @returns Object with destroy function
 */
export function trackDrag(
  target: PixiContainer,
  callbacks: TrackDragCallbacks = {},
  stage?: PixiContainer,
  deltaSpace?: PixiContainer
): TrackDragResult {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let pointerTraceToken: PointerTraceToken | null = null;

  // Use stage for move/up listeners if provided, otherwise use target
  const moveUpTarget = stage || target;
  const resolveEventPoint = (event: FederatedPointerEvent): {x: number; y: number} => {
    if (!deltaSpace) {
      return {x: event.global.x, y: event.global.y};
    }
    const localPoint = deltaSpace.toLocal(event.global);
    return {x: localPoint.x, y: localPoint.y};
  };

  const onDragMove = (event: FederatedPointerEvent) => {
    if (!isDragging) return;
    if (!PointerManager.singleton.acceptsPointer(pointerTraceToken, event.pointerId)) {
      return;
    }

    const point = resolveEventPoint(event);
    const deltaX = point.x - dragStartX;
    const deltaY = point.y - dragStartY;

    callbacks.onDragMove?.(deltaX, deltaY, event);
  };

  const onDragEnd = (event: FederatedPointerEvent) => {
    if (!isDragging) return;
    if (!PointerManager.singleton.acceptsPointer(pointerTraceToken, event.pointerId)) {
      return;
    }

    isDragging = false;
    PointerManager.singleton.endTrace(pointerTraceToken);
    pointerTraceToken = null;

    // Remove move/up listeners from stage or target
    moveUpTarget.off('pointermove', onDragMove);
    moveUpTarget.off('pointerup', onDragEnd);
    moveUpTarget.off('pointerupoutside', onDragEnd);
    moveUpTarget.off('pointercancel', onDragEnd);

    callbacks.onDragEnd?.(event);
  };

  const onDragStart = (event: FederatedPointerEvent) => {
    // Prevent multiple simultaneous drags
    if (isDragging) return;
    const nextToken = PointerManager.singleton.beginTrace('ResizerTrackDrag', event.pointerId);
    if (!nextToken) {
      event.stopPropagation();
      return;
    }
    pointerTraceToken = nextToken;

    const point = resolveEventPoint(event);
    isDragging = true;
    dragStartX = point.x;
    dragStartY = point.y;

    // Attach move/up listeners to stage (or target) when dragging starts
    moveUpTarget.on('pointermove', onDragMove);
    moveUpTarget.on('pointerup', onDragEnd);
    moveUpTarget.on('pointerupoutside', onDragEnd);
    moveUpTarget.on('pointercancel', onDragEnd);

    callbacks.onDragStart?.(event);
  };

  // Make target interactive and attach pointerdown listener
  target.eventMode = 'static';
  target.on('pointerdown', onDragStart);

  // Cleanup function
  const destroy = () => {
    target.off('pointerdown', onDragStart);
    // Also remove move/up listeners in case they're still attached
    moveUpTarget.off('pointermove', onDragMove);
    moveUpTarget.off('pointerup', onDragEnd);
    moveUpTarget.off('pointerupoutside', onDragEnd);
    moveUpTarget.off('pointercancel', onDragEnd);
    PointerManager.singleton.endTrace(pointerTraceToken);
    pointerTraceToken = null;
    isDragging = false;
  };

  return {
    destroy,
  };
}
