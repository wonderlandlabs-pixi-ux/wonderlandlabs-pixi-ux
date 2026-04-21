import type {BoxCellType, BoxStyleManagerLike} from '@wonderlandlabs-pixi-ux/box';
import {
    DIR_HORIZ,
    DIR_VERT,
    INSET_SCOPE_ALL,
    POS_CENTER,
} from '@wonderlandlabs-pixi-ux/box';
import {
} from 'pixi.js';
import type {ButtonOptionsType, ButtonStateType} from "./types.js";
import {BTYPE_AVATAR, BTYPE_BASE, BTYPE_VERTICAL, BTYPE_TEXT} from "./constants.js";
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import defaultStyleJSON from './defaultStyles.json' with {type: 'json'};

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

export function getStyleTree(_variant: string, options: ButtonOptionsType): BoxStyleManagerLike[] {
    return [
        defaultStyle as unknown as BoxStyleManagerLike,
        ...toStyleLayers(options.styleDef, fromJSON),
        ...toStyleLayers(options.styleTree, (value) => value as unknown as BoxStyleManagerLike),
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
    return resolveStyleNumber(styleTree, 'container.background.width', styleVerbs(value), 200, value.variant);
}

function resolveContainerHeight(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    return resolveStyleNumber(styleTree, 'container.background.height', styleVerbs(value), 40, value.variant);
}

function resolvePadding(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number | number[] {
    const resolvedValue = resolveStyleValue(
        styleTree,
        'container.background.padding',
        styleVerbs(value),
        value.variant,
    );

    if (Array.isArray(resolvedValue)) {
        return resolvedValue.filter((v) => typeof v === 'number') as number[];
    }
    return typeof resolvedValue === 'number' && Number.isFinite(resolvedValue) ? resolvedValue : 4;
}

function resolveGap(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    return resolveStyleNumber(styleTree, 'container.content.gap', styleVerbs(value), 6, value.variant);
}

function resolveIconWidth(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    return resolveStyleNumber(styleTree, 'icon.size.width', styleVerbs(value), resolveStyleNumber(styleTree, 'icon.size.size', styleVerbs(value), 16, value.variant), value.variant);
}

function resolveIconHeight(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    return resolveStyleNumber(styleTree, 'icon.size.height', styleVerbs(value), resolveStyleNumber(styleTree, 'icon.size.size', styleVerbs(value), 16, value.variant), value.variant);
}

function resolveLabelHeight(value: ButtonStateType, styleTree: BoxStyleManagerLike[]): number {
    const states = styleVerbs(value);
    return resolveStyleNumber(
        styleTree,
        'label.font.size',
        states,
        resolveStyleNumber(styleTree, 'label.size', states, 14, value.variant),
        value.variant,
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
): unknown {
    const nounList = nouns.split('.');
    for (const query of buttonStyleQueries(nounList, states, variant)) {
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
): number {
    const value = resolveStyleValue(styleTree, nouns, states, variant);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function styleVerbs(value: ButtonStateType): string[] {
    return Array.from(resolveStatus(value));
}

function buttonStyleQueries(
    nouns: string[],
    states: string[],
    variant?: string,
): Array<{ nouns: string[]; states: string[] }> {
    const queries: Array<{ nouns: string[]; states: string[] }> = [];

    if (variant) {
        queries.push({
            nouns: buttonVariantNouns(nouns, variant),
            states,
        });
    }

    queries.push({nouns, states});

    return queries;
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
