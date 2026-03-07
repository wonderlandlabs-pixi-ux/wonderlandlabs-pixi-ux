import {z} from 'zod';
import {DIMENSION_TYPE, LOAD_STATUS, TITLEBAR_MODE, WINDOW_STATUS, STYLE_VARIANT} from './constants';
import type {HandleMode} from '@wonderlandlabs-pixi-ux/resizer';
import type {Application, Container, Rectangle} from 'pixi.js';

// Color schema for RGB values (0..1)
export const RgbColorSchema = z.object({
    r: z.number().min(0).max(1).default(1),
    g: z.number().min(0).max(1).default(1),
    b: z.number().min(0).max(1).default(1),
});

export type RgbColor = z.infer<typeof RgbColorSchema>;

export const WindowLabelFontStyleSchema = z.object({
    size: z.number().min(0).default(10),
    family: z.string().default('Helvetica'),
    color: RgbColorSchema.default({r: 0, g: 0, b: 0}),
    alpha: z.number().min(0).max(1).default(1),
    visible: z.boolean().default(true),
});

export type WindowLabelFontStyle = z.infer<typeof WindowLabelFontStyleSchema>;

export const WindowLabelStyleSchema = z.object({
    font: WindowLabelFontStyleSchema.default({
        size: 10,
        family: 'Helvetica',
        color: {r: 0, g: 0, b: 0},
        alpha: 1,
        visible: true,
    }),
});

export type WindowLabelStyle = z.infer<typeof WindowLabelStyleSchema>;

// Window style schema - defines all styleable properties
export const WindowStyleSchema = z.object({
    // Window background
    backgroundColor: RgbColorSchema,

    // Titlebar colors
    titlebarBackgroundColor: RgbColorSchema,
    titlebarTextColor: RgbColorSchema,
    label: WindowLabelStyleSchema.default({
        font: {
            size: 10,
            family: 'Helvetica',
            color: {r: 0, g: 0, b: 0},
            alpha: 1,
            visible: true,
        },
    }),

    // Border colors
    borderColor: RgbColorSchema.optional(),
    borderWidth: z.number().min(0).default(0),

    // Selection state
    selectedBorderColor: RgbColorSchema,
    selectedBorderWidth: z.number().min(0).default(2),

    // Hover state (optional)
    hoverBorderColor: RgbColorSchema.optional(),
    hoverBorderWidth: z.number().min(0).optional(),
});

export type WindowStyle = z.infer<typeof WindowStyleSchema>;

// Partial style for user overrides
export type PartialWindowStyle = Omit<Partial<WindowStyle>, 'label'> & {
    label?: {
        font?: Partial<WindowLabelFontStyle>;
    };
};

export const LoadStateSchema = z.enum([LOAD_STATUS.START, LOAD_STATUS.LOADED, LOAD_STATUS.ERROR]);

export const DimensionTypeSchema = z.enum([DIMENSION_TYPE.SIZE, DIMENSION_TYPE.SCALE]);

export const PointSchema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
});

// Icon configuration for titlebar
export const TitlebarIconSchema = z.object({
    url: z.string(),
    width: z.number().min(0).default(16),
    height: z.number().min(0).default(16),
});

export type TitlebarIcon = z.infer<typeof TitlebarIconSchema>;

// Titlebar configuration
export const TitlebarConfigSchema = z.object({
    mode: z.enum([TITLEBAR_MODE.PERSISTENT, TITLEBAR_MODE.ON_HOVER]).default(TITLEBAR_MODE.PERSISTENT),
    height: z.number().min(0).default(30),
    backgroundColor: RgbColorSchema.default({r: 0.2, g: 0.2, b: 0.2}),
    title: z.string().default('Window'),
    isVisible: z.boolean().default(true),
    padding: z.number().default(2),
    showCloseButton: z.boolean().default(false),
    fontSize: z.number().min(0).default(14),
    textColor: RgbColorSchema.default({r: 0, g: 0, b: 0}),
    icon: TitlebarIconSchema.optional(),
});

export type TitlebarConfig = z.infer<typeof TitlebarConfigSchema>;

// Type for custom titlebar render function (not in schema since functions can't be serialized)
export type TitlebarContentRendererParams = {
    titlebarStore: unknown;
    titlebarValue: TitlebarConfig;
    windowStore: unknown;
    windowValue: WindowDef;
    contentContainer: Container;
    localRect: Rectangle;
    localScale: {
        x: number;
        y: number;
    };
};

export type TitlebarContentRendererFn = (
    params: TitlebarContentRendererParams
) => void;

export type WindowContentRendererParams = {
    windowStore: unknown;
    windowValue: WindowDef;
    contentContainer: Container;
    localRect: Rectangle;
    localScale: {
        x: number;
        y: number;
    };
};

export type WindowContentRendererFn = (
    params: WindowContentRendererParams
) => void;

export type WindowResolveHookFn = (
    state: WindowDef
) => void;

export type ConfigureTitlebarFn = (
    titlebarStore: unknown,
    windowStore: unknown
) => void;

export type ModifyInitialTitlebarParamsResult = {
    state?: Partial<TitlebarConfig>;
    config?: Partial<WindowDef>;
};

export type ModifyInitialTitlebarParamsFn = (
    params: { state: TitlebarConfig; config: WindowDef }
) => ModifyInitialTitlebarParamsResult | void;

// Window status schema
export const WindowStatusSchema = z.enum([
    WINDOW_STATUS.CLEAN,
    WINDOW_STATUS.DIRTY,
    WINDOW_STATUS.DELETED,
]);

export const RGB_BLACK = {r: 0, g: 0, b: 0};
export const RGB_WHITE = {r: 1, g: 1, b: 1}

