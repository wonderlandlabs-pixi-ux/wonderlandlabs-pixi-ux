import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import {PixiProvider} from '@wonderlandlabs-pixi-ux/utils';
import type {Application, Container} from 'pixi.js';
import {
    CONTROL_CHECKBOX,
    CONTROL_RADIO,
    EVENT_CHECK_CHANGED,
    EVENT_POINTER_DOWN,
    EVENT_POINTER_OUT,
    EVENT_POINTER_OVER,
    EVENT_POINTER_TAP,
    EVENT_POINTER_UP,
    EVENT_RADIO_DESELECTED,
    EVENT_RADIO_SELECTED,
    ORIENTATION_HORIZONTAL,
    PART_LABEL,
    VISUAL_STATES,
    VS_ACTIVE,
    VS_DISABLED,
    VS_DOWN,
    VS_HOVERED,
} from './constants.js';
import {IconPartStore, LabelPartStore} from './parts.js';
import type {
    ButtonPartRecord,
    ButtonSimpleChild,
    ButtonSimpleControlEvent,
    ButtonSimpleIconChild,
    ButtonSimpleLabelChild,
    ButtonSimpleLayout,
    ButtonSimpleOptions,
    ButtonSimpleState,
    ButtonVisualState,
    ButtonVisualStateRecord,
} from './types.js';
import {ButtonSimpleChildSchema, ButtonSimpleLayoutSchema, ButtonSimpleStateSchema,} from './schema.js';
import {
    drawButtonBackground,
    initBackgrounds,
} from "./helpers.js";

type ButtonSimpleCtorConfig = ButtonSimpleOptions & {
    layout: ButtonSimpleLayout;
    children: ButtonSimpleChild[];
};

