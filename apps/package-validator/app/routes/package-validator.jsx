import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  PACKAGE_DEFINITIONS,
  SOURCE_MODES,
  resolveSourceLoader,
} from "../../src/packageHeartbeats.js";
import { Application, Container, Graphics, Rectangle } from "pixi.js";
import { FiArrowDown, FiArrowLeft, FiArrowRight, FiArrowUp, FiRotateCcw } from "react-icons/fi";

const SOURCE_LIST = [SOURCE_MODES.published, SOURCE_MODES.workspace];

function routePath(packageId, sourceMode) {
  return `/${packageId}/${sourceMode}`;
}

function addDemoGeometry(target) {
  const axis = new Graphics();
  axis
    .moveTo(-280, 0)
    .lineTo(280, 0)
    .moveTo(0, -140)
    .lineTo(0, 140)
    .stroke({ width: 2, color: 0x38bdf8, alpha: 0.8 });

  const rect = new Graphics();
  rect
    .rect(-70, -50, 140, 100)
    .fill(0x1d4ed8)
    .stroke({ width: 3, color: 0xffffff, alpha: 0.7 });

  const circle = new Graphics();
  circle
    .circle(130, 0, 36)
    .fill(0x14b8a6)
    .stroke({ width: 2, color: 0xe2e8f0, alpha: 0.9 });

  const triangle = new Graphics();
  triangle
    .poly([-120, 65, -80, 118, -160, 118])
    .fill(0xf59e0b)
    .stroke({ width: 2, color: 0x1f2937, alpha: 1 });

  target.addChild(axis, rect, circle, triangle);
}

function resolveRoute(packageId, sourceMode) {
  const safePackageId = PACKAGE_DEFINITIONS.some((pkg) => pkg.id === packageId)
    ? packageId
    : PACKAGE_DEFINITIONS[0].id;
  const safeSourceMode = SOURCE_LIST.includes(sourceMode) ? sourceMode : SOURCE_MODES.published;
  return { packageId: safePackageId, sourceMode: safeSourceMode };
}

function createDemoObserver(setDemo, readState) {
  return () => {
    const next = readState();
    setDemo({
      status: "ready",
      zoom: next.zoom,
      x: next.x,
      y: next.y,
      error: null,
    });
  };
}

function createDemoController({ observe, onSetZoom, onPanBy, onResetView, onDestroy }) {
  return {
    setZoom(value) {
      onSetZoom?.(value);
      observe();
    },
    panBy(dx, dy) {
      onPanBy(dx, dy);
      observe();
    },
    resetView() {
      onResetView();
      observe();
    },
    destroy() {
      onDestroy();
    },
  };
}

function DemoStats({ x, y, compact = false }) {
  const className = compact ? "demo-stats demo-stats-compact" : "demo-stats";
  return (
    <div className={className}>
      <span>X: {x}</span>
      <span>Y: {y}</span>
    </div>
  );
}

