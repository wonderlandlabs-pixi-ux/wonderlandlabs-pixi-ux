import type {DirtyOnScaleInput, DirtyOnScaleOptions, ScalePoint} from './types.js';
import {compareScalePoints} from './helpers.js';

export class DirtyOnScale {
    readonly watchX: boolean;
    readonly watchY: boolean;
    readonly epsilon?: number;

    constructor(options: DirtyOnScaleOptions = {}) {
        this.watchX = Boolean(options.watchX);
        this.watchY = Boolean(options.watchY);
        this.epsilon = Number.isFinite(options.epsilon) ? options.epsilon : undefined;
    }

    get enabled(): boolean {
        return this.watchX || this.watchY;
    }

    static from(input?: DirtyOnScaleInput): DirtyOnScale {
        if (input instanceof DirtyOnScale) {
            return input;
        }
        if (!input) {
            return new DirtyOnScale({watchX: false, watchY: false});
        }
        if (input === true) {
            return new DirtyOnScale({watchX: true, watchY: true});
        }
        return new DirtyOnScale(input);
    }

    static compare(dirtyOnScale: DirtyOnScale, prev: ScalePoint, next: ScalePoint): boolean {
        return compareScalePoints(dirtyOnScale, prev, next);
    }
}
