import {Assets, Container, Graphics, Rectangle, Sprite, Text} from "pixi.js";
import type {TitlebarContentRendererFn, WindowLabelFontStyle} from "./types.js";
import rgbToColor from "./rgbToColor.js";
import type {TitlebarStore} from "./TitlebarStore.js";
import type {WindowStore} from "./WindowStore.js";
import {computeTitlebarLayout} from "./titlebarLayout.js";

const COUNTER_SCALE_LABEL = 'counter-scale';
const STOCK_TITLE_TEXT = 'stock-titlebar-text';
const STOCK_TITLE_ICON = 'stock-titlebar-icon';
const STOCK_CLOSE_BUTTON = 'stock-titlebar-close';

type StockIconSprite = Sprite & {
    __stockIconUrl?: string;
};

function resolveLabelStyle(
    titlebarStore: TitlebarStore,
    windowStore: WindowStore,
): WindowLabelFontStyle {
    const resolved = windowStore.resolvedStyle?.label?.font;
    return {
        size: resolved?.size ?? titlebarStore.value.fontSize ?? 10,
        family: resolved?.family ?? 'Helvetica',
        color: resolved?.color
            ?? windowStore.resolvedStyle?.titlebarTextColor
            ?? titlebarStore.value.textColor
            ?? {r: 0, g: 0, b: 0},
        alpha: resolved?.alpha ?? 1,
        visible: resolved?.visible ?? true,
    };
}

function resolveRenderTarget(
    contentContainer: TitlebarStore['contentContainer'],
    localRect: Rectangle,
    localScale: {x: number; y: number},
): { container: Container; rect: Rectangle } {
    const counterScale = contentContainer.getChildByLabel(COUNTER_SCALE_LABEL) as Container | null;
    if (!counterScale) {
        return {
            container: contentContainer,
            rect: localRect,
        };
    }
    return {
        container: counterScale,
        rect: new Rectangle(
            localRect.x,
            localRect.y,
            localRect.width * localScale.x,
            localRect.height * localScale.y,
        ),
    };
}

function getManagedChild<T extends Text | Graphics | Sprite>(
    targetContainer: Container,
    rootContainer: Container,
    label: string,
): T | null {
    const local = targetContainer.getChildByLabel(label) as T | null;
    if (local) {
        return local;
    }
    if (targetContainer === rootContainer) {
        return null;
    }
    return rootContainer.getChildByLabel(label) as T | null;
}

function getText(targetContainer: Container, rootContainer: Container): Text {
    let titleText = getManagedChild<Text>(targetContainer, rootContainer, STOCK_TITLE_TEXT);
    if (!titleText) {
        titleText = new Text({
            text: '',
            style: {
                fontSize: 14,
                fill: 0xffffff,
            },
        });
        titleText.label = STOCK_TITLE_TEXT;
        targetContainer.addChild(titleText);
    } else if (titleText.parent !== targetContainer) {
        titleText.parent?.removeChild(titleText);
        targetContainer.addChild(titleText);
    }
    return titleText;
}

function getCloseButton(
    targetContainer: Container,
    rootContainer: Container,
    windowStore: WindowStore,
): Graphics {
    let closeButton = getManagedChild<Graphics>(targetContainer, rootContainer, STOCK_CLOSE_BUTTON);
    if (!closeButton) {
        closeButton = new Graphics({label: STOCK_CLOSE_BUTTON});
        closeButton.eventMode = 'static';
        closeButton.cursor = 'pointer';
        closeButton.on('pointerdown', (event) => {
            event.stopPropagation();
        });
        closeButton.on('pointerup', (event) => {
            event.stopPropagation();
        });
        closeButton.on('pointertap', (event) => {
            event.stopPropagation();
            windowStore.requestClose();
        });
        targetContainer.addChild(closeButton);
    } else if (closeButton.parent !== targetContainer) {
        closeButton.parent?.removeChild(closeButton);
        targetContainer.addChild(closeButton);
    }
    return closeButton;
}

function removeChildByLabel(
    targetContainer: Container,
    rootContainer: Container,
    label: string,
): void {
    const containers = targetContainer === rootContainer
        ? [targetContainer]
        : [targetContainer, rootContainer];
    for (const container of containers) {
        const child = container.getChildByLabel(label);
        if (!child) {
            continue;
        }
        child.parent?.removeChild(child);
        child.destroy();
    }
}

