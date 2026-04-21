import {Forest} from '@wonderlandlabs/forestry4';
import {map, pairwise, Subscription} from 'rxjs';
import type {BoxCellType, BoxLayoutCellType, BoxPreparedCellType, BoxStyleManagerLike, RectStaticType} from './types.js';
import {collectRemovedIds, layoutCell, prepareBoxCellTree, rectToAbsolute} from "./helpers.js";
import {ID_PATH_SEPARATOR} from './constants.js';

type TextMeasureMap = Map<string, {w: number; h: number}>;
type BoxPathInput = string | string[];

const TEXT_MEASURE_RES_KEY = 'box:text-measures';

type BoxStoreConfig = {
    value: BoxCellType;
};

export class BoxStore extends Forest<BoxPreparedCellType> {
    #styles: BoxStyleManagerLike[] = [];
    #killSubscription?: Subscription;
    #debugSubscription?: Subscription;
    #cacheSubscription?: Subscription;
    #isDebug = false;
    #layoutValue?: BoxLayoutCellType;
    public killList = new Set<string>();
    public locationCache = new Map<string, RectStaticType>();

    constructor(config: BoxStoreConfig) {
        super({
            value: prepareBoxCellTree(config.value),
            // @ts-ignore Forestry binds prep to the store instance at runtime.
            prep(next: BoxCellType) {
                return prepareBoxCellTree(next, (this as BoxStore).value);
            },
        });
        this.#killSubscription = this.$subject.pipe(
            map((value) => value as BoxPreparedCellType),
            pairwise(),
        ).subscribe(this.$.addToKillList);
        this.#debugSubscription = this.$subject
            .pipe(map((value) => value as BoxPreparedCellType))
            .subscribe((value) => {
                if (this.isDebug) {
                    console.info('[BoxStore] root emitted', {
                        rootId: value.id,
                        rootName: value.name,
                    });
                }
            });
        this.#cacheSubscription = this.$subject
            .pipe(map((value) => value as BoxPreparedCellType))
            .subscribe(() => {
                this.locationCache.clear();
                this.#layoutValue = undefined;
            });
    }

    update() {
        if (this.isDebug) {
            console.info('[BoxStore.update] start', {
                id: this.value.id,
                name: this.value.name,
            });
        }
        const settled = settleLayout(clonePreparedCell(this.value), this.textMeasures);
        this.#layoutValue = settled;
        this.locationCache = buildLocationCache(settled);
        if (this.isDebug) {
            console.info('[BoxStore.update] complete', {
                id: this.value.id,
                name: this.value.name,
            });
        }
    }

    get layoutValue(): BoxLayoutCellType {
        if (!this.#layoutValue) {
            const settled = settleLayout(clonePreparedCell(this.value), this.textMeasures);
            this.#layoutValue = settled;
            this.locationCache = buildLocationCache(settled);
        }
        return this.#layoutValue;
    }

    get location(): RectStaticType {
        return this.layoutValue.location;
    }

    get rect(): { x: number; y: number; width: number; height: number } {
        const {x, y, w, h} = this.location;
        return {x, y, width: w, height: h};
    }

    getLocation(path: BoxPathInput): RectStaticType | undefined {
        const key = normalizePath(path);
        return this.locationCache.get(key);
    }

    setLocation(path: BoxPathInput, location: RectStaticType): void {
        const key = normalizePath(path);
        const nextLocation = clonePreparedCell(location);
        this.locationCache.set(key, nextLocation);
        const layoutCell = findCellByPath(this.layoutValue, splitPath(path));
        if (layoutCell) {
            layoutCell.location = nextLocation;
        }
    }

    get styles(): BoxStyleManagerLike[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return [...(parentStore?.styles ?? []), ...this.#styles];
    }

    set styles(styles: BoxStyleManagerLike[] | undefined) {
        this.#styles = styles ?? [];
    }

    get isDebug(): boolean {
        return this.#isDebug;
    }

    set isDebug(value: boolean) {
        this.#isDebug = value;
    }

    get styleStates(): string[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return Array.from(new Set([
            ...(parentStore?.styleStates ?? []),
            ...(this.value.verbs ?? this.value.states ?? []),
        ]));
    }

    get variant(): string | undefined {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return this.value.variant ?? parentStore?.variant;
    }

    addToKillList([previous, next]: [BoxPreparedCellType, BoxPreparedCellType]): void {
        this.killList = collectRemovedIds(previous, next);
    }

    clearKillList(): void {
        this.killList.clear();
    }

    get textMeasures(): TextMeasureMap {
        return (this.$res.get(TEXT_MEASURE_RES_KEY) as TextMeasureMap | undefined) ?? new Map();
    }

    recordTextMeasures(measures: TextMeasureMap): boolean {
        const next = normalizeTextMeasures(measures);
        const current = this.textMeasures;
        if (sameTextMeasures(current, next)) {
            return false;
        }
        this.$res.set(TEXT_MEASURE_RES_KEY, next);
        return true;
    }

    complete(): BoxPreparedCellType {
        this.#killSubscription?.unsubscribe();
        this.#killSubscription = undefined;
        this.#debugSubscription?.unsubscribe();
        this.#debugSubscription = undefined;
        this.#cacheSubscription?.unsubscribe();
        this.#cacheSubscription = undefined;
        this.killList.clear();
        this.locationCache.clear();
        this.#layoutValue = undefined;
        return super.complete();
    }
}

