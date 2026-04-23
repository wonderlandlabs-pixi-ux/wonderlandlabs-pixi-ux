type ButtonFamilyOptions = {
    baselineSize?: number;
    family?: string;
    themeName?: string;
};

const DEFAULT_BASELINE_SIZE = 100;
const DEFAULT_FAMILY = 'base';
const DEFAULT_THEME = 'BASE';
const CANONICAL_VARIANTS = ['button', 'text', 'vertical', 'avatar'] as const;
const LEGACY_TO_CANONICAL_VARIANT: Record<string, typeof CANONICAL_VARIANTS[number]> = {
    base: 'button',
    button: 'button',
    text: 'text',
    vertical: 'vertical',
    avatar: 'avatar',
};

export function createButtonFamily(
    styleJson: Record<string, unknown>,
    sizes: number[],
    options: ButtonFamilyOptions = {},
): Record<string, unknown> {
    const baselineSize = options.baselineSize ?? DEFAULT_BASELINE_SIZE;
    const familyName = options.family ?? DEFAULT_FAMILY;
    const themeName = options.themeName ?? DEFAULT_THEME;
    const family: Record<string, unknown> = {};

    for (const size of Array.from(new Set(sizes)).sort((a, b) => a - b)) {
        if (!Number.isFinite(size) || size <= 0) {
            continue;
        }
        const scaled = scaleButtonStyle(styleJson, size / baselineSize) as Record<string, unknown>;
        mergeInto(family, nestButtonFamilySizeCanonical(scaled, familyName, String(size), themeName));
    }

    return family;
}

function nestButtonFamilySizeCanonical(
    styleJson: Record<string, unknown>,
    familyName: string,
    token: string,
    themeName: string,
): Record<string, unknown> {
    const perVariant = createVariantStyleMap(styleJson);
    return {
        [themeName]: {
            button: Object.fromEntries(
                CANONICAL_VARIANTS.map((variant) => [
                    variant,
                    {
                        [familyName]: {
                            [token]: perVariant[variant] ?? {},
                        },
                    },
                ]),
            ),
        },
    };
}

function createVariantStyleMap(styleJson: Record<string, unknown>): Partial<Record<typeof CANONICAL_VARIANTS[number], Record<string, unknown>>> {
    const result: Partial<Record<typeof CANONICAL_VARIANTS[number], Record<string, unknown>>> = {};

    for (const variant of CANONICAL_VARIANTS) {
        const nextRoot: Record<string, unknown> = {};

        for (const [root, value] of Object.entries(styleJson)) {
            if (!isPlainObject(value)) {
                continue;
            }

            const canonicalRoot = resolveVariantBranchRecursive(value, variant);
            if (Object.keys(canonicalRoot).length > 0) {
                nextRoot[root] = canonicalRoot;
            }
        }

        result[variant] = nextRoot;
    }

    return result;
}

function resolveVariantBranchRecursive(
    value: Record<string, unknown>,
    variant: typeof CANONICAL_VARIANTS[number],
): Record<string, unknown> {
    const common: Record<string, unknown> = {};
    let variantSpecific: Record<string, unknown> | undefined;

    for (const [key, child] of Object.entries(value)) {
        const mappedVariant = LEGACY_TO_CANONICAL_VARIANT[key];
        if (mappedVariant) {
            if (mappedVariant === variant && isPlainObject(child)) {
                variantSpecific = resolveVariantBranchRecursive(child, variant);
            }
            continue;
        }
        common[key] = isPlainObject(child)
            ? resolveVariantBranchRecursive(child, variant)
            : child;
    }

    if (variantSpecific) {
        const merged = structuredCloneSafe(common);
        mergeInto(merged, variantSpecific);
        return merged;
    }

    return common;
}

function scaleButtonStyle(
    value: unknown,
    factor: number,
    path: string[] = [],
): unknown {
    if (typeof value === 'number' && Number.isFinite(value) && isScalablePath(path)) {
        return roundScale(value * factor);
    }

    if (Array.isArray(value)) {
        if (!isScalablePath(path)) {
            return value.map((item) => scaleButtonStyle(item, factor, path));
        }
        return value.map((item) => (
            typeof item === 'number' && Number.isFinite(item)
                ? roundScale(item * factor)
                : item
        ));
    }

    if (!isPlainObject(value)) {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
            key,
            scaleButtonStyle(child, factor, [...path, key]),
        ]),
    );
}

function isScalablePath(path: string[]): boolean {
    const semanticPath = path.filter((segment) => !segment.startsWith('$'));
    const last = semanticPath[semanticPath.length - 1];
    if (!last) {
        return false;
    }

    return ['width', 'height', 'size', 'padding', 'gap', 'radius'].includes(last);
}

function roundScale(value: number): number {
    return Math.round(value * 100) / 100;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function structuredCloneSafe<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(source)) {
        const existing = target[key];
        if (isPlainObject(existing) && isPlainObject(value)) {
            mergeInto(existing, value);
            continue;
        }
        target[key] = value;
    }
}
