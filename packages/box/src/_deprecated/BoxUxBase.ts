import type { BoxRenderer, BoxTree } from './BoxTree.js';

export abstract class BoxUxBase implements BoxRenderer {
  abstract readonly env: string;
  readonly box: BoxTree;
  isInitialized = false;
  isAttached = false;

  constructor(box: BoxTree) {
    this.box = box;
  }

  init(): void {
    if (this.isInitialized) {
      return;
    }
    this.onInit();
    this.isInitialized = true;
  }

  protected onInit(): void {}

  attach(): void {
    this.#attachLifecycle();
  }

  #attachLifecycle(): void {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.isAttached) {
      return;
    }
    this.onAttach();
    this.isAttached = true;
  }

  protected onAttach(): void {}

  detach(): void {
    this.#detachLifecycle();
  }

  #detachLifecycle(): void {
    if (!this.isAttached) {
      return;
    }
    this.onDetach();
    this.isAttached = false;
  }

  protected onDetach(): void {}

  render(): void {
    if (this.box.value.isVisible) {
      this.#attachLifecycle();
      this.renderUp();
      return;
    }
    this.#detachLifecycle();
  }

  protected abstract renderUp(): void;

  destroy(): void {
    this.#detachLifecycle();
    if (!this.isInitialized) {
      return;
    }
    this.onDestroy();
    this.isInitialized = false;
  }

  clear(): void {
    this.destroy();
  }

  protected onDestroy(): void {}

  abstract getContainer(key: unknown): unknown;

  protected readChildRenderer<T extends BoxRenderer>(
    child: BoxTree,
    guard: (value: unknown) => value is T,
  ): T | undefined {
    if (guard(child.ux)) {
      return child.ux;
    }
    return guard(child.renderer) ? child.renderer : undefined;
  }

  protected getChildRendererByKey<T extends BoxRenderer>(
    key: string,
    guard: (value: unknown) => value is T,
  ): T | undefined {
    const child = this.box.getChild(key);
    return child ? this.readChildRenderer(child, guard) : undefined;
  }

  protected getChildRenderers<T extends BoxRenderer>(
    guard: (value: unknown) => value is T,
  ): ReadonlyMap<string, T> {
    const out = new Map<string, T>();
    for (const child of this.box.children) {
      const childRenderer = this.readChildRenderer(child, guard);
      if (childRenderer) {
        out.set(child.name, childRenderer);
      }
    }
    return out;
  }
}
