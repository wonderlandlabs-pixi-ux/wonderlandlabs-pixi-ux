import {Container, Graphics, Rectangle} from "pixi.js";
import {TitlebarStore} from "./TitlebarStore";
import type {TitlebarConfig} from "./types";
import {StoreParams} from "@wonderlandlabs/forestry4";
import type {TickerForestConfig} from "@wonderlandlabs-pixi-ux/ticker-forest";

export class CounterScalingTitlebar extends TitlebarStore {
    static readonly COUNTER_SCALE_LABEL = 'counter-scale';

    #contentMask = new Graphics({
        label: 'titlebar-counter-scale-mask',
    });
    #counterScaleContent = new Container({
        label: CounterScalingTitlebar.COUNTER_SCALE_LABEL,
        sortableChildren: true,
    });

    constructor(config: StoreParams<TitlebarConfig>, options: TickerForestConfig = {}) {
        super(config, {
            ...options,
            dirtyOnScale: {
                watchX: true,
                watchY: true,
            },
        });
    }

    override get height(): number {
        return this.value.height * this.getInverseScale().y;
    }

    protected override ensureContainerStructure(): void {
        super.ensureContainerStructure();
        const container = this.container!;

        if (!this.#contentMask.parent) {
            container.addChild(this.#contentMask);
            this.#contentMask.zIndex = 3;
        }

        if (!this.#counterScaleContent.parent) {
            this.contentContainer.addChildAt(this.#counterScaleContent, 0);
        } else if (this.contentContainer.getChildIndex(this.#counterScaleContent) !== 0) {
            this.contentContainer.setChildIndex(this.#counterScaleContent, 0);
        }
    }

    protected override layoutContent(rect: Rectangle): void {
        const inverseScale = this.getInverseScale();
        this.contentContainer.position.set(0, 0);
        this.contentContainer.scale.set(1, 1);
        this.#counterScaleContent.position.set(0, 0);
        this.#counterScaleContent.scale.set(inverseScale.x, inverseScale.y);
        this.#counterScaleContent.visible = true;
        this.#counterScaleContent.eventMode = 'passive';
        this.#contentMask.clear();
        this.#contentMask.rect(0, 0, rect.width, rect.height).fill(0xffffff);
        this.contentContainer.mask = this.#contentMask;
    }
}
