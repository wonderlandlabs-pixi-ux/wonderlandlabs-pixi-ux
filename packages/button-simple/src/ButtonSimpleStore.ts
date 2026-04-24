import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import type { Application, Container, Graphics } from 'pixi.js';
import {
  EVENT_POINTER_DOWN,
  EVENT_POINTER_OUT,
  EVENT_POINTER_OVER,
  EVENT_POINTER_TAP,
  EVENT_POINTER_UP,
  ORIENTATION_HORIZONTAL,
  PART_ICON,
  PART_LABEL,
} from './constants.js';
import { IconPartStore, LabelPartStore, type ButtonVisualState } from './parts.js';
import {
  ButtonSimpleChildSchema,
  ButtonSimpleLayoutSchema,
  ButtonSimpleStateSchema,
  type ButtonSimpleChild,
  type ButtonSimpleIconChild,
  type ButtonSimpleLabelChild,
  type ButtonSimpleLayout,
  type ButtonSimpleOptions,
  type ButtonSimpleState,
} from './types.js';

type ButtonSimpleCtorConfig = ButtonSimpleOptions & {
  layout: ButtonSimpleLayout;
  children: ButtonSimpleChild[];
};

type ButtonPartRecord = {
  child: ButtonSimpleChild;
  store: LabelPartStore | IconPartStore;
  width: number;
  height: number;
};

export class ButtonSimpleStore extends TickerForest<ButtonSimpleState> {
  readonly pixi: PixiProvider;
  readonly contentContainer: Container;
  readonly backgrounds: Record<ButtonVisualState, Graphics>;
  readonly layout: ButtonSimpleLayout;
  readonly childrenConfig: ButtonSimpleChild[];
  #hovered = false;
  #pressed = false;
  #parts: ButtonPartRecord[];
  #backgroundSize = { width: -1, height: -1 };

