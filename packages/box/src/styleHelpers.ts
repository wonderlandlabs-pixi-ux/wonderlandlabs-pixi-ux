import type { BoxCellType, BoxStyleManagerLike, BoxStyleQueryLike } from './types.js';

export type BoxStyleContext = {
    nouns: string[];
    states: string[];
    variant?: string;
};

export function styleContextForCell(
    cell: Pick<BoxCellType, 'name' | 'verbs' | 'states' | 'variant'>,
    parent?: BoxStyleContext,
): BoxStyleContext {
    const localStates = cell.verbs ?? cell.states ?? [];
    return {
        nouns: [...(parent?.nouns ?? []), cell.name],
        states: mergeStates(parent?.states ?? [], localStates),
        variant: cell.variant ?? parent?.variant,
    };
}

export function resolveStyleValue<T = unknown>(
    styles: BoxStyleManagerLike[] | undefined,
    context: BoxStyleContext,
    propertyPath: string[] = [],
    options: { states?: string[]; extraNouns?: string[] } = {},
): T | undefined {
    if (!styles) {
        return undefined;
    }

    const baseNouns = [...context.nouns, ...(options.extraNouns ?? []), ...propertyPath];
    const localNouns = [
        ...(context.nouns.length > 0 ? [context.nouns[context.nouns.length - 1]] : []),
        ...(options.extraNouns ?? []),
        ...propertyPath,
    ];
    const baseObjectNouns = [...context.nouns, ...(options.extraNouns ?? [])];
    const localObjectNouns = [
        ...(context.nouns.length > 0 ? [context.nouns[context.nouns.length - 1]] : []),
        ...(options.extraNouns ?? []),
    ];
    const states = options.states ?? context.states;
    const variant = context.variant;
    const leaf = baseNouns[baseNouns.length - 1];
    const withVariant = variant && baseNouns.length > 0
        ? [baseNouns[0], variant, ...baseNouns.slice(1)]
        : undefined;
    const localWithVariant = variant && localNouns.length > 0
        ? [localNouns[0], variant, ...localNouns.slice(1)]
        : undefined;
    const withObjectVariant = variant && baseObjectNouns.length > 0
        ? [baseObjectNouns[0], variant, ...baseObjectNouns.slice(1)]
        : undefined;
    const localObjectWithVariant = variant && localObjectNouns.length > 0
        ? [localObjectNouns[0], variant, ...localObjectNouns.slice(1)]
        : undefined;
    const objectSuffixes = nounSuffixes(baseObjectNouns);
    const objectSuffixVariants = variant
        ? objectSuffixes.map((suffix) => [suffix[0], variant, ...suffix.slice(1)])
        : [];

    const queries = [
        ...(withVariant ? [{ nouns: withVariant, states }] : []),
        { nouns: baseNouns, states },
        ...(localWithVariant ? [{ nouns: localWithVariant, states }] : []),
        ...(localNouns.length > 0 ? [{ nouns: localNouns, states }] : []),
        ...(leaf ? [{ nouns: [leaf], states }] : []),
    ];

    for (const query of queries) {
        const result = resolveLayeredStyleValue(styles, query);
        if (result !== undefined) {
            return result as T;
        }
    }

    const objectQueries = [
        ...(withObjectVariant ? [{ nouns: withObjectVariant, states }] : []),
        ...(baseObjectNouns.length > 0 ? [{ nouns: baseObjectNouns, states }] : []),
        ...objectSuffixVariants.map((nouns) => ({ nouns, states })),
        ...objectSuffixes.map((nouns) => ({ nouns, states })),
        ...(localObjectWithVariant ? [{ nouns: localObjectWithVariant, states }] : []),
        ...(localObjectNouns.length > 0 ? [{ nouns: localObjectNouns, states }] : []),
    ];

    for (const query of objectQueries) {
        const result = resolveLayeredStyleValue(styles, query);
        const nestedValue = getNestedValue(result, propertyPath);
        if (nestedValue !== undefined) {
            return nestedValue as T;
        }
    }

    return undefined;
}

function getNestedValue(value: unknown, propertyPath: string[]): unknown {
    if (propertyPath.length === 0) {
        return value;
    }
    let current = value;
    for (const segment of propertyPath) {
        if (typeof current !== 'object' || current === null || !(segment in current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
}

function nounSuffixes(nouns: string[]): string[][] {
    const suffixes: string[][] = [];
    for (let index = 1; index < nouns.length; index += 1) {
        suffixes.push(nouns.slice(index));
    }
    return suffixes;
}

function mergeStates(parentStates: string[], localStates: string[]): string[] {
    return Array.from(new Set([...parentStates, ...localStates]));
}

function resolveLayeredStyleValue(
    styles: BoxStyleManagerLike[],
    query: BoxStyleQueryLike,
): unknown {
    for (let index = styles.length - 1; index >= 0; index -= 1) {
        const layer = styles[index];
        const result = layer.matchHierarchy
            ? layer.matchHierarchy(query)
            : layer.match(query);
        if (result !== undefined) {
            return result;
        }
    }
    return undefined;
}
