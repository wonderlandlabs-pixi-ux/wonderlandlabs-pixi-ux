import {Point, type Application, type Container} from 'pixi.js';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import type {DirtyOnScale} from './DirtyOnScale.js';
import type {
    DirtyProps,
    MaybeScaleBinding,
    ScalePoint,
    ScaleBinding,
    TickerForestConfig,
} from './types.js';

export function makeDirtyProps(): DirtyProps {
    const state$ = new BehaviorSubject<boolean>(false);
    return {
        state$,
        stream$: state$.pipe(distinctUntilChanged()),
    };
}

export function isScaleBinding(binding: MaybeScaleBinding): binding is ScaleBinding {
    return !!binding.container && !!binding.ticker;
}

export function isPixiApplication(value: TickerForestConfig | Application): value is Application {
    return !!value && typeof value === 'object' && 'ticker' in value && 'renderer' in value;
}

export function isScalePoint(value: unknown): value is ScalePoint {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const point = value as { x?: unknown; y?: unknown };
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function compareScalePoints(
    dirtyOnScale: DirtyOnScale,
    prev: ScalePoint,
    next: ScalePoint,
    epsilon = dirtyOnScale.epsilon ?? 0.0001,
): boolean {
    if (dirtyOnScale.watchX) {
        const xDiff = Math.abs(prev.x - next.x);
        if (xDiff > epsilon) {
            return false;
        }
    }
    if (dirtyOnScale.watchY) {
        const yDiff = Math.abs(prev.y - next.y);
        if (yDiff > epsilon) {
            return false;
        }
    }
    return true;
}

export function resolveRootParent(container: Container): Container | undefined {
    let root = container.parent ?? undefined;
    while (root?.parent) {
        root = root.parent;
    }
    return root;
}

export function readScalePoint(container?: Container): ScalePoint | undefined {
    if (!container) {
        return undefined;
    }
    const rootParent = resolveRootParent(container);
    if (!rootParent) {
        return undefined;
    }

    const origin = rootParent.toLocal(container.toGlobal({x: 0, y: 0}));
    const xAxis = rootParent.toLocal(container.toGlobal({x: 1, y: 0}));
    const yAxis = rootParent.toLocal(container.toGlobal({x: 0, y: 1}));

    const scaleX = Math.hypot(xAxis.x - origin.x, xAxis.y - origin.y);
    const scaleY = Math.hypot(yAxis.x - origin.x, yAxis.y - origin.y);
    return new Point(scaleX || 1, scaleY || 1);
}

function canInvertValue(n: unknown): n is number {
    return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function canInvertScale(scale?: unknown): scale is ScalePoint {
    if (!isScalePoint(scale)) {
        return false;
    }
    return canInvertValue(scale.x) && canInvertValue(scale.y);
}

export function inverseScalePoint(container?: Container): ScalePoint {
    if (!container) {
        return new Point(1, 1);
    }
    const scale = readScalePoint(container);
    if (!canInvertScale(scale)) {
        return new Point(1, 1);
    }
    return new Point(1 / scale.x, 1 / scale.y);
}
