import {
    BoxStore,
    DIR_HORIZ,
    POS_CENTER,
    POS_START,
    SIZE_FRACTION,
    type BoxCellType,
    type RectStaticType,
} from '@wonderlandlabs-pixi-ux/box';

const TITLEBAR_ROOT_ID = 'titlebar-root';
const TITLEBAR_ICON_ID = 'titlebar-icon';
const TITLEBAR_TITLE_ID = 'titlebar-title';
const TITLEBAR_CLOSE_ID = 'titlebar-close';
const TITLEBAR_GAP = 4;
const CLOSE_BUTTON_TRAILING_SPACE = 8;

type TitlebarLayoutInput = {
    width: number;
    height: number;
    padding: number;
    icon?: {
        width: number;
        height: number;
    };
    closeButtonSize?: number;
};

export type TitlebarLayout = {
    contentRect: RectStaticType;
    titleRect: RectStaticType;
    iconRect?: RectStaticType;
    closeRect?: RectStaticType;
};

function getRect(store: BoxStore, id: string): RectStaticType | undefined {
    return store.getLocation([TITLEBAR_ROOT_ID, id]);
}

export function computeTitlebarLayout(input: TitlebarLayoutInput): TitlebarLayout {
    const width = Math.max(0, input.width);
    const height = Math.max(0, input.height);
    const padding = Math.max(0, input.padding);
    const contentWidth = Math.max(0, width - (padding * 2));
    const contentHeight = Math.max(0, height - (padding * 2));

    const children: BoxCellType[] = [];
    if (input.icon) {
        children.push({
            id: TITLEBAR_ICON_ID,
            name: 'icon',
            absolute: false,
            dim: {
                w: Math.max(0, input.icon.width),
                h: Math.max(0, input.icon.height),
            },
            align: {
                direction: DIR_HORIZ,
                xPosition: POS_START,
                yPosition: POS_CENTER,
            },
        });
    }

    children.push({
        id: TITLEBAR_TITLE_ID,
        name: 'title',
        absolute: false,
        dim: {
            w: {value: 1, unit: SIZE_FRACTION},
            h: Math.max(0, contentHeight),
        },
        align: {
            direction: DIR_HORIZ,
            xPosition: POS_START,
            yPosition: POS_CENTER,
        },
    });

    if (input.closeButtonSize) {
        children.push({
            id: TITLEBAR_CLOSE_ID,
            name: 'close',
            absolute: false,
            dim: {
                w: Math.max(0, input.closeButtonSize + CLOSE_BUTTON_TRAILING_SPACE),
                h: Math.max(0, input.closeButtonSize),
            },
            align: {
                direction: DIR_HORIZ,
                xPosition: POS_START,
                yPosition: POS_CENTER,
            },
        });
    }

    const store = new BoxStore({
        value: {
            id: TITLEBAR_ROOT_ID,
            name: 'titlebar',
            absolute: true,
            dim: {
                x: padding,
                y: padding,
                w: contentWidth,
                h: contentHeight,
            },
            align: {
                direction: DIR_HORIZ,
                xPosition: POS_START,
                yPosition: POS_CENTER,
            },
            gap: children.length > 1 ? TITLEBAR_GAP : undefined,
            children,
        },
    });

    store.update();

    return {
        contentRect: store.location,
        titleRect: getRect(store, TITLEBAR_TITLE_ID) ?? {
            x: padding,
            y: padding,
            w: contentWidth,
            h: contentHeight,
        },
        iconRect: getRect(store, TITLEBAR_ICON_ID),
        closeRect: getRect(store, TITLEBAR_CLOSE_ID),
    };
}
