import {ImageSpriteProps, Point} from "./types.js";
import {Assets, Rectangle, Sprite, Texture} from "pixi.js";
import {DIMENSION_TYPE, LOAD_STATUS} from "./constants.js";
import {BehaviorSubject} from "rxjs";

/**
 * Result emitted by the image sprite loading observable
 */
export interface ImageSpriteResult {
  sprite: Sprite;
  loadStatus: typeof LOAD_STATUS[keyof typeof LOAD_STATUS];
  nativeSize?: Point;
  computedSize: Point;
}

/**
 * Creates and loads an image sprite with the defined parameters.
 * Uses PIXI's Assets system for caching and proper resource management.
 * Returns a BehaviorSubject that emits loading progress and completes on success,
 * or errors on load failure.
 *
 * @param misProps - Image sprite properties including url, position, dimension type, and optional mask
 * @returns BehaviorSubject that emits ImageSpriteResult and completes on load
 */
export function makeImageSprite(misProps: ImageSpriteProps): BehaviorSubject<ImageSpriteResult> {
  const {
    url,
    x = 0,
    y = 0,
    dimension,
    dimensionType = DIMENSION_TYPE.SCALE,
    mask,
    id,
  } = misProps;

  // Create sprite with empty texture initially
  const sprite = new Sprite(Texture.EMPTY);

  // Set position
  sprite.position.set(x, y);

  // Set label for debugging
  if (id) {
    sprite.label = `ImageSprite-${id}`;
  } else {
    sprite.label = `ImageSprite-${url}`;
  }

  // Create BehaviorSubject with initial state
  const subject = new BehaviorSubject<ImageSpriteResult>({
    sprite,
    loadStatus: LOAD_STATUS.START,
    computedSize: { x: 0, y: 0 },
  });

  // Start loading asynchronously
  (async () => {
    try {
      // Load texture using PIXI's Assets system (handles caching automatically)
      const texture = await Assets.load<Texture>(url);

      // Update sprite texture
      sprite.texture = texture;

      // Get native size from texture
      const nativeSize: Point = {
        x: texture.width,
        y: texture.height,
      };

      let computedSize: Point;

      if (dimension) {
        switch (dimensionType) {
          case DIMENSION_TYPE.SIZE:
            sprite.width = dimension.x;
            sprite.height = dimension.y;
            computedSize = { x: dimension.x, y: dimension.y };
            break;

          case DIMENSION_TYPE.SCALE:
            // Use scale
            sprite.scale.set(dimension.x, dimension.y);
            computedSize = {
              x: nativeSize.x * dimension.x,
              y: nativeSize.y * dimension.y,
            };
            break;
          default:
            computedSize = {...nativeSize};
        }
      } else {
        computedSize = {...nativeSize};
      }


      // Apply mask if provided
      if (mask) {
        sprite.hitArea = new Rectangle(mask.x, mask.y, mask.width, mask.height);
      }

      // Emit success state
      subject.next({
        sprite,
        loadStatus: LOAD_STATUS.LOADED,
        nativeSize,
        computedSize,
      });

      // Complete the subject on successful load
      subject.complete();
    } catch (error) {
      console.error(`Failed to load image from ${url}:`, error);

      // Error the subject on load failure
      subject.error({
        sprite,
        loadStatus: LOAD_STATUS.ERROR,
        error,
      });
    }
  })();

  return subject;
}