import type {
    BoxCellType,
    BoxLayoutCellType,
    BoxPreparedCellType,
    BoxLayerType,
    BoxInsetEntryType,
    BoxSizeObjType,
    BoxSizeType,
    DimensionDirectionType,
    DirectionType,
    RectPartialType,
    RectStaticType
} from "./types.js";
import {
    ID_PATH_SEPARATOR,
    DIM_HORIZ_S,
    DIM_VERT_S,
    DIR_HORIZ_S,
    DIR_VERT_S,
    dirMap,
    POS_CENTER_S,
    POS_END_S,
    POS_FILL,
    POS_KEY_X,
    POS_KEY_Y,
    POS_START_S,
    posMap,
    SIZE_FRACTION,
    SIZE_PCT,
    SIZE_PX
} from './constants.js';
import { InsetDigest } from './InsetDigest.js';
import { ComputeAxis } from './ComputeAxis.js';
import {v4 as uuid} from 'uuid';

type RectPartialKey = keyof RectPartialType;

function percentToNumber(value: number, location: RectStaticType, direction: DirectionType, base?: number) {
    const dir = dirMap.get(direction);
    let parentSize = 0;

    switch (dir) {
        case DIR_HORIZ_S: {
            parentSize = location.w;
            break;
        }
        case DIR_VERT_S: {
            parentSize = location.h;
            break;
        }
        default:
            console.error('percentToNumber failure: ', arguments, 'cannot map', dir);
            throw new Error('cannot parse direction');
    }

    if (base) {
        return parentSize * value / base!;
    }
    return parentSize * value / 100; // percent values are expected to be "of 100" unless specified
}

type SizeToNumberInput = {
    input?: BoxSizeType;
    parentContainer?: RectStaticType;
    direction?: DirectionType;
    skipFractional?: boolean;
}

export function toComplexSize(input?: BoxSizeType): BoxSizeObjType | undefined {
    if (input === undefined) {
        return undefined;
    }
    if (typeof input === 'number') {
        return {value: input, unit: SIZE_PX};
    }
    return input;
}

export function sizeToNumber({input, parentContainer, direction, skipFractional}: SizeToNumberInput) {
    if (input === undefined) {
        return 0;
    }
    const data = toComplexSize(input);
    const {unit, value, base} = data!;
    switch (unit) {
        case SIZE_PX: {
            return value;
        }
        case SIZE_PCT: {
            if (parentContainer && direction) {
                return percentToNumber(value, parentContainer, direction, base);
            }
            throw new Error('Cannot parse size without parent and direction');
        }
        case SIZE_FRACTION: {
            if (skipFractional) {
                return null;
            }
            throw new Error('Cannot resolve fractional size directly');
        }
        case undefined: {
            return value; // assume px
        }
        default:
            console.error('cannot parse', data, 'from', input);
            throw new Error(`unhandled unit "${unit}"`);
    }
}

const keys: RectPartialKey[] = ['x', 'y', 'w', 'h'];
const posKeys: RectPartialKey[] = ['x', 'y'];
const keyDirections: DirectionType[] = [DIR_HORIZ_S, DIR_VERT_S, DIR_HORIZ_S, DIR_VERT_S];

export function rectToAbsolute(r: RectPartialType, parentRect?: RectStaticType): RectStaticType {
    return keys.reduce((o: Record<string, unknown>, dim: RectPartialKey, index: number) => {
        const dir = keyDirections[index];
        const input = r[dim];
        if (input === undefined) {
            return {...o, [dim]: 0};
        }
        const computed = sizeToNumber({input, parentContainer: parentRect, direction: dir})
        return {...o, [dim]: computed}
    }, {}) as RectStaticType;
}

export function rectToParentSpace(r: RectPartialType, parentRect?: RectStaticType): RectStaticType {
    return rectToAbsolute(r, parentRect);
}

