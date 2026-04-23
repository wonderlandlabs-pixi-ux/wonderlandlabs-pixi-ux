import {
  ButtonStore,
  BTYPE_AVATAR,
  BTYPE_BASE,
  BTYPE_TEXT,
  BTYPE_VERTICAL,
  type ButtonStateType,
} from '@wonderlandlabs-pixi-ux/button';
import { fromJSON, type StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import { TickerForest, type TickerForestConfig } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import type { Application, Container, Graphics, Rectangle, Ticker } from 'pixi.js';
import type {
  BackgroundStyle,
  ToolbarButtonConfig,
  ToolbarConfig,
  ToolbarPadding,
} from './types.js';
import { ToolbarButtonVariantSchema, ToolbarConfigSchema } from './types.js';
import { computeToolbarLayout, type ToolbarRect } from './toolbarLayout.js';
import defaultStyles from './styles/toolbar.default.json' with { type: 'json' };

type ToolbarState = {
  order: number;
};

type TickerSource = Application | { ticker: Ticker };
type Unwire = () => void;

type ToolbarButtonRecord = {
  button: ButtonStore;
  config: ToolbarButtonConfig;
  unwind: Unwire;
};

const ZERO_PADDING: Required<ToolbarPadding> = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const BUTTON_VARIANTS = new Set(ToolbarButtonVariantSchema.options);

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

function isButtonVariant(value: string | undefined): value is typeof BTYPE_BASE | typeof BTYPE_TEXT | typeof BTYPE_VERTICAL | typeof BTYPE_AVATAR {
  return !!value && BUTTON_VARIANTS.has(value as never);
}

function variantFromMode(mode: ToolbarButtonConfig['mode']): ButtonStateType['variant'] | undefined {
  switch (mode) {
    case 'text':
      return BTYPE_TEXT;
    case 'iconVertical':
      return BTYPE_VERTICAL;
    case 'avatar':
      return BTYPE_AVATAR;
    case 'icon':
    case 'inline':
      return BTYPE_BASE;
    default:
      return undefined;
  }
}

function inferButtonVariant(config: ToolbarButtonConfig): ButtonStateType['variant'] {
  if (isButtonVariant(config.variant)) {
    return config.variant;
  }
  const fromMode = variantFromMode(config.mode);
  if (fromMode) {
    return fromMode;
  }
  if (config.label && !config.icon) {
    return BTYPE_TEXT;
  }
  return BTYPE_BASE;
}

function normalizeModifiers(config: ToolbarButtonConfig): string[] | undefined {
  const next = new Set(config.modifiers ?? []);
  if (config.variant && !isButtonVariant(config.variant)) {
    next.add(config.variant);
  }
  return next.size > 0 ? Array.from(next) : undefined;
}

function normalizeButtonState(config: ToolbarButtonConfig): ButtonStateType {
  return {
    variant: inferButtonVariant(config),
    label: config.label,
    icon: config.icon,
    state: config.state,
    modifiers: normalizeModifiers(config),
    isDebug: config.isDebug,
    isDisabled: config.isDisabled,
    isHovered: config.isHovered,
    size: {
      width: config.size?.width ?? 0,
      height: config.size?.height ?? 0,
      x: 0,
      y: 0,
    },
  };
}

function measureButton(button: ButtonStore): { width: number; height: number } {
  const hitArea = buttonContainer(button).hitArea;
  if (hitArea && typeof hitArea === 'object' && 'width' in hitArea && 'height' in hitArea) {
    return {
      width: Math.max(0, Math.ceil((hitArea as Rectangle).width)),
      height: Math.max(0, Math.ceil((hitArea as Rectangle).height)),
    };
  }

  const bounds = buttonContainer(button).getLocalBounds();
  const width = Math.max(0, Math.ceil(bounds.width));
  const height = Math.max(0, Math.ceil(bounds.height));
  if (width > 0 || height > 0) {
    return { width, height };
  }

  // Headless tests may not provide renderer-derived bounds; fall back to the
  // button's resolved size model so layout logic remains testable under DI.
  return {
    width: Math.max(0, Math.ceil(button.value.size?.width ?? 0)),
    height: Math.max(0, Math.ceil(button.value.size?.height ?? 0)),
  };
}

function sameSize(
  current: ButtonStateType['size'] | undefined,
  width: number,
  height: number,
): boolean {
  return (current?.width ?? 0) === width && (current?.height ?? 0) === height;
}

function resolveDesiredAxisSize(
  current: number | undefined,
  configured: number | undefined,
  applied: number | undefined,
): number {
  if (applied !== undefined && current !== undefined && current !== applied) {
    return current;
  }
  if (configured !== undefined) {
    return configured;
  }
  return current ?? 0;
}

function buttonContainer(button: ButtonStore): Container {
  const container = button.container;
  if (!container) {
    throw new Error('ToolbarStore: button container unavailable');
  }
  return container;
}

export class ToolbarStore extends TickerForest<ToolbarState> {
  readonly id: string;

  #styleTree: StyleTree | StyleTree[];
  #toolbarConfig: ToolbarConfig;
  #pixi: PixiProvider;
  #buttons = new Map<string, ToolbarButtonRecord>();
  #background: Graphics;
  #rect: ToolbarRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  #buttonRects = new Map<string, ToolbarRect>();
  #appliedSizes = new Map<string, { width: number; height: number }>();
  #padding: Required<ToolbarPadding>;
  #isApplyingLayout = false;

  constructor(config: ToolbarConfig, tickerSource: TickerSource) {
    const parsedConfig = ToolbarConfigSchema.parse(config);
    const pixi = parsedConfig.pixi ?? PixiProvider.shared;
    const ContainerClass = pixi.Container;
    const GraphicsClass = pixi.Graphics;
    const toolbarContainer = new ContainerClass({ label: `toolbar-${parsedConfig.id ?? 'toolbar'}` });
    super(
      { value: { order: parsedConfig.order ?? 0 } },
      { ...toTickerConfig(tickerSource), container: toolbarContainer },
    );

    this.id = parsedConfig.id ?? 'toolbar';
    this.#pixi = pixi;
    this.#styleTree = parsedConfig.style ?? fromJSON(defaultStyles);
    this.#toolbarConfig = {
      ...parsedConfig,
      buttons: [...parsedConfig.buttons],
    };
    this.#padding = normalizePadding(parsedConfig.padding);

    this.container.zIndex = this.value.order;
    this.#background = new GraphicsClass({ label: `toolbar-background-${this.id}` });
    this.container.addChild(this.#background);

    for (const buttonConfig of parsedConfig.buttons) {
      this.#createButton(buttonConfig);
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

  get styleTree(): StyleTree | StyleTree[] {
    return this.#styleTree;
  }

  get order(): number {
    return this.value.order;
  }

  get toolbarConfig(): ToolbarConfig {
    return this.#toolbarConfig;
  }

  #wireButton(button: ButtonStore): Unwire {
    const originalResolve = button.resolve.bind(button);
    button.resolve = () => {
      originalResolve();
      if (!this.#isApplyingLayout) {
        this.dirty();
      }
    };

    return () => {
      button.resolve = originalResolve;
    };
  }

  #createButton(buttonConfig: ToolbarButtonConfig): ButtonStore {
    const button = new ButtonStore(normalizeButtonState(buttonConfig), {
      app: this.application,
      pixi: this.#pixi,
      styleTree: this.#styleTree,
      handlers: {
        click: buttonConfig.onClick ?? (() => {}),
      },
    });

    if (!this.application) {
      button.ticker = this.ticker;
    }

    const unwind = this.#wireButton(button);
    this.#buttons.set(buttonConfig.id, {
      button,
      config: buttonConfig,
      unwind,
    });
    this.container.addChild(buttonContainer(button));
    return button;
  }

  #settleButton(button: ButtonStore): void {
    button.resolve();
    button.resolve();
  }

  #desiredButtonSize(record: ToolbarButtonRecord): { width: number; height: number } {
    const current = record.button.value.size;
    const applied = this.#appliedSizes.get(record.config.id);

    return {
      width: resolveDesiredAxisSize(current?.width, record.config.size?.width, applied?.width),
      height: resolveDesiredAxisSize(current?.height, record.config.size?.height, applied?.height),
    };
  }

  #applyButtonSize(id: string, button: ButtonStore, width: number, height: number): boolean {
    this.#appliedSizes.set(id, { width, height });
    if (sameSize(button.value.size, width, height)) {
      return false;
    }

    button.set('size', {
      ...(button.value.size ?? {}),
      x: 0,
      y: 0,
      width,
      height,
    });
    return true;
  }

  #measureButtons(): Array<{ id: string; width: number; height: number }> {
    const measured: Array<{ id: string; width: number; height: number }> = [];

    for (const [id, record] of this.#buttons.entries()) {
      const { width, height } = this.#desiredButtonSize(record);
      if (this.#applyButtonSize(id, record.button, width, height)) {
        this.#settleButton(record.button);
      } else {
        this.#settleButton(record.button);
      }
      const next = measureButton(record.button);
      measured.push({ id, ...next });
    }

    const fillButtons = this.#toolbarConfig.fillButtons ?? false;
    if (!fillButtons || measured.length === 0) {
      return measured;
    }

    if ((this.#toolbarConfig.orientation ?? 'horizontal') === 'vertical') {
      const targetWidth = measured.reduce((max, button) => Math.max(max, button.width), 0);
      return measured.map((entry) => {
        const record = this.#buttons.get(entry.id)!;
        const width = Math.max(record.config.size?.width ?? 0, targetWidth);
        const height = this.#desiredButtonSize(record).height;
        if (this.#applyButtonSize(entry.id, record.button, width, height)) {
          this.#settleButton(record.button);
          const next = measureButton(record.button);
          return { id: entry.id, ...next };
        }
        return entry;
      });
    }

    const targetHeight = measured.reduce((max, button) => Math.max(max, button.height), 0);
    return measured.map((entry) => {
      const record = this.#buttons.get(entry.id)!;
      const width = this.#desiredButtonSize(record).width;
      const height = Math.max(record.config.size?.height ?? 0, targetHeight);
      if (this.#applyButtonSize(entry.id, record.button, width, height)) {
        this.#settleButton(record.button);
        const next = measureButton(record.button);
        return { id: entry.id, ...next };
      }
      return entry;
    });
  }

  addButton(buttonConfig: ToolbarButtonConfig): ButtonStore {
    const button = this.#createButton(buttonConfig);
    this.#toolbarConfig.buttons = [...(this.#toolbarConfig.buttons ?? []), buttonConfig];
    button.kickoff();
    this.dirty();
    return button;
  }

  removeButton(id: string): void {
    const record = this.#buttons.get(id);
    if (!record) return;

    record.unwind();
    this.#buttons.delete(id);
    this.#buttonRects.delete(id);
    this.#appliedSizes.delete(id);
    this.container.removeChild(buttonContainer(record.button));
    record.button.cleanup();
    this.#toolbarConfig.buttons = (this.#toolbarConfig.buttons ?? []).filter((button) => button.id !== id);
    this.dirty();
  }

  getButton(id: string): ButtonStore | undefined {
    return this.#buttons.get(id)?.button;
  }

  getButtons(): ButtonStore[] {
    return Array.from(this.#buttons.values(), (record) => record.button);
  }

  getButtonRect(id: string): ToolbarRect | undefined {
    const rect = this.#buttonRects.get(id);
    return rect ? { ...rect } : undefined;
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

    if (style.stroke?.color && style.stroke.width > 0) {
      this.#background.roundRect(0, 0, this.#rect.width, this.#rect.height, radius);
      this.#background.stroke({
        color: rgbToHex(style.stroke.color),
        alpha: style.stroke.alpha ?? 1,
        width: style.stroke.width,
      });
    }
  }

  override kickoff(): void {
    for (const record of this.#buttons.values()) {
      record.button.kickoff();
    }
    super.kickoff();
  }

  protected override resolve(): void {
    this.#isApplyingLayout = true;

    try {
      const measuredButtons = this.#measureButtons();
      const layout = computeToolbarLayout({
        buttons: measuredButtons,
        orientation: this.#toolbarConfig.orientation ?? 'horizontal',
        spacing: this.#toolbarConfig.spacing ?? 8,
        fillButtons: this.#toolbarConfig.fillButtons ?? false,
        width: this.#toolbarConfig.width,
        height: this.#toolbarConfig.height,
        fixedSize: this.#toolbarConfig.fixedSize ?? false,
        padding: this.#padding,
      });

      this.container.zIndex = this.value.order;
      this.#rect = {
        x: this.container.position.x,
        y: this.container.position.y,
        width: layout.rect.width,
        height: layout.rect.height,
      };

      this.#buttonRects = new Map();
      for (const [id, record] of this.#buttons.entries()) {
        const rect = layout.buttonRects.get(id);
        if (!rect) {
          continue;
        }
        buttonContainer(record.button).position.set(rect.x, rect.y);
        this.#buttonRects.set(id, { ...rect });
      }

      this.#renderBackground(this.#toolbarConfig.background);
    } finally {
      this.#isApplyingLayout = false;
    }
  }

  override cleanup(): void {
    for (const record of this.#buttons.values()) {
      record.unwind();
      record.button.cleanup();
    }
    this.#buttons.clear();
    this.#buttonRects.clear();
    this.#appliedSizes.clear();
    super.cleanup();
  }
}
