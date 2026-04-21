import {Assets, Container, Graphics, TextStyle, TextStyleFontStyle, TextStyleFontWeight, TextStyleOptions, Texture} from 'pixi.js';
import {z} from 'zod';
import {cellLayers} from './helpers.js';
import {resolveStyleValue, styleContextForCell, type BoxStyleContext} from './styleHelpers.js';
import {drainKillList} from './toPixi.killlist.helpers.js';
import {
    attachToParent,
    CROP_MASK_LABEL,
    drawBorderBands,
    ensureGraphics,
    ensureGraphicsByLabel,
    ensureSprite,
    ensureText,
    fitSpriteToRect,
    insetRoundRect,
    resolvePixiGradient,
    resolveNumericStyle,
    resolvePixiColor,
    resolveAlignedOffset,
    toLocalRect,
    validateRendererResult,
} from './toPixi.helpers.js';
import type {
    BoxLayoutCellType,
    BoxPreparedCellType,
    BoxPixiNodeContext,
    BoxPixiOptions,
    BoxPixiRenderInput,
    BoxPixiRendererManifest,
    BoxPixiRendererOverride,
    BoxStyleManagerLike,
} from './types.js';

const PixiOverrideSchema = z.object({
    renderer: z.unknown(),
})

type ContentExtent = {
    w: number;
    h: number;
};

export function boxTreeToPixi(options: BoxPixiOptions): Container {
    if (options.store.isDebug) {
        console.info('[boxTreeToPixi] start', {
            id: options.root.id,
            name: options.root.name,
        });
    }
    drainKillList(options);
    const textMeasures = new Map<string, {w: number; h: number}>();
    const rendered = renderPixiNode({
        cell: options.root,
        parentContainer: options.parentContainer ?? options.app?.stage,
    }, options, textMeasures);
    if (options.store.recordTextMeasures(textMeasures)) {
        options.observer?.({action: 'invalidate'});
    }
    if (options.store.isDebug) {
        console.info('[boxTreeToPixi] complete', {
            id: options.root.id,
            name: options.root.name,
        });
    }
    return rendered;
}

function renderPixiNode(
    {cell, parentContext, parentContainer, parentCell}: BoxPixiNodeContext,
    options: BoxPixiOptions,
    textMeasures: Map<string, {w: number; h: number}>,
): Container {
    if (!cell.location) {
        throw new Error(`boxTreeToPixi requires location data on "${cell.name}"`);
    }

    const context = styleContextForCell(cell, parentContext);
    const pathString = context.nouns.join('.');
    const hostParentContainer = parentContainer ?? options.app?.stage;
    const container = (hostParentContainer?.getChildByLabel(cell.id) as Container) ?? new Container({label: cell.id});
    container.isRenderGroup = !!cell.renderGroup;

    const localLocation = toLocalRect(cell.location, parentCell?.location);
    const layers = cellLayers(cell);
    const renderInput: BoxPixiRenderInput = {
        options,
        context: {
            cell,
            parentContext,
            parentContainer,
            parentCell,
        },
        local: {
            layers,
            path: context.nouns,
            pathString,
            currentContainer: container,
            location: cell.location,
            localLocation,
        },
    };
    const override = resolvePixiRendererOverride(options.renderers, options.styleTree, context, cell.id);

    if (override && !override.post) {
        const result = validateRendererResult(override.renderer(renderInput), cell.name, pathString);
        if (result !== false) {
            const rendered = attachToParent(result ?? container, hostParentContainer, cell.id);
            renderChildren(rendered, cell, options, context, textMeasures);
            return rendered;
        }
    }

  const rendered = renderDefaultPixiNode(renderInput);
    attachToParent(rendered, hostParentContainer, cell.id);
    renderChildren(rendered, cell, options, context, textMeasures);
    finalizeDefaultPixiNode({
        ...renderInput,
        local: {
            ...renderInput.local,
            currentContainer: rendered,
        },
    }, context, textMeasures);

    if (override?.post) {
        const result = validateRendererResult(override.renderer({
            ...renderInput,
            local: {
                ...renderInput.local,
                currentContainer: rendered,
            },
        }), cell.name, pathString);
        if (result && result !== rendered) {
            if (result.parent === hostParentContainer) {
                return result;
            }
            return attachToParent(result, hostParentContainer, cell.id);
        }
    }

    return rendered;
}

