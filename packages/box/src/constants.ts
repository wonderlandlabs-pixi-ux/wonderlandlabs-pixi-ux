export const SIZE_PCT = '%';
export const SIZE_PX = 'px';
export const SIZE_FRACTION = 'fr';

export const POS_START = 'start';
export const POS_START_S = '<';
export const POS_END = 'end';
export const POS_END_S = '>';
export const POS_TOP = 'top';
export const POS_LEFT = 'left';
export const POS_RIGHT = 'right';
export const POS_BOTTOM = 'bottom';
export const POS_CENTER = 'center';
export const POS_CENTER_S = '|';

export const POS_FILL = 'fill';

export const DIR_HORIZ = 'horizontal';
export const DIR_HORIZ_S = 'h';
export const DIR_VERT = 'vertical';
export const DIR_VERT_S = 'v';

export const dirMap = new Map([
    [DIR_HORIZ, DIR_HORIZ_S],
    [DIR_HORIZ_S, DIR_HORIZ_S],
    [DIR_VERT, DIR_VERT_S],
    [DIR_VERT_S, DIR_VERT_S],
]);

export const posMap = new Map([
    [POS_START, POS_START_S],
    [POS_START_S, POS_START_S],
    [POS_TOP, POS_START_S],
    [POS_LEFT, POS_START_S],
    [POS_CENTER, POS_CENTER_S],
    [POS_CENTER_S, POS_CENTER_S],
    [POS_END, POS_END_S],
    [POS_END_S, POS_END_S],
    [POS_BOTTOM, POS_END_S],
    [POS_RIGHT, POS_END_S],
    [POS_FILL, POS_FILL]
]);

export const AXIS_X = 'x'
export const AXIS_Y = 'y'

export const POS_KEY_X = 'xPosition';
export const POS_KEY_Y = 'yPosition';

export const DIM_HORIZ_S = 'w';
export const DIM_VERT_S = 'h';

export const INSET_SCOPE_ALL = 'all';
export const INSET_SCOPE_HORIZ = 'h';
export const INSET_SCOPE_VERT = 'v';
export const INSET_SCOPE_TOP = 'top';
export const INSET_SCOPE_RIGHT = 'right';
export const INSET_SCOPE_BOTTOM = 'bottom';
export const INSET_SCOPE_LEFT = 'left';

export const INSET_PART_TOP = 'top';
export const INSET_PART_RIGHT = 'right';
export const INSET_PART_BOTTOM = 'bottom';
export const INSET_PART_LEFT = 'left';

export const ID_PATH_SEPARATOR = '\t';
