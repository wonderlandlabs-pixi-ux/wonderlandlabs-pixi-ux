import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import type { Container, Graphics } from 'pixi.js';
import type {
  GridStoreValue,
  GridManagerValue,
  GridCacheDebugInfo,
  GridManagerConfig,
  WorldBounds,
  GridRedrawReason,
} from './types.js';

/**
 * Grid manager that redraws visible lines directly into Graphics objects.
 * This avoids tiled texture seam artifacts and keeps behavior deterministic.
 */
export class GridManager extends TickerForest<GridManagerValue> {
  readonly pixi: PixiProvider;
  #_gridContainer?: Container;
  #_grid?: Graphics;
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

  static readonly #DEFAULT_WORLD_BOUNDS: WorldBounds = {
    left: -2000,
    right: 2000,
    top: -2000,
    bottom: 2000,
  };
  static readonly #MAJOR_ALPHA_MULTIPLIER = 1.4;

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

    this.pixi = config.pixi ?? PixiProvider.shared;
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
      const container = new this.pixi.Container();
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

  get #gridGraphics(): Graphics {
    if (!this.#_grid) {
      const graphics = new this.pixi.Graphics();
      graphics.label = 'Grid';
      this.#gridContainer.addChild(graphics);
      this.#_grid = graphics;
    }
    return this.#_grid;
  }

  get #majorGraphics(): Graphics {
    if (!this.#_gridMajor) {
      const graphics = new this.pixi.Graphics();
      graphics.label = 'GridMajor';
      this.#gridContainer.addChild(graphics);
      this.#_gridMajor = graphics;
    }
    return this.#_gridMajor;
  }

  get #artboardGraphics(): Graphics {
    if (!this.#_artboard) {
      const graphics = new this.pixi.Graphics();
      graphics.label = 'Artboard';
      this.#gridContainer.addChild(graphics);
      this.#_artboard = graphics;
    }
    return this.#_artboard;
  }

  #initialize(): void {
    this.#gridContainer;
    this.#gridGraphics;
    if (this.#resolveMajorFrequency()) {
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

  #resolveMajorFrequency(): { x: number; y: number } | undefined {
    const rawFrequency = this.value.gridSpec.majorGridFrequency;
    if (typeof rawFrequency === 'number') {
      const frequency = Math.max(0, Math.floor(rawFrequency));
      if (frequency === 0) {
        return undefined;
      }
      return { x: frequency, y: frequency };
    }
    if (!rawFrequency) {
      return undefined;
    }
    const x = Math.max(0, Math.floor(rawFrequency.x));
    const y = Math.max(0, Math.floor(rawFrequency.y));
    if (x === 0 && y === 0) {
      return undefined;
    }
    return { x, y };
  }

  #applyDensityFloor(spacingX: number, spacingY: number, zoom: number): { x: number; y: number } {
    let multiplier = 1;
    while (
      (spacingX > 0 && spacingX * zoom * multiplier < 16)
      || (spacingY > 0 && spacingY * zoom * multiplier < 16)
    ) {
      multiplier *= 2;
    }

    return {
      x: spacingX > 0 ? spacingX * multiplier : 0,
      y: spacingY > 0 ? spacingY * multiplier : 0,
    };
  }

  #resolveGridSpacing(zoom: number): { x: number; y: number } {
    const { gridSpec } = this.value;
    let spacingX = gridSpec.grid.x;
    let spacingY = gridSpec.grid.y;
    const majorFrequency = this.#resolveMajorFrequency();

    if (majorFrequency) {
      if (spacingX * zoom < 16 && majorFrequency.x > 0) {
        spacingX = Math.max(1, (gridSpec.grid.x * majorFrequency.x) / 2);
      }
      if (spacingY * zoom < 16 && majorFrequency.y > 0) {
        spacingY = Math.max(1, (gridSpec.grid.y * majorFrequency.y) / 2);
      }
    }

    return this.#applyDensityFloor(spacingX, spacingY, zoom);
  }

  #resolveMajorSpacing(zoom: number): { x: number; y: number } | undefined {
    const majorFrequency = this.#resolveMajorFrequency();
    if (!majorFrequency) {
      return undefined;
    }
    const spacingX = majorFrequency.x > 0 ? this.value.gridSpec.grid.x * majorFrequency.x : 0;
    const spacingY = majorFrequency.y > 0 ? this.value.gridSpec.grid.y * majorFrequency.y : 0;
    if (spacingX <= 0 && spacingY <= 0) {
      return undefined;
    }

    return this.#applyDensityFloor(spacingX, spacingY, zoom);
  }

  #worldBounds(spacingX: number, spacingY: number): WorldBounds {
    const screen = this.application?.screen;
    const container = this.container;
    if (!screen) {
      return GridManager.#DEFAULT_WORLD_BOUNDS;
    }
    if (!container) {
      return GridManager.#DEFAULT_WORLD_BOUNDS;
    }

    const scale = this.getScale();
    const safeScaleX = Math.max(0.0001, Math.abs(scale.x));
    const safeScaleY = Math.max(0.0001, Math.abs(scale.y));

    // Derive visible container-space bounds from viewport corners.
    // This keeps bounds correct even when parent transforms (centering/pan) are applied.
    const topLeft = container.toLocal({ x: 0, y: 0 });
    const topRight = container.toLocal({ x: screen.width, y: 0 });
    const bottomLeft = container.toLocal({ x: 0, y: screen.height });
    const bottomRight = container.toLocal({ x: screen.width, y: screen.height });

    const left = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const right = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const top = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
    const bottom = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

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
    const drawVertical = spacingX > 0;
    const drawHorizontal = spacingY > 0;
    if (!drawVertical && !drawHorizontal) {
      return;
    }

    const bounds = this.#worldBounds(spacingX, spacingY);

    let segmentCount = 0;
    const maxSegments = 12000;

    if (drawVertical) {
      const startX = Math.floor(bounds.left / spacingX) * spacingX;
      const endX = Math.ceil(bounds.right / spacingX) * spacingX;
      for (let x = startX; x <= endX && segmentCount < maxSegments; x += spacingX) {
        graphics.moveTo(x, bounds.top);
        graphics.lineTo(x, bounds.bottom);
        segmentCount += 1;
      }
    }

    if (drawHorizontal) {
      const startY = Math.floor(bounds.top / spacingY) * spacingY;
      const endY = Math.ceil(bounds.bottom / spacingY) * spacingY;
      for (let y = startY; y <= endY && segmentCount < maxSegments; y += spacingY) {
        graphics.moveTo(bounds.left, y);
        graphics.lineTo(bounds.right, y);
        segmentCount += 1;
      }
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
    } else {
      void info;
    }
  }

  #redrawGrid(): void {
    const { gridSpec } = this.value;
    const zoom = Math.max(this.getScale().x, 0.0001);
    const lineWidth = 1 / zoom;

    const gridSpacing = this.#resolveGridSpacing(zoom);
    this.#drawGridLines(
      this.#gridGraphics,
      gridSpacing.x,
      gridSpacing.y,
      gridSpec.grid.color,
      gridSpec.grid.alpha,
      lineWidth
    );

    const majorSpacing = this.#resolveMajorSpacing(zoom);
    if (majorSpacing) {
      const majorAlpha = Math.min(1, gridSpec.grid.alpha * GridManager.#MAJOR_ALPHA_MULTIPLIER);
      this.#drawGridLines(
        this.#majorGraphics,
        majorSpacing.x,
        majorSpacing.y,
        gridSpec.grid.color,
        majorAlpha,
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
      if (gridSpec.majorGridFrequency !== undefined) {
        draft.gridSpec.majorGridFrequency = gridSpec.majorGridFrequency;
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
      this.#_grid = undefined;
      this.#_gridMajor = undefined;
      this.#_artboard = undefined;
    }
  }
}
