import type {BoxCellType, BoxStyleManagerLike} from '@wonderlandlabs-pixi-ux/box';
import {
    DIR_HORIZ,
    DIR_VERT,
    INSET_SCOPE_ALL,
    POS_CENTER,
} from '@wonderlandlabs-pixi-ux/box';
import type {ButtonOptionsType, ButtonStateType} from "./types.js";
import {BTYPE_AVATAR, BTYPE_BASE, BTYPE_VERTICAL, BTYPE_TEXT} from "./constants.js";
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import defaultStyleJSON from './defaultStyles.json' with {type: 'json'};
import { createButtonFamily } from './buttonFamily.js';

type BoxStoreConfig = {
    value: BoxCellType;
};

export function makeStoreConfig(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): BoxStoreConfig {

    switch (value.variant) {
        case BTYPE_TEXT: {
            return makeStoreConfigText(value, styleTree);
        }
        case BTYPE_AVATAR: {
            return makeStoreConfigAvatar(value, styleTree);
        }
        case BTYPE_VERTICAL: {
            return makeStoreConfigIconVert(value, styleTree);
        }
        case BTYPE_BASE:
        default: {
            return makeStoreConfigButton(value, styleTree);
        }
    }
}

function makeStoreConfigButton(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): BoxStoreConfig {
    return makeRowContainer(value, styleTree);
}

function makeStoreConfigIconVert(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): BoxStoreConfig {
    return makeColumnContainer(value, styleTree);
}

function makeStoreConfigAvatar(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): BoxStoreConfig {
    const avatarSize = resolveAvatarInnerSize(value, styleTree);
    const child = value.icon
        ? makeIconCell(value, styleTree, avatarSize, avatarSize)
        : makeLabelCell(value, styleTree, avatarSize, avatarSize);

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_HORIZ,
            children: child ? [child] : [],
        }),
    };
}

function makeStoreConfigText(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): BoxStoreConfig {
    const contentWidth = resolveContentWidth(value, styleTree);
    const gap = value.icon && value.label ? resolveGap(value, styleTree) : 0;
    const labelWidth = value.icon
        ? Math.max(0, contentWidth - resolveIconWidth(value, styleTree) - gap)
        : contentWidth;

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_HORIZ,
            children: [
                makeIconCell(value, styleTree),
                makeLabelCell(value, styleTree, labelWidth),
            ].filter(Boolean) as BoxCellType[],
            gap,
        }),
    };
}

const defaultStyle = fromJSON(defaultStyleJSON);
const defaultSizeFamilyStyle = fromJSON(createButtonFamily(
    defaultStyleJSON as Record<string, unknown>,
    [50, 100, 133],
    {baselineSize: 133, family: 'base'},
));

export function getStyleTree(_variant: string, options: ButtonOptionsType): BoxStyleManagerLike[] {
    const baseLayers = [
        defaultStyle as unknown as BoxStyleManagerLike,
        defaultSizeFamilyStyle as unknown as BoxStyleManagerLike,
        ...toStyleLayers(options.styleDef, fromJSON),
        ...toStyleLayers(options.styleTree, (value) => value as unknown as BoxStyleManagerLike),
    ];

    return [
        ...baseLayers,
        createDynamicScaleStyleLayer(baseLayers),
    ];
}

function makeRowContainer(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): BoxStoreConfig {
    const contentWidth = resolveContentWidth(value, styleTree);
    const children = [
        makeIconCell(value, styleTree),
        makeLabelCell(value, styleTree, value.icon ? Math.max(0, contentWidth - resolveIconWidth(value, styleTree) - resolveGap(value, styleTree)) : contentWidth),
    ].filter(Boolean) as BoxCellType[];

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_HORIZ,
            children,
            gap: value.icon && value.label ? resolveGap(value, styleTree) : 0,
        }),
    };
}

