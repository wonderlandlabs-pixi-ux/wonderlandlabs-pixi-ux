import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { Container, Graphics } from 'pixi.js';
import type {
  GridStoreValue,
  GridManagerValue,
  GridCacheOptions,
  GridCacheDebugInfo,
  GridManagerConfig,
  WorldBounds,
  GridRedrawReason,
} from './types';

/**
 * Grid manager that redraws visible lines directly into Graphics objects.
 * This avoids tiled texture seam artifacts and keeps behavior deterministic.
 */
export class GridManager extends TickerForest<GridManagerValue> {
  #_gridContainer?: Container;
  #_gridMinor?: Graphics;
  #_gridMajor?: Graphics;
  #_artboard?: Graphics;
  #cacheEnabled: boolean;
  #cacheBaseResolution: number;
  #cacheActiveResolution: number;
  #cacheAntialias: boolean;
  #cacheDebugEnabled: boolean;
  #cacheDebugLogger?: (info: GridCacheDebugInfo) => void;
  #cacheDebugIntervalMs: number;
  #lastCacheDebugAtMs: number = Number.NEGATIVE_INFINITY;
  #lastRedrawReason: GridRedrawReason = 'init';

  #onStageZoom = (): void => {
    this.#invalidate('zoom');
  };

  #onStageDrag = (): void => {
    this.#invalidate('drag');
  };

  #onRendererResize = (): void => {
    this.#invalidate('resize');
  };

  constructor(config: GridManagerConfig) {
    super(
      {
        value: {
          gridSpec: config.gridSpec,
        },
      },
      { app: config.application, container: config.zoomPanContainer }
    );

    this.#cacheEnabled = config.cache?.enabled ?? true;
    this.#cacheBaseResolution = Math.max(Number.EPSILON, config.cache?.resolution ?? 2);
    this.#cacheActiveResolution = this.#cacheBaseResolution;
    this.#cacheAntialias = config.cache?.antialias ?? true;
    this.#cacheDebugEnabled = Boolean(config.cache?.debug);
    this.#cacheDebugLogger =
      typeof config.cache?.debug === 'object' && config.cache?.debug?.logger
        ? config.cache.debug.logger
        : undefined;
    this.#cacheDebugIntervalMs =
      typeof config.cache?.debug === 'object'
        ? Math.max(0, config.cache.debug.logIntervalMs ?? 250)
        : 250;
    this.#initialize();
  }

  protected resolve(): void {
    this.#redrawGrid();
  }

  get #gridContainer(): Container {
    if (!this.#_gridContainer) {
      const parent = this.container;
      if (!parent) {
        throw new Error('GridManager requires a container');
      }
      const container = new Container();
      container.label = 'GridContainer';
      parent.addChildAt(container, 0);
      if (this.#cacheEnabled) {
        container.cacheAsTexture({
          resolution: this.#cacheActiveResolution,
          antialias: this.#cacheAntialias,
        });
      }
      this.#_gridContainer = container;
    }
    return this.#_gridContainer;
  }

  get #minorGraphics(): Graphics {
    if (!this.#_gridMinor) {
      const graphics = new Graphics();
      graphics.label = 'GridMinor';
      this.#gridContainer.addChild(graphics);
      this.#_gridMinor = graphics;
    }
    return this.#_gridMinor;
  }

  get #majorGraphics(): Graphics {
    if (!this.#_gridMajor) {
      const graphics = new Graphics();
      graphics.label = 'GridMajor';
      this.#gridContainer.addChild(graphics);
      this.#_gridMajor = graphics;
    }
    return this.#_gridMajor;
  }

  get #artboardGraphics(): Graphics {
    if (!this.#_artboard) {
      const graphics = new Graphics();
      graphics.label = 'Artboard';
      this.#gridContainer.addChild(graphics);
      this.#_artboard = graphics;
    }
    return this.#_artboard;
  }

  #initialize(): void {
    this.#gridContainer;
    this.#minorGraphics;
    if (this.value.gridSpec.gridMajor) {
      this.#majorGraphics;
    }
    if (this.value.gridSpec.artboard) {
      this.#artboardGraphics;
    }

    this.application?.stage.on('stage-zoom', this.#onStageZoom);
    this.application?.stage.on('stage-drag', this.#onStageDrag);
    this.application?.renderer.on('resize', this.#onRendererResize);

    this.#invalidate('init');
    this.kickoff();
  }

  #invalidate(reason: GridRedrawReason): void {
    this.#lastRedrawReason = reason;
    this.dirty();
  }

  #applyDensityFloor(spacingX: number, spacingY: number, zoom: number): { x: number; y: number } {
    let multiplier = 1;
    while (spacingX * zoom * multiplier < 16 || spacingY * zoom * multiplier < 16) {
      multiplier *= 2;
    }

    return {
      x: spacingX * multiplier,
      y: spacingY * multiplier,
    };
  }

  #resolveMinorSpacing(zoom: number): { x: number; y: number } {
    const { gridSpec } = this.value;
    let spacingX = gridSpec.grid.x;
    let spacingY = gridSpec.grid.y;

    const isMinorTooDense = spacingX * zoom < 16 || spacingY * zoom < 16;
    if (isMinorTooDense && gridSpec.gridMajor) {
      // Use half-major spacing so minor lines remain visible between major lines
      // instead of landing on top of them.
      spacingX = Math.max(1, gridSpec.gridMajor.x / 2);
      spacingY = Math.max(1, gridSpec.gridMajor.y / 2);
    }

    return this.#applyDensityFloor(spacingX, spacingY, zoom);
  }

  #resolveMajorSpacing(zoom: number): { x: number; y: number } | undefined {
    const { gridSpec } = this.value;
    if (!gridSpec.gridMajor) {
      return undefined;
    }

    return this.#applyDensityFloor(gridSpec.gridMajor.x, gridSpec.gridMajor.y, zoom);
  }

  #worldBounds(spacingX: number, spacingY: number): WorldBounds {
    const screen = this.application?.screen;
    const container = this.container;
    if (!screen) {
      return { left: -2000, right: 2000, top: -2000, bottom: 2000 };
    }
    if (!container) {
      return { left: -2000, right: 2000, top: -2000, bottom: 2000 };
    }

    const scale = this.getScale();
    const safeScaleX = Math.max(0.0001, Math.abs(scale.x));
    const safeScaleY = Math.max(0.0001, Math.abs(scale.y));

    const pos = container.position;
    const rawLeft = (0 - pos.x) / safeScaleX;
    const rawRight = (screen.width - pos.x) / safeScaleX;
    const rawTop = (0 - pos.y) / safeScaleY;
    const rawBottom = (screen.height - pos.y) / safeScaleY;

    const left = Math.min(rawLeft, rawRight);
    const right = Math.max(rawLeft, rawRight);
    const top = Math.min(rawTop, rawBottom);
    const bottom = Math.max(rawTop, rawBottom);

    const padX = Math.max(spacingX * 2, 48 / Math.abs(safeScaleX));
    const padY = Math.max(spacingY * 2, 48 / Math.abs(safeScaleY));

    return {
      left: left - padX,
      right: right + padX,
      top: top - padY,
      bottom: bottom + padY,
    };
  }

  #drawGridLines(
    graphics: Graphics,
    spacingX: number,
    spacingY: number,
    color: number,
    alpha: number,
    lineWidth: number
  ): void {
    graphics.clear();
    if (spacingX <= 0 || spacingY <= 0) {
      return;
    }

    const bounds = this.#worldBounds(spacingX, spacingY);
    const startX = Math.floor(bounds.left / spacingX) * spacingX;
    const endX = Math.ceil(bounds.right / spacingX) * spacingX;
    const startY = Math.floor(bounds.top / spacingY) * spacingY;
    const endY = Math.ceil(bounds.bottom / spacingY) * spacingY;

    let segmentCount = 0;
    const maxSegments = 12000;

    for (let x = startX; x <= endX && segmentCount < maxSegments; x += spacingX) {
      graphics.moveTo(x, bounds.top);
      graphics.lineTo(x, bounds.bottom);
      segmentCount += 1;
    }

    for (let y = startY; y <= endY && segmentCount < maxSegments; y += spacingY) {
      graphics.moveTo(bounds.left, y);
      graphics.lineTo(bounds.right, y);
      segmentCount += 1;
    }

    if (segmentCount > 0) {
      graphics.stroke({ color, width: lineWidth, alpha });
    }
  }

  #resolveCacheResolution(zoom: number): number {
    // Fully dynamic: scale cache resolution directly with zoom level.
    return Math.max(Number.EPSILON, this.#cacheBaseResolution * zoom);
  }

  #syncCacheResolution(zoom: number): void {
    if (!this.#cacheEnabled || !this.#_gridContainer) {
      return;
    }

    const nextResolution = this.#resolveCacheResolution(zoom);
    if (nextResolution === this.#cacheActiveResolution) {
      return;
    }

    this.#cacheActiveResolution = nextResolution;
    this.#_gridContainer.cacheAsTexture({
      resolution: this.#cacheActiveResolution,
      antialias: this.#cacheAntialias,
    });
  }

  #emitCacheDebug(zoom: number): void {
    if (!this.#cacheDebugEnabled || !this.#cacheEnabled || !this.#_gridContainer) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.#lastCacheDebugAtMs < this.#cacheDebugIntervalMs) {
      return;
    }
    this.#lastCacheDebugAtMs = now;

    const source = this.#_gridContainer.renderGroup?.texture?.source;
    const textureWidthPx = source?.pixelWidth ?? 0;
    const textureHeightPx = source?.pixelHeight ?? 0;
    const pixelCount = textureWidthPx * textureHeightPx;
    const estimatedBytes = pixelCount * 4;
    const estimatedMiB = estimatedBytes / (1024 * 1024);
    const resource = source?.resource as { byteLength?: number; data?: { byteLength?: number } } | undefined;
    let measuredBytes: number | null = null;
    let measuredBytesMethod: GridCacheDebugInfo['measuredBytesMethod'] = 'unavailable';
    if (typeof resource?.byteLength === 'number') {
      measuredBytes = resource.byteLength;
      measuredBytesMethod = 'resource-byteLength';
    } else if (typeof resource?.data?.byteLength === 'number') {
      measuredBytes = resource.data.byteLength;
      measuredBytesMethod = 'resource-data-byteLength';
    }

    const info: GridCacheDebugInfo = {
      reason: this.#lastRedrawReason,
      zoom,
      baseResolution: this.#cacheBaseResolution,
      activeResolution: this.#cacheActiveResolution,
      textureWidthPx,
      textureHeightPx,
      pixelCount,
      measuredBytes,
      measuredBytesMethod,
      estimatedBytes,
      estimatedMiB,
    };

    if (this.#cacheDebugLogger) {
      this.#cacheDebugLogger(info);
      return;
    }

    const baseMessage = `[GridCacheDebug] reason=${info.reason} zoom=${info.zoom.toFixed(2)} res=${info.activeResolution.toFixed(2)} texture=${info.textureWidthPx}x${info.textureHeightPx} pixels=${info.pixelCount} estMiB=${info.estimatedMiB.toFixed(2)}`;
    if (info.measuredBytes !== null) {
      // eslint-disable-next-line no-console
      console.info(`${baseMessage} measuredBytes=${info.measuredBytes} method=${info.measuredBytesMethod}`);
      return;
    }

    // eslint-disable-next-line no-console
    console.info(baseMessage);
  }

  #redrawGrid(): void {
    const { gridSpec } = this.value;
    const zoom = Math.max(this.getScale().x, 0.0001);
    const lineWidth = 1 / zoom;

    const minorSpacing = this.#resolveMinorSpacing(zoom);
    this.#drawGridLines(
      this.#minorGraphics,
      minorSpacing.x,
      minorSpacing.y,
      gridSpec.grid.color,
      gridSpec.grid.alpha,
      lineWidth
    );

    const majorSpacing = this.#resolveMajorSpacing(zoom);
    if (majorSpacing && gridSpec.gridMajor) {
      this.#drawGridLines(
        this.#majorGraphics,
        majorSpacing.x,
        majorSpacing.y,
        gridSpec.gridMajor.color,
        gridSpec.gridMajor.alpha,
        lineWidth
      );
    } else if (this.#_gridMajor) {
      this.#_gridMajor.clear();
    }

    if (gridSpec.artboard) {
      const { x, y, width, height, color, alpha } = gridSpec.artboard;
      const artboard = this.#artboardGraphics;
      artboard.clear();
      artboard.rect(x, y, width, height);
      artboard.stroke({ color, width: lineWidth, alpha });
    } else if (this.#_artboard) {
      this.#_artboard.clear();
    }

    if (this.#cacheEnabled && this.#_gridContainer) {
      this.#syncCacheResolution(zoom);
      this.#_gridContainer.updateCacheTexture();
      if (this.#lastRedrawReason === 'zoom') {
        this.#emitCacheDebug(zoom);
      }
    }

    this.#lastRedrawReason = 'unknown';
  }

  updateGridSpec(gridSpec: Partial<GridStoreValue>): void {
    this.mutate(draft => {
      if (gridSpec.grid) {
        draft.gridSpec.grid = { ...draft.gridSpec.grid, ...gridSpec.grid };
      }
      if (gridSpec.gridMajor !== undefined) {
        draft.gridSpec.gridMajor = gridSpec.gridMajor;
      }
      if (gridSpec.artboard !== undefined) {
        draft.gridSpec.artboard = gridSpec.artboard;
      }
    });

    this.#invalidate('spec-update');
  }

  cleanup(): void {
    super.cleanup();

    this.application?.stage.off('stage-zoom', this.#onStageZoom);
    this.application?.stage.off('stage-drag', this.#onStageDrag);
    this.application?.renderer.off('resize', this.#onRendererResize);

    if (this.#_gridContainer) {
      if (this.#cacheEnabled) {
        this.#_gridContainer.cacheAsTexture(false);
      }
      this.container?.removeChild(this.#_gridContainer);
      this.#_gridContainer.destroy({ children: true });
      this.#_gridContainer = undefined;
      this.#_gridMinor = undefined;
      this.#_gridMajor = undefined;
      this.#_artboard = undefined;
    }
  }
}