function renderChildren(
    container: Container,
    cell: BoxLayoutCellType,
    options: BoxPixiOptions,
    context: BoxStyleContext,
    textMeasures: Map<string, {w: number; h: number}>,
): void {
    for (const child of cell.children ?? []) {
        renderPixiNode({
            cell: child,
            parentContainer: container,
            parentContext: context,
            parentCell: cell,
        }, options, textMeasures);
    }
}

function renderDefaultPixiNode(
  input: BoxPixiRenderInput,
): Container {
    const {currentContainer, localLocation} = input.local;
    currentContainer!.position.set(localLocation.x, localLocation.y);
    return currentContainer!;
}

function finalizeDefaultPixiNode(
  input: BoxPixiRenderInput,
  context: BoxStyleContext,
  textMeasures: Map<string, {w: number; h: number}>,
): void {
    const {
        currentContainer,
        localLocation,
    } = input.local;
    const contentExtent = renderDefaultContent(input, context);
    const effectiveWidth = Math.max(localLocation.w, contentExtent.w);
    const effectiveHeight = Math.max(localLocation.h, contentExtent.h);
    if (input.context.cell.content?.type === 'text') {
        textMeasures.set(input.context.cell.id, {w: contentExtent.w, h: contentExtent.h});
    }

    const backgroundStyle = resolveStyleValue<Record<string, unknown> | undefined>(
        input.options.styleTree,
        context,
        ['background'],
    );
    const backgroundGradient = backgroundStyle?.gradient ?? resolveGradientStyle(input.options.styleTree, context);
    const fillColor = resolvePixiColor(
        backgroundStyle?.color
        ?? resolveStyleValue(input.options.styleTree, context, ['background', 'color'])
    );
    const fillGradient = resolvePixiGradient(
        backgroundGradient,
        localLocation,
    );
    const fillAlpha = resolveNumericStyle(
        backgroundStyle?.alpha
        ?? resolveStyleValue(input.options.styleTree, context, ['background', 'alpha'])
    ) ?? 1;
    const borderRadius = Math.max(
        0,
        Math.min(
            resolveNumericStyle(resolveStyleValue(input.options.styleTree, context, ['border', 'radius'])) ?? 6,
            Math.min(effectiveWidth, effectiveHeight) / 2,
        ),
    );
    const baseBorderColor = resolvePixiColor(
        resolveStyleValue(input.options.styleTree, context, ['border', 'color'])
    );
    const baseBorderWidth = resolveNumericStyle(
        resolveStyleValue(input.options.styleTree, context, ['border', 'width'])
    ) ?? 0;
    const baseBorderAlpha = resolveNumericStyle(
        resolveStyleValue(input.options.styleTree, context, ['border', 'alpha'])
    ) ?? 1;

    const background = ensureGraphics(currentContainer!);
    background.clear();

    if (fillGradient || fillColor !== undefined) {
        background.roundRect(0, 0, effectiveWidth, effectiveHeight, borderRadius).fill(
            fillGradient
                ? {
                    fill: fillGradient,
                    alpha: fillAlpha,
                  }
                : {
                    color: fillColor,
                    alpha: fillAlpha,
                  }
        );
    }

    if (baseBorderColor !== undefined && baseBorderWidth > 0) {
        const strokeShape = insetRoundRect(
            {x: 0, y: 0, w: effectiveWidth, h: effectiveHeight},
            borderRadius,
            baseBorderWidth / 2,
        );
        background.roundRect(
            strokeShape.rect.x,
            strokeShape.rect.y,
            strokeShape.rect.w,
            strokeShape.rect.h,
            strokeShape.radius,
        );
        background.stroke({
            color: baseBorderColor,
            width: baseBorderWidth,
            alpha: baseBorderAlpha,
        });
    }

    if (input.context.cell.crop) {
        const cropMask = ensureGraphicsByLabel(currentContainer!, CROP_MASK_LABEL);
        cropMask.clear();
        cropMask.roundRect(0, 0, effectiveWidth, effectiveHeight, borderRadius).fill(0xffffff);
        currentContainer!.mask = cropMask;
    } else if (currentContainer!.mask instanceof Graphics && currentContainer!.mask.label === CROP_MASK_LABEL) {
        currentContainer!.mask.clear();
        currentContainer!.mask = null;
    }
}

