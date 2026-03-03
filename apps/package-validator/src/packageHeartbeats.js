import { Application, Container, Graphics, Rectangle } from 'pixi.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function withPixiCanvas(mountNode, run) {
  if (!mountNode) {
    throw new Error('Pixi mount node was not provided');
  }

  mountNode.innerHTML = '';
  const app = new Application();
  await app.init({
    resizeTo: mountNode,
    antialias: true,
    backgroundColor: 0x111827,
  });

  app.canvas.style.display = 'block';
  mountNode.appendChild(app.canvas);

  try {
    return await run(app);
  } finally {
    app.destroy(true);
    mountNode.innerHTML = '';
  }
}

async function runDragTest(mod, ctx) {
  await withPixiCanvas(ctx.mountNode, async (app) => {
    const store = new mod.DragStore({ app });
    store.startDrag('item-1', 20, 20, 10, 10);
    store.updateDrag(30, 35);
    const position = store.getCurrentItemPosition();
    assert(position !== null, 'drag position was null');
    store.endDrag();
    store.destroy();
  });
  ctx.pass('created drag store and completed drag cycle');
}

async function runGridTest(mod, ctx) {
  await withPixiCanvas(ctx.mountNode, async (app) => {
    const zoomPan = new Container();
    app.stage.addChild(zoomPan);

    const manager = new mod.GridManager({
      application: app,
      zoomPanContainer: zoomPan,
      gridSpec: {
        grid: { x: 24, y: 24, color: 0x2f3f5f, alpha: 0.7 },
        gridMajor: { x: 120, y: 120, color: 0x5d7bd6, alpha: 0.9 },
        artboard: { x: -160, y: -100, width: 320, height: 200, color: 0xffffff, alpha: 0.5 },
      },
    });

    manager.updateGridSpec({ grid: { x: 28, y: 28, color: 0x3f4f6f, alpha: 0.8 } });
    manager.cleanup();
  });
  ctx.pass('constructed grid manager and updated grid spec');
}

async function runRootContainerTest(mod, ctx) {
  await withPixiCanvas(ctx.mountNode, async (app) => {
    const rootResult = mod.createRootContainer(app);
    app.stage.addChild(rootResult.root);

    const zoomResult = mod.createZoomPan(app, rootResult.root);
    rootResult.root.addChild(zoomResult.zoomPan);

    const sample = new Graphics().rect(-60, -40, 120, 80).fill(0x2563eb);
    zoomResult.zoomPan.addChild(sample);

    const drag = mod.makeStageDraggable(app, zoomResult.zoomPan);
    const zoom = mod.makeStageZoomable(app, zoomResult.zoomPan, { minZoom: 0.5, maxZoom: 2.5 });

    zoom.setZoom(1.15);
    assert(zoom.getZoom() > 1, 'zoom did not change');

    drag.destroy();
    zoom.destroy();
    zoomResult.destroy();
    rootResult.destroy();
  });
  ctx.pass('created root/zoom-pan containers with drag+zoom decorators');
}

async function runResizerTest(mod, ctx) {
  await withPixiCanvas(ctx.mountNode, async (app) => {
    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);

    const frame = new Container();
    frame.position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(frame);

    const scaleCarrier = new Container();
    frame.addChild(scaleCarrier);

    const referenceSpace = new Container();
    scaleCarrier.addChild(referenceSpace);

    const target = new Container();
    referenceSpace.addChild(target);

    const box = new Graphics();
    target.addChild(box);

    const drawRect = (rect) => {
      box.clear();
      box
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill(0x1d4ed8)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
    };

    const initialRect = new Rectangle(-80, -50, 160, 100);
    drawRect(initialRect);

    const handles = mod.enableHandles(target, initialRect, {
      app,
      mode: 'EDGE_AND_CORNER',
      size: 12,
      drawRect,
    });
    handles.setVisible(true);

    scaleCarrier.scale.set(1.75);
    handles.setRect(new Rectangle(-70, -45, 180, 110));
    assert(handles.value.rect.width === 180, 'resizer rect width did not update');

    handles.removeHandles();
    handles.cleanup();
  });
  ctx.pass('created always-visible resizer handles under scaled parent context');
}

