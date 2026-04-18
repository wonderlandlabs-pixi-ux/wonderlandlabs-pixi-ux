import { cellLayers } from './helpers.js';
import { resolveStyleValue, styleContextForCell, type BoxStyleContext } from './styleHelpers.js';
import type { BoxCellType, BoxStyleManagerLike, RectStaticType } from './types.js';

type SvgPalette = {
    fill: string;
    stroke: string;
    text: string;
    insetStroke: string;
};

export type BoxSvgOptions = {
    title?: string;
    padding?: number;
    showInsets?: boolean;
    styleTree: BoxStyleManagerLike;
};

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function paletteFor(
    cell: BoxCellType,
    options: BoxSvgOptions,
    context?: BoxStyleContext,
): SvgPalette {
    const styleBackground = context
        ? svgColor(
            resolveStyleValue(options.styleTree, context, ['background', 'color'])
        )
        : undefined;
    const styleBorder = context
        ? svgColor(
            resolveStyleValue(options.styleTree, context, ['border', 'color'])
        )
        : undefined;
    const styleText = context
        ? svgColor(
            resolveStyleValue(options.styleTree, context, ['text', 'color'])
            ?? resolveStyleValue(options.styleTree, context, ['textColor'])
        )
        : undefined;

    if (!styleBackground || !styleBorder) {
        throw new Error(`toSVG requires styleTree values for background.color and border.color on "${cell.name}"`);
    }

    return {
        fill: styleBackground,
        stroke: styleBorder,
        insetStroke: styleBorder,
        text: styleText ?? styleBorder,
    };
}

function boundsOf(cell: BoxCellType): { maxX: number; maxY: number } {
    const location = cell.location;
    const base = {
        maxX: location ? location.x + location.w : 0,
        maxY: location ? location.y + location.h : 0,
    };

    return (cell.children ?? []).reduce((nextBounds, child) => {
        const childBounds = boundsOf(child);
        return {
            maxX: Math.max(nextBounds.maxX, childBounds.maxX),
            maxY: Math.max(nextBounds.maxY, childBounds.maxY),
        };
    }, base);
}

function renderCell(
    cell: BoxCellType,
    depth: number,
    options: BoxSvgOptions,
    parentContext?: BoxStyleContext,
): string {
    const location = cell.location;
    if (!location) {
        return '';
    }

    const context = styleContextForCell(cell, parentContext);
    const palette = paletteFor(cell, options, context);
    const layers = cellLayers(cell);
    const outerRect = `<rect x="${location.x}" y="${location.y}" width="${location.w}" height="${location.h}" fill="${palette.fill}" stroke="none" stroke-width="${Math.max(0.75, 2 - depth * 0.25)}" rx="${Math.max(0, 6 - depth)}" fill-opacity="0.8" />`;
    const isIndexLabel = /^#\d+$/.test(cell.name);
    const label = isIndexLabel
        ? `<text x="${location.x + location.w - 6}" y="${location.y + location.h - 6}" font-family="monospace" font-size="${Math.max(8, 11 - depth)}" text-anchor="end" fill="rgba(0, 0, 0, 0.2)">${escapeHtml(cell.name)}</text>`
        : `<text x="${location.x + 5}" y="${location.y + 14}" font-family="monospace" font-size="${Math.max(8, 12 - depth)}" fill="${palette.text ?? palette.stroke}">${escapeHtml(cell.name)}</text>`;
    const insetRects = options.showInsets === false
        ? ''
        : layers
            .filter((layer) => !['outer', 'content'].includes(layer.role))
            .map((layer, index) => {
            const layerStroke = svgColor(
                resolveStyleValue(options.styleTree, context, ['border', 'color'], {
                    extraNouns: [layer.role],
                })
            ) ?? svgColor(
                resolveStyleValue(options.styleTree, context, ['border', 'color'])
            ) ?? palette.insetStroke ?? palette.stroke;
            const opacity = Math.max(0.3, 0.7 - index * 0.12);
            const layerVisual = layer.role === 'border'
                ? renderBorderLayer(layer.rect, layer.insets, layerStroke, opacity)
                : `<rect x="${layer.insets.x}" y="${layer.insets.y}" width="${layer.insets.w}" height="${layer.insets.h}" fill="none" stroke="${layerStroke}" stroke-width="1" stroke-dasharray="4 3" opacity="${opacity}" rx="${Math.max(0, 5 - depth)}" />`;
            return [
                layerVisual,
                `<text x="${layer.insets.x + 4}" y="${layer.insets.y + 11}" font-family="monospace" font-size="${Math.max(7, 10 - depth)}" fill="${layerStroke}" opacity="${opacity}">${escapeHtml(layer.role)}</text>`,
            ].join('');
        }).join('');
    const children = (cell.children ?? []).map((child) => renderCell(child, depth + 1, options, context)).join('');

    return outerRect + insetRects + label + children;
}

