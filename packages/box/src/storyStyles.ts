import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import type { BoxStyleManagerLike } from './types.js';
import storyStylesJSON from './storyStyles.json' with { type: 'json' };

export function createSVGStoryStyles(): BoxStyleManagerLike {
    return fromJSON(storyStylesJSON) as BoxStyleManagerLike;
}