async function runResizerSnapTest(mod, ctx) {
  await withPixiCanvas(ctx.mountNode, async (app) => {
    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);

    const frame = new Container();
    frame.position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(frame);

    const scaleCarrier = new Container();
    frame.addChild(scaleCarrier);

    const referenceSpace = new Container();
    scaleCarrier.addChild(referenceSpace);

    const target = new Container();
    referenceSpace.addChild(target);

    const box = new Graphics();
    target.addChild(box);

    const drawRect = (rect) => {
      box.clear();
      box
        .rect(rect.x, rect.y, rect.width, rect.height)
        .fill(0x1d4ed8)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
    };

    const SNAP_GRID = 16;
    const MIN_SIZE = 64;
    const snapValue = (value) => Math.round(value / SNAP_GRID) * SNAP_GRID;
    const snapDimension = (value) => {
      const sign = value < 0 ? -1 : 1;
      const snappedAbs = snapValue(Math.abs(value));
      const roundedAbs = Math.max(SNAP_GRID, snappedAbs);
      const clampedAbs = Math.max(MIN_SIZE, roundedAbs);
      return sign * clampedAbs;
    };
    const snapRect = (rect) => new Rectangle(
      snapValue(rect.x),
      snapValue(rect.y),
      snapDimension(rect.width),
      snapDimension(rect.height),
    );

    const initialRect = new Rectangle(-80, -50, 160, 100);
    drawRect(initialRect);

    let releasedRect = null;
    const handles = mod.enableHandles(target, initialRect, {
      app,
      mode: 'EDGE_AND_CORNER',
      size: 12,
      drawRect,
      rectTransform: ({ rect }) => snapRect(rect),
      onRelease: (rect) => {
        releasedRect = rect;
      },
    });
    handles.setVisible(true);

    const event = { stopPropagation() {} };
    handles.onDragStart(event, mod.HandlePosition.BOTTOM_RIGHT);
    handles.onDragMove(18, 10, event);
    handles.onDragEnd(event);

    assert(handles.value.rect.width === 176, 'snap transform did not round width to 16px grid');
    assert(handles.value.rect.height === 112, 'snap transform did not round height to 16px grid');
    assert(releasedRect?.width === 176 && releasedRect?.height === 112, 'release rect did not use transformed coordinates');

    handles.removeHandles();
    handles.cleanup();
  });
  ctx.pass('created snapping resizer and committed transformed coordinates on release');
}