function resolveGradientStyle(
    styles: BoxPixiOptions['styleTree'],
    context: BoxStyleContext,
): Record<string, unknown> | undefined {
    const direction = resolveStyleValue(styles, context, ['background', 'gradient', 'direction']);
    const colors = resolveStyleValue(styles, context, ['background', 'gradient', 'colors']);
    const from = resolveStyleValue(styles, context, ['background', 'gradient', 'from']);
    const to = resolveStyleValue(styles, context, ['background', 'gradient', 'to']);

    if (
        direction === undefined
        && colors === undefined
        && from === undefined
        && to === undefined
    ) {
        return undefined;
    }

    return {
        ...(direction !== undefined ? { direction } : {}),
        ...(colors !== undefined ? { colors } : {}),
        ...(from !== undefined ? { from } : {}),
        ...(to !== undefined ? { to } : {}),
    };
}

function renderDefaultContent(
    input: BoxPixiRenderInput,
    context: BoxStyleContext,
): ContentExtent {
    const {currentContainer, localLocation} = input.local;
    const content = input.context.cell.content;

    if (!currentContainer || !content) {
        return {w: localLocation.w, h: localLocation.h};
    }

    if (content.type === 'url') {
        const sprite = ensureSprite(currentContainer);
        sprite.visible = true;
        sprite.alpha = resolveNumericStyle(
            resolveStyleValue(input.options.styleTree, context, ['alpha'])
        ) ?? 1;
   
        if (Assets.cache.has(content.value)) {
            const cached = Assets.cache.get<Texture>(content.value);
            if (cached) {
                sprite.texture = cached;
            }
            fitSpriteToRect(sprite, cached, localLocation.w, localLocation.h);
            return {w: localLocation.w, h: localLocation.h};
        }

        sprite.texture = Texture.EMPTY;
        sprite.position.set(0, 0);
        sprite.width = 0;
        sprite.height = 0;
        void Assets.load<Texture>(content.value).then((texture) => {
            if (sprite.destroyed) {
                return;
            }
            if (texture) {
                sprite.texture = texture;
            }
            fitSpriteToRect(sprite, texture, localLocation.w, localLocation.h);
            input.options.app?.render();
        }).catch((error) => {
            console.error(`[boxTreeToPixi] Failed to load texture "${content.value}"`, error);
        });
        return {w: localLocation.w, h: localLocation.h};
    }

    if (content.type !== 'text') {
        return {w: localLocation.w, h: localLocation.h};
    }

    const fill = resolvePixiColor(
        resolveStyleValue(input.options.styleTree, context, ['font', 'color'])
        ?? resolveStyleValue(input.options.styleTree, context, ['color'])
    ) ?? 0x111111;
    const alpha = resolveNumericStyle(
        resolveStyleValue(input.options.styleTree, context, ['font', 'alpha'])
        ?? resolveStyleValue(input.options.styleTree, context, ['alpha'])
    ) ?? 1;
    const fontSize = resolveNumericStyle(
        resolveStyleValue(input.options.styleTree, context, ['font', 'size'])
        ?? resolveStyleValue(input.options.styleTree, context, ['size'])
    ) ?? 14;
    const fontFamilyValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'family'])
        ?? resolveStyleValue<unknown>(input.options.styleTree, context, ['font']);
    const fontFamily = Array.isArray(fontFamilyValue)
        ? fontFamilyValue.join(', ')
        : typeof fontFamilyValue === 'string'
            ? fontFamilyValue
            : 'Arial';
    const fontWeightValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'weight']);
    const fontStyleValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'style']);
    const alignValue = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'align']);
    const letterSpacing = resolveNumericStyle(
        resolveStyleValue(input.options.styleTree, context, ['font', 'letterSpacing'])
    );
    const lineHeight = resolveNumericStyle(
        resolveStyleValue(input.options.styleTree, context, ['font', 'lineHeight'])
    );
    const wordWrap = resolveStyleValue<unknown>(input.options.styleTree, context, ['font', 'wordWrap']);
    const wordWrapWidth = resolveNumericStyle(
        resolveStyleValue(input.options.styleTree, context, ['font', 'wordWrapWidth'])
    ) ?? Math.max(1, localLocation.w);

    const textNode = ensureText(currentContainer);
    textNode.text = content.value;
    textNode.alpha = alpha;
    const config: TextStyleOptions = {
        fontFamily,
        fontSize,
        fill,
        align: alignValue === 'center' || alignValue === 'right' ? alignValue : 'left',
        letterSpacing: letterSpacing ?? 0,
        lineHeight: lineHeight ?? undefined,
        wordWrap: wordWrap === true,
        wordWrapWidth,
    }
    if (typeof fontWeightValue === 'string') config.fontWeight = fontWeightValue as TextStyleFontWeight;
    if (typeof fontStyleValue === 'string') config.fontStyle = fontStyleValue as TextStyleFontStyle;

    textNode.style = new TextStyle(config);

    const bounds = textNode.getLocalBounds();
    textNode.position.set(
        resolveAlignedOffset(localLocation.w, bounds.width, input.context.cell.align.xPosition),
        resolveAlignedOffset(localLocation.h, bounds.height, input.context.cell.align.yPosition),
    );
    return {
        w: Math.max(localLocation.w, textNode.position.x + bounds.width),
        h: Math.max(localLocation.h, textNode.position.y + bounds.height),
    };
}

