import {Container, Rectangle} from 'pixi.js';
import type {EnableHandlesConfig} from './types';
import {ResizerStore} from "./ResizerStore";

/**
 * Enable resize handles on a container.
 * Handles persist until removeHandles() is called.
 *
 * @param container - The PixiJS container to add handles to
 * @param rect - Initial rectangle dimensions
 * @param config - Handle configuration
 * @returns ResizerStore - Forestry state managing the current rectangle
 */
export function enableHandles(
  container: Container,
  rect: Rectangle,
  config: EnableHandlesConfig
): ResizerStore {
  const store = new ResizerStore({
    container,
    rect,
    app: config.app,
    drawRect: config.drawRect,
    onRelease: config.onRelease,
    size: config.size,
    color: config.color,
    constrain: config.constrain,
    mode: config.mode,
    rectTransform: config.rectTransform,
    onTransformedRect: config.onTransformedRect,
    deltaSpace: config.deltaSpace,
  });

  return store;
}
