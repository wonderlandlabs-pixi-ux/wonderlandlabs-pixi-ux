import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import type { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { BehaviorSubject, Subscription } from 'rxjs';
import { z } from 'zod';
import {
  ICON_BOX,
  ICON_CIRCLE,
  ICON_FILLED_BOX,
  ICON_FILLED_CIRCLE,
  ICON_IMAGE,
} from './constants.js';
import type {
  ButtonSimpleIconChild,
  ButtonSimpleImageIconChild,
  ButtonSimpleLabelChild,
  ButtonSimpleShapeIconChild,
} from './types.js';

export type ButtonVisualState = 'active' | 'hover' | 'down' | 'disabled';

const ButtonVisualStateSchema = z.enum(['active', 'hover', 'down', 'disabled']);

type LabelPartValue = {
  text: string;
  state: ButtonVisualState;
};

type IconPartValue = {
  state: ButtonVisualState;
  checked?: boolean;
};

const LabelPartValueSchema = z.object({
  text: z.string(),
  state: ButtonVisualStateSchema,
});

const IconPartValueSchema = z.object({
  state: ButtonVisualStateSchema,
  checked: z.boolean().optional(),
});

const PixiLabelStyleSchema = z.object({
  fontSize: z.number().finite().positive(),
  fontFamily: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]).optional(),
  fontWeight: z.union([z.string().min(1), z.number().finite()]).optional(),
  fontStyle: z.string().min(1).optional(),
  letterSpacing: z.number().finite().optional(),
  lineHeight: z.number().finite().positive().optional(),
  fill: z.number().finite(),
}).transform((value) => Object.fromEntries(
  Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
));

export class LabelPartStore {
  readonly pixi: PixiProvider;
  readonly parent: Container;
  readonly config: ButtonSimpleLabelChild;
  readonly text: Text;
  readonly #state$: BehaviorSubject<LabelPartValue>;
  readonly #subscription: Subscription;
  #size = { width: 0, height: 0 };

  constructor(config: ButtonSimpleLabelChild, app: Application, pixi: PixiProvider, parent: Container) {
    const TextClass = pixi.Text;
    const text = new TextClass({
      text: '',
      style: createLabelStyle(config, 'active', pixi),
    });
    text.label = `${config.id}-label`;
    parent.addChild(text);
    const initialState = LabelPartValueSchema.parse({
      text: '',
      state: 'active',
    });
    const state$ = new BehaviorSubject<LabelPartValue>(initialState);
    const subscription = state$.subscribe((value) => {
      text.text = value.text;
      text.style = createLabelStyle(config, value.state, pixi);
      text.visible = true;
      text.alpha = 1;
      const bounds = text.getLocalBounds();
      this.#size = { width: bounds.width, height: bounds.height };
    });

    this.parent = parent;
    this.text = text;
    this.config = config;
    this.pixi = pixi;
    this.#state$ = state$;
    this.#subscription = subscription;
  }

  sync(input: LabelPartValue): { width: number; height: number } {
    this.#state$.next(LabelPartValueSchema.parse(input));
    return this.#size;
  }

  setPosition(x: number, y: number): void {
    this.text?.position.set(x, y);
  }

  get size(): { width: number; height: number } {
    return this.#size;
  }

  cleanup(): void {
    this.#subscription.unsubscribe();
    this.text.destroy();
  }
}

export class IconPartStore extends TickerForest<IconPartValue> {
  readonly pixi: PixiProvider;
  readonly host: Container;
  readonly config: ButtonSimpleIconChild;
  readonly displays: Record<ButtonVisualState, Sprite | Graphics>;

  constructor(config: ButtonSimpleIconChild, app: Application, pixi: PixiProvider, parent: Container) {
    const ContainerClass = pixi.Container;
    const SpriteClass = pixi.Sprite;
    const GraphicsClass = pixi.Graphics;
    const host = new ContainerClass({ label: config.id });
    const displays: Record<ButtonVisualState, Sprite | Graphics> = {
      active: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
      hover: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
      down: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
      disabled: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
    };
    displays.active.label = `${config.id}-active`;
    displays.hover.label = `${config.id}-hover`;
    displays.down.label = `${config.id}-down`;
    displays.disabled.label = `${config.id}-disabled`;
    host.addChild(displays.active);
    host.addChild(displays.hover);
    host.addChild(displays.down);
    host.addChild(displays.disabled);
    parent.addChild(host);
    super({
      value: {
        state: 'active',
        checked: false,
      },
      schema: IconPartValueSchema,
      name: `${config.id}-icon-part`,
    }, {
      app,
      container: host,
    });
    this.host = host;
    this.displays = displays;
    this.config = config;
    this.pixi = pixi;
  }

  sync(input: IconPartValue): { width: number; height: number } {
    this.mutate((draft) => {
      Object.assign(draft, input);
    });
    this.resolve();
    return { width: this.config.width, height: this.config.height };
  }

  setPosition(x: number, y: number): void {
    this.host.position.set(x, y);
  }

  protected resolve(): void {
    const states: ButtonVisualState[] = ['active', 'hover', 'down', 'disabled'];
    if (isImageIcon(this.config)) {
      this.#resolveImage(this.config, states);
      return;
    }
    this.#resolveShape(this.config, states);
  }

  #resolveImage(config: ButtonSimpleImageIconChild, states: ButtonVisualState[]): void {
    for (const state of states) {
      const sprite = this.displays[state] as Sprite;
      sprite.alpha = resolveIconAlpha(config, state);
      sprite.visible = this.value.state === state;
      sprite.width = config.width;
      sprite.height = config.height;
      sprite.position.set(0, 0);
    }