function samePreparedCell(a: BoxLayoutCellType, b: BoxLayoutCellType): boolean {
    if (
        a.id !== b.id
        || a.name !== b.name
        || !sameRect(a.location, b.location)
    ) {
        return false;
    }

    const aChildren = a.children ?? [];
    const bChildren = b.children ?? [];
    if (aChildren.length !== bChildren.length) {
        return false;
    }

    for (let index = 0; index < aChildren.length; index += 1) {
        if (!samePreparedCell(aChildren[index], bChildren[index])) {
            return false;
        }
    }

    return true;
}

function sameRect(a?: RectStaticType, b?: RectStaticType): boolean {
    if (!a || !b) {
        return a === b;
    }
    return sameNumber(a.x, b.x) && sameNumber(a.y, b.y) && sameNumber(a.w, b.w) && sameNumber(a.h, b.h);
}

function sameNumber(a?: number, b?: number, epsilon = 1): boolean {
    if (a === undefined || b === undefined) {
        return a === b;
    }
    return Math.abs(a - b) <= epsilon;
}

function normalizeMeasure(value: number): number {
    return Math.max(0, Math.ceil(value));
}

function clonePreparedCell<T>(value: T): T {
    return structuredClone(value);
}

function settleLayout(root: BoxPreparedCellType, textMeasures: TextMeasureMap): BoxLayoutCellType {
    let working = layoutCell(root, undefined, textMeasures);
    for (let pass = 0; pass < 5; pass += 1) {
        const next = layoutCell(working, undefined, textMeasures);
        if (samePreparedCell(working, next)) {
            break;
        }
        working = next;
    }
    return working;
}

function buildLocationCache(root: BoxLayoutCellType): Map<string, RectStaticType> {
    const next = new Map<string, RectStaticType>();
    recordLocations(next, root);
    return next;
}

function recordLocations(
    cache: Map<string, RectStaticType>,
    cell: BoxLayoutCellType,
    path: string[] = [],
): void {
    const nextPath = [...path, cell.id];
    if (cell.location) {
        cache.set(nextPath.join(ID_PATH_SEPARATOR), cell.location);
    }
    for (const child of cell.children ?? []) {
        recordLocations(cache, child, nextPath);
    }
}

function normalizeTextMeasures(measures: TextMeasureMap): TextMeasureMap {
    const next: TextMeasureMap = new Map();
    measures.forEach((measure, id) => {
        next.set(id, {
            w: normalizeMeasure(measure.w),
            h: normalizeMeasure(measure.h),
        });
    });
    return next;
}

function sameTextMeasures(a: TextMeasureMap, b: TextMeasureMap): boolean {
    if (a.size !== b.size) {
        return false;
    }
    for (const [id, measureA] of a.entries()) {
        const measureB = b.get(id);
        if (!measureB) {
            return false;
        }
        if (!sameNumber(measureA.w, measureB.w) || !sameNumber(measureA.h, measureB.h)) {
            return false;
        }
    }
    return true;
}

function normalizePath(path: BoxPathInput): string {
    return Array.isArray(path) ? path.join(ID_PATH_SEPARATOR) : path;
}

function splitPath(path: BoxPathInput): string[] {
    return Array.isArray(path) ? path : path.split(ID_PATH_SEPARATOR);
}

function findCellByPath(
    root: BoxLayoutCellType,
    ids: string[],
): BoxLayoutCellType | undefined {
    if (ids.length === 0 || root.id !== ids[0]) {
        return undefined;
    }

    let current: BoxLayoutCellType | undefined = root;
    for (let index = 1; index < ids.length; index += 1) {
        current = current?.children?.find((child) => child.id === ids[index]);
        if (!current) {
            return undefined;
        }
    }

    return current;
}