function fetchLayoutResult(value: ButtonSimpleState, config: ButtonSimpleCtorConfig) {
    if (!config?.layout) {
        throw new Error('ButtonSimpleStoreBase: layout config is required');
    }
    if (!config?.children) {
        throw new Error('ButtonSimpleStoreBase: children config is required');
    }
    if (!config?.app) {
        throw new Error('ButtonSimpleStoreBase: app config is required');
    }
    if (!config?.parentContainer) {}
    const layoutResult = ButtonSimpleLayoutSchema.safeParse(config?.layout);
    if (!layoutResult.success) {
        console.error('Failed to parse layout config', layoutResult.error, config.layout);
        throw new Error('ButtonSimpleStoreBase: layout config validation failed');
    } else {
        return layoutResult.data;
    }
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

export function normalizeButtonSimpleState(value: ButtonSimpleState): ButtonSimpleState {
    if (!value) throw new Error('normalizeButtonState: value is undefined');
    const {success, data, error} = ButtonSimpleStateSchema.safeParse(value);
    if (success) {
        return {
            ...data,
            callback: value.callback,
        };
    }
    console.error(error, 'normalize error from ', value);
    throw new Error('normalizeButtonState parsing error');
}

export function emitButtonSimpleEvent(target: {
    emit?: (event: string, payload: unknown) => unknown
} | undefined, event: string, payload: unknown): void {
    target?.emit?.(event, payload);
}

export function resolveVisualState(disabled: boolean | undefined, hovered: boolean, pressed: boolean): ButtonVisualState {
    if (disabled) {
        return VS_DISABLED;
    }
    if (pressed) {
        return VS_DOWN;
    }
    if (hovered) {
        return VS_HOVERED;
    }
    return VS_ACTIVE;
}

export class ButtonSimpleStoreBase extends TickerForest<ButtonSimpleState> {
    readonly pixi: PixiProvider;
    readonly contentContainer: Container;
    readonly backgrounds: ButtonVisualStateRecord;
    readonly layout: ButtonSimpleLayout;
    readonly childrenConfig: ButtonSimpleChild[];
    readonly getCheckedValues?: () => unknown[];
    #hovered = false;
    #pressed = false;
    #parts: ButtonPartRecord[];
    #backgroundSize = {width: -1, height: -1};

    constructor(value: ButtonSimpleState, config: ButtonSimpleCtorConfig) {
        let layout;
        try {
            layout = fetchLayoutResult(value, config);
        } catch (error) {
            console.error('failed to fetch layout', error, 'with value:', value, 'config: ', config);
            layout = fetchLayoutResult(value, config);
        }
        const children: ButtonSimpleChild[] = [];
        config.children.forEach((child) => {
            if (!child) throw new Error('ButtonSimpleStoreBase: children has empty members');
            const childResult = ButtonSimpleChildSchema.safeParse(child);
            if (childResult.success) {
                children.push(childResult.data);
            } else {
                console.error('Failed to parse child config', childResult.error, child);
            }
        });
        const pixiProvider = (config.pixi as PixiProvider | undefined) ?? PixiProvider.shared;
        const ContainerClass = pixiProvider.Container;
        const root = new ContainerClass({
            x: layout.x ?? 0,
            y: layout.y ?? 0,
            eventMode: 'static',
        });
        const contentContainer = new ContainerClass({label: '$$content'});
        (config.parentContainer as Container).addChild(root);
        super({
            value: normalizeButtonSimpleState(value),
            schema: ButtonSimpleStateSchema,
            name: 'RawButtonSimpleStore',
        }, {
            app: config.app as Application,
            container: root,
        });

        this.backgrounds = initBackgrounds(root, pixiProvider);
        root.addChild(contentContainer);
        this.layout = layout;
        this.childrenConfig = children;
        this.pixi = pixiProvider;
        this.contentContainer = contentContainer;
        this.getCheckedValues = config.getCheckedValues;
        this.#parts = children.map((child) => ({
            child,
            store: child.type === PART_LABEL
                ? new LabelPartStore(child as ButtonSimpleLabelChild, this.application!, pixiProvider, contentContainer)
                : new IconPartStore(child as ButtonSimpleIconChild, this.application!, pixiProvider, contentContainer),
            width: 0,
            height: 0,
        }));

        if (this.$.onPointerOver) root.on(EVENT_POINTER_OVER, this.$.onPointerOver);
        if (this.$.onPointerOut) root.on(EVENT_POINTER_OUT, this.$.onPointerOut);
        if (this.$.onPointerDown) root.on(EVENT_POINTER_DOWN, this.$.onPointerDown);
        if (this.$.onPointerUp) root.on(EVENT_POINTER_UP, this.$.onPointerUp);
        if (this.$.onPointerTap) root.on(EVENT_POINTER_TAP, this.$.onPointerTap);
        if (this.$.onRadioDeselected) root.on(EVENT_RADIO_DESELECTED, this.$.onRadioDeselected);
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
            const previousChecked = this.checked
            const defaultChecked = this.value.controlType === CONTROL_RADIO
                ? true
                : !this.value.checked;
            let callbackResult: boolean | null = null;
            try {
                callbackResult = this.value.callback?.() ?? null
            } catch (err) {
                console.error('callback failure on button', this.value, err);
            }
            this.checked = typeof callbackResult === 'boolean'
                ? callbackResult
                : defaultChecked;
            this.#emitControlChange(previousChecked, this.checked);
        }
    }

    get checked() {
        return this.value.checked ?? false
    }

    set checked(value: boolean) {
        const bValue = !!value;
        if (this.checked !== bValue)
            this.set('checked', bValue);
        this.dirty();
    }

    onRadioDeselected(payload?: { id?: string }): void {
        if (payload?.id === this.value.id) {
            return;
        }
        this.checked = false;
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
                    text: child.useButtonLabel ? (this.value.label ?? '') : (child.text ?? ''),
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
        this.#toggleBackground(visualState);
        if (this.container) {
            this.container.eventMode = this.value.disabled ? 'none' : 'static';
            this.container.cursor = this.value.disabled ? 'default' : 'pointer';
            this.container.hitArea = new this.pixi.Rectangle(0, 0, width, height);
        }
        this.application?.render?.();
    }

    #toggleBackground(visualState: ButtonVisualState): void {
        for (const state of VISUAL_STATES) {
            this.backgrounds[state].visible = visualState === state;
        }
    }

    #syncBackgrounds(width: number, height: number): void {
        if (this.#backgroundSize.width === width && this.#backgroundSize.height === height) {
            return;
        }

        for (const key of VISUAL_STATES) {
            const state: ButtonVisualState = key as ButtonVisualState;
            const item = this.backgrounds[state];
            if (item) drawButtonBackground(item, width, height, this.layout, state, this.pixi);
        }

        this.#backgroundSize = {width, height};
    }

    override cleanup(): void {
        this.#parts.forEach((record) => record.store.cleanup());
        super.cleanup();
    }

    #emitControlChange(previousChecked: boolean, checked: boolean): void {
        if (previousChecked === checked) {
            return;
        }

        const payload: ButtonSimpleControlEvent = {
            id: this.value.id,
            buttonValue: this.value.buttonValue,
            changedButtonValue: this.value.buttonValue,
            checked,
            button: this,
        };

        if (this.value.controlType === CONTROL_RADIO && checked) {
            emitButtonSimpleEvent(this.container, EVENT_RADIO_SELECTED, payload);
            this.container?.parent?.emit?.(EVENT_RADIO_SELECTED, payload);
            return;
        }

        if (this.value.controlType === CONTROL_CHECKBOX) {
            const checkedValues = this.getCheckedValues?.() ?? (checked ? [this.value.buttonValue] : []);
            emitButtonSimpleEvent(this.container, EVENT_CHECK_CHANGED, {
                ...payload,
                checkedValues,
            });
            this.container?.parent?.emit?.(EVENT_CHECK_CHANGED, {
                ...payload,
                checkedValues,
            });
        }
    }
}

export type ButtonSimpleStoreBaseClass = new (value: ButtonSimpleState, options: ButtonSimpleOptions) => ButtonSimpleStoreBase;

export function createRawButtonSimpleStoreClass(layout: ButtonSimpleLayout, children: ButtonSimpleChild[]) {
    const BoundButtonSimpleStore = class extends ButtonSimpleStoreBase {
        constructor(value: ButtonSimpleState, options: ButtonSimpleOptions) {
            super(value, {
                ...options,
                layout,
                children,
            });
        }
    };
    return BoundButtonSimpleStore as ButtonSimpleStoreBaseClass;
}

