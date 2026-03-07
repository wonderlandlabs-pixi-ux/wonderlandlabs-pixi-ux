import { Container } from 'pixi.js';
import type { Application, Container as PixiContainer } from 'pixi.js';
import type { ZoomPanResult } from './types';

/**
 * Creates a simple zoom/pan container with no event handling.
 * Use makeStageDraggable() and makeStageZoomable() decorators to add interactions.
 *
 * @param app - The PixiJS Application instance
 * @param root - Optional parent container (if using RootContainer)
 * @returns Object containing zoomPan container and destroy function
 *
 * Note: The container is not added to any parent automatically.
 * Mount it explicitly (`root.addChild(zoomPan)` or `app.stage.addChild(zoomPan)`).
 */
export function createZoomPan(
  _app: Application,
  _root?: PixiContainer
): ZoomPanResult {
  const zoomPan = new Container();
  zoomPan.label = 'ZoomPanContainer';

  // Cleanup function
  const destroy = () => {
    // Remove from parent
    if (zoomPan.parent) {
      zoomPan.parent.removeChild(zoomPan);
    }

    // Destroy container
    zoomPan.destroy();
  };

  return {
    zoomPan,
    destroy,
  };
}