    const iconUrl = resolveImageIconUrl(config, this.value.checked ?? false);
    const cachedTexture = this.pixi.Assets.cache.get(iconUrl);
    if (cachedTexture) {
      for (const state of states) {
        (this.displays[state] as Sprite).texture = cachedTexture;
      }
      return;
    }

    void this.pixi.Assets.load(iconUrl).then((texture) => {
      if (!this.host.destroyed && texture) {
        for (const state of states) {
          (this.displays[state] as Sprite).texture = texture;
        }
        this.application?.render?.();
      }
    }).catch(() => {});
  }

  #resolveShape(config: ButtonSimpleShapeIconChild, states: ButtonVisualState[]): void {
    for (const state of states) {
      const graphic = this.displays[state] as Graphics;
      graphic.visible = this.value.state === state;
      graphic.alpha = resolveIconAlpha(config, state);
      graphic.position.set(0, 0);
      drawShapeIcon(
        graphic,
        config,
        state,
        this.value.checked ?? false,
        this.pixi,
      );
    }
  }
}

function resolveLabelColor(config: ButtonSimpleLabelChild, state: ButtonVisualState): string | number {
  if (state === 'disabled') {
    return config.disabledColor ?? config.color;
  }
  if (state === 'down') {
    return config.hoverColor ?? config.color;
  }
  if (state === 'hover') {
    return config.hoverColor ?? config.color;
  }
  return config.color;
}

function createLabelStyle(
  config: ButtonSimpleLabelChild,
  state: ButtonVisualState,
  pixi: PixiProvider,
): Record<string, unknown> {
  return PixiLabelStyleSchema.parse({
    fontSize: config.fontSize,
    fontFamily: Array.isArray(config.fontFamily) || typeof config.fontFamily === 'string'
      ? config.fontFamily
      : undefined,
    fontWeight: config.fontWeight,
    fontStyle: config.fontStyle,
    letterSpacing: config.letterSpacing,
    lineHeight: config.lineHeight,
    fill: new pixi.Color(resolveLabelColor(config, state)).toNumber(),
  });
}

function resolveIconAlpha(config: ButtonSimpleIconChild, state: ButtonVisualState): number {
  if (state === 'disabled') {
    return config.disabledAlpha ?? 0.5;
  }
  if (state === 'down') {
    return config.downAlpha ?? config.hoverAlpha ?? config.alpha ?? 1;
  }
  if (state === 'hover') {
    return config.hoverAlpha ?? config.alpha ?? 1;
  }
  return config.alpha ?? 1;
}

function isImageIcon(config: ButtonSimpleIconChild): config is ButtonSimpleImageIconChild {
  return config.iconType === ICON_IMAGE;
}

function resolveImageIconUrl(config: ButtonSimpleImageIconChild, checked: boolean): string {
  if (checked) {
    return config.onIconUrl ?? config.icon;
  }
  return config.offIconUrl ?? config.icon;
}

function resolveShapeType(config: ButtonSimpleShapeIconChild, checked: boolean): string {
  return checked
    ? (config.checkedIconType ?? defaultCheckedShape(config.iconType))
    : config.iconType;
}

function defaultCheckedShape(iconType: ButtonSimpleShapeIconChild['iconType']): ButtonSimpleShapeIconChild['iconType'] {
  if (iconType === ICON_BOX) return ICON_FILLED_BOX;
  if (iconType === ICON_CIRCLE) return ICON_FILLED_CIRCLE;
  return iconType;
}

function resolveShapeStroke(config: ButtonSimpleShapeIconChild, state: ButtonVisualState): string | number {
  if (state === 'disabled') return config.disabledColor ?? config.color;
  if (state === 'down') return config.downColor ?? config.hoverColor ?? config.color;
  if (state === 'hover') return config.hoverColor ?? config.color;
  return config.color;
}

function resolveShapeFill(config: ButtonSimpleShapeIconChild, state: ButtonVisualState): string | number | null {
  const fill = state === 'disabled'
    ? config.disabledFillColor ?? config.fillColor
    : state === 'down'
      ? config.downFillColor ?? config.hoverFillColor ?? config.fillColor
      : state === 'hover'
        ? config.hoverFillColor ?? config.fillColor
        : config.fillColor;
  return fill ?? null;
}

function drawShapeIcon(
  graphic: Graphics,
  config: ButtonSimpleShapeIconChild,
  state: ButtonVisualState,
  checked: boolean,
  pixi: PixiProvider,
): void {
  const iconType = resolveShapeType(config, checked);
  const strokeColor = new pixi.Color(resolveShapeStroke(config, state)).toNumber();
  const fillValue = resolveShapeFill(config, state);
  const fillColor = fillValue == null ? null : new pixi.Color(fillValue).toNumber();
  const borderWidth = config.borderWidth ?? 2;
  const width = config.width;
  const height = config.height;
  const radius = Math.min(width, height) / 2;

  graphic.clear();
  if (iconType === ICON_BOX || iconType === ICON_FILLED_BOX) {
    const shape = graphic.roundRect(0, 0, width, height, Math.min(4, radius));
    if (iconType === ICON_FILLED_BOX) {
      shape.fill({ color: fillColor ?? strokeColor });
    }
    shape.stroke({ color: strokeColor, width: borderWidth });
    return;
  }

  const shape = graphic.circle(width / 2, height / 2, radius - borderWidth / 2);
  if (iconType === ICON_FILLED_CIRCLE) {
    shape.fill({ color: fillColor ?? strokeColor });
  }
  shape.stroke({ color: strokeColor, width: borderWidth });
}