async function runWindowSnapTest(mod, ctx) {
  await withPixiCanvas(ctx.mountNode, async (app) => {
    assert(typeof mod.WindowsManager === 'function', 'window module missing WindowsManager export');

    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);

    const frame = new Container();
    frame.position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(frame);

    const scaleCarrier = new Container();
    frame.addChild(scaleCarrier);

    const referenceSpace = new Container();
    scaleCarrier.addChild(referenceSpace);

    const SNAP_GRID = 16;
    const MIN_SIZE = 64;
    const snapValue = (value) => Math.round(value / SNAP_GRID) * SNAP_GRID;
    const snapDimension = (value) => {
      const sign = value < 0 ? -1 : 1;
      const snappedAbs = snapValue(Math.abs(value));
      const roundedAbs = Math.max(SNAP_GRID, snappedAbs);
      const clampedAbs = Math.max(MIN_SIZE, roundedAbs);
      return sign * clampedAbs;
    };

    const applyHandleSnap = (rect, handle) => {
      const snapped = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };

      switch (handle) {
        case 'top-left':
          snapped.x = snapValue(rect.x);
          snapped.y = snapValue(rect.y);
          snapped.width = snapDimension(rect.width);
          snapped.height = snapDimension(rect.height);
          break;
        case 'top-center':
          snapped.y = snapValue(rect.y);
          snapped.height = snapDimension(rect.height);
          break;
        case 'top-right':
          snapped.y = snapValue(rect.y);
          snapped.width = snapDimension(rect.width);
          snapped.height = snapDimension(rect.height);
          break;
        case 'middle-left':
          snapped.x = snapValue(rect.x);
          snapped.width = snapDimension(rect.width);
          break;
        case 'middle-right':
          snapped.width = snapDimension(rect.width);
          break;
        case 'bottom-left':
          snapped.x = snapValue(rect.x);
          snapped.width = snapDimension(rect.width);
          snapped.height = snapDimension(rect.height);
          break;
        case 'bottom-center':
          snapped.height = snapDimension(rect.height);
          break;
        case 'bottom-right':
          snapped.width = snapDimension(rect.width);
          snapped.height = snapDimension(rect.height);
          break;
        default:
          snapped.x = snapValue(rect.x);
          snapped.y = snapValue(rect.y);
          snapped.width = snapDimension(rect.width);
          snapped.height = snapDimension(rect.height);
          break;
      }

      return new Rectangle(snapped.x, snapped.y, snapped.width, snapped.height);
    };

    const observedHandles = new Set();
    const manager = new mod.WindowsManager({
      app,
      container: referenceSpace,
    });

    manager.addWindow('snap-window', {
      x: -96,
      y: -64,
      width: 160,
      height: 128,
      isDraggable: true,
      isResizeable: true,
      resizeMode: 'EDGE_AND_CORNER',
      rectTransform: ({ rect, phase, handle }) => {
        if (handle) {
          observedHandles.add(`${phase}:${handle}`);
        }
        return applyHandleSnap(rect, handle);
      },
    });

    const branch = manager.initWindow('snap-window');
    assert(branch, 'window branch was not created');
    manager.setSelectedWindow('snap-window');
    branch.resolveComponents(manager.windowsContainer, manager.handlesContainer);

    const waitForFrame = () => new Promise((resolve) => setTimeout(resolve, 25));
    const eventAt = (x, y) => ({
      global: { x, y },
      stopPropagation() {},
    });

    const dragWindow = async (dx, dy) => {
      const start = branch.rootContainer.getGlobalPosition();
      branch.rootContainer.emit('pointerdown', eventAt(start.x, start.y));
      app.stage.emit('pointermove', eventAt(start.x + dx, start.y + dy));
      await waitForFrame();
      app.stage.emit('pointerup', eventAt(start.x + dx, start.y + dy));
      await waitForFrame();
    };

    await dragWindow(40, 24);
    assert(branch.value.x === -56, 'window drag did not update x');
    assert(branch.value.y === -40, 'window drag did not update y');
    assert(branch.value.x !== 0 && branch.value.y !== 0, 'window drag unexpectedly reset position to origin');

    const dragHandle = (handleLabel, dx, dy) => {
      const handle = manager.handlesContainer.children.find((child) => child.label === `Handle-${handleLabel}`);
      assert(handle, `missing handle ${handleLabel}`);

      const start = handle.getGlobalPosition();

      handle.emit('pointerdown', eventAt(start.x, start.y));
      app.stage.emit('pointermove', eventAt(start.x + dx, start.y + dy));
      app.stage.emit('pointerup', eventAt(start.x + dx, start.y + dy));
    };

    dragHandle('middle-right', 13, 9);
    assert(branch.value.x === -56, 'side-handle snap changed x unexpectedly');
    assert(branch.value.y === -40, 'side-handle snap changed y unexpectedly');
    assert(branch.value.width === 176, 'side-handle snap did not round width to 16px grid');
    assert(branch.value.height === 128, 'side-handle snap changed height unexpectedly');

    dragHandle('bottom-right', 13, 9);
    assert(branch.value.x === -56, 'corner-handle snap changed x unexpectedly');
    assert(branch.value.y === -40, 'corner-handle snap changed y unexpectedly');
    assert(branch.value.width === 192, 'corner-handle snap did not round width to 16px grid');
    assert(branch.value.height === 144, 'corner-handle snap did not round height to 16px grid');

    dragHandle('top-center', 13, -11);
    assert(branch.value.x === -56, 'top-center snap changed x unexpectedly');
    assert(branch.value.y === -48, 'top-center snap did not round y to 16px grid');
    assert(branch.value.width === 192, 'top-center snap changed width unexpectedly');
    assert(branch.value.height === 160, 'top-center snap did not round height to 16px grid');

    assert(observedHandles.has('release:middle-right'), 'rectTransform did not receive middle-right handle');
    assert(observedHandles.has('release:bottom-right'), 'rectTransform did not receive bottom-right handle');
    assert(observedHandles.has('release:top-center'), 'rectTransform did not receive top-center handle');

    manager.removeWindow('snap-window');
  });
  ctx.pass('validated window snapping with handle-specific rectTransform behavior');
}

export const SOURCE_MODES = {
  published: 'published',
  workspace: 'workspace',
};

