import type { Application, Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
import observeDrag, {dragTargetDecorator} from '@wonderlandlabs-pixi-ux/observe-drag';
import type { StageDraggableOptions, StageDraggableResult, StageDragEvent } from './types.js';

/**
 * Makes a container draggable via stage-level pointer events.
 * Listens on app.stage so dragging works anywhere on the canvas.
 * Emits 'stage-drag' events to the application's event stream.
 *
 * @param app - The PixiJS Application instance
 * @param container - The container to make draggable
 * @param options - Optional drag target and point transform hooks
 * @returns Object with destroy function
 */
export function makeStageDraggable(
  app: Application,
  container: PixiContainer,
  options: StageDraggableOptions = {}
): StageDraggableResult {
  const pointTransform = options.targetPointTransform;

  const subscribeToDown = observeDrag<FederatedPointerEvent>({
    stage: app.stage,
    app,
  });
  const dragListeners = dragTargetDecorator<FederatedPointerEvent, undefined, PixiContainer>({
    transformPoint: pointTransform
      ? (point, event) => pointTransform(point, event)
      : undefined,
    listeners: {
      onStart(_event, dragTarget) {
        const resolvedDragTarget = dragTarget ?? container;
        app.stage.emit('stage-drag', {
          type: 'drag-start',
          position: { x: resolvedDragTarget.position.x, y: resolvedDragTarget.position.y },
        } as StageDragEvent);
      },
      onMove(_event, _context, dragTarget) {
        const resolvedDragTarget = dragTarget ?? container;
        app.stage.emit('stage-drag', {
          type: 'drag-move',
          position: { x: resolvedDragTarget.position.x, y: resolvedDragTarget.position.y },
        } as StageDragEvent);
      },
      onUp(_event, _context, dragTarget) {
        const resolvedDragTarget = dragTarget ?? container;
        app.stage.emit('stage-drag', {
          type: 'drag-end',
          position: { x: resolvedDragTarget.position.x, y: resolvedDragTarget.position.y },
        } as StageDragEvent);
      },
      onBlocked(event) {
        event.stopPropagation();
      },
      onError(_error, _phase, event) {
        event?.stopPropagation();
      },
    },
  });
  const dragSubscription = subscribeToDown(
    app.stage,
    dragListeners,
    {
      dragTarget: options.dragTarget ?? container,
      getDragTarget: options.getDragTarget,
    },
  );

  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  
  // Cleanup function
  const destroy = () => {
    dragSubscription.unsubscribe();
  };
  
  return {
    destroy,
  };
}