  constructor(value: ButtonSimpleState, config: ButtonSimpleCtorConfig) {
    const parsedState = normalizeButtonSimpleState(value);
    const layout = ButtonSimpleLayoutSchema.parse(config.layout);
    const children = config.children.map((child) => ButtonSimpleChildSchema.parse(child));
    const pixi = (config.pixi as PixiProvider | undefined) ?? PixiProvider.shared;
    const ContainerClass = pixi.Container;
    const GraphicsClass = pixi.Graphics;
    const root = new ContainerClass({
      x: layout.x ?? 0,
      y: layout.y ?? 0,
    });
    const backgrounds: Record<ButtonVisualState, Graphics> = {
      active: new GraphicsClass({ label: '$$background-active' }),
      hover: new GraphicsClass({ label: '$$background-hover' }),
      down: new GraphicsClass({ label: '$$background-down' }),
      disabled: new GraphicsClass({ label: '$$background-disabled' }),
    };
    const contentContainer = new ContainerClass({ label: '$$content' });
    root.addChild(backgrounds.active);
    root.addChild(backgrounds.hover);
    root.addChild(backgrounds.down);
    root.addChild(backgrounds.disabled);
    root.addChild(contentContainer);
    (config.parentContainer as Container).addChild(root);

    super({
      value: parsedState,
      schema: ButtonSimpleStateSchema,
      name: 'ButtonSimpleStore',
    }, {
      app: config.app as Application,
      container: root,
    });

    this.layout = layout;
    this.childrenConfig = children;
    this.pixi = pixi;
    this.backgrounds = backgrounds;
    this.contentContainer = contentContainer;
    this.#parts = children.map((child) => ({
      child,
      store: child.type === PART_LABEL
        ? new LabelPartStore(child as ButtonSimpleLabelChild, this.application!, pixi, contentContainer)
        : new IconPartStore(child as ButtonSimpleIconChild, this.application!, pixi, contentContainer),
      width: 0,
      height: 0,
    }));

    root.eventMode = 'static';
    root.on(EVENT_POINTER_OVER, this.$.onPointerOver);
    root.on(EVENT_POINTER_OUT, this.$.onPointerOut);
    root.on(EVENT_POINTER_DOWN, this.$.onPointerDown);
    root.on(EVENT_POINTER_UP, this.$.onPointerUp);
    root.on(EVENT_POINTER_TAP, this.$.onPointerTap);
  }

  updateState(next: Partial<ButtonSimpleState>): void {
    this.mutate((draft) => {
      Object.assign(draft, normalizeButtonSimpleState({
        ...draft,
        ...next,
      }));
    });
    this.dirty();
  }

  setPosition(x: number, y: number): void {
    this.container?.position.set(x, y);
  }

  click(): void {
    if (!this.value.disabled) {
      const toggled = !this.value.checked;
      const callbackResult = this.value.callback?.();
      const nextChecked = typeof callbackResult === 'boolean'
        ? callbackResult
        : toggled;
      this.mutate((draft) => {
        draft.checked = nextChecked;
      });
      this.dirty();
    }
  }

  onPointerOver(): void {
    if (!this.value.disabled && !this.#hovered) {
      this.#hovered = true;
      this.dirty();
    }
  }

  onPointerOut(): void {
    if (this.#hovered) {
      this.#hovered = false;
      this.#pressed = false;
      this.dirty();
    }
  }

  onPointerDown(): void {
    if (!this.value.disabled && !this.#pressed) {
      this.#pressed = true;
      this.dirty();
    }
  }

  onPointerUp(): void {
    if (this.#pressed) {
      this.#pressed = false;
      this.dirty();
    }
  }

  onPointerTap(): void {
    this.click();
  }

  protected resolve(): void {
    const gap = this.layout.gap;
    const visualState = resolveVisualState(this.value.disabled, this.#hovered, this.#pressed);
    let contentWidth = 0;
    let contentHeight = 0;
    let visibleCount = 0;

    this.#parts.forEach((record) => {
      if (record.child.type === PART_LABEL) {
        const child = record.child as ButtonSimpleLabelChild;
        const size = (record.store as LabelPartStore).sync({
          text: child.useButtonLabel ? this.value.label : (child.text ?? ''),
          state: visualState,
        });
        record.width = size.width;
        record.height = size.height;
      } else {
        const size = (record.store as IconPartStore).sync({
          state: visualState,
          checked: this.value.checked,
        });
        record.width = size.width;
        record.height = size.height;
      }

      visibleCount += 1;
      if (this.layout.orientation === ORIENTATION_HORIZONTAL) {
        contentWidth += record.width;
        contentHeight = Math.max(contentHeight, record.height);
      } else {
        contentWidth = Math.max(contentWidth, record.width);
        contentHeight += record.height;
      }
    });

    if (visibleCount > 1) {
      if (this.layout.orientation === ORIENTATION_HORIZONTAL) {
        contentWidth += gap * (visibleCount - 1);
      } else {
        contentHeight += gap * (visibleCount - 1);
      }
    }

    const rawWidth = Math.max(this.layout.minWidth ?? 0, contentWidth + this.layout.paddingX * 2);
    const rawHeight = Math.max(this.layout.minHeight ?? 0, contentHeight + this.layout.paddingY * 2);
    const width = snapButtonSimpleSize(rawWidth, this.layout.sizeIncrement);
    const height = snapButtonSimpleSize(rawHeight, this.layout.sizeIncrement);

    let cursorX = this.layout.paddingX + Math.max(0, (width - this.layout.paddingX * 2 - contentWidth) / 2);
    let cursorY = this.layout.paddingY + Math.max(0, (height - this.layout.paddingY * 2 - contentHeight) / 2);

    this.#parts.forEach((record) => {
      if (this.layout.orientation === ORIENTATION_HORIZONTAL) {
        record.store.setPosition(cursorX, this.layout.paddingY + Math.max(0, (height - this.layout.paddingY * 2 - record.height) / 2));
        cursorX += record.width + gap;
      } else {
        record.store.setPosition(this.layout.paddingX + Math.max(0, (width - this.layout.paddingX * 2 - record.width) / 2), cursorY);
        cursorY += record.height + gap;
      }
    });

    this.#syncBackgrounds(width, height);
    this.backgrounds.active.visible = visualState === 'active';
    this.backgrounds.hover.visible = visualState === 'hover';
    this.backgrounds.down.visible = visualState === 'down';
    this.backgrounds.disabled.visible = visualState === 'disabled';
    if (this.container) {
      this.container.eventMode = this.value.disabled ? 'none' : 'static';
      this.container.cursor = this.value.disabled ? 'default' : 'pointer';
      this.container.hitArea = new this.pixi.Rectangle(0, 0, width, height);
    }
    this.application?.render?.();
  }

  #syncBackgrounds(width: number, height: number): void {
    if (this.#backgroundSize.width === width && this.#backgroundSize.height === height) {
      return;
    }

    drawButtonBackground(this.backgrounds.active, width, height, this.layout, 'active', this.pixi);
    drawButtonBackground(this.backgrounds.hover, width, height, this.layout, 'hover', this.pixi);
    drawButtonBackground(this.backgrounds.down, width, height, this.layout, 'down', this.pixi);
    drawButtonBackground(this.backgrounds.disabled, width, height, this.layout, 'disabled', this.pixi);
    this.#backgroundSize = { width, height };
  }

  override cleanup(): void {
    this.#parts.forEach((record) => record.store.cleanup());
    super.cleanup();
  }
}

