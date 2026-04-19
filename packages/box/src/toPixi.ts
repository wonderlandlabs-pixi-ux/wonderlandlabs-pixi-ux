import {Assets, Container, Graphics, TextStyle, TextStyleFontStyle, TextStyleFontWeight, TextStyleOptions, Texture} from 'pixi.js';
import {z} from 'zod';
import {getSharedRenderHelper} from '@wonderlandlabs-pixi-ux/utils';
import {cellLayers} from './helpers.js';
import {resolveStyleValue, styleContextForCell, type BoxStyleContext} from './styleHelpers.js';
import {drainKillList} from './toPixi.killlist.helpers.js';
import {
    attachToParent,
    drawBorderBands,
    ensureGraphics,
    ensureSprite,
    ensureText,
    fitSpriteToRect,
    resolveNumericStyle,
    resolvePixiColor,
    resolveAlignedOffset,
    toLocalRect,
    validateRendererResult,
} from './toPixi.helpers.js';
import type {
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

export function boxTreeToPixi(options: BoxPixiOptions): Container {
    drainKillList(options);

    return renderPixiNode({
        cell: options.root,
        parentContainer: options.parentContainer ?? options.app?.stage,
    }, options);
}

function renderPixiNode(
    {cell, parentContext, parentContainer, parentCell}: BoxPixiNodeContext,
    options: BoxPixiOptions,
): Container {
    if (!cell.location) {
        throw new Error(`boxTreeToPixi requires location data on "${cell.name}"`);
    }

    const context = styleContextForCell(cell, parentContext);
    const pathString = context.nouns.join('.');
    const hostParentContainer = parentContainer ?? options.app?.stage;
    const container = (hostParentContainer?.getChildByLabel(cell.id) as Container) ?? new Container({label: cell.id});
    container.isRenderGroup = !!cell.renderGroup;

    const layers = cellLayers(cell);
    const localLocation = toLocalRect(cell.location, parentCell?.location);
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
            renderChildren(rendered, cell, options, context);
            return rendered;
        }
    }

  const rendered = renderDefaultPixiNode(renderInput, context);
    attachToParent(rendered, hostParentContainer, cell.id);
    renderChildren(rendered, cell, options, context);

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
    cell: BoxPreparedCellType,
    options: BoxPixiOptions,
    context: BoxStyleContext,
): void {
    for (const child of cell.children ?? []) {
        renderPixiNode({
            cell: child,
            parentContainer: container,
            parentContext: context,
            parentCell: cell,
        }, options);
    }
}

function renderDefaultPixiNode(
  input: BoxPixiRenderInput,
  context: BoxStyleContext,
): Container {
    const {
        currentContainer,
        layers,
        localLocation,
        location,
    } = input.local;

    const fillColor = resolvePixiColor(
        resolveStyleValue(input.options.styleTree, context, ['background', 'color'])
    );
    const fillAlpha = resolveNumericStyle(resolveStyleValue(input.options.styleTree, context, ['background', 'alpha'])) ?? 1;
    const borderRadius = Math.max(
        0,
        Math.min(
            resolveNumericStyle(resolveStyleValue(input.options.styleTree, context, ['border', 'radius'])) ?? 6,
            Math.min(localLocation.w, localLocation.h) / 2,
        ),
    );

    currentContainer!.position.set(localLocation.x, localLocation.y);

    if (fillColor !== undefined) {
        const background = ensureGraphics(currentContainer!);
        background.clear();
        background.roundRect(0, 0, localLocation.w, localLocation.h, borderRadius).fill({
            color: fillColor,
            alpha: fillAlpha,
        });
    } else {
        const background = currentContainer!.children.find((child) => child.label === '$$background');
        if (background instanceof Graphics) {
            background.clear();
        }
    }

    let hasBorders = false;
    for (const layer of layers) {
        if (layer.role !== 'border') {
            continue;
        }

        const borderColor = resolvePixiColor(
            resolveStyleValue(input.options.styleTree, context, ['border', 'color'], {extraNouns: [layer.role]})
            ?? resolveStyleValue(input.options.styleTree, context, ['border', 'color'])
        );

        if (borderColor === undefined) {
            continue;
        }

        hasBorders = true;
        const borderAlpha = resolveNumericStyle(
            resolveStyleValue(input.options.styleTree, context, ['border', 'alpha'], {extraNouns: [layer.role]})
            ?? resolveStyleValue(input.options.styleTree, context, ['border', 'alpha'])
        ) ?? 1;

        const background = ensureGraphics(currentContainer!);
        drawBorderBands(background, toLocalRect(layer.rect, location), toLocalRect(layer.insets, location), borderColor, borderAlpha);
    }

    if (!fillColor && !hasBorders) {
        const background = currentContainer!.children.find((child) => child.label === '$$background');
        if (background instanceof Graphics) {
            background.clear();
        }
    }

  renderDefaultContent(input, context);

  return currentContainer!;
}

function renderDefaultContent(
    input: BoxPixiRenderInput,
    context: BoxStyleContext,
): void {
    const {currentContainer, localLocation} = input.local;
    const content = input.context.cell.content;

    if (!currentContainer || !content) {
        return;
    }

    if (content.type === 'url') {
        const sprite = ensureSprite(currentContainer);
        sprite.visible = true;
   
        const cached = Assets.get<Texture>(content.value);
        if (cached) {
            sprite.texture = cached;
            fitSpriteToRect(sprite, cached, localLocation.w, localLocation.h);
            return;
        }

        sprite.texture = Texture.EMPTY;
        sprite.position.set(0, 0);
        sprite.width = 0;
        sprite.height = 0;
        void Assets.load<Texture>(content.value).then((texture) => {
            if (sprite.destroyed) {
                return;
            }
            sprite.texture = texture;
            fitSpriteToRect(sprite, texture, localLocation.w, localLocation.h);
            input.options.app?.render();
        }).catch((error) => {
            console.error(`[boxTreeToPixi] Failed to load texture "${content.value}"`, error);
        });
        return;
    }

    if (content.type !== 'text') {
        return;
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
