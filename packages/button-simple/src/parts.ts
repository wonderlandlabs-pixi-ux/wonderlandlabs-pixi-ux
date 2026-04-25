import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import {PixiProvider} from '@wonderlandlabs-pixi-ux/utils';
import type {Application, Container, Graphics, Sprite, Text} from 'pixi.js';
import {BehaviorSubject, Subscription} from 'rxjs';
import {
    ICON_BOX,
    ICON_CIRCLE,
    ICON_FILLED_BOX,
    ICON_FILLED_CIRCLE,
    ICON_IMAGE,
    VISUAL_STATES,
    VS_ACTIVE,
} from './constants.js';
import type {
    ButtonSimpleIconChild,
    ButtonSimpleImageIconChild,
    ButtonSimpleLabelChild,
    ButtonSimpleShapeIconChild,
    ButtonVisualState, IconPartValue,
    LabelPartValue,
} from './types.js';
import {IconPartValueSchema, LabelPartValueSchema, PixiLabelStyleSchema,} from './schema.js';

export class LabelPartStore {
    readonly pixi: PixiProvider;
    readonly parent: Container;
    readonly config: ButtonSimpleLabelChild;
    readonly text: Text;
    #state$?: BehaviorSubject<LabelPartValue>;
    #subscription?: Subscription;
    #size = {width: 0, height: 0};

    constructor(config: ButtonSimpleLabelChild, app: Application, pixi: PixiProvider, parent: Container) {
        const TextClass = pixi.Text;
        const text = new TextClass({
            text: '',
            style: createLabelStyle(config, 'active', pixi),
        });
        text.label = `${config.id}-label`;
        parent.addChild(text);


        this.parent = parent;
        this.text = text;
        this.config = config;
        this.pixi = pixi;
        
        this.#subscribeToLabelState();
    }

    #subscribeToLabelState() {
        const {data, success, error} = LabelPartValueSchema.safeParse({
            text: '',
            state: 'active',
        });

        if (!success) {
            console.error('Failed to parse label part value', error);
            return;
        }
        const initialState = data;
        const state$ = new BehaviorSubject<LabelPartValue>(initialState);
        const subscription = state$.subscribe((value) => {
            this.text.text = value.text;
            this.text.style = createLabelStyle(this.config, value.state, this.pixi);
            this.text.visible = true;
            this.text.alpha = 1;
            const bounds = this.text.getLocalBounds();
            this.#size = {width: bounds.width, height: bounds.height};
        });
        this.#state$ = state$;
        this.#subscription = subscription;
    }

    sync(input: LabelPartValue): { width: number; height: number } {
        if (!input) throw new Error('LabelPartStore: sync requires a value');
        const {data, success, error} = LabelPartValueSchema.safeParse(input);
        if (success) {
            this.#state$?.next(data);
        } else {
            console.error('Failed to parse label part value', error, input);
        }
        return this.#size;
    }

    setPosition(x: number, y: number): void {
        this.text?.position.set(x, y);
    }

    get size(): { width: number; height: number } {
        return this.#size;
    }

    cleanup(): void {
        this.#subscription?.unsubscribe();
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
        const host = new ContainerClass({label: config.id});
        const displays: Record<ButtonVisualState, Sprite | Graphics> = {
            active: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
            hovered: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
            down: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
            disabled: config.iconType === ICON_IMAGE ? new SpriteClass(pixi.Texture.EMPTY) : new GraphicsClass(),
        };
        displays.active.label = `${config.id}-active`;
        displays.hovered.label = `${config.id}-hovered`;
        displays.down.label = `${config.id}-down`;
        displays.disabled.label = `${config.id}-disabled`;
        host.addChild(displays.active);
        host.addChild(displays.hovered);
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
        if (!input) throw new Error('IconPartStore: sync requires a value');
        const {data, success, error} = IconPartValueSchema.safeParse(input);
        if (success) {
            this.mutate((draft) => {
                Object.assign(draft, data);
            });
            this.resolve();
        } else {
            console.error('Failed to parse icon part value', error, input);
        }
        return {width: this.config.width, height: this.config.height};
    }

    setPosition(x: number, y: number): void {
        this.host.position.set(x, y);
    }

    protected resolve(): void {
        if (isImageIcon(this.config)) {
            this.#resolveImage(this.config);
            return;
        }
        this.#resolveShape(this.config);
    }

    #resolveImage(config: ButtonSimpleImageIconChild): void {
        for (const key of VISUAL_STATES) {
            const state = key as ButtonVisualState
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
            for (const key of VISUAL_STATES) {
                const state = key as ButtonVisualState
                const display = (this.displays[state] as Sprite);
                if (display) display.texture = cachedTexture;
            }
            return;
        }

        void this.pixi.Assets.load(iconUrl).then((texture) => {
            if (!this.host.destroyed && texture) {
                for (const key of VISUAL_STATES) {
                    const state = key as ButtonVisualState
                    const display = (this.displays[state] as Sprite)
                    if (display) display.texture = texture;
                }
                this.application?.render?.();
            }
        }).catch((err) => {
            console.error('Failed to load icon', err);
        });
    }

    #resolveShape(config: ButtonSimpleShapeIconChild): void {
        for (const key of VISUAL_STATES) {
            const state = key as ButtonVisualState
            const graphic = this.displays[state] as Graphics;
            if (!graphic) continue;
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
    const style = config.labelStyle[state] ?? config.labelStyle[VS_ACTIVE];
    return style.color;
}

function createLabelStyle(
    config: ButtonSimpleLabelChild,
    state: ButtonVisualState,
    pixi: PixiProvider,
): Record<string, unknown> {
    const {data, success, error} = PixiLabelStyleSchema.safeParse({
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
    if (!success) {
        console.error('Failed to parse label style', error, config);
        return {};
    }
    return data;
}

function resolveIconAlpha(config: ButtonSimpleIconChild, state: ButtonVisualState): number {
    const style = config.iconStyle[state] ?? config.iconStyle[VS_ACTIVE];
    return style.alpha;
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
    const style = config.iconStyle[state] ?? config.iconStyle[VS_ACTIVE];
    return style.color ?? 0xFFFFFF;
}

function resolveShapeFill(config: ButtonSimpleShapeIconChild, state: ButtonVisualState): string | number | null {
    const style = config.iconStyle[state] ?? config.iconStyle[VS_ACTIVE];
    return style.fillColor ?? null;
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
        const shape = graphic.rect(0, 0, width, height);
        if (iconType === ICON_FILLED_BOX) {
            shape.fill({color: fillColor ?? strokeColor});
        }
        shape.stroke({color: strokeColor, width: borderWidth});
        return;
    }

    const shape = graphic.circle(width / 2, height / 2, radius - borderWidth / 2);
    if (iconType === ICON_FILLED_CIRCLE) {
        shape.fill({color: fillColor ?? strokeColor});
    }
    shape.stroke({color: strokeColor, width: borderWidth});
}
