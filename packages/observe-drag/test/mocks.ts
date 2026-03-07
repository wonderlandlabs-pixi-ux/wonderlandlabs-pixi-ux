import {fromEventPattern, Observable} from 'rxjs';
import type {
    PixiApplicationLike,
    PixiEventLike,
    PixiEventName,
    PixiEventTargetLike,
} from '../src/type';

export class MockPixiEventTarget<TEvent extends PixiEventLike> implements PixiEventTargetLike<TEvent> {
    #listeners = new Map<PixiEventName, Set<(event: TEvent) => void>>();

    addEventListener(type: PixiEventName, listener: (event: TEvent) => void): void {
        if (!this.#listeners.has(type)) {
            this.#listeners.set(type, new Set());
        }
        this.#listeners.get(type)!.add(listener);
    }

    removeEventListener(type: PixiEventName, listener: (event: TEvent) => void): void {
        this.#listeners.get(type)?.delete(listener);
    }

    emit(type: PixiEventName, event: TEvent): void {
        const listeners = this.#listeners.get(type);
        if (!listeners) {
            return;
        }
        for (const listener of [...listeners]) {
            listener(event);
        }
    }

    event$(type: PixiEventName): Observable<TEvent> {
        return fromEventPattern<TEvent>(
            (handler) => this.addEventListener(type, handler as (event: TEvent) => void),
            (handler) => this.removeEventListener(type, handler as (event: TEvent) => void),
        );
    }
}

export type MockPointerApp<TEvent extends PixiEventLike> = PixiApplicationLike<TEvent> & {
    stage: MockPixiEventTarget<TEvent>;
};

export function createMockPixiEventTarget<TEvent extends PixiEventLike>(): MockPixiEventTarget<TEvent> {
    return new MockPixiEventTarget<TEvent>();
}

export function createMockPointerApp<TEvent extends PixiEventLike>(): MockPointerApp<TEvent> {
    const stage = createMockPixiEventTarget<TEvent>();
    return {stage};
}
