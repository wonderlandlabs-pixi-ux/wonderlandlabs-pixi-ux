import type {BoxTree} from './BoxTree.js';
import type {Container} from 'pixi.js';

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function collectNodes(root: BoxTree, includeRoot: boolean): BoxNodeRenderData[] {
  const out: BoxNodeRenderData[] = [];

  const walk = (node: BoxTree, isRoot: boolean): void => {
    if (!isRoot || includeRoot) {
      out.push({
        node,
        x: node.absX,
        y: node.absY,
        width: node.width,
        height: node.height,
        contentType: node.content?.type,
        contentValue: node.content?.value,
      });
    }

    for (const child of node.children) {
      walk(child, false);
    }
  };

  walk(root, true);
  return out;
}

export async function boxTreeToPixi(tree: BoxTree, options: BoxTreeToPixiOptions = {}): Promise<Container> {
  const {
    includeRoot = true,
    fill,
    fillAlpha = 1,
    stroke = 0x000000,
    strokeAlpha = 1,
    strokeWidth = 1,
    nodeToStyle,
  } = options;

  const { Container, Graphics } = await import('pixi.js');
  const container = new Container();
  const nodes = collectNodes(tree, includeRoot);

  for (const [index, nodeData] of nodes.entries()) {
    const style = {
      fill,
      fillAlpha,
      stroke,
      strokeAlpha,
      strokeWidth,
      ...(nodeToStyle?.(nodeData.node, index) ?? {}),
    };

    const g = new Graphics();
    const gWithMeta = g as typeof g & BoxNodeGraphicsMetadata;
    g.rect(nodeData.x, nodeData.y, nodeData.width, nodeData.height);

    if (style.fill !== undefined) {
      g.fill({ color: style.fill, alpha: style.fillAlpha ?? 1 });
    }

    if (style.stroke !== undefined && (style.strokeWidth ?? 1) > 0) {
      g.stroke({
        color: style.stroke,
        alpha: style.strokeAlpha ?? 1,
        width: style.strokeWidth ?? 1,
      });
    }

    g.label = nodeData.node.identityPath;
    gWithMeta.boxContentType = nodeData.contentType;
    gWithMeta.boxContentValue = nodeData.contentValue;
    container.addChild(g);
  }

  return container;
}

export function boxTreeToSvg(tree: BoxTree, options: BoxTreeToSvgOptions = {}): string {
  const {
    includeRoot = true,
    padding = 0,
    fill = 'none',
    fillOpacity = 1,
    stroke = '#000000',
    strokeOpacity = 1,
    strokeWidth = 1,
    nodeToStyle,
    background,
  } = options;

  const nodes = collectNodes(tree, includeRoot);
  if (!nodes.length) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" viewBox="0 0 0 0"></svg>';
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));

  const viewX = minX - padding;
  const viewY = minY - padding;
  const width = maxX - minX + (padding * 2);
  const height = maxY - minY + (padding * 2);

  const body: string[] = [];

  if (background) {
    body.push(
      `<rect x="${viewX}" y="${viewY}" width="${width}" height="${height}" fill="${escapeAttr(background)}" />`,
    );
  }

  for (const [index, nodeData] of nodes.entries()) {
    const style = {
      fill,
      fillOpacity,
      stroke,
      strokeOpacity,
      strokeWidth,
      ...(nodeToStyle?.(nodeData.node, index) ?? {}),
    };

    const contentAttrs = nodeData.contentType
      ? ` data-content-type="${escapeAttr(nodeData.contentType)}" data-content-value="${escapeAttr(nodeData.contentValue ?? '')}"`
      : '';

    body.push(
      `<rect data-path="${escapeAttr(nodeData.node.identityPath)}"${contentAttrs} x="${nodeData.x}" y="${nodeData.y}" width="${nodeData.width}" height="${nodeData.height}" fill="${escapeAttr(style.fill ?? 'none')}" fill-opacity="${style.fillOpacity ?? 1}" stroke="${escapeAttr(style.stroke ?? 'none')}" stroke-opacity="${style.strokeOpacity ?? 1}" stroke-width="${style.strokeWidth ?? 0}" />`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewX} ${viewY} ${width} ${height}">${body.join('')}</svg>`;
}
