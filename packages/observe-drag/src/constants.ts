export const POINTER_EVT_DOWN = 'pointerdown';
export const POINTER_EVT_MOVE = 'pointermove';
export const POINTER_EVT_UP = 'pointerup';
export const POINTER_EVT_UP_OUTSIDE = 'pointerupoutside';
export const POINTER_EVT_CANCEL = 'pointercancel';

export const POINTER_EVENT_NAMES = [
    POINTER_EVT_DOWN,
    POINTER_EVT_MOVE,
    POINTER_EVT_UP,
    POINTER_EVT_UP_OUTSIDE,
    POINTER_EVT_CANCEL,
] as const;

export type PixiEventName = (typeof POINTER_EVENT_NAMES)[number];