function makeColumnContainer(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): BoxStoreConfig {
    const contentWidth = resolveContentWidth(value, styleTree);
    const children = [
        makeIconCell(value, styleTree),
        makeLabelCell(value, styleTree, contentWidth),
    ].filter(Boolean) as BoxCellType[];

    return {
        value: makeContainerCell(value, styleTree, {
            direction: DIR_VERT,
            children,
            gap: value.icon && value.label ? resolveGap(value, styleTree) : 0,
        }),
    };
}

function makeContainerCell(
    value: ButtonStateType,
    styleTree: BoxStyleManagerLike[],
    input: { direction: typeof DIR_HORIZ | typeof DIR_VERT; children: BoxCellType[]; gap?: number }
): BoxCellType {
    const padding = resolvePadding(value, styleTree);
    const preferredWidth = value.size?.width ?? resolveContainerWidth(value, styleTree);
    const preferredHeight = value.size?.height ?? resolveContainerHeight(value, styleTree);

    const inset: Array<{
        scope: 'top' | 'right' | 'bottom' | 'left' | 'all';
        value: number;
    }> = [];
    if (Array.isArray(padding)) {
        if (padding.length === 2) {
            inset.push({scope: 'top', value: padding[0]});
            inset.push({scope: 'bottom', value: padding[0]});
            inset.push({scope: 'left', value: padding[1]});
            inset.push({scope: 'right', value: padding[1]});
        } else if (padding.length === 4) {
            inset.push({scope: 'top', value: padding[0]});
            inset.push({scope: 'right', value: padding[1]});
            inset.push({scope: 'bottom', value: padding[2]});
            inset.push({scope: 'left', value: padding[3]});
        }
    } else if (padding > 0) {
        inset.push({scope: INSET_SCOPE_ALL, value: padding});
    }

    return {
        id: 'button-background',
        name: 'container',
        absolute: true,
        layoutStrategy: 'bloat',
        variant: value.variant,
        verbs: styleVerbs(value),
        dim: {
            x: 0,
            y: 0,
            w: preferredWidth,
            h: preferredHeight,
        },
        align: {
            direction: input.direction,
            xPosition: POS_CENTER,
            yPosition: POS_CENTER,
        },
        insets: inset.length > 0 ? [{
            role: 'padding',
            inset,
        }] : undefined,
        gap: input.gap && input.gap > 0 ? input.gap : undefined,
        children: input.children,
    };
}

function makeIconCell(
    value: ButtonStateType,
    styleTree: BoxStyleManagerLike[],
    widthOverride?: number,
    heightOverride?: number,
): BoxCellType | undefined {
    if (!value.icon) {
        return undefined;
    }

    const width = widthOverride ?? resolveIconWidth(value, styleTree);
    const height = heightOverride ?? resolveIconHeight(value, styleTree);
    return {
        id: 'button-icon',
        name: 'icon',
        absolute: false,
        dim: {
            w: width,
            h: height,
        },
        align: {
            direction: DIR_HORIZ,
            xPosition: POS_CENTER,
            yPosition: POS_CENTER,
        },
        content: {
            type: 'url',
            value: value.icon,
        },
    };
}

function makeLabelCell(
    value: ButtonStateType,
    styleTree: BoxStyleManagerLike[],
    width: number,
    height = resolveLabelHeight(value, styleTree),
): BoxCellType | undefined {
    if (!value.label) {
        return undefined;
    }

    return {
        id: 'button-label',
        name: 'label',
        absolute: false,
        dim: {
            w: Math.max(0, width),
            h: Math.max(0, height),
        },
        align: {
            direction: DIR_HORIZ,
            xPosition: POS_CENTER,
            yPosition: POS_CENTER,
        },
        content: {
            type: 'text',
            value: value.label,
        },
    };
}

function resolveContentWidth(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    const padding = resolvePadding(value, styleTree);
    const horizontalPadding = resolveHorizontalPadding(padding);
    return Math.max(0, (value.size?.width ?? resolveContainerWidth(value, styleTree)) - horizontalPadding);
}

