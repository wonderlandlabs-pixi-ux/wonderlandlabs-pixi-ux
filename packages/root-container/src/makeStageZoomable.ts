import type { Application, Container as PixiContainer, FederatedWheelEvent } from 'pixi.js';
import { RENDER_THROTTLE_MS } from '@wonderlandlabs-pixi-ux/observe-drag';
import { getSharedRenderHelper } from '@wonderlandlabs-pixi-ux/utils';
import type { ZoomOptions, StageZoomableResult, StageZoomEvent } from './types.js';

/**
 * Makes a container zoomable via stage-level mousewheel events.
 * Listens on app.stage so zooming works anywhere on the canvas.
 * Zooms toward/away from the mouse cursor position.
 * All container updates happen in ticker handlers for clean PixiJS updates.
 * Emits 'stage-zoom' events to the application's event stream.
 *
 * @param app - The PixiJS Application instance
 * @param container - The container to make zoomable
 * @param options - Zoom configuration options
 * @returns Object with zoom control functions and destroy
 */
export function makeStageZoomable(
  app: Application,
  container: PixiContainer,
  options: ZoomOptions = {}
): StageZoomableResult {
  const minZoom = options.minZoom ?? 0.1;
  const maxZoom = options.maxZoom ?? 10;
  const zoomSpeed = options.zoomSpeed ?? 0.1;
  const renderThrottleMs = options.renderThrottleMs ?? RENDER_THROTTLE_MS;
  const renderHelper = getSharedRenderHelper(app, {
    throttleMs: renderThrottleMs,
  });
  const maybeApp = app as unknown as {
    canvas?: HTMLCanvasElement;
    renderer?: { canvas?: HTMLCanvasElement; view?: HTMLCanvasElement };
  };
  const nativeWheelTarget =
    maybeApp.canvas ?? maybeApp.renderer?.canvas ?? maybeApp.renderer?.view ?? null;

  const onNativeWheel = (event: WheelEvent) => {
    event.preventDefault();
  };

  const onWheel = (event: FederatedWheelEvent) => {
    event.stopPropagation();

    // Get mouse position in world coordinates before zoom
    const mousePosition = { x: event.global.x, y: event.global.y };
    const worldPosBefore = container.toLocal(mousePosition);

    // Calculate new zoom level
    const zoomDelta = event.deltaY > 0 ? (1 - zoomSpeed) : (1 + zoomSpeed);
    const newScale = container.scale.x * zoomDelta;

    // Clamp zoom level
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, newScale));

    // Schedule ticker update for zoom
    app.ticker.addOnce(() => {
      container.scale.set(clampedScale, clampedScale);

      // Get mouse position in world coordinates after zoom
      const worldPosAfter = container.toLocal(mousePosition);

      // Adjust position to keep same world point under mouse
      container.position.x += (worldPosAfter.x - worldPosBefore.x) * container.scale.x;
      container.position.y += (worldPosAfter.y - worldPosBefore.y) * container.scale.y;

      // Emit zoom event
      app.stage.emit('stage-zoom', {
        type: 'zoom',
        zoom: clampedScale,
        mousePosition: { x: event.global.x, y: event.global.y },
      } as StageZoomEvent);

      renderHelper.request();
    });
  };

  // Listen to wheel events on the stage (global)
  // This ensures wheel events are captured regardless of where the mouse is
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('wheel', onWheel);
  nativeWheelTarget?.addEventListener('wheel', onNativeWheel, { passive: false });

  // Utility functions
  const setZoom = (zoom: number) => {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    container.scale.set(clampedZoom, clampedZoom);
    renderHelper.now();
  };

  const getZoom = (): number => {
    return container.scale.x;
  };

  // Cleanup function
  const destroy = () => {
    app.stage.off('wheel', onWheel);
    nativeWheelTarget?.removeEventListener('wheel', onNativeWheel);
    renderHelper.destroy();
  };

  return {
    setZoom,
    getZoom,
    destroy,
  };
}