export function insetRect(
    parentRect: RectStaticType,
    insetters: Array<BoxInsetEntryType | undefined> = [],
): RectStaticType {
    return insetters.reduce((nextRect: RectStaticType, insetter) => {
        return new InsetDigest(insetter?.inset, nextRect).apply(nextRect);
    }, parentRect);
}

export function rectLayers(
    parentRect: RectStaticType,
    insetters: Array<BoxInsetEntryType | undefined> = [],
): BoxLayerType[] {
    const layers: BoxLayerType[] = [{
        role: 'outer',
        rect: parentRect,
        insets: parentRect,
    }];

    const contentRect = insetters.reduce((nextRect: RectStaticType, insetter) => {
        if (!insetter) {
            return nextRect;
        }

        const insetRect = new InsetDigest(insetter.inset, nextRect).apply(nextRect);
        layers.push({
            role: insetter.role,
            rect: nextRect,
            insets: insetRect,
        });
        return insetRect;
    }, parentRect);

    layers.push({
        role: 'content',
        rect: contentRect,
        insets: contentRect,
    });

    return layers;
}

export function cellLayers(cell: Pick<BoxLayoutCellType, 'location' | 'insets'>): BoxLayerType[] {
    return rectLayers(cell.location, cell.insets ?? []);
}

export function rectHasFractionalSizes(r: RectPartialType, ignorePosition = false) {
    return keys.some((key: RectPartialKey) => {
        const value = r[key];
        if (value === undefined) return false;
        if (ignorePosition && posKeys.includes(key)) return false;
        return toComplexSize(value)?.unit === SIZE_FRACTION;
    })
}

export function normalizeDirection(direction: DirectionType): typeof DIR_HORIZ_S | typeof DIR_VERT_S {
    return (dirMap.get(direction) ?? DIR_VERT_S) as typeof DIR_HORIZ_S | typeof DIR_VERT_S;
}

export function crossDirection(direction: DirectionType): typeof DIR_HORIZ_S | typeof DIR_VERT_S {
    return normalizeDirection(direction) === DIR_HORIZ_S ? DIR_VERT_S : DIR_HORIZ_S;
}

export function alignKey(direction: DirectionType): typeof POS_KEY_X | typeof POS_KEY_Y {
    return normalizeDirection(direction) === DIR_HORIZ_S ? POS_KEY_X : POS_KEY_Y;
}

export function parentSize(direction: DirectionType, parent: RectStaticType): number {
    return normalizeDirection(direction) === DIR_HORIZ_S ? parent.w : parent.h;
}

export function sizeDirection(direction: DirectionType): DimensionDirectionType {
    return normalizeDirection(direction) === DIR_HORIZ_S ? DIM_HORIZ_S : DIM_VERT_S;
}

export function sizeValue(direction: DimensionDirectionType, rect: RectPartialType) {
    return direction === DIM_HORIZ_S ? rect.w : rect.h;
}