function resolveContainerWidth(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    const states = styleVerbs(value);
    const canonical = resolveStyleNumber(styleTree, 'container.width', states, Number.NaN, value.variant, resolveScaleValue(value), resolveFamilyValue(value));
    if (Number.isFinite(canonical)) {
        return canonical;
    }
    return resolveStyleNumber(styleTree, 'container.background.width', states, 200, value.variant, resolveScaleValue(value), resolveFamilyValue(value));
}

function resolveContainerHeight(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    const states = styleVerbs(value);
    const canonical = resolveStyleNumber(styleTree, 'container.height', states, Number.NaN, value.variant, resolveScaleValue(value), resolveFamilyValue(value));
    if (Number.isFinite(canonical)) {
        return canonical;
    }
    return resolveStyleNumber(styleTree, 'container.background.height', states, 40, value.variant, resolveScaleValue(value), resolveFamilyValue(value));
}

function resolvePadding(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number | number[] {
    const states = styleVerbs(value);
    const canonicalValue = resolveStyleValue(
        styleTree,
        'container.padding',
        states,
        value.variant,
        resolveScaleValue(value),
        resolveFamilyValue(value),
    );
    const resolvedValue = canonicalValue ?? resolveStyleValue(
        styleTree,
        'container.background.padding',
        states,
        value.variant,
        resolveScaleValue(value),
        resolveFamilyValue(value),
    );

    if (Array.isArray(resolvedValue)) {
        return resolvedValue.filter((v) => typeof v === 'number') as number[];
    }
    return typeof resolvedValue === 'number' && Number.isFinite(resolvedValue) ? resolvedValue : 4;
}

function resolveGap(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    const states = styleVerbs(value);
    const canonical = resolveStyleNumber(styleTree, 'container.gap', states, Number.NaN, value.variant, resolveScaleValue(value), resolveFamilyValue(value));
    if (Number.isFinite(canonical)) {
        return canonical;
    }
    return resolveStyleNumber(styleTree, 'container.content.gap', states, 6, value.variant, resolveScaleValue(value), resolveFamilyValue(value));
}

function resolveIconWidth(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    return resolveStyleNumber(styleTree, 'icon.size.width', styleVerbs(value), resolveStyleNumber(styleTree, 'icon.size.size', styleVerbs(value), 16, value.variant, resolveScaleValue(value), resolveFamilyValue(value)), value.variant, resolveScaleValue(value), resolveFamilyValue(value));
}

function resolveIconHeight(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    return resolveStyleNumber(styleTree, 'icon.size.height', styleVerbs(value), resolveStyleNumber(styleTree, 'icon.size.size', styleVerbs(value), 16, value.variant, resolveScaleValue(value), resolveFamilyValue(value)), value.variant, resolveScaleValue(value), resolveFamilyValue(value));
}

function resolveLabelHeight(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    const states = styleVerbs(value);
    return resolveStyleNumber(
        styleTree,
        'label.font.size',
        states,
        resolveStyleNumber(styleTree, 'label.size', states, 17, value.variant, resolveScaleValue(value), resolveFamilyValue(value)),
        value.variant,
        resolveScaleValue(value),
        resolveFamilyValue(value),
    );
}

function resolveAvatarInnerSize(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    const contentSize = Math.max(
        resolveIconWidth(value, styleTree),
        resolveIconHeight(value, styleTree),
        resolveLabelHeight(value, styleTree),
    );
    const containerSize = Math.min(
        value.size?.width ?? resolveContainerWidth(value, styleTree),
        value.size?.height ?? resolveContainerHeight(value, styleTree),
    );
    const padding = resolvePadding(value, styleTree);
    const totalPadding = resolveVerticalPadding(padding);
    return Math.max(0, Math.min(contentSize, containerSize - totalPadding));
}

export function resolveStyleValue(
    styleTree: BoxStyleManagerLike[],
    nouns: string,
    states: string[],
    variant?: string,
    sizeValue?: number,
    family?: string,
): unknown {
    for (const fullPath of buttonInheritedPaths(nouns, variant, sizeValue, family).reverse()) {
        const query = { nouns: fullPath.split('.'), states };
        for (let index = styleTree.length - 1; index >= 0; index -= 1) {
            const layer = styleTree[index];
            const value = layer.matchHierarchy
                ? layer.matchHierarchy(query)
                : layer.match(query);
            if (value !== undefined) {
                return value;
            }
        }
    }
    return undefined;
}

function resolveHorizontalPadding(padding: number | number[]): number {
    if (Array.isArray(padding)) {
        if (padding.length === 2) {
            return padding[1] * 2;
        }
        if (padding.length === 4) {
            return padding[1] + padding[3];
        }
        return 0;
    }
    return padding * 2;
}

function resolveVerticalPadding(padding: number | number[]): number {
    if (Array.isArray(padding)) {
        if (padding.length === 2) {
            return padding[0] * 2;
        }
        if (padding.length === 4) {
            return padding[0] + padding[2];
        }
        return 0;
    }
    return padding * 2;
}

export function resolveStyleNumber(
    styleTree: BoxStyleManagerLike[],
    nouns: string,
    states: string[],
    fallback: number,
    variant?: string,
    sizeValue?: number,
    family?: string,
): number {
    const value = resolveStyleValue(styleTree, nouns, states, variant, sizeValue, family);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function styleVerbs(value: ButtonStateType): string[] {
    return Array.from(resolveStatus(value));
}

function buttonInheritedPaths(nouns: string, variant?: string, sizeValue?: number, family?: string): string[] {
    const nounList = nouns.split('.');
    const paths = [nounList.join('.')];

    if (variant) {
        paths.push(buttonVariantNouns(nounList, variant).join('.'));
    }

    if (family) {
        paths.push(buttonFamilyNouns(nounList, family).join('.'));
    }

    if (sizeValue) {
        paths.push(buttonSizeNouns(nounList, sizeValue).join('.'));
    }

    if (variant && family) {
        paths.push(buttonVariantFamilyNouns(nounList, variant, family).join('.'));
    }

    if (family && sizeValue) {
        paths.push(buttonFamilyScaleNouns(nounList, family, sizeValue).join('.'));
    }

    if (variant && sizeValue) {
        paths.push(buttonSizeVariantNouns(nounList, variant, sizeValue).join('.'));
    }

    if (variant && family && sizeValue) {
        paths.push(buttonVariantFamilyScaleNouns(nounList, variant, family, sizeValue).join('.'));
    }

    return paths;
}

function buttonVariantNouns(nouns: string[], variant: string): string[] {
    if (nouns.length === 0) {
        return nouns;
    }
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], variant, ...nouns.slice(2)];
    }
    return [nouns[0], variant, ...nouns.slice(1)];
}

