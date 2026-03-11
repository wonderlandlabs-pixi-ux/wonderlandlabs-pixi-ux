import {Assets, Graphics, Sprite, Text} from "pixi.js";
import type {TitlebarContentRendererFn, WindowLabelFontStyle} from "./types";
import rgbToColor from "./rgbToColor";
import type {TitlebarStore} from "./TitlebarStore";
import type {WindowStore} from "./WindowStore";

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

function getText(contentContainer: TitlebarStore['contentContainer']): Text {
    let titleText = contentContainer.getChildByLabel(STOCK_TITLE_TEXT) as Text | null;
    if (!titleText) {
        titleText = new Text({
            text: '',
            style: {
                fontSize: 14,
                fill: 0xffffff,
            },
        });
        titleText.label = STOCK_TITLE_TEXT;
        contentContainer.addChild(titleText);
    }
    return titleText;
}

function getCloseButton(
    contentContainer: TitlebarStore['contentContainer'],
    windowStore: WindowStore,
): Graphics {
    let closeButton = contentContainer.getChildByLabel(STOCK_CLOSE_BUTTON) as Graphics | null;
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
        contentContainer.addChild(closeButton);
    }
    return closeButton;
}

function removeChildByLabel(
    contentContainer: TitlebarStore['contentContainer'],
    label: string,
): void {
    const child = contentContainer.getChildByLabel(label);
    if (!child) {
        return;
    }
    contentContainer.removeChild(child);
    child.destroy();
}

export const renderStockTitlebarContent: TitlebarContentRendererFn = ({
    titlebarStore,
    windowStore,
    titlebarValue,
    contentContainer,
    localRect,
}) => {
    const typedTitlebarStore = titlebarStore as TitlebarStore;
    const typedWindowStore = windowStore as WindowStore;
    const labelStyle = resolveLabelStyle(typedTitlebarStore, typedWindowStore);
    const padding = titlebarValue.padding ?? 0;
    const titleText = getText(contentContainer);

    titleText.text = titlebarValue.title;
    titleText.style.fontSize = labelStyle.size;
    titleText.style.fontFamily = labelStyle.family;
    titleText.style.fill = rgbToColor(labelStyle.color);
    titleText.alpha = labelStyle.visible ? labelStyle.alpha : 0;
    titleText.style.wordWrap = true;

    let iconOffset = 0;
    if (!titlebarValue.icon) {
        removeChildByLabel(contentContainer, STOCK_TITLE_ICON);
    } else {
        const iconUrl = titlebarValue.icon.url;
        const existingIcon = contentContainer.getChildByLabel(STOCK_TITLE_ICON) as StockIconSprite | null;
        const applyIcon = (sprite: Sprite) => {
            sprite.width = titlebarValue.icon!.width;
            sprite.height = titlebarValue.icon!.height;
            sprite.x = padding;
            sprite.y = Math.max(0, (localRect.height - sprite.height) / 2);
        };

        if (existingIcon?.__stockIconUrl === iconUrl) {
            applyIcon(existingIcon);
        } else {
            Assets.load(iconUrl).then((texture) => {
                if (typedTitlebarStore.value.icon?.url !== iconUrl) {
                    return;
                }
                const existing = contentContainer.getChildByLabel(STOCK_TITLE_ICON) as StockIconSprite | null;
                if (existing) {
                    existing.texture = texture;
                    existing.__stockIconUrl = iconUrl;
                    applyIcon(existing);
                    return;
                }
                const iconSprite = new Sprite(texture) as StockIconSprite;
                iconSprite.label = STOCK_TITLE_ICON;
                iconSprite.__stockIconUrl = iconUrl;
                applyIcon(iconSprite);
                contentContainer.addChild(iconSprite);
            });
        }
        iconOffset = titlebarValue.icon.width + 4;
    }

    let closeButtonReserve = 0;
    if (!titlebarValue.showCloseButton) {
        removeChildByLabel(contentContainer, STOCK_CLOSE_BUTTON);
    } else {
        const closeButton = getCloseButton(contentContainer, typedWindowStore);
        const size = Math.max(10, Math.min(18, localRect.height - (padding * 2) - 6));
        const symbolColor = rgbToColor(labelStyle.color);
        const inset = Math.max(2, size * 0.3);
        const half = size / 2;
        closeButtonReserve = size + 8;

        closeButton.clear();
        closeButton.roundRect(-half, -half, size, size, 3)
            .fill({color: 0x000000, alpha: 0.25});
        closeButton.moveTo(-half + inset, -half + inset)
            .lineTo(half - inset, half - inset)
            .stroke({color: symbolColor, width: 2});
        closeButton.moveTo(half - inset, -half + inset)
            .lineTo(-half + inset, half - inset)
            .stroke({color: symbolColor, width: 2});
        closeButton.x = Math.max(half + padding, localRect.width - padding - half);
        closeButton.y = localRect.height / 2;
    }

    titleText.x = padding + iconOffset;
    titleText.y = Math.max(0, ((localRect.height - labelStyle.size) / 2) - (labelStyle.size * 0.15));
    titleText.style.wordWrapWidth = Math.max(
        0,
        localRect.width - (padding * 2) - iconOffset - closeButtonReserve,
    );
};
