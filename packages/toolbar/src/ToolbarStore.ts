import { ButtonStore } from '@wonderlandlabs-pixi-ux/button';
import { StyleTree, fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { TickerForest, type TickerForestConfig } from '@wonderlandlabs-pixi-ux/ticker-forest';
import {
  Application,
  Container,
  Graphics,
  type Ticker,
} from 'pixi.js';
import type {
  BackgroundStyle,
  ToolbarConfig,
  ToolbarButtonConfig,
  ToolbarPadding,
} from './types';
import { ToolbarConfigSchema } from './types';
import defaultStyles from './styles/toolbar.default.json';

type ToolbarState = {
  order: number;
};

type TickerSource = Application | { ticker: Ticker };

type ToolbarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Unwire = () => void;

const ZERO_PADDING: Required<ToolbarPadding> = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

function isApplication(value: TickerSource): value is Application {
  return !!value && typeof value === 'object' && 'renderer' in value && 'ticker' in value;
}

function toTickerConfig(source: TickerSource): TickerForestConfig {
  if (isApplication(source)) {
    return { app: source };
  }
  return { ticker: source.ticker };
}

function normalizePadding(padding: number | ToolbarPadding | undefined): Required<ToolbarPadding> {
  if (padding === undefined) return { ...ZERO_PADDING };
  if (typeof padding === 'number') {
    return {
      top: padding,
      right: padding,
      bottom: padding,
      left: padding,
    };
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): number {
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  return (r << 16) | (g << 8) | b;
}

/**
 * ToolbarStore - Composes ButtonStore instances and lays them out in row/column flow.
 */
export class ToolbarStore extends TickerForest<ToolbarState> {
  readonly id: string;

  #styleTree: StyleTree;
  #toolbarConfig: ToolbarConfig;
  #buttons: Map<string, ButtonStore> = new Map();
  #buttonUnwires: Map<string, Unwire> = new Map();

  #background: Graphics;
  #contentContainer: Container;

  #rect: ToolbarRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  #padding: Required<ToolbarPadding>;

  constructor(config: ToolbarConfig, tickerSource: TickerSource) {
    const parsedConfig = ToolbarConfigSchema.parse(config);
    const toolbarContainer = new Container({ label: `toolbar-${parsedConfig.id ?? 'toolbar'}` });
    super(
      { value: { order: parsedConfig.order ?? 0 } },
      {...toTickerConfig(tickerSource), container: toolbarContainer}
    );


    this.id = parsedConfig.id ?? 'toolbar';
    this.#styleTree = parsedConfig.style ?? fromJSON(defaultStyles);
    this.#toolbarConfig = parsedConfig;
    this.#padding = normalizePadding(parsedConfig.padding);

    this.container.zIndex = this.value.order;
    this.#background = new Graphics();
    this.#contentContainer = new Container({ label: `toolbar-content-${this.id}` });

    this.container.addChild(this.#background);
    this.container.addChild(this.#contentContainer);

    for (const buttonConfig of parsedConfig.buttons) {
      this.#createButton(buttonConfig, parsedConfig.bitmapFont);
    }
  }

  get container(): Container {
    const container = super.container;
    if (!container) {
      throw new Error('ToolbarStore: container unavailable');
    }
    return container;
  }

  get rect(): ToolbarRect {
    return {
      x: this.container.position.x,
      y: this.container.position.y,
      width: this.#rect.width,
      height: this.#rect.height,
    };
  }

  get styleTree(): StyleTree {
    return this.#styleTree;
  }

  get order(): number {
    return this.value.order;
  }

  get toolbarConfig(): ToolbarConfig {
    return this.#toolbarConfig;
  }

  #wireButton(button: ButtonStore): Unwire {
    const originalSetHovered = button.setHovered.bind(button);
    const originalSetDisabled = button.setDisabled.bind(button);

    button.setHovered = (isHovered: boolean): void => {
      originalSetHovered(isHovered);
      this.dirty();
    };

    button.setDisabled = (isDisabled: boolean): void => {
      originalSetDisabled(isDisabled);
      this.dirty();
    };

    return () => {
      button.setHovered = originalSetHovered;
      button.setDisabled = originalSetDisabled;
    };
  }

  #createButton(buttonConfig: ToolbarButtonConfig, bitmapFontName?: string): ButtonStore {
    const tickerSource = this.application ?? { ticker: this.ticker };
    const button = new ButtonStore({
      ...buttonConfig,
      bitmapFont: buttonConfig.bitmapFont ?? bitmapFontName,
    }, this.#styleTree, tickerSource);

    const unwind = this.#wireButton(button);

    this.#buttons.set(buttonConfig.id, button);
    this.#buttonUnwires.set(buttonConfig.id, unwind);
    this.#contentContainer.addChild(button.container);

    return button;
  }

  addButton(buttonConfig: ToolbarButtonConfig): ButtonStore {
    const button = this.#createButton(buttonConfig, this.#toolbarConfig.bitmapFont);
    button.kickoff();
    this.dirty();
    return button;
  }

  removeButton(id: string): void {
    const button = this.#buttons.get(id);
    if (!button) return;

    this.#buttonUnwires.get(id)?.();
    this.#buttonUnwires.delete(id);

    this.#buttons.delete(id);
    this.#contentContainer.removeChild(button.container);
    button.cleanup();

    this.dirty();
  }

  getButton(id: string): ButtonStore | undefined {
    return this.#buttons.get(id);
  }

  getButtons(): ButtonStore[] {
    return Array.from(this.#buttons.values());
  }

  setPosition(x: number, y: number): void {
    this.container.position.set(x, y);
  }

  setOrder(order: number): void {
    if (!Number.isFinite(order)) {
      throw new Error(`${this.id}: order must be finite`);
    }
    if (this.value.order === order) {
      return;
    }
    this.mutate((draft) => {
      draft.order = order;
    });
    this.dirty();
  }

  #layoutButtons(): { width: number; height: number } {
    const buttons = this.getButtons();
    if (!buttons.length) {
      return { width: 0, height: 0 };
    }

    const spacing = this.#toolbarConfig.spacing ?? 8;
    const orientation = this.#toolbarConfig.orientation ?? 'horizontal';
    const fillButtons = this.#toolbarConfig.fillButtons ?? false;

    let fillChanged = false;
    if (fillButtons) {
      if (orientation === 'vertical') {
        const targetWidth = buttons.reduce((max, button) => Math.max(max, button.rect.width), 0);
        for (const button of buttons) {
          fillChanged = button.setMinSize(targetWidth, undefined) || fillChanged;
        }
      } else {
        const targetHeight = buttons.reduce((max, button) => Math.max(max, button.rect.height), 0);
        for (const button of buttons) {
          fillChanged = button.setMinSize(undefined, targetHeight) || fillChanged;
        }
      }
    } else {
      for (const button of buttons) {
        fillChanged = button.setMinSize(undefined, undefined) || fillChanged;
      }
    }

    let flowOffset = 0;
    let crossSize = 0;

    for (const [index, button] of buttons.entries()) {
      const { width, height } = button.rect;

      if (orientation === 'vertical') {
        if (button.rect.x !== 0 || button.rect.y !== flowOffset) {
          button.setPosition(0, flowOffset);
        }
        flowOffset += height;
        if (index < buttons.length - 1) {
          flowOffset += spacing;
        }
        crossSize = Math.max(crossSize, width);
      } else {
        if (button.rect.x !== flowOffset || button.rect.y !== 0) {
          button.setPosition(flowOffset, 0);
        }
        flowOffset += width;
        if (index < buttons.length - 1) {
          flowOffset += spacing;
        }
        crossSize = Math.max(crossSize, height);
      }
    }

    if (orientation === 'vertical') {
      if (fillChanged) {
        this.dirty();
      }
      return {
        width: crossSize,
        height: flowOffset,
      };
    }

    if (fillChanged) {
      this.dirty();
    }
    return {
      width: flowOffset,
      height: crossSize,
    };
  }

  #resolveToolbarSize(contentWidth: number, contentHeight: number): { width: number; height: number } {
    const withPaddingWidth = contentWidth + this.#padding.left + this.#padding.right;
    const withPaddingHeight = contentHeight + this.#padding.top + this.#padding.bottom;

    const fixedSize = this.#toolbarConfig.fixedSize ?? false;
    if (fixedSize) {
      return {
        width: this.#toolbarConfig.width ?? withPaddingWidth,
        height: this.#toolbarConfig.height ?? withPaddingHeight,
      };
    }

    return {
      width: Math.max(this.#toolbarConfig.width ?? 0, withPaddingWidth),
      height: Math.max(this.#toolbarConfig.height ?? 0, withPaddingHeight),
    };
  }

  #renderBackground(style?: BackgroundStyle): void {
    this.#background.clear();

    if (!style) return;

    const radius = style.borderRadius ?? 0;

    if (style.fill?.color) {
      this.#background.roundRect(0, 0, this.#rect.width, this.#rect.height, radius);
      this.#background.fill({
        color: rgbToHex(style.fill.color),
        alpha: style.fill.alpha ?? 1,
      });
    }

    if (style.stroke?.color && style.stroke.width && style.stroke.width > 0) {
      this.#background.roundRect(0, 0, this.#rect.width, this.#rect.height, radius);
      this.#background.stroke({
        color: rgbToHex(style.stroke.color),
        alpha: style.stroke.alpha ?? 1,
        width: style.stroke.width,
      });
    }
  }

  override kickoff(): void {
    for (const button of this.#buttons.values()) {
      button.kickoff();
    }
    super.kickoff();
  }

  protected override resolve(): void {
    const content = this.#layoutButtons();
    const size = this.#resolveToolbarSize(content.width, content.height);
    this.container.zIndex = this.value.order;

    this.#rect = {
      x: this.container.position.x,
      y: this.container.position.y,
      width: size.width,
      height: size.height,
    };

    this.#contentContainer.position.set(this.#padding.left, this.#padding.top);
    this.#renderBackground(this.#toolbarConfig.background);
  }

  override cleanup(): void {
    for (const [id, button] of this.#buttons.entries()) {
      this.#buttonUnwires.get(id)?.();
      button.cleanup();
    }
    this.#buttonUnwires.clear();
    this.#buttons.clear();
    super.cleanup();
  }
}