function buttonFamilyNouns(nouns: string[], family: string): string[] {
    if (nouns.length === 0) {
        return nouns;
    }
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], family, ...nouns.slice(2)];
    }
    return [nouns[0], family, ...nouns.slice(1)];
}

function buttonSizeNouns(nouns: string[], sizeValue: number): string[] {
    const token = String(sizeValue);
    if (nouns.length === 0) {
        return nouns;
    }
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], token, ...nouns.slice(2)];
    }
    return [nouns[0], token, ...nouns.slice(1)];
}

function buttonVariantFamilyNouns(nouns: string[], variant: string, family: string): string[] {
    if (nouns.length === 0) {
        return nouns;
    }
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], variant, family, ...nouns.slice(2)];
    }
    return [nouns[0], variant, family, ...nouns.slice(1)];
}

function buttonFamilyScaleNouns(nouns: string[], family: string, sizeValue: number): string[] {
    const token = String(sizeValue);
    if (nouns.length === 0) {
        return nouns;
    }
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], family, token, ...nouns.slice(2)];
    }
    return [nouns[0], family, token, ...nouns.slice(1)];
}

function buttonSizeVariantNouns(nouns: string[], variant: string, sizeValue: number): string[] {
    const token = String(sizeValue);
    if (nouns.length === 0) {
        return nouns;
    }
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], token, variant, ...nouns.slice(2)];
    }
    return [nouns[0], token, variant, ...nouns.slice(1)];
}

