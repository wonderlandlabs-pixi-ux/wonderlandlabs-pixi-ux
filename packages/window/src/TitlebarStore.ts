import {TickerForest} from "@wonderlandlabs-pixi-ux/ticker-forest";
import type {TitlebarConfig, TitlebarContentRendererFn} from "./types";
import type {Application} from "pixi.js";
import {Assets, Container, Graphics, Rectangle, Sprite, Text} from "pixi.js";
import {StoreParams} from "@wonderlandlabs/forestry4";
import rgbToColor from "./rgbToColor";
import type {Subscription} from "rxjs";
import {TITLEBAR_MODE} from "./constants";
import {WindowStore} from "./WindowStore";
import type {WindowLabelFontStyle} from "./types";

type TitlebarStoreValue = TitlebarConfig;

export class TitlebarStore extends TickerForest<TitlebarStoreValue> {
    // Optional custom render function
    titlebarContentRenderer?: TitlebarContentRendererFn;

    // Pixi components - created in property definitions
    #contentContainer: Container = new Container({
        x: 0,
        y: 0,
        sortableChildren: true,
    });
    #counterScaledContentContainer: Container = new Container({
        x: 0,
        y: 0,
        sortableChildren: true,
    });
    #contentMask: Graphics = new Graphics({label: 'titlebar-content-mask'});
    #background: Graphics = new Graphics({label: 'backgroundGraphics'});
    #titleText: Text = new Text({
        text: '',
        style: {
            fontSize: 14,
            fill: 0xffffff,
        },
    });
    #iconSprite?: Sprite;
    #closeButton?: Graphics;
    widthSubscription?: Subscription;
    configSubscription?: Subscription;
    #inverseScaleY = 1;

    constructor(config: StoreParams<TitlebarStoreValue>, app: Application) {
        const titlebarContainer = new Container({
            label: 'titlebar',
            position: {x: 0, y: 0},
            sortableChildren: true,  // Enable zIndex sorting
            eventMode: 'static'
        });
        super({
            // @ts-ignore
            ...config, prep(next: TitlebarStoreValue) {
                if (!next) {
                    return next;
                }
                if (!this.value && next) {
                    queueMicrotask(() => {
                        (this as TitlebarStore).dirty();
                    })
                    return next;
                }
                let changed = false;
                Array.from(Object.keys(next)).forEach((key) => {
                    // @ts-ignore
                    if (next[key] !== (this as TitlebarStore).value[key]) {
                        changed = true;
                    }
                });
                if (changed) {
                    queueMicrotask(() => {
                        (this as TitlebarStore).dirty();
                    });
                }
                return next;
            }
        }, {
            app,
            container: titlebarContainer,
            dirtyOnScale: {
                watchX: false,
                watchY: true,
            }
        });
        if (!this.application) {
            const parent = this.$parent as WindowStore | undefined;
            if (parent?.application) {
                this.application = parent.application;
            }
        }
        if (this.application) {
            this.kickoff();
        }
    }

    #hoverAdded = false;

    addHover() {
        if (this.#hoverAdded) {
            return;
        }
        const windowStore = this.$parent as WindowStore;
        const titlebar = this.value;
        // Set up hover listeners for ON_HOVER mode
        if (titlebar.mode === TITLEBAR_MODE.ON_HOVER && windowStore.rootContainer) {
            windowStore.rootContainer?.on('pointerenter', () => {
                this.mutate((draft) => {
                    draft.isVisible = true;
                })
            });
            windowStore.rootContainer?.on('pointerleave', () => {
                this.mutate((draft) => {
                    draft.isVisible = false;
                })
            });
            this.set('isVisible', false);
        } else {
            this.set('isVisible', true);
        }
        this.#hoverAdded = true;
    }

    get parentContainer() {
        const parent = this.$parent as WindowStore;
        return parent?.rootContainer;
    }

    /**
     * Get the titlebar container (for drag handling)
     */
    get container(): Container {
        const container = super.container;
        if (!container) {
            throw new Error('TitlebarStore: container unavailable');
        }
        return container;
    }

    set container(container: Container | undefined) {
        super.container = container;
    }

    resolveComponents() {
        this.#refreshContainer();
        this.#refreshBackground();
        this.#refreshIcon();
        this.#refreshCloseButton();
        this.#refreshTitle();

        // Call custom render function if provided
        if (this.titlebarContentRenderer) {
            const windowStore = this.$parent as WindowStore;
            const padding = this.value.padding ?? 0;
            const height = this.value.height;
            const width = windowStore?.value?.width || 0;
            this.titlebarContentRenderer({
                titlebarStore: this,
                titlebarValue: this.value,
                windowStore,
                windowValue: windowStore.value,
                contentContainer: this.#contentContainer,
                localRect: new Rectangle(
                    -padding,
                    -((height / 2) + padding),
                    width,
                    height,
                ),
                localScale: {
                    x: this.#counterScaledContentContainer.scale.x,
                    y: this.#counterScaledContentContainer.scale.y,
                },
            });
        }
    }

    #refreshContainer() {
        const {padding, height} = this.value;
        const windowStore = this.$parent as WindowStore;
        const width = windowStore?.value?.width || 0;
        const container = this.container;

        // Add to parent if not already added
        if (!container.parent) {
            this.parentContainer?.addChild(container);
            // Use zIndex to ensure titlebar is above content (background=0, content=1, titlebar=2)
            container.zIndex = 2;
        }

        // Add counter-scaled content container if not already added
        if (!this.#counterScaledContentContainer.parent) {
            container.addChild(this.#counterScaledContentContainer);
            this.#counterScaledContentContainer.zIndex = 1;
        }

        // Add content container if not already added
        if (!this.#contentContainer.parent) {
            this.#counterScaledContentContainer.addChild(this.#contentContainer);
        }

        // Update content container position
        this.#contentContainer.x = padding ?? 0;
        this.#contentContainer.y = height / 2 + (padding ?? 0);

        // Counter-scale Y only so titlebar keeps visual height while width follows window scale.
        this.#inverseScaleY = this.getInverseScale().y;
        this.#counterScaledContentContainer.scale.set(1, this.#inverseScaleY);

        const counterWidth = width;
        const counterHeight = height * this.#inverseScaleY;
        this.#refreshContentMask(counterWidth, counterHeight);
        container.hitArea = new Rectangle(0, 0, counterWidth, counterHeight);

        // Update visibility
        container.visible = this.value.isVisible;
    }

    #refreshBackground() {
        const {height, backgroundColor} = this.value;
        const windowStore = this.$parent as WindowStore;
        const width = windowStore?.value?.width || 0;
        const container = this.container;

        // Add to container if not already added
        if (!this.#background.parent) {
            container.addChild(this.#background);
            this.#background.zIndex = 0;  // Background layer
        }

        // Use style titlebar color if variant is set, otherwise use explicit backgroundColor
        const style = windowStore?.resolvedStyle;
        const bgColor = windowStore?.value?.variant ? style?.titlebarBackgroundColor : backgroundColor;

        // Update graphics
        this.#background.clear();
        const color = rgbToColor(bgColor ?? backgroundColor);
        this.#background.rect(0, 0, width, height * this.#inverseScaleY)
            .fill(color);
    }

    #refreshContentMask(counterWidth: number, counterHeight: number) {
        const container = this.container;
        if (!this.#contentMask.parent) {
            container.addChild(this.#contentMask);
            this.#contentMask.zIndex = 3;
        }

        this.#contentMask.clear();
        this.#contentMask.rect(0, 0, counterWidth, counterHeight).fill(0xffffff);
        this.#counterScaledContentContainer.mask = this.#contentMask;
    }

    #refreshIcon() {
        const {icon, height, padding} = this.value;

        if (!icon) {
            // Remove icon if it exists but no icon config
            if (this.#iconSprite?.parent) {
                this.#contentContainer.removeChild(this.#iconSprite);
                this.#iconSprite.destroy();
                this.#iconSprite = undefined;
            }
            return;
        }

        // Load and display icon
        if (!this.#iconSprite) {
            Assets.load(icon.url).then((texture) => {
                if (!this.#iconSprite) {
                    this.#iconSprite = new Sprite(texture);
                    this.#iconSprite.width = icon.width;
                    this.#iconSprite.height = icon.height;
                    this.#iconSprite.zIndex = 2;
                    this.#contentContainer.addChild(this.#iconSprite);
                    // Position icon vertically centered
                    this.#iconSprite.y = -(icon.height / 2);
                }
            });
        } else {
            // Update existing icon
            this.#iconSprite.width = icon.width;
            this.#iconSprite.height = icon.height;
            this.#iconSprite.y = -(icon.height / 2);
        }
    }

    #refreshTitle() {
        const {title, icon, padding, height, showCloseButton} = this.value;
        const windowStore = this.$parent as WindowStore;
        const width = windowStore?.value?.width || 0;
        const labelStyle = this.#resolveLabelStyle();

        // Add to content container if not already added
        if (!this.#titleText.parent) {
            this.#contentContainer.addChild(this.#titleText);
            this.#titleText.zIndex = 1;  // Above background
        }

        // Update text properties
        this.#titleText.text = title;
        this.#titleText.style.fontSize = labelStyle.size;
        this.#titleText.style.fontFamily = labelStyle.family;
        this.#titleText.style.fill = rgbToColor(labelStyle.color);
        this.#titleText.alpha = labelStyle.visible ? labelStyle.alpha : 0;
        this.#titleText.style.wordWrap = true;
        this.#titleText.y = -0.66 * labelStyle.size;

        // Offset title if icon is present
        const iconOffset = icon ? (icon.width + 4) : 0;
        this.#titleText.x = iconOffset;

        const buttonReserve = showCloseButton
            ? this.#closeButtonSize(height, padding ?? 0) + 8
            : 0;
        this.#titleText.style.wordWrapWidth = Math.max(
            0,
            width - ((padding ?? 0) * 2) - iconOffset - buttonReserve
        );
    }

    #resolveLabelStyle(): WindowLabelFontStyle {
        const windowStore = this.$parent as WindowStore | undefined;
        const resolved = windowStore?.resolvedStyle?.label?.font;
        return {
            size: resolved?.size ?? this.value.fontSize ?? 10,
            family: resolved?.family ?? 'Helvetica',
            color: resolved?.color ?? this.value.textColor ?? {r: 0, g: 0, b: 0},
            alpha: resolved?.alpha ?? 1,
            visible: resolved?.visible ?? true,
        };
    }

    #closeButtonSize(height: number, padding: number): number {
        return Math.max(10, Math.min(18, height - (padding * 2) - 6));
    }

    #refreshCloseButton() {
        const {showCloseButton, height, padding} = this.value;
        const windowStore = this.$parent as WindowStore | undefined;
        const width = windowStore?.value?.width || 0;

        if (!showCloseButton) {
            if (this.#closeButton) {
                this.#closeButton.visible = false;
            }
            return;
        }

        if (!this.#closeButton) {
            this.#closeButton = new Graphics({label: 'titlebar-close-button'});
            this.#closeButton.eventMode = 'static';
            this.#closeButton.cursor = 'pointer';
            this.#closeButton.zIndex = 3;
            this.#closeButton.on('pointerdown', (event) => {
                event.stopPropagation();
            });
            this.#closeButton.on('pointerup', (event) => {
                event.stopPropagation();
            });
            this.#closeButton.on('pointertap', (event) => {
                event.stopPropagation();
                const parent = this.$parent as WindowStore | undefined;
                parent?.requestClose();
            });
        }

        if (this.#closeButton.parent !== this.#contentContainer) {
            this.#contentContainer.addChild(this.#closeButton);
        }

        const resolvedPadding = padding ?? 0;
        const size = this.#closeButtonSize(height, resolvedPadding);
        const symbolColor = rgbToColor(this.#resolveLabelStyle().color);
        const inset = Math.max(2, size * 0.3);
        const half = size / 2;

        this.#closeButton.visible = true;
        this.#closeButton.clear();
        this.#closeButton.roundRect(-half, -half, size, size, 3)
            .fill({color: 0x000000, alpha: 0.25});
        this.#closeButton.moveTo(-half + inset, -half + inset)
            .lineTo(half - inset, half - inset)
            .stroke({color: symbolColor, width: 2});
        this.#closeButton.moveTo(half - inset, -half + inset)
            .lineTo(-half + inset, half - inset)
            .stroke({color: symbolColor, width: 2});
        this.#closeButton.x = Math.max(half, width - (resolvedPadding * 2) - half);
        this.#closeButton.y = 0;
    }

    protected resolve(): void {
        this.resolveComponents();
    }

    cleanup(): void {
        super.cleanup();

        // Unsubscribe from width changes
        if (this.widthSubscription) {
            this.widthSubscription.unsubscribe();
            this.widthSubscription = undefined;
        }

        // Unsubscribe from config changes
        if (this.configSubscription) {
            this.configSubscription.unsubscribe();
            this.configSubscription = undefined;
        }

        const container = super.container;
        if (container) {
            this.parentContainer?.removeChild(container);
            container.destroy({children: true});
            this.container = undefined;
        }
    }
}
