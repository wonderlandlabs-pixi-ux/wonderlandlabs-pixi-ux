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
    const states = options.states ?? context.states;
    const variant = context.variant;
    const leaf = baseNouns[baseNouns.length - 1];
    const withVariant = variant && baseNouns.length > 0
        ? insertVariantNoun(baseNouns, variant)
        : undefined;
    const localWithVariant = variant && localNouns.length > 0
        ? insertVariantNoun(localNouns, variant)
        : undefined;
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

    for (const candidate of objectLookupCandidates(context, propertyPath, options.extraNouns ?? [], variant)) {
        const result = resolveLayeredStyleValue(styles, {
            nouns: candidate.nouns,
            states,
        });
        const nestedValue = getNestedValue(result, candidate.remainder);
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

function objectLookupCandidates(
    context: BoxStyleContext,
    propertyPath: string[],
    extraNouns: string[],
    variant?: string,
): Array<{ nouns: string[]; remainder: string[] }> {
    const basePrefixes = objectPrefixes([...context.nouns, ...extraNouns], propertyPath);
    const localPrefixes = objectPrefixes(
        [
            ...(context.nouns.length > 0 ? [context.nouns[context.nouns.length - 1]] : []),
            ...extraNouns,
        ],
        propertyPath,
    );
    const candidates = [
        ...decorateObjectPrefixes(basePrefixes, variant),
        ...decorateObjectPrefixes(localPrefixes, variant),
    ];
    const seen = new Set<string>();

    return candidates.filter((candidate) => {
        const key = `${candidate.nouns.join('.')}:${candidate.remainder.join('.')}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function objectPrefixes(
    baseNouns: string[],
    propertyPath: string[],
): Array<{ nouns: string[]; remainder: string[] }> {
    const prefixes: Array<{ nouns: string[]; remainder: string[] }> = [];

    for (let index = propertyPath.length - 1; index >= 0; index -= 1) {
        prefixes.push({
            nouns: [...baseNouns, ...propertyPath.slice(0, index)],
            remainder: propertyPath.slice(index),
        });
    }

    prefixes.push({
        nouns: baseNouns,
        remainder: propertyPath,
    });

    return prefixes.filter((prefix) => prefix.nouns.length > 0);
}

function decorateObjectPrefixes(
    prefixes: Array<{ nouns: string[]; remainder: string[] }>,
    variant?: string,
): Array<{ nouns: string[]; remainder: string[] }> {
    const result: Array<{ nouns: string[]; remainder: string[] }> = [];

    for (const prefix of prefixes) {
        if (variant && prefix.nouns.length > 0) {
            result.push({
                nouns: insertVariantObjectNoun(prefix.nouns, variant),
                remainder: prefix.remainder,
            });
        }
        result.push(prefix);
        for (const suffix of nounSuffixes(prefix.nouns)) {
            if (variant && suffix.length > 0) {
                result.push({
                    nouns: insertVariantObjectNoun(suffix, variant),
                    remainder: prefix.remainder,
                });
            }
            result.push({
                nouns: suffix,
                remainder: prefix.remainder,
            });
        }
    }

    return result;
}

function mergeStates(parentStates: string[], localStates: string[]): string[] {
    return Array.from(new Set([...parentStates, ...localStates]));
}

function insertVariantNoun(nouns: string[], variant: string): string[] {
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], variant, ...nouns.slice(2)];
    }
    return [nouns[0], variant, ...nouns.slice(1)];
}

function insertVariantObjectNoun(nouns: string[], variant: string): string[] {
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], variant, ...nouns.slice(2)];
    }
    return [nouns[0], variant, ...nouns.slice(1)];
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
