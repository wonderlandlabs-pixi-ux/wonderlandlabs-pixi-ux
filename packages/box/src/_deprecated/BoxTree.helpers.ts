import { z } from 'zod';
import {
    AlignInputSchema,
    AreaPivotInputSchema,
    BoxAlignSchema,
    BoxAreaSchema,
    BoxTreeConfig,
    BoxTreeNodeConfigSchema,
    BoxTreeNodeStateSchema,
    BoxTreeState,
    BoxTreeStateSchema,
    type AlignInput,
    type AlignKeyword,
    type AreaPivotInput,
    type AreaPivotKeyword,
    type Axis,
    type AxisConstrain,
} from "./types.boxtree.js";
import {AxisConstraintSchema, PxValue, PxValueSchema} from "./types.js";
import {BoxTree} from "./BoxTree.js";

function zodMessage(error: unknown): string {
    if (error instanceof z.ZodError) {
        return error.issues.map((issue) => issue.message).join('; ');
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'invalid value';
}

function normalizeConstraintValue(
    value: unknown,
    axis: Axis,
    identity: string,
    kind: 'min' | 'max',
): PxValue | undefined {
    if (!value) {
        return undefined;
    }
    try {
        return PxValueSchema.parse(value);
    } catch (error) {
        throw new Error(`${identity}.${axis}.${kind}: ${zodMessage(error)}`);
    }
}

export function normalizeVerbList(
    value: readonly string[] | undefined,
    identity: string,
    field: 'modeVerb' | 'globalVerb',
): string[] {
    if (!value) {
        return [];
    }

    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of value) {
        if (typeof raw !== 'string') {
            throw new Error(`${identity}.${field}: verbs must be strings`);
        }
        const next = raw.trim();
        if (!next.length) {
            throw new Error(`${identity}.${field}: verbs must be non-empty strings`);
        }
        if (seen.has(next)) {
            continue;
        }
        seen.add(next);
        out.push(next);
    }
    return out;
}

function normalizeAxisConstrain(
    input: { min?: unknown; max?: unknown } | undefined,
    axis: Axis,
    identity: string,
): AxisConstrain | undefined {
    const min = normalizeConstraintValue(input?.min, axis, identity, 'min');
    const max = normalizeConstraintValue(input?.max, axis, identity, 'max');
    if (!min && !max) {
        return undefined;
    }
    return AxisConstraintSchema.parse({min, max});
}

function normalizeAlignValue(value: AlignInput | undefined, axis: Axis, identity: string): AlignKeyword {
    let next: AlignInput;
    try {
        next = AlignInputSchema.parse(value ?? 's');
    } catch {
        throw new Error(`${identity}.${axis}: unsupported align "${String(value)}"`);
    }

    switch (next) {
        case '<':
            return 's';
        case '|':
            return 'c';
        case '>':
            return 'e';
        case '<>':
            return 'f';
        default:
            return next;
    }
}

function normalizePivotValue(value: AreaPivotInput | undefined, axis: Axis, identity: string): AreaPivotKeyword {
    let next: AreaPivotInput;
    try {
        next = AreaPivotInputSchema.parse(value ?? 's');
    } catch {
        throw new Error(`${identity}.area.p${axis}: unsupported pivot "${String(value)}"`);
    }

    switch (next) {
        case '<':
            return 's';
        case '|':
            return 'c';
        case '>':
            return 'e';
        default:
            return next;
    }
}

function mappifyChildren(
    children: BoxTreeConfig['children'],
    identity: string,
): Map<string, BoxTreeConfig> | undefined {
    if (!children) {
        return undefined;
    }
    if (children instanceof Map) {
        return new Map(children);
    }
    if (typeof children === 'object' && !Array.isArray(children)) {
        return new Map(Object.entries(children as Record<string, BoxTreeConfig>));
    }
    throw new Error(`${identity}.children: expected Map or Record`);
}

export function createBoxTreeState(config: BoxTreeConfig = {}, inferredId?: string): BoxTreeState {
    const parsedConfig = BoxTreeNodeConfigSchema.parse(config);
    const identity = parsedConfig.id ?? inferredId ?? 'root';
    const styleName = parsedConfig.styleName ?? inferredId ?? parsedConfig.id ?? 'root';
    const isRoot = inferredId === undefined;
    const modeVerb = normalizeVerbList(parsedConfig.modeVerb, identity, 'modeVerb');
    const globalVerb = normalizeVerbList(parsedConfig.globalVerb, identity, 'globalVerb');

    if (isRoot) {
        const hasExplicitX = parsedConfig.area?.x !== undefined;
        const hasExplicitY = parsedConfig.area?.y !== undefined;
        if (!hasExplicitX || !hasExplicitY) {
            throw new Error(`${identity}.area: root requires explicit x and y`);
        }
    }

    const nextArea = BoxAreaSchema.parse({
        ...(parsedConfig.area ?? {}),
        px: normalizePivotValue(parsedConfig.area?.px, 'x', identity),
        py: normalizePivotValue(parsedConfig.area?.py, 'y', identity),
    });

    const nextAlign = BoxAlignSchema.parse({
        x: normalizeAlignValue(parsedConfig.align?.x, 'x', identity),
        y: normalizeAlignValue(parsedConfig.align?.y, 'y', identity),
        direction: parsedConfig.align?.direction,
    });

    const nextConstrainX = normalizeAxisConstrain(parsedConfig.constrain?.x, 'x', identity);
    const nextConstrainY = normalizeAxisConstrain(parsedConfig.constrain?.y, 'y', identity);
    const nextConstrain = nextConstrainX || nextConstrainY ? {x: nextConstrainX, y: nextConstrainY} : undefined;

    const preparedChildren = mappifyChildren(config.children, identity);
    const children = preparedChildren && preparedChildren.size
        ? new Map([...preparedChildren.entries()].map(([key, childConfig]) => [key, createBoxTreeState(childConfig, key)]))
        : undefined;

    const nodeState = BoxTreeNodeStateSchema.parse({
        area: nextArea,
        align: nextAlign,
        content: parsedConfig.content,
        styleName,
        modeVerb,
        globalVerb,
        order: parsedConfig.order,
        isVisible: parsedConfig.isVisible,
        absolute: parsedConfig.absolute,
        constrain: nextConstrain,
        style: parsedConfig.style,
        id: parsedConfig.id ?? inferredId,
    });

    return BoxTreeStateSchema.parse({
        ...nodeState,
        children,
    });
}

export function withWildcardBranchParams(params: StoreParams<BoxTreeState>): StoreParams<BoxTreeState> {
    const nextBranchParams = new Map(params.branchParams ?? []);

    if (!nextBranchParams.has('*')) {
        nextBranchParams.set('*', {subclass: BoxTree});
    }

    return {
        ...params,
        branchParams: nextBranchParams,
    };
}