export function boxTreeToSVG(root: BoxCellType, options: BoxSvgOptions): string {
    const location = root.location;
    if (!location) {
        return '';
    }

    const padding = options.padding ?? 20;
    const titleHeight = options.title ? 28 : 0;
    const bounds = boundsOf(root);
    const width = bounds.maxX + padding;
    const height = bounds.maxY + padding + titleHeight;
    const shiftedRoot: BoxCellType = titleHeight === 0
        ? root
        : shiftTree(root, titleHeight);

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8f9fa" />`,
        ...(options.title
            ? [`<text x="${padding}" y="18" font-family="monospace" font-size="16" fill="#0b132b" dominant-baseline="ideographic">${escapeHtml(options.title)}</text>`]
            : []),
        renderCell(shiftedRoot, 0, options),
        `</svg>`,
    ].join('');
}

function shiftTree(cell: BoxCellType, deltaY: number): BoxCellType {
    return {
        ...cell,
        location: cell.location
            ? { ...cell.location, y: cell.location.y + deltaY }
            : undefined,
        children: cell.children?.map((child) => shiftTree(child, deltaY)),
    };
}

export function computedBoxesToSVG(
    parent: RectStaticType,
    children: RectStaticType[],
    options: BoxSvgOptions & { childNames?: string[] },
): string {
    const root: BoxCellType = {
        name: 'parent',
        absolute: true,
        dim: parent,
        location: parent,
        align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        children: children.map((child, index) => ({
            name: options.childNames?.[index] ?? `#${index}`,
            absolute: false,
            dim: { w: child.w, h: child.h },
            location: child,
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        })),
    };

    return boxTreeToSVG(root, options);
}

function svgColor(input: unknown): string | undefined {
    if (!input) {
        return undefined;
    }
    if (typeof input === 'string') {
        return input;
    }
    if (typeof input === 'number' && Number.isFinite(input)) {
        return `#${input.toString(16).padStart(6, '0').slice(-6)}`;
    }
    if (typeof input === 'object' && input !== null) {
        const maybeRgb = input as { r?: unknown; g?: unknown; b?: unknown };
        if (typeof maybeRgb.r === 'number' && typeof maybeRgb.g === 'number' && typeof maybeRgb.b === 'number') {
            const toByte = (value: number) => {
                const normalized = value <= 1 ? value * 255 : value;
                return Math.max(0, Math.min(255, Math.round(normalized)));
            };
            return `rgb(${toByte(maybeRgb.r)}, ${toByte(maybeRgb.g)}, ${toByte(maybeRgb.b)})`;
        }
    }
    return undefined;
}

function renderBorderLayer(
    outer: RectStaticType,
    inner: RectStaticType,
    color: string,
    opacity: number,
): string {
    const top = Math.max(inner.y - outer.y, 0);
    const left = Math.max(inner.x - outer.x, 0);
    const right = Math.max((outer.x + outer.w) - (inner.x + inner.w), 0);
    const bottom = Math.max((outer.y + outer.h) - (inner.y + inner.h), 0);

    const bands: string[] = [];

    if (top > 0) {
        bands.push(`<rect x="${outer.x}" y="${outer.y}" width="${outer.w}" height="${top}" fill="${color}" opacity="${opacity}" />`);
    }
    if (bottom > 0) {
        bands.push(`<rect x="${outer.x}" y="${inner.y + inner.h}" width="${outer.w}" height="${bottom}" fill="${color}" opacity="${opacity}" />`);
    }
    if (left > 0) {
        bands.push(`<rect x="${outer.x}" y="${inner.y}" width="${left}" height="${inner.h}" fill="${color}" opacity="${opacity}" />`);
    }
    if (right > 0) {
        bands.push(`<rect x="${inner.x + inner.w}" y="${inner.y}" width="${right}" height="${inner.h}" fill="${color}" opacity="${opacity}" />`);
    }

    if (bands.length === 0) {
        bands.push(`<rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity}" />`);
    }

    return bands.join('');
}
