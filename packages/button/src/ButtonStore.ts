import {
    BoxStore,
    boxTreeToPixi,
    type BoxStyleManagerLike,
    type BoxPixiObserverMessage,
    type BoxPixiRenderInput,
    type BoxPixiRendererOverride,
} from '@wonderlandlabs-pixi-ux/box';
import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import {
    Application,
    Container,
    Rectangle,
} from 'pixi.js';
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
    #renderer: ButtonRendererManifest;
    #options: ButtonOptionsType;
    #boundHosts = new WeakSet<Container>();

    constructor(value: ButtonStateType, options: ButtonOptionsType) {
        const container = new Container({
            x: value.size?.x ?? 0,
            y: value.size?.y ?? 0,
        });
        super({value: normalizeButtonState(value)}, {
            app: options.app as unknown as Application,
            container,
        });

        this.#options = options;
        this.#styleTree = getStyleTree(value.variant, options);
        this.#renderer = this.#makeRendererManifest();

        this.#boxStore = new BoxStore(makeStoreConfig(this.value, this.#styleTree));
        this.#boxStore.styles = this.#styleTree;
        this.resolve();
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
        const currentContainer = input.local.currentContainer!;
        currentContainer.eventMode = this.hasStatus('disabled') ? 'none' : 'static';
        currentContainer.cursor = this.hasStatus('disabled') ? 'default' : 'pointer';
        currentContainer.hitArea = new Rectangle(0, 0, input.local.localLocation.w, input.local.localLocation.h);

        if (!this.#boundHosts.has(currentContainer)) {
            currentContainer.on(EVENT_POINTER_OVER, this.$.onPointerOver);
            currentContainer.on(EVENT_POINTER_OUT, this.$.onPointerOut);
            currentContainer.on(EVENT_POINTER_TAP, this.$.onPointerTap);
            this.#boundHosts.add(currentContainer);
        }

        return currentContainer;
    }

    hasStatus(name: string): boolean {
        return this.value.status?.has(name) ?? false;
    }

    setStatus(name: string, enabled: boolean): void {
        const next = new Set(this.value.status ?? []);
        const hasChanged = enabled ? !next.has(name) : next.has(name);

        if (!hasChanged) {
            return;
        }

        if (enabled) {
            next.add(name);
        } else {
            next.delete(name);
        }

        if (name === 'disabled' && enabled) {
            next.delete('hover');
        }

        this.set('status', next);
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

    observeBox(input: BoxPixiObserverMessage): void {
        if (input.action === 'invalidate') {
            window.setTimeout(this.$.dirty, 0);
        }
    }

    resolve() {
        this.#boxStore.mutate((draft) => {
            Object.assign(draft, makeStoreConfig(this.value, this.#styleTree).value);
        });
        this.#boxStore.update();
        boxTreeToPixi({
            root: this.#boxStore.value,
            app: this.#options.app as unknown as Application,
            parentContainer: this.container,
            store: this.#boxStore,
            styleTree: this.#styleTree,
            renderers: this.#renderer,
            observer: this.$.observeBox,
        } as never);
    }
}

function normalizeButtonState(value: ButtonStateType): ButtonStateType {
    const status = new Set(value.status ?? []);
    if (value.isDisabled) {
        status.add('disabled');
    }
    if (value.isHovered) {
        status.add('hover');
    }
    return {
        ...value,
        status,
        isDisabled: undefined,
        isHovered: undefined,
    };
}
