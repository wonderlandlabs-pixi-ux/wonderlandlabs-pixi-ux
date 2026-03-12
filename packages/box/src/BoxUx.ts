import './pixiEnvironment.js';
import type { Application } from 'pixi.js';
import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import type { BoxRenderer, BoxTree } from './BoxTree.js';
import { BoxUxBase } from './BoxUxBase.js';
import { MapEnhanced } from './BoxUxContextMap.js';
import {
  BOX_RENDER_CONTENT_ORDER,
  BOX_UX_CONTENT_ORDER,
  BOX_UX_LAYER,
  BOX_UX_ORDER,
  getUxOrder,
  setUxOrder,
} from './constants.js';
import {
  BACKGROUND_CONTAINER,
  BOX_UX_ENV,
  CHILD_CONTAINER,
  CONTENT_CONTAINER,
  OVERLAY_CONTAINER,
  ROOT_CONTAINER,
  STROKE_CONTAINER,
} from './constants.ux.js';
import { asColorNumber, asNonNegativeNumber, resolveStyleProp } from './utils.ux.js';
import type {
  BoxTreeStyleMap,
  BoxTreeUxStyleManagerLike,
} from './types.ux.js';

export {
  BOX_UX_CONTENT_ORDER,
  BOX_UX_ORDER,
  BOX_UX_LAYER,
  BOX_RENDER_CONTENT_ORDER,
  getUxOrder,
  setUxOrder,
} from './constants.js';
export {
  BACKGROUND_CONTAINER,
  BOX_UX_ENV,
  CHILD_CONTAINER,
  CONTENT_CONTAINER,
  OVERLAY_CONTAINER,
  ROOT_CONTAINER,
  STROKE_CONTAINER,
} from './constants.ux.js';
export type {
  BoxTreeFillStyle,
  BoxTreeStrokeStyle,
  BoxTreeStyleMap,
  BoxTreeUxStyleManagerLike,
} from './types.ux.js';
export { BoxUxBase } from './BoxUxBase.js';

function isBoxUxPixi(value: unknown): value is BoxUxPixi {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<BoxUxPixi>;
  return candidate.container instanceof Container
    && typeof candidate.env === 'string';
}

/**
 * Default BoxTree UX implementation for Pixi containers.
 *
 * Exposes `content` as a keyed layer map. Layer order is taken from each
 * display object's `zIndex` during render.
 */
export class BoxUxPixi extends BoxUxBase implements BoxRenderer {
  static readonly DEFAULT_STYLES: BoxTreeUxStyleManagerLike = {
    match: () => undefined,
  };

  readonly env = BOX_UX_ENV.PIXI;
  readonly container: Container;
  readonly contentMap: MapEnhanced;
  #managedContentNode?: Sprite | Text;
  #managedContentKey?: string;
  #strokeGraphic?: Graphics;

  constructor(box: BoxTree) {
    super(box);

    this.container = new Container({
      label: `${this.box.identityPath}-container`,
      sortableChildren: true,
    });

    this.contentMap = new MapEnhanced();
  }

