import { Forest, type StoreParams } from '@wonderlandlabs/forestry4';
import { z } from 'zod';
import type { Application, Ticker } from 'pixi.js';
import { distinctUntilChanged, map, skip, type Subscription } from 'rxjs';
import { AxisConstraintSchema, PxValueSchema, type PxValue } from './types';
import { applyAxisConstraints, resolveConstraintValuePx, resolveMeasurement } from './sizeUtils';
import { pathToString } from './pathUtils';
import { BoxUxPixi } from './BoxUx';
import type { BoxTreeUxStyleManagerLike } from './types.ux';
import {
  AlignInputSchema,
  AreaPivotInputSchema,
  BoxContentSchema,
  BoxAlignSchema,
  BoxAreaSchema,
  BoxTreeNodeConfigSchema,
  BoxTreeNodeStateSchema,
  BoxTreeStateSchema,
  type AlignInput,
  type AlignKeyword,
  type AreaPivotInput,
  type AreaPivotKeyword,
  type Axis,
  type AxisConstrain,
  type BoxContent,
  type BoxTreeConfig,
  type BoxTreeState,
  type Direction,
  type ResolvedArea,
  type ResolvedRect,
  type StyleName,
} from './types.boxtree';

export * from './types.boxtree';

type StyleQueryLike = {
  nouns: string[];
  states: string[];
};

type StyleManagerLike = {
  match: (query: StyleQueryLike) => unknown;
  matchHierarchy?: (query: StyleQueryLike) => unknown;
};

export type BoxUx = {
  readonly env: string;
  isInitialized: boolean;
  isAttached?: boolean;
  init: () => void;
  attach?: () => void;
  detach?: () => void;
  destroy?: () => void;
  render: () => void;
  clear: () => void;
  getContainer: (key: unknown) => unknown;
};

export type BoxUxMapFn = (box: BoxTree) => BoxUx | undefined;
export type BoxTreeRuntimeConfig = BoxTreeConfig & {
  ux?: BoxUxMapFn;
  uxMapFn?: BoxUxMapFn;
  renderer?: BoxRenderMapFn;
  renderMapFn?: BoxRenderMapFn;
  applyToChildren?: boolean;
};

export type BoxRenderMapFn = BoxUxMapFn;
export type BoxRenderer = BoxUx;
const DEFAULT_BOX_UX_MAP_FN: BoxUxMapFn = (box) => new BoxUxPixi(box);

function zodMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join('; ');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'invalid value';
}

function normalizeConstraintValue(
  value: unknown,
  axis: Axis,
  identity: string,
  kind: 'min' | 'max',
): PxValue | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return PxValueSchema.parse(value);
  } catch (error) {
    throw new Error(`${identity}.${axis}.${kind}: ${zodMessage(error)}`);
  }
}

function normalizeVerbList(
  value: readonly string[] | undefined,
  identity: string,
  field: 'modeVerb' | 'globalVerb',
): string[] {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') {
      throw new Error(`${identity}.${field}: verbs must be strings`);
    }
    const next = raw.trim();
    if (!next.length) {
      throw new Error(`${identity}.${field}: verbs must be non-empty strings`);
    }
    if (seen.has(next)) {
      continue;
    }
    seen.add(next);
    out.push(next);
  }
  return out;
}

function normalizeAxisConstrain(
  input: { min?: unknown; max?: unknown } | undefined,
  axis: Axis,
  identity: string,
): AxisConstrain | undefined {
  const min = normalizeConstraintValue(input?.min, axis, identity, 'min');
  const max = normalizeConstraintValue(input?.max, axis, identity, 'max');
  if (!min && !max) {
    return undefined;
  }
  return AxisConstraintSchema.parse({ min, max });
}

