import { describe, expect, it } from 'vitest';
import {
    computePointerTriangle,
    getEllipseBoundaryPoint,
    getRectBoundaryPoint,
    getThoughtScallops,
} from './geometry.js';

describe('caption geometry', () => {
    it('gets an ellipse boundary point toward speaker', () => {
        const p = getEllipseBoundaryPoint(120, 80, { x: 200, y: 40 });
        expect(p.x).toBeCloseTo(120, 4);
        expect(p.y).toBeCloseTo(40, 4);
    });

    it('gets a rectangle boundary point toward speaker', () => {
        const p = getRectBoundaryPoint(120, 80, { x: 60, y: -200 });
        expect(p.x).toBeCloseTo(60, 4);
        expect(p.y).toBeCloseTo(0, 4);
    });

    it('builds pointer triangle toward speaker for oval', () => {
        const speaker = { x: 200, y: 40 };
        const triangle = computePointerTriangle({
            shape: 'oval',
            width: 120,
            height: 80,
            speaker,
            baseWidth: 14,
            length: 24,
        });

        expect(triangle).not.toBeNull();
        if (!triangle) return;
        const tip = triangle[2];
        expect(tip.x).toBeCloseTo(speaker.x, 6);
        expect(tip.y).toBeCloseTo(speaker.y, 6);
    });

    it('returns null when speaker is inside bubble', () => {
        const triangle = computePointerTriangle({
            shape: 'rect',
            width: 120,
            height: 80,
            speaker: { x: 40, y: 40 },
            baseWidth: 12,
            length: 20,
        });
        expect(triangle).toBeNull();
    });

    it('creates perimeter scallops for thought bubbles', () => {
        const scallops = getThoughtScallops(400, 200, {
            edgeCircleCount: 20,
            edgeCircleRadiusRatio: 0.1,
            edgeCircleOutsetRatio: 0.45,
        });

        expect(scallops.length).toBe(20);
        expect(scallops[0].radius).toBeCloseTo(20, 6);
    });

    it('treats thought bubble as ellipse-like for pointer anchor', () => {
        const triangle = computePointerTriangle({
            shape: 'thought',
            width: 120,
            height: 80,
            speaker: { x: 220, y: 40 },
            baseWidth: 14,
            length: 24,
        });
        expect(triangle).not.toBeNull();
    });
});
