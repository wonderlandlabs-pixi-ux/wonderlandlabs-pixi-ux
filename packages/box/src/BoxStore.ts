import {Forest} from '@wonderlandlabs/forestry4';
import type {BoxCellType, BoxPreparedCellType, BoxStyleManagerLike, RectStaticType} from './types.js';
import {insetRect, rectToAbsolute, rectToParentSpace} from "./helpers.js";
import {ComputeAxis} from './ComputeAxis.js';
import {resolveStyleValue} from './styleHelpers.js';

type BoxStoreConfig = {
    value: BoxCellType;
};

export class BoxStore extends Forest<BoxPreparedCellType> {
    #styles?: BoxStyleManagerLike;

    constructor(config: BoxStoreConfig) {
        super({
            value: prepareBoxCellTree(config.value),
            // @ts-ignore Forestry binds prep to the store instance at runtime.
            prep(next: BoxCellType) {
                return prepareBoxCellTree(next, (this as BoxStore).value);
            },
        });
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

    get contentRect(): RectStaticType {
        return insetRect(this.location, this.value.insets ?? []);
    }

    get styles(): BoxStyleManagerLike | undefined {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return this.#styles ?? parentStore?.styles;
    }

    set styles(styles: BoxStyleManagerLike | undefined) {
        this.#styles = styles;
    }

    get styleStates(): string[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return [...(parentStore?.styleStates ?? []), ...(this.value.states ?? [])];
    }

    get variant(): string | undefined {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return this.value.variant ?? parentStore?.variant;
    }

    get styleNouns(): string[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return [...(parentStore?.styleNouns ?? []), this.value.name];
    }

    resolveStyle<T = unknown>(
        propertyPath: string[] = [],
        options: { states?: string[]; extraNouns?: string[] } = {},
    ): T | undefined {
        return resolveStyleValue<T>(this.styles, {
            nouns: this.styleNouns,
            states: this.styleStates,
            variant: this.variant,
        }, propertyPath, options);
    }
}

export function prepareBoxCellTree(
    next: BoxCellType,
    previous?: BoxPreparedCellType,
    seenIds: Set<string> = new Set(),
): BoxPreparedCellType {
    const id = next.id
        ?? (previous?.name === next.name ? previous.id : newBoxCellId());

    if (seenIds.has(id)) {
        console.error(`[BoxStore] Duplicate box cell id detected: "${id}" on node "${next.name}"`);
    } else {
        seenIds.add(id);
    }

    return {
        ...next,
        id,
        children: next.children?.map((child, index) => prepareBoxCellTree(
            child,
            matchPreviousChild(previous?.children, child, index),
            seenIds,
        )),
    };
}

function layoutCell(cell: BoxPreparedCellType, parentRect?: RectStaticType): BoxPreparedCellType {
    const ownLocation = cell.location
        ? rectToAbsolute(cell.location)
        : rectToAbsolute(cell.dim, cell.absolute ? undefined : parentRect);
    const {children, align} = cell;

    if (!Array.isArray(children) || children.length === 0) {
        return {
            ...cell,
            location: ownLocation,
        };
    }

    const childLocations: RectStaticType[] = new Array(children.length);
    const flowChildren = children
        .map((child, index) => ({child, index}))
        .filter(({child}) => !child.absolute);

    if (flowChildren.length > 0) {
        const flowChildLocations = new ComputeAxis(
            align,
            ownLocation,
            flowChildren.map(({child}) => child.dim),
            {
                insets: cell.insets,
                gap: cell.gap,
            },
        ).compute();

        flowChildren.forEach(({index}, flowIndex) => {
            childLocations[index] = flowChildLocations[flowIndex];
        });
    }

    children.forEach((child, index) => {
        if (!child.absolute) {
            return;
        }
        childLocations[index] = child.location
            ? rectToAbsolute(child.location)
            : rectToParentSpace(child.dim, ownLocation);
    });

    return {
        ...cell,
        location: ownLocation,
        children: children.map((child: BoxPreparedCellType, index: number) => layoutCell({
            ...child,
            location: childLocations[index],
        }, childLocations[index])),
    };
}

function matchPreviousChild(
    previousChildren: BoxPreparedCellType[] | undefined,
    nextChild: BoxCellType,
    index: number,
): BoxPreparedCellType | undefined {
    if (!previousChildren || previousChildren.length === 0) {
        return undefined;
    }

    if (nextChild.id) {
        return previousChildren.find((child) => child.id === nextChild.id);
    }

    const sameIndex = previousChildren[index];
    if (sameIndex?.name === nextChild.name) {
        return sameIndex;
    }

    return previousChildren.find((child) => child.name === nextChild.name);
}

function newBoxCellId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `box-${Math.random().toString(36).slice(2, 10)}`;
}