function createPackageDefinition({
  id,
  title,
  workspaceImport,
  publishedImport,
  description,
  heartbeat,
  publishedLoader,
  workspaceLoader,
}) {
  return {
    id,
    title,
    workspaceImport,
    publishedImport,
    description,
    heartbeat,
    publishedLoader,
    workspaceLoader,
  };
}

export const PACKAGE_DEFINITIONS = [
  createPackageDefinition({
    id: 'root-container',
    title: 'Root Container',
    workspaceImport: '@wonderlandlabs-pixi-ux/root-container',
    publishedImport: '@published/root-container',
    description: 'Root and zoom/pan scaffolding decorators.',
    heartbeat: runRootContainerTest,
    publishedLoader: () => import('@published/root-container'),
    workspaceLoader: () => import('@wonderlandlabs-pixi-ux/root-container'),
  }),
  createPackageDefinition({
    id: 'grid',
    title: 'Grid',
    workspaceImport: '@wonderlandlabs-pixi-ux/grid',
    publishedImport: '@published/grid',
    description: 'Grid manager rendering into a zoom/pan container.',
    heartbeat: runGridTest,
    publishedLoader: () => import('@published/grid'),
    workspaceLoader: () => import('@wonderlandlabs-pixi-ux/grid'),
  }),
  createPackageDefinition({
    id: 'resizer',
    title: 'Resizer',
    workspaceImport: '@wonderlandlabs-pixi-ux/resizer',
    publishedImport: '@published/resizer',
    description: 'Resizable rectangle with always-visible handles in a zoomable context.',
    heartbeat: runResizerTest,
    publishedLoader: () => import('@published/resizer'),
    workspaceLoader: () => import('@wonderlandlabs-pixi-ux/resizer'),
  }),
  createPackageDefinition({
    id: 'resizer-snap',
    title: 'Resizer (Snap)',
    workspaceImport: '@wonderlandlabs-pixi-ux/resizer',
    publishedImport: '@published/resizer',
    description: 'Snapping transform demo with augmented rectangle preview and release commit.',
    heartbeat: runResizerSnapTest,
    publishedLoader: () => import('@published/resizer'),
    workspaceLoader: () => import('@wonderlandlabs-pixi-ux/resizer'),
  }),
  createPackageDefinition({
    id: 'drag',
    title: 'Drag',
    workspaceImport: '@wonderlandlabs-pixi-ux/drag',
    publishedImport: '@published/drag',
    description: 'Drag state tracking with ticker synchronization.',
    heartbeat: runDragTest,
    publishedLoader: () => import('@published/drag'),
    workspaceLoader: () => import('@wonderlandlabs-pixi-ux/drag'),
  }),
  createPackageDefinition({
    id: 'window-snap',
    title: 'Window (Snap)',
    workspaceImport: '@wonderlandlabs-pixi-ux/window',
    publishedImport: '@published/window',
    description: 'Window resize snapping demo with handle-aware rect transforms.',
    heartbeat: runWindowSnapTest,
    publishedLoader: () => import('@published/window'),
    workspaceLoader: () => import('@wonderlandlabs-pixi-ux/window'),
  }),
];

export function resolveSourceLoader(packageDef, sourceMode) {
  if (sourceMode === SOURCE_MODES.published) {
    return packageDef.publishedLoader;
  }
  return packageDef.workspaceLoader;
}

export function sourceImportLabel(packageDef, sourceMode) {
  if (sourceMode === SOURCE_MODES.published) {
    return packageDef.publishedImport;
  }
  return packageDef.workspaceImport;
}

export async function runHeartbeat(packageDef, sourceMode, mountNode) {
  const startedAt = performance.now();
  const steps = [];
  const ctx = {
    mountNode,
    pass(message) {
      steps.push({ type: 'pass', message });
    },
  };

  try {
    const mod = await resolveSourceLoader(packageDef, sourceMode)();
    const exportKeys = Object.keys(mod).sort();
    ctx.pass(`loaded module from ${sourceImportLabel(packageDef, sourceMode)}`);
    assert(exportKeys.length > 0, 'module has no exports');
    ctx.pass(`detected ${exportKeys.length} exports`);
    await packageDef.heartbeat(mod, ctx);

    return {
      status: 'pass',
      steps,
      exportKeys,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      status: 'fail',
      steps,
      exportKeys: [],
      durationMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