  #requireGraphicsLayer(layer: string, label: string): Graphics {
    return this.contentMap.getOrMake(layer, () => {
      const graphic = new Graphics();
      graphic.label = label;
      return graphic;
    });
  }

  #requireContainerLayer(layer: string, label: string): Container {
    return this.contentMap.getOrMake(
      layer,
      () => new Container({ label }),
    );
  }

  get styles(): BoxTreeUxStyleManagerLike {
    return this.box.styles ?? BoxUxPixi.DEFAULT_STYLES;
  }

  get app(): Application | undefined {
    return this.box.app;
  }

  get background(): Graphics {
    const background = this.#requireGraphicsLayer(
      BOX_UX_LAYER.BACKGROUND,
      `${this.box.identityPath}-background`,
    );
    background.eventMode = 'none';
    background.zIndex = BOX_RENDER_CONTENT_ORDER.BACKGROUND;
    return background;
  }

  get childContainer(): Container {
    const childContainer = this.#requireContainerLayer(
      BOX_UX_LAYER.CHILDREN,
      `${this.box.identityPath}-children`,
    );
    childContainer.zIndex = BOX_RENDER_CONTENT_ORDER.CHILDREN;
    childContainer.sortableChildren = true;
    return childContainer;
  }

  get overlayContainer(): Container {
    const overlay = this.#requireContainerLayer(
      BOX_UX_LAYER.OVERLAY,
      `${this.box.identityPath}-overlay`,
    );
    overlay.zIndex = BOX_RENDER_CONTENT_ORDER.OVERLAY;
    overlay.sortableChildren = true;
    overlay.eventMode = 'none';
    return overlay;
  }

  get contentContainer(): Container {
    const contentContainer = this.#requireContainerLayer(
      BOX_UX_LAYER.CONTENT,
      `${this.box.identityPath}-content`,
    );
    contentContainer.zIndex = BOX_RENDER_CONTENT_ORDER.CONTENT;
    contentContainer.sortableChildren = true;
    return contentContainer;
  }

  get strokeGraphic(): Graphics {
    const overlay = this.overlayContainer;
    if (!this.#strokeGraphic || this.#strokeGraphic.destroyed) {
      const next = new Graphics();
      next.label = `${this.box.identityPath}-stroke`;
      next.eventMode = 'none';
      this.#strokeGraphic = next;
    }
    if (this.#strokeGraphic.parent !== overlay) {
      overlay.addChild(this.#strokeGraphic);
    }
    return this.#strokeGraphic;
  }

  // Back-compat alias for older call sites.
  get content(): MapEnhanced {
    return this.contentMap;
  }

  get childUxs(): ReadonlyMap<string, BoxUxPixi> {
    return this.getChildRenderers(isBoxUxPixi);
  }

  get childRenderers(): ReadonlyMap<string, BoxUxPixi> {
    return this.getChildRenderers(isBoxUxPixi);
  }

  generateStyleMap(targetBox: BoxTree): BoxTreeStyleMap {
    const styleContext = {
      styles: this.styles,
      inlineStyle: targetBox.style,
      styleNouns: targetBox.styleNouns,
      styleName: targetBox.styleName,
      states: targetBox.resolvedVerb,
    } as const;

    const fillColor = asColorNumber(resolveStyleProp('bgColor', styleContext));
    const fillAlpha = asNonNegativeNumber(resolveStyleProp(
      'bgAlpha',
      styleContext,
      fillColor !== undefined ? 1 : undefined,
    ));
    const strokeColor = asColorNumber(resolveStyleProp('bgStrokeColor', styleContext));
    const strokeAlpha = asNonNegativeNumber(resolveStyleProp(
      'bgStrokeAlpha',
      styleContext,
      strokeColor !== undefined ? 1 : undefined,
    ));
    const strokeWidth = asNonNegativeNumber(resolveStyleProp('bgStrokeSize', styleContext, 0));

    return {
      fill: {
        color: fillColor,
        alpha: fillAlpha,
      },
      stroke: {
        color: strokeColor,
        alpha: strokeAlpha,
        width: strokeWidth,
      },
    };
  }

  getChildUx(key: string): BoxUxPixi | undefined {
    return this.getChildRendererByKey(key, isBoxUxPixi);
  }

  getChildRenderer(key: string): BoxUxPixi | undefined {
    return this.getChildUx(key);
  }

  getContainer(key: unknown): unknown {
    if (key === ROOT_CONTAINER) {
      return this.container;
    }
    if (key === BACKGROUND_CONTAINER) {
      return this.background;
    }
    if (key === CHILD_CONTAINER) {
      return this.childContainer;
    }
    if (key === CONTENT_CONTAINER) {
      return this.contentContainer;
    }
    if (key === OVERLAY_CONTAINER) {
      return this.overlayContainer;
    }
    if (key === STROKE_CONTAINER) {
      return this.strokeGraphic;
    }
    return undefined;
  }

  attach(targetContainer?: Container): Container {
    const target = targetContainer ?? this.app?.stage;
    if (!target) {
      throw new Error(`${this.box.identityPath}: attach requires targetContainer or ux.app`);
    }
    target.addChild(this.container);
    return this.container;
  }

  #syncChildren(childrenMap: ReadonlyMap<string, BoxTree>): void {
    const childContainer = this.childContainer;

    // Rebuild child container content every cycle for deterministic ordering.
    childContainer.removeChildren();
    for (const child of childrenMap.values()) {
      child.render();
      const childUx = this.readChildRenderer(child, isBoxUxPixi);
      if (childUx?.isAttached) {
        childContainer.addChild(childUx.container);
      }
    }
  }

  #isRenderableContent(content: unknown): content is Container | Graphics {
    return content instanceof Container || content instanceof Graphics;
  }

  #isContentEmpty(content: unknown): boolean {
    if (!this.#isRenderableContent(content)) {
      return true;
    }
    if (!content.visible) {
      return true;
    }
    if (content instanceof Graphics) {
      return false;
    }
    return !content.children.some((child) => child.visible);
  }

  #renderContentMap(parent: Container): void {
    const ordered = [...this.contentMap.entries()]
      .filter((entry): entry is [string, Container | Graphics] => this.#isRenderableContent(entry[1]))
      .sort((a, b) => {
      const left = Number.isFinite(a[1].zIndex) ? a[1].zIndex : 0;
      const right = Number.isFinite(b[1].zIndex) ? b[1].zIndex : 0;
      if (left !== right) {
        return left - right;
      }
      return a[0].localeCompare(b[0]);
      });

    for (const [, content] of ordered) {
      if (this.#isContentEmpty(content)) {
        if (content.parent === parent) {
          parent.removeChild(content);
        }
        continue;
      }
      if (content.parent !== parent) {
        parent.addChild(content);
      }
    }
  }

  #clearManagedContent(): void {
    if (!this.#managedContentNode) {
      return;
    }
    if (this.#managedContentNode.parent) {
      this.#managedContentNode.parent.removeChild(this.#managedContentNode);
    }
    this.#managedContentNode.destroy();
    this.#managedContentNode = undefined;
    this.#managedContentKey = undefined;
  }

  #syncNodeContent(): void {
    const contentContainer = this.contentContainer;
    const contentDef = this.box.content;
    if (!contentDef) {
      this.#clearManagedContent();
      return;
    }

    if (contentDef.type === 'text') {
      const textKey = `text:${contentDef.value}:${Math.max(0, this.box.width)}`;
      if (!(this.#managedContentNode instanceof Text) || this.#managedContentKey !== textKey) {
        this.#clearManagedContent();
        const text = new Text({
          text: contentDef.value,
          style: new TextStyle({
            fontSize: 13,
            fill: 0xffffff,
            align: 'left',
            fontFamily: 'Arial',
            wordWrap: true,
            wordWrapWidth: Math.max(0, this.box.width),
          }),
        });
        text.label = `${this.box.identityPath}-content-text`;
        text.x = 0;
        text.y = 0;
        this.#managedContentNode = text;
        this.#managedContentKey = textKey;
      }
      if (this.#managedContentNode.parent !== contentContainer) {
        contentContainer.addChild(this.#managedContentNode);
      }
      return;
    }

    const imageKey = `image:${contentDef.value}`;
    if (!(this.#managedContentNode instanceof Sprite) || this.#managedContentKey !== imageKey) {
      try {
        this.#clearManagedContent();
        const sprite = Sprite.from(contentDef.value);
        sprite.label = `${this.box.identityPath}-content-image`;
        sprite.x = 0;
        sprite.y = 0;
        this.#managedContentNode = sprite;
        this.#managedContentKey = imageKey;
      } catch {
        this.#clearManagedContent();
        return;
      }
    }
    if (this.#managedContentNode instanceof Sprite) {
      this.#managedContentNode.width = Math.max(0, this.box.width);
      this.#managedContentNode.height = Math.max(0, this.box.height);
      if (this.#managedContentNode.parent !== contentContainer) {
        contentContainer.addChild(this.#managedContentNode);
      }
    }
  }

  #renderBackground(): void {
    const background = this.background;
    const strokeGraphic = this.strokeGraphic;

    const styleMap = this.generateStyleMap(this.box);
    const bgColor = styleMap.fill.color;
    const bgAlpha = styleMap.fill.alpha ?? 1;
    const bgStrokeColor = styleMap.stroke.color;
    const bgStrokeAlpha = styleMap.stroke.alpha ?? 1;
    const bgStrokeSize = styleMap.stroke.width ?? 0;

    background.clear();
    strokeGraphic.clear();

    const { width, height } = this.box.rect;
    const hasFill = bgColor !== undefined;
    const hasStroke = bgStrokeColor !== undefined && bgStrokeSize > 0;

    background.visible = hasFill;
    strokeGraphic.visible = hasStroke;

    if (hasFill) {
      background.rect(0, 0, width, height);
      background.fill({ color: bgColor, alpha: bgAlpha });
    }

    if (hasStroke) {
      strokeGraphic.rect(0, 0, width, height);
      strokeGraphic.stroke({
        color: bgStrokeColor,
        alpha: bgStrokeAlpha,
        width: bgStrokeSize,
      });
    }
  }

  #destroyContent(): void {
    this.#clearManagedContent();
    this.#strokeGraphic = undefined;

    const childLayer = this.contentMap.get(BOX_UX_LAYER.CHILDREN);
    if (childLayer instanceof Container) {
      childLayer.removeChildren();
    }

    for (const layerContent of this.contentMap.values()) {
      if (!this.#isRenderableContent(layerContent)) {
        continue;
      }
      if (layerContent.parent === this.container) {
        this.container.removeChild(layerContent);
      }
      layerContent.destroy({ children: true });
    }
    this.contentMap.clear();
  }

  protected override renderUp(): void {
    this.container.position.set(this.box.x, this.box.y);
    this.container.zIndex = this.box.order;
    this.container.sortableChildren = true;

    const childrenMap = this.box.getChildBoxes();
    void this.background;
    void this.childContainer;
    void this.contentContainer;
    void this.overlayContainer;
    this.#syncChildren(childrenMap);
    this.#syncNodeContent();
    this.#renderBackground();
    this.#renderContentMap(this.container);
  }

  protected override onAttach(): void {
    this.container.visible = true;
  }

  protected override onDetach(): void {
    this.container.visible = false;
  }

  protected override onDestroy(): void {
    this.#destroyContent();
  }
}

export const BoxTreeUx = BoxUxPixi;
export type BoxTreeUx = BoxUxPixi;
export const BoxTreeRenderer = BoxUxPixi;
export type BoxTreeRenderer = BoxUxPixi;
export type BoxTreeStyleManagerLike = BoxTreeUxStyleManagerLike;
export const BoxUx = BoxUxPixi;
