import {Container, Graphics, Rectangle} from "pixi.js";
import {TitlebarStore} from "./TitlebarStore";
import type {TitlebarConfig} from "./types";
import {StoreParams} from "@wonderlandlabs/forestry4";
import type {TickerForestConfig} from "@wonderlandlabs-pixi-ux/ticker-forest";

export class CounterScalingTitlebar extends TitlebarStore {
    #contentMask = new Graphics({
        label: 'titlebar-counter-scale-mask',
    });
    #inverseScaleY = 1;
    #counterScaledContentStored = false;

    constructor(config: StoreParams<TitlebarConfig>, options: TickerForestConfig = {}) {
        super(config, {
            ...options,
            dirtyOnScale: {
                watchX: false,
                watchY: true,
            },
        });
    }

    protected override ensureContainerStructure(): void {
        super.ensureContainerStructure();
        const container = this.container!;

        if (!this.#contentMask.parent) {
            container.addChild(this.#contentMask);
            this.#contentMask.zIndex = 3;
        }

        if (!this.#counterScaledContentStored) {
            const resources = (this as unknown as {
                $res?: Map<string, unknown>;
            }).$res;
            resources?.set('conterScaleContent', this.contentContainer);
            resources?.set('counterScaleContent', this.contentContainer);
            this.#counterScaledContentStored = true;
        }
    }

    protected override layoutContent(rect: Rectangle): void {
        this.#inverseScaleY = this.getInverseScale().y;
        this.contentContainer.position.set(0, 0);
        this.contentContainer.scale.set(1, this.#inverseScaleY);

        const counterHeight = rect.height * this.#inverseScaleY;
        this.#contentMask.clear();
        this.#contentMask.rect(0, 0, rect.width, counterHeight).fill(0xffffff);
        this.contentContainer.mask = this.#contentMask;
    }

    protected override getTitlebarRect(): Rectangle {
        const width = this.windowStore?.value?.width || 0;
        const inverseScaleY = this.getInverseScale().y;
        return new Rectangle(0, 0, width, this.value.height * inverseScaleY);
    }

    protected override resolveContentScale(): { x: number; y: number } {
        return {
            x: this.contentContainer.scale.x,
            y: this.contentContainer.scale.y,
        };
    }
}