function normalizeAlignValue(value: AlignInput | undefined, axis: Axis, identity: string): AlignKeyword {
  let next: AlignInput;
  try {
    next = AlignInputSchema.parse(value ?? 's');
  } catch {
    throw new Error(`${identity}.${axis}: unsupported align "${String(value)}"`);
  }

  switch (next) {
    case '<':
      return 's';
    case '|':
      return 'c';
    case '>':
      return 'e';
    case '<>':
      return 'f';
    default:
      return next;
  }
}

function normalizePivotValue(value: AreaPivotInput | undefined, axis: Axis, identity: string): AreaPivotKeyword {
  let next: AreaPivotInput;
  try {
    next = AreaPivotInputSchema.parse(value ?? 's');
  } catch {
    throw new Error(`${identity}.area.p${axis}: unsupported pivot "${String(value)}"`);
  }

  switch (next) {
    case '<':
      return 's';
    case '|':
      return 'c';
    case '>':
      return 'e';
    default:
      return next;
  }
}

function mappifyChildren(
  children: BoxTreeConfig['children'],
  identity: string,
): Map<string, BoxTreeConfig> | undefined {
  if (!children) {
    return undefined;
  }
  if (children instanceof Map) {
    return new Map(children);
  }
  if (typeof children === 'object' && !Array.isArray(children)) {
    return new Map(Object.entries(children as Record<string, BoxTreeConfig>));
  }
  throw new Error(`${identity}.children: expected Map or Record`);
}

export function createBoxTreeState(config: BoxTreeConfig = {}, inferredId?: string): BoxTreeState {
  const parsedConfig = BoxTreeNodeConfigSchema.parse(config);
  const identity = parsedConfig.id ?? inferredId ?? 'root';
  const styleName = parsedConfig.styleName ?? inferredId ?? parsedConfig.id ?? 'root';
  const isRoot = inferredId === undefined;
  const modeVerb = normalizeVerbList(parsedConfig.modeVerb, identity, 'modeVerb');
  const globalVerb = normalizeVerbList(parsedConfig.globalVerb, identity, 'globalVerb');

  if (isRoot) {
    const hasExplicitX = parsedConfig.area?.x !== undefined;
    const hasExplicitY = parsedConfig.area?.y !== undefined;
    if (!hasExplicitX || !hasExplicitY) {
      throw new Error(`${identity}.area: root requires explicit x and y`);
    }
  }

  const nextArea = BoxAreaSchema.parse({
    ...(parsedConfig.area ?? {}),
    px: normalizePivotValue(parsedConfig.area?.px, 'x', identity),
    py: normalizePivotValue(parsedConfig.area?.py, 'y', identity),
  });

  const nextAlign = BoxAlignSchema.parse({
    x: normalizeAlignValue(parsedConfig.align?.x, 'x', identity),
    y: normalizeAlignValue(parsedConfig.align?.y, 'y', identity),
    direction: parsedConfig.align?.direction,
  });

  const nextConstrainX = normalizeAxisConstrain(parsedConfig.constrain?.x, 'x', identity);
  const nextConstrainY = normalizeAxisConstrain(parsedConfig.constrain?.y, 'y', identity);
  const nextConstrain = nextConstrainX || nextConstrainY ? { x: nextConstrainX, y: nextConstrainY } : undefined;

  const preparedChildren = mappifyChildren(config.children, identity);
  const children = preparedChildren && preparedChildren.size
    ? new Map([...preparedChildren.entries()].map(([key, childConfig]) => [key, createBoxTreeState(childConfig, key)]))
    : undefined;

  const nodeState = BoxTreeNodeStateSchema.parse({
    area: nextArea,
    align: nextAlign,
    content: parsedConfig.content,
    styleName,
    modeVerb,
    globalVerb,
    order: parsedConfig.order,
    isVisible: parsedConfig.isVisible,
    absolute: parsedConfig.absolute,
    constrain: nextConstrain,
    style: parsedConfig.style,
    id: parsedConfig.id ?? inferredId,
  });

  return BoxTreeStateSchema.parse({
    ...nodeState,
    children,
  });
}