function resolvePixiRendererOverride(
    renderers: BoxPixiRendererManifest | undefined,
    styles: BoxStyleManagerLike[] | undefined,
    context: BoxStyleContext,
    id?: string,
): BoxPixiRendererOverride | undefined {
    const manifestOverride = resolveRendererManifestOverride(renderers, context, id);
    if (manifestOverride) {
        return manifestOverride;
    }

    if (!styles) {
        return undefined;
    }

    const rendererValue = resolveStyleValue<unknown>(styles, context, ['renderer']);
    if (isPixiRendererOverride(rendererValue)) {
        return rendererValue;
    }

    const directValue = resolveStyleValue<unknown>(styles, context, []);
    if (isPixiRendererOverride(directValue)) {
        return directValue;
    }

    return undefined;
}

function resolveRendererManifestOverride(
    renderers: BoxPixiRendererManifest | undefined,
    context: BoxStyleContext,
    id?: string,
): BoxPixiRendererOverride | undefined {
    if (!renderers) {
        return undefined;
    }

    if (id) {
        const byId = renderers.byId?.[id];
        if (byId) {
            return byId;
        }
    }

    const path = context.nouns.join('.');
    const exact = renderers.byPath?.[path];
    if (exact) {
        return exact;
    }

    if (!renderers.byPath) {
        return undefined;
    }

    const nouns = context.nouns;
    for (let index = 1; index < nouns.length; index += 1) {
        const suffix = nouns.slice(index).join('.');
        const match = renderers.byPath[suffix];
        if (match) {
            return match;
        }
    }

    return undefined;
}

function isPixiRendererOverride(value: unknown): value is BoxPixiRendererOverride {
    return PixiOverrideSchema.safeParse(value).success;
}
