import {describe, expect, it} from 'vitest';
import {Subject} from 'rxjs';
import observeDrag from '../src/observe-drag';
import type {PixiEventLike} from '../src/type';
import {POINTER_EVT_DOWN, POINTER_EVT_MOVE, POINTER_EVT_UP} from '../src/constants';
import {createMockPixiEventTarget, createMockPointerApp} from './mocks';

type TestPixiEvent = PixiEventLike;

describe('observeDrag', () => {
    it('locks to first pointerdown and ignores other owners until active pointer completes', () => {
        const app = createMockPointerApp<TestPixiEvent>();
        const {stage} = app;
        const subscribeToDown = observeDrag<TestPixiEvent>(app);

        const targetA = createMockPixiEventTarget<TestPixiEvent>();
        const targetB = createMockPixiEventTarget<TestPixiEvent>();

        const moveA$ = new Subject<TestPixiEvent>();
        const moveB$ = new Subject<TestPixiEvent>();

        const seenA: number[] = [];
        const seenB: number[] = [];
        // Also validate the reusable fromEventPattern adapter on mocks.
        const seenStageMoves: number[] = [];
        const stageMoveSub = stage.event$(POINTER_EVT_MOVE).subscribe((event) => seenStageMoves.push(event.pointerId));
        moveA$.subscribe((event) => seenA.push(event.pointerId));
        moveB$.subscribe((event) => seenB.push(event.pointerId));

        const subA = subscribeToDown(targetA, moveA$);
        const subB = subscribeToDown(targetB, moveB$);

        targetA.emit(POINTER_EVT_DOWN, {pointerId: 1});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 1});
        expect(seenA).toEqual([1]);

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        expect(seenB).toEqual([]);

        stage.emit(POINTER_EVT_UP, {pointerId: 1});

        targetB.emit(POINTER_EVT_DOWN, {pointerId: 2});
        stage.emit(POINTER_EVT_MOVE, {pointerId: 2});
        expect(seenB).toEqual([2]);
        expect(seenStageMoves).toEqual([1, 2, 2]);

        subA.unsubscribe();
        subB.unsubscribe();
        stageMoveSub.unsubscribe();
    });
});
