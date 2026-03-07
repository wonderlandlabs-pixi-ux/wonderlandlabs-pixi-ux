import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { RootContainerResult } from './types';

/**
 * Creates a rootContainer container that centers the origin at screen width/2, height/2
 * and listens to resize events to maintain centering.
 *
 * @param app - The PixiJS Application instance
 * @returns Object containing stage, rootContainer container, and destroy function
 *
 * Note: The container is not added to stage automatically.
 * Call `app.stage.addChild(root)` explicitly where you want it mounted.
 */
export function createRootContainer(app: Application): RootContainerResult {
  const root = new Container();
  root.label = 'RootContainer';

  // Update position to center
  const updatePosition = () => {
    const { width, height } = app.screen;
    root.position.set(width / 2, height / 2);
  };

  // Initial centering
  updatePosition();

  // Listen to resize events
  const handleResize = () => {
    updatePosition();
  };

  app.renderer.on('resize', handleResize);

  // Cleanup function
  const destroy = () => {
    app.renderer.off('resize', handleResize);
    root.destroy();
  };

  return {
    stage: app.stage,
    root,
    destroy,
  };
}