export const renderStockTitlebarContent: TitlebarContentRendererFn = ({
    titlebarStore,
    windowStore,
    titlebarValue,
    contentContainer,
    localRect,
    localScale,
}) => {
    const typedTitlebarStore = titlebarStore as TitlebarStore;
    const typedWindowStore = windowStore as WindowStore;
    const labelStyle = resolveLabelStyle(typedTitlebarStore, typedWindowStore);
    const {container: renderContainer, rect: layoutRect} = resolveRenderTarget(contentContainer, localRect, localScale);
    const padding = titlebarValue.padding ?? 0;
    const closeButtonSize = titlebarValue.showCloseButton
        ? Math.max(10, Math.min(18, layoutRect.height - (padding * 2) - 6))
        : undefined;
    const layout = computeTitlebarLayout({
        width: layoutRect.width,
        height: layoutRect.height,
        padding,
        icon: titlebarValue.icon
            ? {
                width: titlebarValue.icon.width,
                height: titlebarValue.icon.height,
            }
            : undefined,
        closeButtonSize,
    });
    const titleText = getText(renderContainer, contentContainer);

    titleText.text = titlebarValue.title;
    titleText.style.fontSize = labelStyle.size;
    titleText.style.fontFamily = labelStyle.family;
    titleText.style.fill = rgbToColor(labelStyle.color);
    titleText.alpha = labelStyle.visible ? labelStyle.alpha : 0;
    titleText.style.wordWrap = true;

    if (!titlebarValue.icon) {
        removeChildByLabel(renderContainer, contentContainer, STOCK_TITLE_ICON);
    } else {
        const iconUrl = titlebarValue.icon.url;
        const existingIcon = getManagedChild<StockIconSprite>(renderContainer, contentContainer, STOCK_TITLE_ICON);
        const applyIcon = (sprite: Sprite) => {
            const iconRect = layout.iconRect;
            if (!iconRect) {
                return;
            }
            sprite.width = titlebarValue.icon!.width;
            sprite.height = titlebarValue.icon!.height;
            sprite.x = iconRect.x;
            sprite.y = iconRect.y;
        };

        if (existingIcon?.__stockIconUrl === iconUrl) {
            if (existingIcon.parent !== renderContainer) {
                existingIcon.parent?.removeChild(existingIcon);
                renderContainer.addChild(existingIcon);
            }
            applyIcon(existingIcon);
        } else {
            Assets.load(iconUrl).then((texture) => {
                if (typedTitlebarStore.value.icon?.url !== iconUrl) {
                    return;
                }
                const existing = getManagedChild<StockIconSprite>(renderContainer, contentContainer, STOCK_TITLE_ICON);
                if (existing) {
                    if (existing.parent !== renderContainer) {
                        existing.parent?.removeChild(existing);
                        renderContainer.addChild(existing);
                    }
                    existing.texture = texture;
                    existing.__stockIconUrl = iconUrl;
                    applyIcon(existing);
                    return;
                }
                const iconSprite = new Sprite(texture) as StockIconSprite;
                iconSprite.label = STOCK_TITLE_ICON;
                iconSprite.__stockIconUrl = iconUrl;
                applyIcon(iconSprite);
                renderContainer.addChild(iconSprite);
                typedTitlebarStore.dirty();
            });
        }
    }

    if (!titlebarValue.showCloseButton) {
        removeChildByLabel(renderContainer, contentContainer, STOCK_CLOSE_BUTTON);
    } else {
        const closeButton = getCloseButton(renderContainer, contentContainer, typedWindowStore);
        const size = closeButtonSize ?? 10;
        const symbolColor = rgbToColor(labelStyle.color);
        const inset = Math.max(2, size * 0.3);
        const half = size / 2;

        closeButton.clear();
        closeButton.roundRect(-half, -half, size, size, 3)
            .fill({color: 0x000000, alpha: 0.25});
        closeButton.moveTo(-half + inset, -half + inset)
            .lineTo(half - inset, half - inset)
            .stroke({color: symbolColor, width: 2});
        closeButton.moveTo(half - inset, -half + inset)
            .lineTo(-half + inset, half - inset)
            .stroke({color: symbolColor, width: 2});
        const closeRect = layout.closeRect;
        closeButton.x = closeRect ? closeRect.x + half : Math.max(half + padding, layoutRect.width - padding - half);
        closeButton.y = closeRect ? closeRect.y + (closeRect.h / 2) : (layoutRect.height / 2);
    }

    titleText.x = layout.titleRect.x;
    titleText.y = layout.titleRect.y + Math.max(0, ((layout.titleRect.h - labelStyle.size) / 2) - (labelStyle.size * 0.15));
    titleText.style.wordWrapWidth = Math.max(0, layout.titleRect.w);
};