function withWildcardBranchParams(params: StoreParams<BoxTreeState>): StoreParams<BoxTreeState> {
  const nextBranchParams = new Map(params.branchParams ?? []);

  if (!nextBranchParams.has('*')) {
    nextBranchParams.set('*', { subclass: BoxTree });
  }

  return {
    ...params,
    branchParams: nextBranchParams,
  };
}

export class BoxTree extends Forest<BoxTreeState> {
  #uxMapFn?: BoxUxMapFn;
  #uxApplyToChildren = true;
  #ux?: BoxUx;
  #uxResolved = false;
  #styles?: BoxTreeUxStyleManagerLike;
  #app?: Application;
  #renderQueued = false;
  #queuedRenderTicker?: Ticker;
  #renderWatchSubscription?: Subscription;

  constructor(configOrParams: BoxTreeRuntimeConfig | StoreParams<BoxTreeState>) {
    const isParams = BoxTree.isStoreParams(configOrParams);
    const runtimeConfig = isParams ? undefined : configOrParams;
    const ux = runtimeConfig?.ux ?? runtimeConfig?.uxMapFn ?? runtimeConfig?.renderer ?? runtimeConfig?.renderMapFn;
    const applyToChildren = runtimeConfig?.applyToChildren ?? true;
    const config = runtimeConfig ? { ...runtimeConfig } : undefined;
    if (config && 'ux' in config) {
      delete (config as Partial<BoxTreeRuntimeConfig>).ux;
    }
    if (config && 'uxMapFn' in config) {
      delete (config as Partial<BoxTreeRuntimeConfig>).uxMapFn;
    }
    if (config && 'renderer' in config) {
      delete (config as Partial<BoxTreeRuntimeConfig>).renderer;
    }
    if (config && 'renderMapFn' in config) {
      delete (config as Partial<BoxTreeRuntimeConfig>).renderMapFn;
    }
    if (config && 'applyToChildren' in config) {
      delete (config as Partial<BoxTreeRuntimeConfig>).applyToChildren;
    }

    const baseParams: StoreParams<BoxTreeState> = BoxTree.isStoreParams(configOrParams)
      ? {
        ...configOrParams,
        // StoreParams represents state-level input; children must already be a Map.
        value: BoxTreeStateSchema.parse(configOrParams.value),
      }
      : { value: createBoxTreeState(config as BoxTreeConfig) };

    super(withWildcardBranchParams(baseParams));

    if (!isParams) {
      if (ux) {
        this.assignUx(ux, applyToChildren);
      } else {
        this.#setUxMapFn(DEFAULT_BOX_UX_MAP_FN, applyToChildren);
      }
    }

    this.#startRenderWatcher();
  }

  static isStoreParams(value: unknown): value is StoreParams<BoxTreeState> {
    if (!value || typeof value !== 'object') return false;
    if (!Object.prototype.hasOwnProperty.call(value, 'value')) return false;
    const obj = value as Record<string, unknown>;
    return 'path' in obj || 'parent' in obj || 'schema' in obj || 'branchParams' in obj;
  }

