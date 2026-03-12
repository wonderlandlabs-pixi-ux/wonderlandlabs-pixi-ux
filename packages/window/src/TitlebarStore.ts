import {TickerForest} from "@wonderlandlabs-pixi-ux/ticker-forest";
import type {TickerForestConfig} from "@wonderlandlabs-pixi-ux/ticker-forest";
import {readScalePoint} from "@wonderlandlabs-pixi-ux/utils";
import type {TitlebarConfig, TitlebarContentRendererFn} from "./types";
import {Container, Graphics, Rectangle} from "pixi.js";
import {StoreParams} from "@wonderlandlabs/forestry4";
import rgbToColor from "./rgbToColor";
import {TITLEBAR_MODE} from "./constants";
import type {WindowStore} from "./WindowStore";
import {
    fromEventPattern,
    map,
    merge,
    of,
    Subscription,
    switchMap,
    takeUntil,
    timer,
} from "rxjs";

type TitlebarStoreValue = TitlebarConfig;

export class TitlebarStore extends TickerForest<TitlebarStoreValue> {
    static readonly HOVER_HIDE_DELAY_MS = 500;

    titlebarContentRenderer?: TitlebarContentRendererFn;

    protected readonly backgroundGraphic: Graphics = new Graphics({
        label: 'titlebar-background',
    });
    readonly contentContainer: Container = new Container({
        label: 'titlebar-content',
        sortableChildren: true,
    });

    #hoverAdded = false;
    #valueSubscription?: Subscription;
    #hoverVisibilitySubscription?: Subscription;

    constructor(
        config: StoreParams<TitlebarStoreValue>,
        options: TickerForestConfig = {},
    ) {
        super(config, {
            ...options,
            container: new Container({
                label: 'titlebar',
                position: {x: 0, y: 0},
                sortableChildren: true,
                eventMode: 'static',
            }),
        });
        const self = this;
        let initialized = false;
        this.#valueSubscription = this.$subject.subscribe(() => {
            if (!initialized) {
                initialized = true;
                return;
            }
            self.dirty();
        });
        if (this.application) {
            this.kickoff();
        }
    }

    addHover() {
        if (this.#hoverAdded) {
            return;
        }
        const self = this;
        const windowStore = self.windowStore;
        if (this.value.mode === TITLEBAR_MODE.ON_HOVER && windowStore?.rootContainer) {
            const rootContainer = windowStore.rootContainer;
            const titlebarContainer = self.container;
            const bodyOver$ = fromEventPattern(
                (handler) => rootContainer.on('pointerover', handler),
                (handler) => rootContainer.off('pointerover', handler),
            );
            const bodyOut$ = fromEventPattern(
                (handler) => rootContainer.on('pointerout', handler),
                (handler) => rootContainer.off('pointerout', handler),
            );
            const titlebarOver$ = fromEventPattern(
                (handler) => titlebarContainer?.on('pointerover', handler),
                (handler) => titlebarContainer?.off('pointerover', handler),
            );
            const titlebarOut$ = fromEventPattern(
                (handler) => titlebarContainer?.on('pointerout', handler),
                (handler) => titlebarContainer?.off('pointerout', handler),
            );

            const hoverOn$ = merge(bodyOver$, titlebarOver$).pipe(
                map(() => true),
            );
            const delayedHoverOff$ = merge(bodyOut$, titlebarOut$).pipe(
                switchMap(() => timer(TitlebarStore.HOVER_HIDE_DELAY_MS).pipe(
                    takeUntil(hoverOn$),
                    map(() => false),
                )),
            );

            this.#hoverVisibilitySubscription = merge(
                of(false),
                hoverOn$,
                delayedHoverOff$,
            ).subscribe((isVisible) => {
                self.#setHoverVisibility(isVisible);
            });
            self.set('isVisible', false);
        } else {
            self.set('isVisible', true);
        }
        self.#hoverAdded = true;
    }

    #setHoverVisibility(isVisible: boolean): void {
        if (this.value.isVisible === isVisible) {
            return;
        }
        this.set('isVisible', isVisible);
    }

    get parentContainer(): Container | undefined {
        return this.windowStore?.rootContainer;
    }

    get windowStore(): WindowStore | undefined {
        return this.$parent as WindowStore | undefined;
    }

    get width(): number {
        return this.windowStore?.value?.width || 0;
    }

    get height(): number {
        return this.value.height;
    }

    get pivot(): { x: number; y: number } {
        return {
            x: 0,
            y: this.height,
        };
    }

    protected resolve(): void {
        this.resolveComponents();
    }

    protected resolveComponents(): void {
        const rect = this.getTitlebarRect();

        this.ensureContainerStructure();
        this.layoutContent(rect);

        const container = this.container!;
        container.position.set(0, 0);
        container.pivot.set(this.pivot.x, this.pivot.y);
        container.hitArea = rect;
        container.visible = this.value.isVisible;

        this.refreshBackground(rect);
        this.afterLayout(rect);
        this.renderContent(rect);
    }

    protected ensureContainerStructure(): void {
        const container = this.container!;

        if (!container.parent) {
            this.parentContainer?.addChild(container);
            container.zIndex = 2;
        }

        if (!this.backgroundGraphic.parent) {
            container.addChild(this.backgroundGraphic);
            this.backgroundGraphic.zIndex = 0;
        }

        if (!this.contentContainer.parent) {
            container.addChild(this.contentContainer);
            this.contentContainer.zIndex = 1;
        }
    }

    protected layoutContent(_rect: Rectangle): void {
        this.contentContainer.position.set(0, 0);
        this.contentContainer.scale.set(1, 1);
    }

    protected getTitlebarRect(): Rectangle {
        return new Rectangle(
            0,
            0,
            this.width,
            this.height,
        );
    }

    protected resolveContentScale(): { x: number; y: number } {
        const scale = readScalePoint(this.container);
        return {
            x: scale?.x ?? 1,
            y: scale?.y ?? 1,
        };
    }

    protected refreshBackground(rect: Rectangle): void {
        const windowStore = this.windowStore;
        const style = windowStore?.resolvedStyle;
        const backgroundColor = windowStore?.value?.variant
            ? style?.titlebarBackgroundColor
            : this.value.backgroundColor;

        this.backgroundGraphic.clear();
        this.backgroundGraphic
            .rect(rect.x, rect.y, rect.width, rect.height)
            .fill(rgbToColor(backgroundColor ?? this.value.backgroundColor));
    }

    protected afterLayout(_rect: Rectangle): void {
    }

    protected renderContent(_rect: Rectangle): void {
        const windowStore = this.windowStore;
        if (!windowStore || !this.titlebarContentRenderer) {
            return;
        }
        const localRect = new Rectangle(0, 0, this.width, this.height);

        this.titlebarContentRenderer({
            titlebarStore: this,
            titlebarValue: this.value,
            windowStore,
            windowValue: windowStore.value,
            contentContainer: this.contentContainer,
            localRect,
            localScale: this.resolveContentScale(),
        });
    }

    cleanup(): void {
        super.cleanup();
        this.#hoverVisibilitySubscription?.unsubscribe();
        this.#hoverVisibilitySubscription = undefined;
        this.#valueSubscription?.unsubscribe();
        this.#valueSubscription = undefined;
        const container = super.container;
        if (container) {
            this.parentContainer?.removeChild(container);
            container.destroy({children: true});
            super.container = undefined;
        }
    }
}
