import {Point, type Container} from 'pixi.js';

function resolveRootParent(container: Container): Container | undefined {
  let root = container.parent ?? undefined;
  while (root?.parent) {
    root = root.parent;
  }
  return root;
}

export function readScalePoint(container?: Container): Point | undefined {
  if (!container) {
    return undefined;
  }
  const rootParent = resolveRootParent(container);
  if (!rootParent) {
    return undefined;
  }

  const origin = rootParent.toLocal(container.toGlobal({ x: 0, y: 0 }));
  const xAxis = rootParent.toLocal(container.toGlobal({ x: 1, y: 0 }));
  const yAxis = rootParent.toLocal(container.toGlobal({ x: 0, y: 1 }));

  const scaleX = Math.hypot(xAxis.x - origin.x, xAxis.y - origin.y);
  const scaleY = Math.hypot(yAxis.x - origin.x, yAxis.y - origin.y);
  return new Point(scaleX || 1, scaleY || 1);
}