export default function PackageValidatorRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const rootDemoMountRef = useRef(null);
  const rootDemoApiRef = useRef(null);
  const [demo, setDemo] = useState({
    status: "idle",
    zoom: 1,
    x: 0,
    y: 0,
    error: null,
  });
  const [dragStep, setDragStep] = useState(20);

  const resolvedRoute = resolveRoute(params.packageId, params.sourceMode);
  const selected = useMemo(
    () => PACKAGE_DEFINITIONS.find((pkg) => pkg.id === resolvedRoute.packageId) || PACKAGE_DEFINITIONS[0],
    [resolvedRoute.packageId],
  );
  const selectedSourceMode = resolvedRoute.sourceMode;
  const selectedPackageId = selected.id;
  const isDragRoute = selectedPackageId === "drag";

  useEffect(() => {
    if (params.packageId !== resolvedRoute.packageId || params.sourceMode !== resolvedRoute.sourceMode) {
      navigate(routePath(resolvedRoute.packageId, resolvedRoute.sourceMode), { replace: true });
    }
  }, [navigate, params.packageId, params.sourceMode, resolvedRoute.packageId, resolvedRoute.sourceMode]);

  useEffect(() => {
    const api = rootDemoApiRef.current;
    if (api) {
      api.destroy();
      rootDemoApiRef.current = null;
    }
    if (rootDemoMountRef.current) {
      rootDemoMountRef.current.innerHTML = "";
    }

    let cancelled = false;

    async function setupDemo() {
      setDemo({ status: "loading", zoom: 1, x: 0, y: 0, error: null });

      const mountNode = rootDemoMountRef.current;
      if (!mountNode) {
        return;
      }

      try {
        const mod = await resolveSourceLoader(selected, selectedSourceMode)();
        const app = new Application();
        mountNode.innerHTML = "";
        await app.init({
          resizeTo: mountNode,
          antialias: true,
          backgroundColor: 0x0f172a,
        });

        if (cancelled) {
          app.destroy(true);
          return;
        }

        app.canvas.style.display = "block";
        mountNode.appendChild(app.canvas);

        if (selectedPackageId === "root-container") {
          const rootResult = mod.createRootContainer(app);
          app.stage.addChild(rootResult.root);
          const zoomResult = mod.createZoomPan(app, rootResult.root);
          rootResult.root.addChild(zoomResult.zoomPan);
          addDemoGeometry(zoomResult.zoomPan);

          const drag = mod.makeStageDraggable(app, zoomResult.zoomPan);
          const zoom = mod.makeStageZoomable(app, zoomResult.zoomPan, { minZoom: 0.25, maxZoom: 2.5, zoomSpeed: 0.08 });

          const observe = createDemoObserver(setDemo, () => ({
            zoom: Number(zoom.getZoom().toFixed(2)),
            x: Math.round(zoomResult.zoomPan.position.x),
            y: Math.round(zoomResult.zoomPan.position.y),
          }));
          observe();

          rootDemoApiRef.current = createDemoController({
            observe,
            onSetZoom(value) {
              zoom.setZoom(value);
            },
            onPanBy(dx, dy) {
              zoomResult.zoomPan.position.set(zoomResult.zoomPan.position.x + dx, zoomResult.zoomPan.position.y + dy);
            },
            onResetView() {
              zoom.setZoom(1);
              zoomResult.zoomPan.position.set(0, 0);
            },
            onDestroy() {
              drag.destroy();
              zoom.destroy();
              zoomResult.destroy();
              rootResult.destroy();
              app.destroy(true);
              if (mountNode) {
                mountNode.innerHTML = "";
              }
            },
          });
          return;
        }

        if (selectedPackageId === "grid") {
          const zoomPan = new Container();
          app.stage.addChild(zoomPan);
          addDemoGeometry(zoomPan);

          const manager = new mod.GridManager({
            application: app,
            zoomPanContainer: zoomPan,
            cache: {
              enabled: true,
              resolution: 2,
              antialias: true,
              debug: { logIntervalMs: 250 },
            },
            gridSpec: {
              grid: { x: 24, y: 24, color: 0x2f3f5f, alpha: 0.7 },
              gridMajor: { x: 120, y: 120, color: 0x5d7bd6, alpha: 0.9 },
              artboard: { x: -160, y: -100, width: 320, height: 200, color: 0xffffff, alpha: 0.6 },
            },
          });

          const emitZoom = () => app.stage.emit("stage-zoom");
          const emitDrag = () => app.stage.emit("stage-drag");
          const observe = createDemoObserver(setDemo, () => ({
            zoom: Number(zoomPan.scale.x.toFixed(2)),
            x: Math.round(zoomPan.position.x),
            y: Math.round(zoomPan.position.y),
          }));
          observe();

          rootDemoApiRef.current = createDemoController({
            observe,
            onSetZoom(value) {
              zoomPan.scale.set(value);
              emitZoom();
            },
            onPanBy(dx, dy) {
              zoomPan.position.set(zoomPan.position.x + dx, zoomPan.position.y + dy);
              emitDrag();
            },
            onResetView() {
              zoomPan.scale.set(1);
              zoomPan.position.set(0, 0);
              emitZoom();
              emitDrag();
            },
            onDestroy() {
              manager.cleanup();
              app.destroy(true);
              if (mountNode) {
                mountNode.innerHTML = "";
              }
            },
          });
          return;
        }

        if (selectedPackageId === "drag") {
          const square = new Graphics().rect(-35, -35, 70, 70).fill(0x1d4ed8).stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
          square.position.set(app.screen.width / 2, app.screen.height / 2);
          app.stage.addChild(square);

          let pointerX = 0;
          let pointerY = 0;
          const observe = createDemoObserver(setDemo, () => ({
            zoom: 1,
            x: Math.round(square.position.x),
            y: Math.round(square.position.y),
          }));
          const store = new mod.DragStore({
            app,
            callbacks: {
              onDrag(state) {
                square.position.set(state.initialItemX + state.deltaX, state.initialItemY + state.deltaY);
                observe();
              },
              onDragEnd() {
                observe();
              },
            },
          });

          observe();

          rootDemoApiRef.current = createDemoController({
            observe,
            onSetZoom() {},
            onPanBy(dx, dy) {
              if (!store.value.isDragging) {
                store.startDrag("demo-item", pointerX, pointerY, square.position.x, square.position.y);
              }
              pointerX += dx;
              pointerY += dy;
              store.updateDrag(pointerX, pointerY);
              const position = store.getCurrentItemPosition();
              if (position) {
                square.position.set(position.x, position.y);
              }
            },
            onResetView() {
              store.cancelDrag();
              pointerX = 0;
              pointerY = 0;
              square.position.set(app.screen.width / 2, app.screen.height / 2);
            },
            onDestroy() {
              store.destroy();
              app.destroy(true);
              if (mountNode) {
                mountNode.innerHTML = "";
              }
            },
          });
          return;
        }

        if (selectedPackageId === "resizer") {
          app.stage.eventMode = "static";
          app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);

          const frame = new Container();
          frame.position.set(app.screen.width / 2, app.screen.height / 2);
          app.stage.addChild(frame);

          // Keep scale on an ancestor that is not the target's direct parent.
          const scaleCarrier = new Container();
          frame.addChild(scaleCarrier);

          const referenceSpace = new Container();
          scaleCarrier.addChild(referenceSpace);
          addDemoGeometry(referenceSpace);

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
            mode: "EDGE_AND_CORNER",
            size: 12,
            drawRect,
          });
          handles.setVisible(true);

          const observe = createDemoObserver(setDemo, () => ({
            zoom: Number(scaleCarrier.scale.x.toFixed(2)),
            x: Math.round(frame.position.x),
            y: Math.round(frame.position.y),
          }));
          observe();

          rootDemoApiRef.current = createDemoController({
            observe,
            onSetZoom(value) {
              scaleCarrier.scale.set(value);
            },
            onPanBy(dx, dy) {
              frame.position.set(frame.position.x + dx, frame.position.y + dy);
            },
            onResetView() {
              scaleCarrier.scale.set(1);
              frame.position.set(app.screen.width / 2, app.screen.height / 2);
            },
            onDestroy() {
              handles.removeHandles();
              handles.cleanup();
              app.destroy(true);
              if (mountNode) {
                mountNode.innerHTML = "";
              }
            },
          });
          return;
        }

        if (selectedPackageId === "resizer-snap") {
          app.stage.eventMode = "static";
          app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);

          const frame = new Container();
          frame.position.set(app.screen.width / 2, app.screen.height / 2);
          app.stage.addChild(frame);

          // Keep scale on an ancestor that is not the target's direct parent.
          const scaleCarrier = new Container();
          frame.addChild(scaleCarrier);

          const referenceSpace = new Container();
          scaleCarrier.addChild(referenceSpace);
          addDemoGeometry(referenceSpace);

          const target = new Container();
          referenceSpace.addChild(target);

          const box = new Graphics();
          const augmented = new Graphics();
          target.addChild(box, augmented);
          let marchingRect = null;
          let marchingPhase = 0;
          const ANT_SPACING = 8;

          const normalizeRect = (rect) => {
            const x = rect.width >= 0 ? rect.x : rect.x + rect.width;
            const y = rect.height >= 0 ? rect.y : rect.y + rect.height;
            return { x, y, width: Math.abs(rect.width), height: Math.abs(rect.height) };
          };

          const getPerimeterPoint = (rect, distance) => {
            const { x, y, width, height } = normalizeRect(rect);
            const top = width;
            const right = top + height;
            const bottom = right + width;

            if (distance <= top) return { x: x + distance, y };
            if (distance <= right) return { x: x + width, y: y + (distance - top) };
            if (distance <= bottom) return { x: x + width - (distance - right), y: y + height };
            return { x, y: y + height - (distance - bottom) };
          };

          const drawMarchingAnts = () => {
            augmented.clear();
            if (!marchingRect) return;
            const normalized = normalizeRect(marchingRect);
            const perimeter = 2 * (normalized.width + normalized.height);
            if (perimeter <= 0) return;

            for (let d = 0; d <= perimeter; d += ANT_SPACING) {
              const point = getPerimeterPoint(marchingRect, d);
              const offsetIndex = Math.floor((d + marchingPhase) / ANT_SPACING) % 2;
              const color = offsetIndex === 0 ? 0x9ca3af : 0x6b7280;
              augmented.circle(point.x, point.y, 1.4).fill({ color, alpha: 0.95 });
            }
          };

          const onMarchingAntsTick = () => {
            if (!marchingRect) return;
            marchingPhase = (marchingPhase + 1) % (ANT_SPACING * 2);
            drawMarchingAnts();
          };

          app.ticker.add(onMarchingAntsTick);

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
            mode: "EDGE_AND_CORNER",
            size: 12,
            drawRect,
            rectTransform: ({ rect }) => snapRect(rect),
            onTransformedRect: (_rawRect, transformedRect, phase) => {
              if (phase !== "drag") {
                marchingRect = null;
                drawMarchingAnts();
                return;
              }
              marchingRect = new Rectangle(
                transformedRect.x,
                transformedRect.y,
                transformedRect.width,
                transformedRect.height,
              );
              drawMarchingAnts();
            },
            onRelease: () => {
              marchingRect = null;
              drawMarchingAnts();
            },
          });
          handles.setVisible(true);

          const observe = createDemoObserver(setDemo, () => ({
            zoom: Number(scaleCarrier.scale.x.toFixed(2)),
            x: Math.round(frame.position.x),
            y: Math.round(frame.position.y),
          }));
          observe();

          rootDemoApiRef.current = createDemoController({
            observe,
            onSetZoom(value) {
              scaleCarrier.scale.set(value);
            },
            onPanBy(dx, dy) {
              frame.position.set(frame.position.x + dx, frame.position.y + dy);
            },
            onResetView() {
              scaleCarrier.scale.set(1);
              frame.position.set(app.screen.width / 2, app.screen.height / 2);
            },
            onDestroy() {
              app.ticker.remove(onMarchingAntsTick);
              handles.removeHandles();
              handles.cleanup();
              app.destroy(true);
              if (mountNode) {
                mountNode.innerHTML = "";
              }
            },
          });
          return;
        }

        if (selectedPackageId === "window-snap") {
          app.stage.eventMode = "static";
          app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);

          const frame = new Container();
          frame.position.set(app.screen.width / 2, app.screen.height / 2);
          app.stage.addChild(frame);

          const scaleCarrier = new Container();
          frame.addChild(scaleCarrier);

          const referenceSpace = new Container();
          scaleCarrier.addChild(referenceSpace);
          addDemoGeometry(referenceSpace);

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
              case "top-left":
                snapped.x = snapValue(rect.x);
                snapped.y = snapValue(rect.y);
                snapped.width = snapDimension(rect.width);
                snapped.height = snapDimension(rect.height);
                break;
              case "top-center":
                snapped.y = snapValue(rect.y);
                snapped.height = snapDimension(rect.height);
                break;
              case "top-right":
                snapped.y = snapValue(rect.y);
                snapped.width = snapDimension(rect.width);
                snapped.height = snapDimension(rect.height);
                break;
              case "middle-left":
                snapped.x = snapValue(rect.x);
                snapped.width = snapDimension(rect.width);
                break;
              case "middle-right":
                snapped.width = snapDimension(rect.width);
                break;
              case "bottom-left":
                snapped.x = snapValue(rect.x);
                snapped.width = snapDimension(rect.width);
                snapped.height = snapDimension(rect.height);
                break;
              case "bottom-center":
                snapped.height = snapDimension(rect.height);
                break;
              case "bottom-right":
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

          const windows = new mod.WindowsManager({
            app,
            container: referenceSpace,
          });

          windows.addWindow("snap-window", {
            x: -96,
            y: -64,
            width: 160,
            height: 128,
            isDraggable: true,
            isResizeable: true,
            resizeMode: "EDGE_AND_CORNER",
            titlebar: { title: "Snap Window" },
            rectTransform: ({ rect, handle }) => applyHandleSnap(rect, handle),
          });

          const branch = windows.initWindow("snap-window");
          windows.setSelectedWindow("snap-window");
          branch?.resolveComponents(windows.windowsContainer, windows.handlesContainer);

          const observe = createDemoObserver(setDemo, () => ({
            zoom: Number(scaleCarrier.scale.x.toFixed(2)),
            x: Math.round(frame.position.x),
            y: Math.round(frame.position.y),
          }));
          observe();

          rootDemoApiRef.current = createDemoController({
            observe,
            onSetZoom(value) {
              scaleCarrier.scale.set(value);
            },
            onPanBy(dx, dy) {
              frame.position.set(frame.position.x + dx, frame.position.y + dy);
            },
            onResetView() {
              scaleCarrier.scale.set(1);
              frame.position.set(app.screen.width / 2, app.screen.height / 2);
              windows.setSelectedWindow("snap-window");
            },
            onDestroy() {
              windows.removeWindow("snap-window");
              app.destroy(true);
              if (mountNode) {
                mountNode.innerHTML = "";
              }
            },
          });
          return;
        }
      } catch (error) {
        if (!cancelled) {
          setDemo({
            status: "fail",
            zoom: 1,
            x: 0,
            y: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    setupDemo();

    return () => {
      cancelled = true;
      const currentApi = rootDemoApiRef.current;
      if (currentApi) {
        currentApi.destroy();
        rootDemoApiRef.current = null;
      }
    };
  }, [selected, selectedSourceMode, selectedPackageId]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <nav>
          {PACKAGE_DEFINITIONS.map((pkg) => {
            return (
              <div key={pkg.id} className="nav-group">
                <div className="nav-title" title={pkg.workspaceImport}>{pkg.id}</div>
                <div className="nav-links-row">
                  <Link
                    to={routePath(pkg.id, SOURCE_MODES.published)}
                    className={`nav-link nav-link-compact ${
                      selected.id === pkg.id && selectedSourceMode === SOURCE_MODES.published ? "active" : ""
                    }`}
                  >
                    <span>published</span>
                  </Link>
                  <Link
                    to={routePath(pkg.id, SOURCE_MODES.workspace)}
                    className={`nav-link nav-link-compact ${
                      selected.id === pkg.id && selectedSourceMode === SOURCE_MODES.workspace ? "active" : ""
                    }`}
                  >
                    <span>workspace</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="content">
        <div className="content-top">
          <header className="content-header">
            <h2>{selected.workspaceImport}</h2>
          </header>
          <div className="source-tabs">
            <Link
              to={routePath(selected.id, SOURCE_MODES.published)}
              className={`source-tab ${selectedSourceMode === SOURCE_MODES.published ? "active" : ""}`}
            >
              published
            </Link>
            <Link
              to={routePath(selected.id, SOURCE_MODES.workspace)}
              className={`source-tab ${selectedSourceMode === SOURCE_MODES.workspace ? "active" : ""}`}
            >
              workspace
            </Link>
          </div>
        </div>

        <section className="demo-panel">
          <div className="demo-controls">
            <div className="control-split">
              <div className="zoom-controls">
                <label className="zoom-label" htmlFor="zoom-slider">
                  {isDragRoute ? `Step: ${dragStep}px` : `Zoom: ${demo.zoom.toFixed(2)}x`}
                </label>
                <input
                  id="zoom-slider"
                  type="range"
                  min={isDragRoute ? "5" : "0.25"}
                  max={isDragRoute ? "60" : "2.5"}
                  step={isDragRoute ? "1" : "0.01"}
                  value={isDragRoute ? dragStep : demo.zoom}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (isDragRoute) {
                      setDragStep(nextValue);
                      return;
                    }
                    rootDemoApiRef.current?.setZoom(nextValue);
                  }}
                  disabled={demo.status !== "ready"}
                />
              </div>
              <div className="pan-controls">
                <div className="pan-buttons">
                  <div className="pan-pad" role="group" aria-label="Pan controls">
                    <button
                      type="button"
                      className="icon-button pan-up"
                      onClick={() => rootDemoApiRef.current?.panBy(0, -(isDragRoute ? dragStep : 20))}
                      disabled={demo.status !== "ready"}
                      aria-label="Pan up"
                      title="Pan up"
                    >
                      <FiArrowUp />
                    </button>
                    <button
                      type="button"
                      className="icon-button pan-left"
                      onClick={() => rootDemoApiRef.current?.panBy(-(isDragRoute ? dragStep : 20), 0)}
                      disabled={demo.status !== "ready"}
                      aria-label="Pan left"
                      title="Pan left"
                    >
                      <FiArrowLeft />
                    </button>
                    <button
                      type="button"
                      className="icon-button pan-right"
                      onClick={() => rootDemoApiRef.current?.panBy(isDragRoute ? dragStep : 20, 0)}
                      disabled={demo.status !== "ready"}
                      aria-label="Pan right"
                      title="Pan right"
                    >
                      <FiArrowRight />
                    </button>
                    <button
                      type="button"
                      className="icon-button pan-down"
                      onClick={() => rootDemoApiRef.current?.panBy(0, isDragRoute ? dragStep : 20)}
                      disabled={demo.status !== "ready"}
                      aria-label="Pan down"
                      title="Pan down"
                    >
                      <FiArrowDown />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="icon-button reset-button"
                    onClick={() => rootDemoApiRef.current?.resetView()}
                    disabled={demo.status !== "ready"}
                    aria-label="Reset view"
                    title="Reset view"
                  >
                    <FiRotateCcw />
                  </button>
                  <DemoStats x={demo.x} y={demo.y} compact />
                </div>
              </div>
            </div>
            {demo.error && (
              <div className="error-box">
                <strong>Demo Error:</strong> {demo.error}
              </div>
            )}
          </div>
          <div className="pixi-mount" ref={rootDemoMountRef} />
        </section>
      </main>
    </div>
  );
}
