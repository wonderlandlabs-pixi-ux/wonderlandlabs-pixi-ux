import type { CaptionShape, CaptionThoughtConfig, Point } from './types.js';

export type TrianglePoints = [Point, Point, Point];
export interface ThoughtScallop {
    x: number;
    y: number;
    radius: number;
    angle: number;
}

interface PointerTriangleInput {
    shape: CaptionShape;
    width: number;
    height: number;
    speaker: Point;
    baseWidth: number;
    length?: number;
}

function centerOf(width: number, height: number): Point {
    return { x: width / 2, y: height / 2 };
}

function normalize(dx: number, dy: number): Point | null {
    const mag = Math.hypot(dx, dy);
    if (mag <= 1e-6) return null;
    return { x: dx / mag, y: dy / mag };
}

function pointInsideRect(width: number, height: number, point: Point): boolean {
    return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}

function pointInsideEllipse(width: number, height: number, point: Point): boolean {
    const c = centerOf(width, height);
    const rx = width / 2;
    const ry = height / 2;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (point.x - c.x) / rx;
    const ny = (point.y - c.y) / ry;
    return (nx * nx + ny * ny) <= 1;
}

export function getThoughtScallops(
    width: number,
    height: number,
    thought: CaptionThoughtConfig
): ThoughtScallop[] {
    if (width <= 0 || height <= 0) {
        return [];
    }

    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2;
    const ry = height / 2;
    const base = Math.min(width, height);
    const r = Math.max(1, base * thought.edgeCircleRadiusRatio);
    const count = Math.max(3, Math.round(thought.edgeCircleCount));
    const scallops: ThoughtScallop[] = [];

    for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        const bx = cx + rx * Math.cos(angle);
        const by = cy + ry * Math.sin(angle);

        const nxRaw = Math.cos(angle) / Math.max(1e-6, rx);
        const nyRaw = Math.sin(angle) / Math.max(1e-6, ry);
        const mag = Math.hypot(nxRaw, nyRaw) || 1;
        const nx = nxRaw / mag;
        const ny = nyRaw / mag;
        const offset = r * thought.edgeCircleOutsetRatio;

        scallops.push({
            x: bx + nx * offset,
            y: by + ny * offset,
            radius: r,
            angle,
        });
    }

    return scallops;
}

export function getRectBoundaryPoint(width: number, height: number, target: Point): Point {
    const c = centerOf(width, height);
    const dx = target.x - c.x;
    const dy = target.y - c.y;

    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
        return c;
    }

    const tx = Math.abs(dx) > 1e-6 ? (width / 2) / Math.abs(dx) : Number.POSITIVE_INFINITY;
    const ty = Math.abs(dy) > 1e-6 ? (height / 2) / Math.abs(dy) : Number.POSITIVE_INFINITY;
    const t = Math.min(tx, ty);
    return {
        x: c.x + dx * t,
        y: c.y + dy * t,
    };
}

export function getEllipseBoundaryPoint(width: number, height: number, target: Point): Point {
    const c = centerOf(width, height);
    const angle = Math.atan2(target.y - c.y, target.x - c.x);
    return {
        x: c.x + (width / 2) * Math.cos(angle),
        y: c.y + (height / 2) * Math.sin(angle),
    };
}

export function computePointerTriangle(input: PointerTriangleInput): TrianglePoints | null {
    const {
        shape,
        width,
        height,
        speaker,
        baseWidth,
    } = input;

    if (width <= 0 || height <= 0 || baseWidth <= 0) {
        return null;
    }

    const ellipseLike = shape === 'oval' || shape === 'thought';
    const inside = ellipseLike
        ? pointInsideEllipse(width, height, speaker)
        : pointInsideRect(width, height, speaker);
    if (inside) {
        return null;
    }

    const c = centerOf(width, height);
    const direction = normalize(speaker.x - c.x, speaker.y - c.y);
    if (!direction) {
        return null;
    }

    const anchor = ellipseLike
        ? getEllipseBoundaryPoint(width, height, speaker)
        : getRectBoundaryPoint(width, height, speaker);
    const tangent = { x: -direction.y, y: direction.x };
    const half = baseWidth / 2;

    if (Math.hypot(speaker.x - anchor.x, speaker.y - anchor.y) <= 1e-6) {
        return null;
    }

    const left: Point = {
        x: anchor.x + tangent.x * half,
        y: anchor.y + tangent.y * half,
    };
    const right: Point = {
        x: anchor.x - tangent.x * half,
        y: anchor.y - tangent.y * half,
    };
    const tip: Point = {
        x: speaker.x,
        y: speaker.y,
    };

    return [left, right, tip];
}

export function triangleToPathPoints(triangle: TrianglePoints): number[] {
    return [
        triangle[0].x, triangle[0].y,
        triangle[1].x, triangle[1].y,
        triangle[2].x, triangle[2].y,
    ];
}
