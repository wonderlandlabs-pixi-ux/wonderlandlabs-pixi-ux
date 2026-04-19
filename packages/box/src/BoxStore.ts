import {Forest} from '@wonderlandlabs/forestry4';
import {map, pairwise, Subscription} from 'rxjs';
import type {BoxCellType, BoxPreparedCellType, BoxStyleManagerLike, RectStaticType} from './types.js';
import {collectRemovedIds, layoutCell, prepareBoxCellTree, rectToAbsolute} from "./helpers.js";

type BoxStoreConfig = {
    value: BoxCellType;
};

export class BoxStore extends Forest<BoxPreparedCellType> {
    #styles: BoxStyleManagerLike[] = [];
    #killSubscription?: Subscription;
    public killList = new Set<string>();

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
    }

    update() {
        const next = layoutCell(this.value);
        this.mutate((draft) => {
            Object.assign(draft, next);
        });
    }

    get location(): RectStaticType {
        const {dim, location} = this.value;
        return rectToAbsolute(dim ?? location);
    }

    get rect(): { x: number; y: number; width: number; height: number } {
        const {x, y, w, h} = this.location;
        return {x, y, width: w, height: h};
    }

    get styles(): BoxStyleManagerLike[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return [...(parentStore?.styles ?? []), ...this.#styles];
    }

    set styles(styles: BoxStyleManagerLike[] | undefined) {
        this.#styles = styles ?? [];
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

    complete(): BoxPreparedCellType {
        this.#killSubscription?.unsubscribe();
        this.#killSubscription = undefined;
        this.killList.clear();
        return super.complete();
    }
}