export type ButtonSimpleStoreClass = new (value: ButtonSimpleState, options: ButtonSimpleOptions) => ButtonSimpleStore;

export function createButtonSimpleStoreClass(layout: ButtonSimpleLayout, children: ButtonSimpleChild[]) {
  const BoundButtonSimpleStore = class extends ButtonSimpleStore {
    constructor(value: ButtonSimpleState, options: ButtonSimpleOptions) {
      super(value, {
        ...options,
        layout,
        children,
      });
    }
  };
  return BoundButtonSimpleStore as ButtonSimpleStoreClass;
}

export function snapButtonSimpleSize(value: number, increment?: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (!Number.isFinite(increment) || !increment || increment <= 1) {
    return Math.ceil(value);
  }
  return Math.ceil(value / increment) * increment;
}

function normalizeButtonSimpleState(value: ButtonSimpleState): ButtonSimpleState {
  const parsed = ButtonSimpleStateSchema.parse(value);
  return {
    ...parsed,
    callback: value.callback,
  };
}

function resolveVisualState(disabled: boolean | undefined, hovered: boolean, pressed: boolean): ButtonVisualState {
  if (disabled) {
    return 'disabled';
  }
  if (pressed) {
    return 'down';
  }
  if (hovered) {
    return 'hover';
  }
  return 'active';
}

function drawButtonBackground(
  background: Graphics,
  width: number,
  height: number,
  layout: ButtonSimpleLayout,
  state: ButtonVisualState,
  pixi: PixiProvider,
): void {
  const fill = state === 'disabled'
    ? layout.disabledBackgroundColor ?? layout.backgroundColor
    : state === 'down'
      ? layout.downBackgroundColor ?? layout.hoverBackgroundColor ?? layout.backgroundColor
    : state === 'hover'
      ? layout.hoverBackgroundColor ?? layout.backgroundColor
      : layout.backgroundColor;
  const border = state === 'disabled'
    ? layout.disabledBorderColor ?? layout.borderColor
    : state === 'down'
      ? layout.downBorderColor ?? layout.hoverBorderColor ?? layout.borderColor
    : state === 'hover'
      ? layout.hoverBorderColor ?? layout.borderColor
      : layout.borderColor;

  background.clear();
  background.roundRect(0, 0, width, height, layout.borderRadius).fill({
    color: new pixi.Color(fill).toNumber(),
  });

  if (layout.borderWidth > 0) {
    background.roundRect(0, 0, width, height, layout.borderRadius).stroke({
      color: new pixi.Color(border).toNumber(),
      width: layout.borderWidth,
    });
  }
}