function buttonVariantFamilyScaleNouns(nouns: string[], variant: string, family: string, sizeValue: number): string[] {
    const token = String(sizeValue);
    if (nouns.length === 0) {
        return nouns;
    }
    if (nouns[0] === 'container' && nouns.length > 1) {
        return [nouns[0], nouns[1], variant, family, token, ...nouns.slice(2)];
    }
    return [nouns[0], variant, family, token, ...nouns.slice(1)];
}

function toStyleLayers<TInput, TOutput>(
    value: TInput | TInput[] | undefined,
    mapValue: (item: TInput) => TOutput,
): TOutput[] {
    if (!value) {
        return [];
    }
    return (Array.isArray(value) ? value : [value]).map(mapValue);
}

function resolveStatus(value: ButtonStateType): Set<string> {
    const state = value.isDisabled
        ? 'disabled'
        : value.isHovered
            ? 'hover'
            : (value.state ?? 'start');
    return new Set([
        state,
        ...(value.modifiers ?? []),
    ]);
}

function resolveScaleValue(value: ButtonStateType): number {
    return value.scale ?? 100;
}

function resolveFamilyValue(value: ButtonStateType): string {
    return value.family ?? 'base';
}

function createDynamicScaleStyleLayer(
    layers: BoxStyleManagerLike[],
): BoxStyleManagerLike {
    const resolver = (query: { nouns: string[]; states: string[] }) => {
        const scaleToken = findScaleToken(query.nouns);
        if (!scaleToken || scaleToken === '100') {
            return undefined;
        }
        if (!isScalablePropertyQuery(query.nouns)) {
            return undefined;
        }

        const direct = matchLayers(layers, query);
        if (direct !== undefined) {
            return undefined;
        }

        const baselineQuery = {
            nouns: query.nouns.map((noun) => noun === scaleToken ? '100' : noun),
            states: query.states,
        };
        const baseline = matchLayers(layers, baselineQuery);
        return scaleStyleValue(baseline, Number(scaleToken) / 100);
    };

    return {
        match: resolver,
        matchHierarchy: resolver,
    };
}

function matchLayers(
    layers: BoxStyleManagerLike[],
    query: { nouns: string[]; states: string[] },
): unknown {
    for (let index = layers.length - 1; index >= 0; index -= 1) {
        const layer = layers[index];
        const result = layer.matchHierarchy
            ? layer.matchHierarchy(query)
            : layer.match(query);
        if (result !== undefined) {
            return result;
        }
    }
    return undefined;
}

function findScaleToken(nouns: string[]): string | undefined {
    return nouns.find((noun) => /^\d+$/.test(noun));
}

function isScalablePropertyQuery(nouns: string[]): boolean {
    const semanticPath = nouns.filter((noun) => !/^\d+$/.test(noun));
    const leaf = semanticPath[semanticPath.length - 1];
    return leaf !== undefined && ['width', 'height', 'size', 'padding', 'gap', 'radius'].includes(leaf);
}

function scaleStyleValue(value: unknown, factor: number): unknown {
    if (!Number.isFinite(factor) || factor <= 0 || value === undefined) {
        return undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.round(value * factor * 100) / 100;
    }
    if (Array.isArray(value)) {
        return value.map((item) => (
            typeof item === 'number' && Number.isFinite(item)
                ? Math.round(item * factor * 100) / 100
                : item
        ));
    }
    return undefined;
}
