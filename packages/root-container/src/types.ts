import type { Container } from 'pixi.js';

export interface RootContainerResult {
  stage: Container;
  root: Container;
  destroy: () => void;
}

export interface ZoomPanResult {
  zoomPan: Container;
  destroy: () => void;
}

export interface StageDraggableResult {
  destroy: () => void;
}

export interface StageDragEvent {
  type: 'drag-start' | 'drag-move' | 'drag-end';
  position: { x: number; y: number };
}

export interface ZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
}

export interface StageZoomableResult {
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  destroy: () => void;
}

export interface StageZoomEvent {
  type: 'zoom';
  zoom: number;
  mousePosition: { x: number; y: number };
}
