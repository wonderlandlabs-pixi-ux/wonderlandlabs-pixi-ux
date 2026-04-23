type ButtonFamilyOptions = {
    baselineSize?: number;
    family?: string;
};

const DEFAULT_BASELINE_SIZE = 100;
const DEFAULT_FAMILY = 'base';

export function createButtonFamily(
    styleJson: Record<string, unknown>,
    sizes: number[],
    options: ButtonFamilyOptions = {},
): Record<string, unknown> {
    const baselineSize = options.baselineSize ?? DEFAULT_BASELINE_SIZE;
    const familyName = options.family ?? DEFAULT_FAMILY;
    const family: Record<string, unknown> = {};

    for (const size of Array.from(new Set(sizes)).sort((a, b) => a - b)) {
        if (!Number.isFinite(size) || size <= 0) {
            continue;
        }
        const scaled = scaleButtonStyle(styleJson, size / baselineSize) as Record<string, unknown>;
        mergeInto(family, nestButtonFamilySize(scaled, familyName, String(size)));
    }

    return family;
}

function nestButtonFamilySize(
    styleJson: Record<string, unknown>,
    familyName: string,
    token: string,
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [root, value] of Object.entries(styleJson)) {
        if (!isPlainObject(value)) {
            continue;
        }

        if (root === 'container') {
            const containerFamily: Record<string, unknown> = {};
            for (const [section, sectionValue] of Object.entries(value)) {
                if (!isPlainObject(sectionValue)) {
                    continue;
                }
                containerFamily[section] = {
                    [familyName]: {
                        [token]: sectionValue,
                    },
                };
            }
            result[root] = containerFamily;
            continue;
        }

        result[root] = {
            [familyName]: {
                [token]: value,
            },
        };
    }

    return result;
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