export function alignOffset(position: string | undefined, available: number): number {
    const normalized = position ? posMap.get(position) ?? position : undefined;
    switch (normalized) {
        case POS_CENTER_S:
            return available / 2;
        case POS_END_S:
            return available;
        case POS_FILL:
        case POS_START_S:
        default:
            return 0;
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

export function layoutCell(
    cell: BoxPreparedCellType,
    parentRect?: RectStaticType,
    textMeasures: Map<string, {w: number; h: number}> = new Map(),
    assignedLocation?: RectStaticType,
): BoxLayoutCellType {
    let ownLocation = assignedLocation
        ?? rectToAbsolute(effectiveDim(cell, textMeasures), cell.absolute ? undefined : parentRect);
    const {children, align} = cell;

    if (!Array.isArray(children) || children.length === 0) {
        return {
            ...cell,
            location: ownLocation,
            children: undefined,
        };
    }

    let resolvedChildren: BoxLayoutCellType[] = [];
    for (let pass = 0; pass < 5; pass += 1) {
        const childLocations: RectStaticType[] = new Array(children.length);
        const flowChildren = children
            .map((child, index) => ({child, index}))
            .filter(({child}) => !child.absolute);

        if (flowChildren.length > 0) {
            const flowChildLocations = new ComputeAxis(
                align,
                ownLocation,
                flowChildren.map(({child}) => effectiveDim(child, textMeasures)),
                {
                    insets: cell.insets,
                    gap: cell.gap,
                },
            ).compute();

            flowChildren.forEach(({index}, flowIndex) => {
                childLocations[index] = flowChildLocations[flowIndex];
            });
        }

        children
            .map((child, index) => ({child, index}))
            .filter(({child}) => child.absolute)
            .forEach(({child, index}) => {
                childLocations[index] = rectToParentSpace(effectiveDim(child, textMeasures), ownLocation);
            });

        resolvedChildren = children.map((child: BoxPreparedCellType, index: number) => layoutCell(
            child,
            ownLocation,
            textMeasures,
            childLocations[index],
        ));

        const resolvedLocation = cell.crop
            ? ownLocation
            : cell.layoutStrategy !== 'bloat'
                ? ownLocation
                : expandToFitChildren(ownLocation, resolvedChildren.map((child) => child.location), cell.insets);

        if (sameRect(ownLocation, resolvedLocation)) {
            ownLocation = resolvedLocation;
            break;
        }

        ownLocation = resolvedLocation;
    }

    return {
        ...cell,
        location: ownLocation,
        children: resolvedChildren,
    };
}

export function collectRemovedIds(
    previous: BoxPreparedCellType,
    next: BoxPreparedCellType,
): Set<string> {
    const nextIds = flattenPreparedIds(next);
    const previousIds = flattenPreparedIds(previous);
    const diff = Array.from(previousIds.values()).filter((path) => !nextIds.has(path));
    return new Set(diff);
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
    return uuid();
}

function flattenPreparedIds(root: BoxPreparedCellType): Set<string> {
    const ids = new Set<string>();
    recordPathToCell(ids, root);
    return ids;
}

function recordPathToCell(ids: Set<string>, cell: BoxPreparedCellType, path: string[] = []) {
    const nextPath = [...path, cell.id];
    ids.add(nextPath.join(ID_PATH_SEPARATOR));
    for (const child of cell.children ?? []) {
        recordPathToCell(ids, child, nextPath);
    }
}

function expandToFitChildren(
    location: RectStaticType,
    childLocations: Array<RectStaticType | undefined>,
    insets?: BoxInsetEntryType[],
): RectStaticType {
    const contentRect = insetRect(location, insets);
    let maxRight = contentRect.x + contentRect.w;
    let maxBottom = contentRect.y + contentRect.h;

    for (const childLocation of childLocations) {
        if (!childLocation) {
            continue;
        }
        maxRight = Math.max(maxRight, childLocation.x + childLocation.w);
        maxBottom = Math.max(maxBottom, childLocation.y + childLocation.h);
    }

    return {
        ...location,
        w: location.w + Math.max(0, maxRight - (contentRect.x + contentRect.w)),
        h: location.h + Math.max(0, maxBottom - (contentRect.y + contentRect.h)),
    };
}

function effectiveDim(
    cell: BoxPreparedCellType,
    textMeasures: Map<string, {w: number; h: number}>,
): RectPartialType {
    if (cell.content?.type !== 'text') {
        return cell.dim;
    }

    const measure = textMeasures.get(cell.id);
    const baseWidth = typeof cell.dim.w === 'number' ? cell.dim.w : 0;
    const baseHeight = typeof cell.dim.h === 'number' ? cell.dim.h : 0;
    return {
        ...cell.dim,
        w: Math.max(baseWidth, measure?.w ?? cell.textWidth ?? 0),
        h: Math.max(baseHeight, measure?.h ?? cell.textHeight ?? 0),
    };
}

function sameRect(a: RectStaticType, b: RectStaticType): boolean {
    return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