export const RectSchema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().min(0).default(200),
    height: z.number().min(0).default(200),
});

// Style variant schema
export const StyleVariantSchema = z.enum([
    STYLE_VARIANT.DEFAULT,
    STYLE_VARIANT.LIGHT_GRAYSCALE,
    STYLE_VARIANT.INVERTED,
    STYLE_VARIANT.BLUE,
    STYLE_VARIANT.ALERT_INFO,
    STYLE_VARIANT.ALERT_DANGER,
    STYLE_VARIANT.ALERT_WARNING,
]).default(STYLE_VARIANT.DEFAULT);

// Window definition schema
export const WindowDefSchema = z.object({
    id: z.string(),
    minWidth: z.number().min(0).optional(),
    minHeight: z.number().min(0).optional(),
    backgroundColor: RgbColorSchema.default({r: 0.1, g: 0.1, b: 0.1}),
    titlebar: TitlebarConfigSchema.default({
        mode: TITLEBAR_MODE.PERSISTENT,
        height: 30,
        backgroundColor: {r: 0.2, g: 0.2, b: 0.2},
        title: 'Window',
        padding: 2,
        fontSize: 14,
        textColor: RGB_BLACK,
        showCloseButton: false,
        isVisible: true,
    }),
    isResizeable: z.boolean().default(false),
    isDraggable: z.boolean().default(false),
    dragFromTitlebar: z.boolean().default(false), // If true, drag only from titlebar, not entire window
    resizeMode: z.string().optional() as z.ZodType<HandleMode | undefined>,
    status: WindowStatusSchema.default(WINDOW_STATUS.CLEAN),
    zIndex: z.number().default(0),
    contentClickable: z.boolean().default(false),
    // Style system
    variant: StyleVariantSchema,
}).merge(RectSchema)

export type WindowDef = z.infer<typeof WindowDefSchema>;

export type WindowCloseContext = {
    id: string;
    windowStore: unknown;
    windowsManager?: unknown;
};

export type WindowCloseHandler = (context: WindowCloseContext) => boolean | void;

export type WindowRectTransformHandle =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'middle-left'
    | 'middle-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';

export type WindowRectTransformPhase = 'drag' | 'release';

export type WindowRectLike = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export interface WindowRectTransformParams {
    rect: Rectangle;
    phase: WindowRectTransformPhase;
    handle: WindowRectTransformHandle | null;
}

export type WindowRectTransform = (params: WindowRectTransformParams) => Rectangle | WindowRectLike;

// Type for WindowStore class constructor
export type WindowStoreClass<T extends WindowDef = WindowDef> = new (
    config: any,
    app: Application
) => any;

export type TitlebarStoreClass = new (
    config: any,
    app: Application
) => any;

// Input type for addWindow - allows partial titlebar config and custom style
export type WindowDefInput = Omit<Partial<WindowDef>, 'titlebar'> & {
    id: string;
    titlebar?: Partial<TitlebarConfig>;
    rectTransform?: WindowRectTransform; // Optional rect transform forwarded to resizer handles
    closable?: boolean;
    onClose?: WindowCloseHandler;
    customStyle?: PartialWindowStyle; // User style overrides
    storeClass?: WindowStoreClass; // Custom WindowStore subclass
    titlebarContentRenderer?: TitlebarContentRendererFn; // Per-window titlebar content renderer
    windowContentRenderer?: WindowContentRendererFn; // Per-window window content renderer
    onResolve?: WindowResolveHookFn; // Runs before window refresh/renderers each resolve cycle
    configureTitlebar?: ConfigureTitlebarFn; // Per-window titlebar setup callback
    modifyInitialTitlebarParams?: ModifyInitialTitlebarParamsFn; // Startup-only titlebar/window param modifier
};

// Texture status values
// - 'pending': in state but not yet started loading
// - 'loading': currently being loaded
// - 'loaded': successfully loaded and ready to use
// - 'error': failed to load
export const TextureStatusValues = ['pending', 'loading', 'loaded', 'error'] as const;
export const TextureStatusSchema = z.enum(TextureStatusValues).default('pending');

// Texture definition with status (for WindowsManager)
export const TextureDefSchema = z.object({
    id: z.string(),
    url: z.string(),
    status: TextureStatusSchema.optional(),
    error: z.string().optional(), // Error message when status is 'error'
    // Note: texture (Texture) is not in schema since it can't be serialized
});

export type TextureDef = z.infer<typeof TextureDefSchema> & {
    texture?: import('pixi.js').Texture;
};

// WindowsManager state schema
export const WindowStoreSchema = z.object({
    windows: z.map(z.string(), WindowDefSchema).default(new Map()),
    selected: z.set(z.string()).default(new Set()),
    textures: z.array(TextureDefSchema).default([]),
});

export type WindowStoreValue = z.infer<typeof WindowStoreSchema> & {
    textures: TextureDef[];
};

export const ZIndexDataSchema = z.object({
    zIndex: z.number(),
    id: z.string(),
    zIndexFlat: z.number(),
    branch: z.unknown()
})

export type ZIndexData = z.infer<typeof ZIndexDataSchema>;

export const ImageSpriteSchema = z.object({
    url: z.string(),
    id: z.string().optional(),
    x: z.number().default(0),
    y: z.number().default(0),
    dimension: PointSchema.default({ x: 1, y: 1 }),
    dimensionType: DimensionTypeSchema.default(DIMENSION_TYPE.SCALE),
    mask: RectSchema.optional(),
    loadState: LoadStateSchema.optional(),
});

export type ImageSpriteProps = z.infer<typeof ImageSpriteSchema>;

export type Point = z.infer<typeof PointSchema>;