  #childKey(): string | undefined {
    const path = this.$path;
    if (!path || path.length !== 2) {
      return undefined;
    }
    if (path[0] !== 'children') {
      return undefined;
    }
    const key = path[1];
    return typeof key === 'string' ? key : undefined;
  }

  get id(): string | undefined {
    return this.value.id;
  }

  get name(): string {
    return this.#childKey() ?? this.value.id ?? 'root';
  }

  get identityPath(): string {
    if (this.$parent && this.$parent instanceof BoxTree) {
      return `${this.$parent.identityPath}/${this.name}`;
    }
    return this.name;
  }

  get parentTree(): BoxTree | undefined {
    return this.$parent instanceof BoxTree ? this.$parent : undefined;
  }

  #parentAxisPixels(axis: Axis): number | undefined {
    const parent = this.parentTree;
    if (!parent) {
      return undefined;
    }
    return axis === 'x' ? parent.width : parent.height;
  }

  #axisConstrain(axis: Axis): AxisConstrain | undefined {
    return axis === 'x' ? this.value.constrain?.x : this.value.constrain?.y;
  }

  #axisAlign(axis: Axis): AlignKeyword {
    return axis === 'x' ? this.value.align.x : this.value.align.y;
  }

  #axisPivot(axis: Axis): AreaPivotKeyword {
    return axis === 'x' ? this.value.area.px : this.value.area.py;
  }

  get order(): number {
    return this.value.order;
  }

  get isVisible(): boolean {
    return this.value.isVisible;
  }

  get absolute(): boolean {
    return this.value.absolute;
  }

  get content(): BoxContent | undefined {
    return this.value.content;
  }

  get style(): BoxTreeState['style'] {
    return this.value.style;
  }

  get styles(): BoxTreeUxStyleManagerLike | undefined {
    return this.#styles ?? this.parentTree?.styles;
  }

  set styles(styles: BoxTreeUxStyleManagerLike | undefined) {
    this.#styles = styles;
  }

  get app(): Application | undefined {
    return this.#app ?? this.parentTree?.app;
  }

  set app(app: Application | undefined) {
    this.#app = app;
  }

  get uxMapFn(): BoxUxMapFn | undefined {
    return this.#uxMapFn;
  }

  get uxAppliesToChildren(): boolean {
    return this.#uxApplyToChildren;
  }

  get ux(): BoxUx | undefined {
    return this.#ux;
  }

  get renderMapFn(): BoxRenderMapFn | undefined {
    return this.uxMapFn;
  }

  get rendererAppliesToChildren(): boolean {
    return this.uxAppliesToChildren;
  }

  get renderer(): BoxRenderer | undefined {
    return this.ux;
  }

  get isRenderQueued(): boolean {
    return this.#rootTree().#renderQueued;
  }

  get styleName(): StyleName {
    return this.value.styleName;
  }

  get styleNouns(): readonly string[] {
    const parentNouns = this.parentTree?.styleNouns ?? [];
    return [...parentNouns, this.styleName];
  }

  #rootTree(): BoxTree {
    let cursor: BoxTree = this;
    while (cursor.parentTree) {
      cursor = cursor.parentTree;
    }
    return cursor;
  }

  #startRenderWatcher(): void {
    if (this.parentTree) {
      return;
    }
    if (this.#renderWatchSubscription) {
      return;
    }
    const self = this;

    self.#renderWatchSubscription = self.$subject.pipe(
      skip(1),
      map(() => ({
        valueRef: self.value,
        nounsKey: self.styleNouns.join('.'),
        verbsKey: self.resolvedVerb.join('|'),
        contentType: self.content?.type,
        contentValue: self.content?.value,
      })),
      distinctUntilChanged((prev, next) =>
        prev.valueRef === next.valueRef
        && prev.nounsKey === next.nounsKey
        && prev.verbsKey === next.verbsKey
        && prev.contentType === next.contentType
        && prev.contentValue === next.contentValue,
      ),
    ).subscribe(() => {
      self.queueRender();
    });
  }

  #scheduleQueuedRender(): void {
    const ticker = this.app?.ticker;
    if (!ticker) {
      return;
    }
    if (this.#queuedRenderTicker === ticker) {
      return;
    }
    this.#queuedRenderTicker?.remove(this.$.flushQueuedRenderOnTick, this);
    ticker.addOnce(this.$.flushQueuedRenderOnTick, this);
    this.#queuedRenderTicker = ticker;
  }

  private flushQueuedRenderOnTick(): void {
    this.#queuedRenderTicker = undefined;
    if (!this.#renderQueued) {
      return;
    }
    this.#renderQueued = false;
    this.render();
  }

  get modeVerb(): readonly string[] {
    return this.value.modeVerb;
  }

  get globalVerb(): readonly string[] {
    return this.#rootTree().value.globalVerb;
  }

  get resolvedVerb(): readonly string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const verb of [...this.globalVerb, ...this.modeVerb]) {
      if (!seen.has(verb)) {
        seen.add(verb);
        out.push(verb);
      }
    }
    return out;
  }

  get direction(): Direction {
    return this.value.align.direction;
  }

  #isFlowAxis(axis: Axis, parent: BoxTree): boolean {
    return (parent.direction === 'row' && axis === 'x')
      || (parent.direction === 'column' && axis === 'y');
  }

  #flowOffset(axis: Axis): number {
    const parent = this.parentTree;
    if (!parent || this.absolute || !this.#isFlowAxis(axis, parent)) {
      return 0;
    }

    let offset = 0;
    for (const sibling of parent.children) {
      if (sibling === this) {
        break;
      }
      offset += axis === 'x' ? sibling.width : sibling.height;
    }

    return offset;
  }

  #resolveAxis(axis: Axis, parentPixels?: number): number {
    const inheritedParent = parentPixels ?? this.#parentAxisPixels(axis);
    const align = this.#axisAlign(axis);
    const sizeDef = axis === 'x' ? this.value.area.width : this.value.area.height;
    const shouldFillParent = !this.absolute && align === 'f' && inheritedParent !== undefined;
    const base = shouldFillParent
      ? inheritedParent
      : resolveMeasurement(sizeDef, { axis, parentPixels: inheritedParent });

    const constrain = this.#axisConstrain(axis);
    const min = resolveConstraintValuePx(constrain?.min);
    const max = resolveConstraintValuePx(constrain?.max);

    return applyAxisConstraints(base, { min, max });
  }

  #anchorAxis(axis: Axis): number {
    const axisAnchor = axis === 'x' ? this.value.area.x : this.value.area.y;
    const parent = this.parentTree;
    if (!parent || this.absolute) {
      return axisAnchor;
    }

    const align = this.#axisAlign(axis);
    const parentAxis = axis === 'x' ? parent.width : parent.height;
    const ownAxis = axis === 'x' ? this.width : this.height;
    let alignedAnchor = axisAnchor;
    switch (align) {
      case 'c':
        alignedAnchor = (parentAxis - ownAxis) / 2 + axisAnchor;
        break;
      case 'e':
        alignedAnchor = (parentAxis - ownAxis) - axisAnchor;
        break;
      case 's':
      case 'f':
      default:
        alignedAnchor = axisAnchor;
        break;
    }

    if (this.#isFlowAxis(axis, parent)) {
      return alignedAnchor + this.#flowOffset(axis);
    }

    return alignedAnchor;
  }

  #pivotOffset(axis: Axis): number {
    const size = axis === 'x' ? this.width : this.height;
    const pivot = this.#axisPivot(axis);
    switch (pivot) {
      case 'c':
        return size / 2;
      case 'e':
        return size;
      case 's':
      default:
        return 0;
    }
  }

  get anchorX(): number {
    return this.#anchorAxis('x');
  }

  get anchorY(): number {
    return this.#anchorAxis('y');
  }

  get x(): number {
    return this.anchorX - this.#pivotOffset('x');
  }

  get y(): number {
    return this.anchorY - this.#pivotOffset('y');
  }

  get absAnchorX(): number {
    if (!this.parentTree) {
      return this.anchorX;
    }
    return this.parentTree.absX + this.anchorX;
  }

  get absAnchorY(): number {
    if (!this.parentTree) {
      return this.anchorY;
    }
    return this.parentTree.absY + this.anchorY;
  }

  get absX(): number {
    const parent = this.parentTree;
    if (!parent) {
      return this.x;
    }
    return parent.absX + this.x;
  }

  get absY(): number {
    const parent = this.parentTree;
    if (!parent) {
      return this.y;
    }
    return parent.absY + this.y;
  }

  get width(): number {
    return this.#resolveAxis('x');
  }

  get height(): number {
    return this.#resolveAxis('y');
  }

  get area(): ResolvedArea {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  get rect(): ResolvedRect {
    return this.area;
  }

  get childrenMap(): ReadonlyMap<string, BoxTree> {
    const branches: Array<[string, BoxTree]> = [];
    const children = this.value.children;
    if (!children) {
      return new Map<string, BoxTree>();
    }

    for (const key of children.keys()) {
      const branch = this.$br.$get<BoxTreeState, BoxTree>(['children', key]);
      if (branch) {
        branches.push([key, branch]);
      }
    }

    branches.sort((a, b) => {
      const orderDelta = a[1].order - b[1].order;
      if (orderDelta !== 0) {
        return orderDelta;
      }
      return a[0].localeCompare(b[0]);
    });

    return new Map(branches);
  }

  get children(): readonly BoxTree[] {
    return [...this.childrenMap.values()];
  }

  getChildBoxes(): ReadonlyMap<string, BoxTree> {
    return this.childrenMap;
  }

  getChild(key: string): BoxTree | undefined {
    if (!this.value.children?.has(key)) {
      return undefined;
    }
    return this.$br.$get<BoxTreeState, BoxTree>(['children', key]);
  }

  addChild(key: string, config: BoxTreeRuntimeConfig = {}): BoxTree {
    if (this.value.children?.has(key)) {
      throw new Error(`${this.identityPath}: child ${key} already exists`);
    }

    const nextConfig = { ...config };
    if ('ux' in nextConfig) {
      delete (nextConfig as Partial<BoxTreeRuntimeConfig>).ux;
    }
    if ('uxMapFn' in nextConfig) {
      delete (nextConfig as Partial<BoxTreeRuntimeConfig>).uxMapFn;
    }
    if ('renderer' in nextConfig) {
      delete (nextConfig as Partial<BoxTreeRuntimeConfig>).renderer;
    }
    if ('renderMapFn' in nextConfig) {
      delete (nextConfig as Partial<BoxTreeRuntimeConfig>).renderMapFn;
    }
    if ('applyToChildren' in nextConfig) {
      delete (nextConfig as Partial<BoxTreeRuntimeConfig>).applyToChildren;
    }

    const childState = createBoxTreeState(nextConfig, key);

    this.mutate((draft) => {
      const nextChildren = new Map(draft.children ?? []);
      nextChildren.set(key, childState);
      draft.children = nextChildren;
    });

    const branch = this.$br.$get<BoxTreeState, BoxTree>(['children', key]);
    if (!branch) {
      throw new Error(`${this.identityPath}: could not create branch for child ${key}`);
    }

    if (this.#uxMapFn && this.#uxApplyToChildren) {
      if (this.#uxResolved) {
        branch.assignUx(this.#uxMapFn, true);
      } else {
        branch.#setUxMapFn(this.#uxMapFn, true);
      }
    }

    return branch;
  }

  removeChild(key: string): void {
    const branch = this.getChild(key);
    branch?.clearUx();

    if (!this.value.children?.has(key)) {
      return;
    }

    this.$br.delete(pathToString(['children', key]));

    this.mutate((draft) => {
      if (!draft.children?.has(key)) {
        return;
      }
      const nextChildren = new Map(draft.children);
      nextChildren.delete(key);
      draft.children = nextChildren.size ? nextChildren : undefined;
    });
  }

  #setUxMapFn(uxMapFn: BoxUxMapFn, applyToChildren: boolean): void {
    this.#uxMapFn = uxMapFn;
    this.#uxApplyToChildren = applyToChildren;
    this.#uxResolved = false;
    this.#ux = undefined;

    if (applyToChildren) {
      for (const child of this.children) {
        child.#setUxMapFn(uxMapFn, true);
      }
    }
  }

  assignUx(uxMapFn: BoxUxMapFn, applyToChildren = true): void {
    this.#uxMapFn = uxMapFn;
    this.#uxApplyToChildren = applyToChildren;

    this.#ux?.destroy?.();
    if (this.#ux && !this.#ux.destroy) {
      this.#ux.clear();
    }
    this.#ux = uxMapFn(this);
    this.#uxResolved = true;

    if (applyToChildren) {
      for (const child of this.children) {
        child.assignUx(uxMapFn, true);
      }
    }
  }

  clearUx(applyToChildren = true): void {
    this.#ux?.destroy?.();
    if (this.#ux && !this.#ux.destroy) {
      this.#ux.clear();
    }
    this.#ux = undefined;
    this.#uxMapFn = undefined;
    this.#uxResolved = false;
    this.#uxApplyToChildren = true;

    if (applyToChildren) {
      for (const child of this.children) {
        child.clearUx(true);
      }
    }
  }

  render(): void {
    if (!this.parentTree) {
      this.#renderQueued = false;
      this.#queuedRenderTicker?.remove(this.$.flushQueuedRenderOnTick, this);
      this.#queuedRenderTicker = undefined;
    }

    if (!this.#uxResolved && this.#uxMapFn) {
      this.#ux = this.#uxMapFn(this);
      this.#uxResolved = true;
    }
    if (!this.#ux) {
      return;
    }
    if (!this.#ux.isInitialized) {
      this.#ux.init();
    }
    this.#ux.render();
  }

  queueRender(): void {
    const root = this.#rootTree();
    root.#renderQueued = true;
    root.#scheduleQueuedRender();
  }

  flushRenderQueue(): void {
    const root = this.#rootTree();
    if (!root.#renderQueued) {
      return;
    }
    root.#renderQueued = false;
    root.render();
  }

  assignRenderer(renderMapFn: BoxRenderMapFn, applyToChildren = true): void {
    this.assignUx(renderMapFn, applyToChildren);
  }

  clearRenderer(applyToChildren = true): void {
    this.clearUx(applyToChildren);
  }

  setPosition(x: number, y: number): void {
    this.mutate((draft) => {
      draft.area.x = x;
      draft.area.y = y;
    });
  }

  setOrder(order: number): void {
    if (!Number.isFinite(order)) {
      throw new Error(`${this.identityPath}.order: order must be finite`);
    }

    this.mutate((draft) => {
      draft.order = order;
    });
  }

  setAbsolute(absolute: boolean): void {
    this.mutate((draft) => {
      draft.absolute = absolute;
    });
  }

  setVisible(isVisible: boolean): void {
    this.mutate((draft) => {
      draft.isVisible = isVisible;
    });
  }

  setDirection(direction: Direction): void {
    this.mutate((draft) => {
      draft.align.direction = direction;
    });
  }

  setContent(content: BoxContent): void {
    const nextContent = BoxContentSchema.parse(content);
    this.mutate((draft) => {
      draft.content = nextContent;
    });
  }

  setStyleName(styleName: string): void {
    const next = styleName.trim();
    if (!next.length) {
      throw new Error(`${this.identityPath}.styleName: styleName must be non-empty`);
    }
    this.mutate((draft) => {
      draft.styleName = next;
    });
  }

  setModeVerb(modeVerb: readonly string[]): void {
    const next = normalizeVerbList(modeVerb, this.identityPath, 'modeVerb');
    this.mutate((draft) => {
      draft.modeVerb = next;
    });
  }

  addModeVerb(verb: string): void {
    this.setModeVerb([...this.modeVerb, verb]);
  }

  removeModeVerb(verb: string): void {
    this.setModeVerb(this.modeVerb.filter((item) => item !== verb));
  }

  toggleModeVerb(verb: string, force?: boolean): void {
    const trimmed = verb.trim();
    if (!trimmed.length) {
      throw new Error(`${this.identityPath}.modeVerb: verbs must be non-empty strings`);
    }
    const has = this.modeVerb.includes(trimmed);
    const enabled = force ?? !has;
    if (enabled && !has) {
      this.setModeVerb([...this.modeVerb, trimmed]);
      return;
    }
    if (!enabled && has) {
      this.setModeVerb(this.modeVerb.filter((item) => item !== trimmed));
    }
  }

  setGlobalVerb(globalVerb: readonly string[]): void {
    const root = this.#rootTree();
    const next = normalizeVerbList(globalVerb, root.identityPath, 'globalVerb');
    root.mutate((draft) => {
      draft.globalVerb = next;
    });
  }

  addGlobalVerb(verb: string): void {
    this.setGlobalVerb([...this.globalVerb, verb]);
  }

  removeGlobalVerb(verb: string): void {
    this.setGlobalVerb(this.globalVerb.filter((item) => item !== verb));
  }

  toggleGlobalVerb(verb: string, force?: boolean): void {
    const trimmed = verb.trim();
    if (!trimmed.length) {
      throw new Error(`${this.identityPath}.globalVerb: verbs must be non-empty strings`);
    }
    const has = this.globalVerb.includes(trimmed);
    const enabled = force ?? !has;
    if (enabled && !has) {
      this.setGlobalVerb([...this.globalVerb, trimmed]);
      return;
    }
    if (!enabled && has) {
      this.setGlobalVerb(this.globalVerb.filter((item) => item !== trimmed));
    }
  }

  resolveStyle<T = unknown>(styleManager: StyleManagerLike, states: string[] = []): T | undefined {
    if (!styleManager || typeof styleManager.match !== 'function') {
      throw new Error(`${this.identityPath}.style: styleManager.match is required`);
    }

    const resolvedStates = normalizeVerbList(
      [...this.globalVerb, ...this.modeVerb, ...states],
      this.identityPath,
      'modeVerb',
    );

    const query: StyleQueryLike = {
      nouns: [...this.styleNouns],
      states: resolvedStates,
    };

    if (typeof styleManager.matchHierarchy === 'function') {
      return styleManager.matchHierarchy(query) as T | undefined;
    }

    const hierarchical = styleManager.match(query);
    if (hierarchical !== undefined) {
      return hierarchical as T;
    }

    const atomicQuery: StyleQueryLike = {
      nouns: [this.styleName],
      states: resolvedStates,
    };
    return styleManager.match(atomicQuery) as T | undefined;
  }

  clearContent(): void {
    this.mutate((draft) => {
      draft.content = undefined;
    });
  }

  setWidthPx(width: number): void {
    if (!Number.isFinite(width) || width < 0) {
      throw new Error(`${this.identityPath}.x: px must be finite and >= 0`);
    }

    this.mutate((draft) => {
      draft.area.width = { mode: 'px', value: width };
    });
  }

  setHeightPx(height: number): void {
    if (!Number.isFinite(height) || height < 0) {
      throw new Error(`${this.identityPath}.y: px must be finite and >= 0`);
    }

    this.mutate((draft) => {
      draft.area.height = { mode: 'px', value: height };
    });
  }

  setWidthPercent(percent: number): void {
    if (!Number.isFinite(percent) || percent < 0 || percent > 1) {
      throw new Error(`${this.identityPath}.x: percent must be between 0 and 1`);
    }

    this.mutate((draft) => {
      draft.area.width = { mode: '%', value: percent };
    });
  }

  setHeightPercent(percent: number): void {
    if (!Number.isFinite(percent) || percent < 0 || percent > 1) {
      throw new Error(`${this.identityPath}.y: percent must be between 0 and 1`);
    }

    this.mutate((draft) => {
      draft.area.height = { mode: '%', value: percent };
    });
  }

  resolveWidth(parentWidth?: number): number {
    return this.#resolveAxis('x', parentWidth);
  }

  resolveHeight(parentHeight?: number): number {
    return this.#resolveAxis('y', parentHeight);
  }

  resolveArea(parentWidth?: number, parentHeight?: number): ResolvedArea {
    return {
      x: this.x,
      y: this.y,
      width: this.resolveWidth(parentWidth),
      height: this.resolveHeight(parentHeight),
    };
  }

  resolveRect(parentWidth?: number, parentHeight?: number): ResolvedRect {
    return this.resolveArea(parentWidth, parentHeight);
  }
}
