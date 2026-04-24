import {
    BoxStore,
    boxTreeToPixi,
    type BoxStyleManagerLike,
    type BoxPixiObserverMessage,
    type BoxPixiRenderInput,
    type BoxPixiRendererOverride,
} from '@wonderlandlabs-pixi-ux/box';
import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import type { Application, Container } from 'pixi.js';
import type {ButtonOptionsType, ButtonStateType, EventFn} from './types.js';
import {getStyleTree, makeStoreConfig} from "./helpers.js";
import {
    EVENT_POINTER_OUT,
    EVENT_POINTER_OVER,
    EVENT_POINTER_TAP,
} from './constants.js';

type ButtonRendererManifest = {
    byId: Record<string, BoxPixiRendererOverride>;
};

export class ButtonStore extends TickerForest<ButtonStateType> {
    #boxStore: BoxStore;
    #styleTree: BoxStyleManagerLike[];
    #styleTreeSignature: string;
    #renderer: ButtonRendererManifest;
    #options: ButtonOptionsType;
    #pixi: PixiProvider;
    #boundHosts = new WeakSet<Container>();
    #isUpdatingValue = false;

    constructor(value: ButtonStateType, options: ButtonOptionsType) {
        const pixi = options.pixi ?? PixiProvider.shared;
        const ContainerClass = pixi.Container;
        const container = new ContainerClass({
            x: value.size?.x ?? 0,
            y: value.size?.y ?? 0,
        });
        super({value: normalizeButtonState(value)}, {
            app: options.app as unknown as Application,
            container,
        });

        this.#options = options;
        this.#pixi = pixi;
        this.#styleTree = getStyleTree(this.value, options);
        this.#styleTreeSignature = this.#makeStyleTreeSignature();
        this.#renderer = this.#makeRendererManifest();

        this.#boxStore = new BoxStore(makeStoreConfig(this.value, this.#styleTree));
        this.#boxStore.styles = this.#styleTree;
        this.#boxStore.isDebug = !!this.value.isDebug;
    }

    get isDebug(): boolean {
        return !!this.value.isDebug;
    }

    set isDebug(value: boolean) {
        this.set('isDebug', value);
        this.#boxStore.isDebug = value;
    }

    get isUpdating(): boolean {
        return this.#isUpdatingValue;
    }

    set isUpdating(value: boolean) {
        if (this.#isUpdatingValue === value) {
            return;
        }
        this.#isUpdatingValue = value;
    }

    #makeRendererManifest(): ButtonRendererManifest {
        return {
            byId: {
                'button-background': {
                    renderer: this.$.containerPostRenderer as BoxPixiRendererOverride['renderer'],
                    post: true,
                },
            },
        };
    }

    containerPostRenderer(input: BoxPixiRenderInput): Container {
        const RectangleClass = this.#pixi.Rectangle;
        const currentContainer = input.local.currentContainer!;
        currentContainer.eventMode = this.hasStatus('disabled') ? 'none' : 'static';
        currentContainer.cursor = this.hasStatus('disabled') ? 'default' : 'pointer';
        currentContainer.hitArea = new RectangleClass(0, 0, input.local.localLocation.w, input.local.localLocation.h);

        if (!this.#boundHosts.has(currentContainer)) {
            currentContainer.on(EVENT_POINTER_OVER, this.$.onPointerOver);
            currentContainer.on(EVENT_POINTER_OUT, this.$.onPointerOut);
            currentContainer.on(EVENT_POINTER_TAP, this.$.onPointerTap);
            this.#boundHosts.add(currentContainer);
        }

        return currentContainer;
    }

    hasStatus(name: string): boolean {
        return this.value.state === name;
    }

    setStatus(name: string, enabled: boolean): void {
        const next = nextState(this.value.state, name, enabled);
        if (next === this.value.state) {
            return;
        }
        this.set('state', next);
        this.dirty();
    }

    onPointerOver(): void {
        if (!this.hasStatus('disabled') && !this.hasStatus('hover')) {
            this.setStatus('hover', true);
        }
    }

    onPointerOut(): void {
        if (this.hasStatus('hover')) {
            this.setStatus('hover', false);
        }
    }

    onPointerTap(): void {
        if (!this.hasStatus('disabled')) {
            this.#getHandler('click', 'tap')();
        }
    }

    #getHandler(...names: string[]): EventFn {
        for (const name of names) {
            const handler = this.#options.handlers[name];
            if (typeof handler === 'function') {
                return handler as EventFn;
            }
        }
        return () => {};
    }

    #makeStyleTreeSignature(): string {
        return [
            this.value.variant,
            this.value.family ?? 'base',
            this.value.scale ?? 100,
            this.value.themeName ?? 'BASE',
        ].join('|');
    }

    #refreshStyleTree(): void {
        const nextSignature = this.#makeStyleTreeSignature();
        if (nextSignature === this.#styleTreeSignature) {
            return;
        }

        this.#styleTree = getStyleTree(this.value, this.#options);
        this.#styleTreeSignature = nextSignature;
        this.#boxStore.styles = this.#styleTree;
    }

    observeBox(input: BoxPixiObserverMessage): void {
        if (input.action === 'invalidate') {
            window.setTimeout(this.$.dirty, 0);
        }
    }

    resolve() {
        if (this.isUpdating) {
            return;
        }

        this.isUpdating = true;
        try {
            this.#refreshStyleTree();
            this.#boxStore.mutate((draft) => {
                Object.assign(draft, makeStoreConfig(this.value, this.#styleTree).value);
            });
            this.#boxStore.update();
            boxTreeToPixi({
                root: this.#boxStore.layoutValue,
                app: this.#options.app as unknown as Application,
                parentContainer: this.container,
                pixi: this.#pixi,
                store: this.#boxStore,
                styleTree: this.#styleTree,
                renderers: this.#renderer,
                observer: this.$.observeBox,
            } as never);
        } finally {
            this.isUpdating = false;
        }
    }
}

function normalizeButtonState(value: ButtonStateType): ButtonStateType {
    const state = normalizeInteractionState(value);
    return {
        ...value,
        state,
        modifiers: value.modifiers ? Array.from(new Set(value.modifiers)) : undefined,
        isDisabled: undefined,
        isHovered: undefined,
    };
}

function normalizeInteractionState(value: ButtonStateType): string {
    if (value.isDisabled || value.state === 'disabled') {
        return 'disabled';
    }
    if (value.isHovered || value.state === 'hover') {
        return 'hover';
    }
    return 'start';
}

function nextState(current: string | undefined, name: string, enabled: boolean): string {
    if (name === 'disabled') {
        return enabled ? 'disabled' : 'start';
    }
    if (name === 'hover') {
        if (current === 'disabled') {
            return 'disabled';
        }
        return enabled ? 'hover' : 'start';
    }
    return enabled ? name : (current === name ? 'start' : (current ?? 'start'));
}
