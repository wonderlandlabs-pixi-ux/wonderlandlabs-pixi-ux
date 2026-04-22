import {
  BoxStore,
  DIR_HORIZ,
  DIR_VERT,
  INSET_SCOPE_BOTTOM,
  INSET_SCOPE_LEFT,
  INSET_SCOPE_RIGHT,
  INSET_SCOPE_TOP,
  POS_START,
  type BoxCellType,
} from '@wonderlandlabs-pixi-ux/box';
import type { ToolbarPadding } from './types.js';

export type ToolbarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ToolbarButtonMeasure = {
  id: string;
  width: number;
  height: number;
};

type ComputeToolbarLayoutInput = {
  buttons: ToolbarButtonMeasure[];
  orientation: 'horizontal' | 'vertical';
  spacing: number;
  fillButtons: boolean;
  width?: number;
  height?: number;
  fixedSize: boolean;
  padding: Required<ToolbarPadding>;
};

type ToolbarLayout = {
  rect: ToolbarRect;
  buttonRects: Map<string, ToolbarRect>;
};

const ROOT_ID = 'toolbar-root';
const CONTENT_ID = 'toolbar-content';

export function computeToolbarLayout(input: ComputeToolbarLayoutInput): ToolbarLayout {
  const buttons = normalizeButtonMeasures(input.buttons, input.orientation, input.fillButtons);
  const naturalStore = new BoxStore({
    value: makeRootCell({
      ...input,
      buttons,
      width: input.fixedSize ? 0 : (input.width ?? 0),
      height: input.fixedSize ? 0 : (input.height ?? 0),
      fixedSize: false,
    }),
  });
  naturalStore.update();

  if (!input.fixedSize) {
    return readLayout(naturalStore, buttons);
  }

  const naturalLayout = readLayout(naturalStore, buttons);
  const fixedWidth = input.width ?? naturalLayout.rect.width;
  const fixedHeight = input.height ?? naturalLayout.rect.height;

  if (
    fixedWidth === naturalLayout.rect.width
    && fixedHeight === naturalLayout.rect.height
  ) {
    return naturalLayout;
  }

  const fixedStore = new BoxStore({
    value: makeRootCell({
      ...input,
      buttons,
      width: fixedWidth,
      height: fixedHeight,
      fixedSize: true,
    }),
  });
  fixedStore.update();
  return readLayout(fixedStore, buttons);
}

function normalizeButtonMeasures(
  buttons: ToolbarButtonMeasure[],
  orientation: 'horizontal' | 'vertical',
  fillButtons: boolean,
): ToolbarButtonMeasure[] {
  if (!fillButtons || buttons.length === 0) {
    return buttons.map((button) => ({ ...button }));
  }

  if (orientation === 'vertical') {
    const targetWidth = buttons.reduce((max, button) => Math.max(max, button.width), 0);
    return buttons.map((button) => ({
      ...button,
      width: Math.max(button.width, targetWidth),
    }));
  }

  const targetHeight = buttons.reduce((max, button) => Math.max(max, button.height), 0);
  return buttons.map((button) => ({
    ...button,
    height: Math.max(button.height, targetHeight),
  }));
}

function makeRootCell(
  input: ComputeToolbarLayoutInput & {
    buttons: ToolbarButtonMeasure[];
    width: number;
    height: number;
  },
): BoxCellType {
  return {
    id: ROOT_ID,
    name: 'toolbar',
    absolute: true,
    layoutStrategy: input.fixedSize ? undefined : 'bloat',
    dim: {
      x: 0,
      y: 0,
      w: input.width,
      h: input.height,
    },
    align: {
      direction: DIR_HORIZ,
      xPosition: POS_START,
      yPosition: POS_START,
    },
    insets: makePaddingInsets(input.padding),
    children: [
      {
        id: CONTENT_ID,
        name: 'content',
        absolute: false,
        layoutStrategy: 'bloat',
        dim: {
          w: 0,
          h: 0,
        },
        align: {
          direction: input.orientation === 'vertical' ? DIR_VERT : DIR_HORIZ,
          xPosition: POS_START,
          yPosition: POS_START,
        },
        gap: input.spacing,
        children: input.buttons.map((button) => ({
          id: buttonCellId(button.id),
          name: button.id,
          absolute: false,
          dim: {
            w: button.width,
            h: button.height,
          },
          align: {
            direction: DIR_HORIZ,
            xPosition: POS_START,
            yPosition: POS_START,
          },
        })),
      },
    ],
  };
}

function makePaddingInsets(
  padding: Required<ToolbarPadding>,
): Array<{
  role: string;
  inset: Array<{
    scope:
      | typeof INSET_SCOPE_TOP
      | typeof INSET_SCOPE_RIGHT
      | typeof INSET_SCOPE_BOTTOM
      | typeof INSET_SCOPE_LEFT;
    value: number;
  }>;
}> | undefined {
  const inset = [
    { scope: INSET_SCOPE_TOP, value: padding.top },
    { scope: INSET_SCOPE_RIGHT, value: padding.right },
    { scope: INSET_SCOPE_BOTTOM, value: padding.bottom },
    { scope: INSET_SCOPE_LEFT, value: padding.left },
  ].filter((entry): entry is {
    scope:
      | typeof INSET_SCOPE_TOP
      | typeof INSET_SCOPE_RIGHT
      | typeof INSET_SCOPE_BOTTOM
      | typeof INSET_SCOPE_LEFT;
    value: number;
  } => entry.value > 0);

  if (inset.length === 0) {
    return undefined;
  }

  return [{
    role: 'padding',
    inset,
  }];
}

function readLayout(store: BoxStore, buttons: ToolbarButtonMeasure[]): ToolbarLayout {
  const rootRect = store.getLocation([ROOT_ID])!;
  const buttonRects = new Map<string, ToolbarRect>();

  for (const button of buttons) {
    const location = store.getLocation([ROOT_ID, CONTENT_ID, buttonCellId(button.id)]);
    if (!location) {
      continue;
    }
    buttonRects.set(button.id, {
      x: location.x,
      y: location.y,
      width: location.w,
      height: location.h,
    });
  }

  return {
    rect: {
      x: rootRect.x,
      y: rootRect.y,
      width: rootRect.w,
      height: rootRect.h,
    },
    buttonRects,
  };
}

function buttonCellId(id: string): string {
  return `toolbar-button-${id}`;
}
