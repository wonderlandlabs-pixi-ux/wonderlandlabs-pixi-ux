import {z} from 'zod';
import {BTYPE_AVATAR, BTYPE_BASE, BTYPE_VERTICAL, BTYPE_TEXT} from "./constants.js";

export const ButtonVariant = z.enum([BTYPE_VERTICAL, BTYPE_TEXT, BTYPE_AVATAR, BTYPE_BASE])

const ButtonState = z.object({
    variant: ButtonVariant,
    label: z.string().optional(),
    icon: z.string().optional(),
    state: z.string().optional(),
    modifiers: z.array(z.string()).optional(),
    isDebug: z.boolean().optional(),
    isDisabled: z.boolean().optional(),
    isHovered: z.boolean().optional(),
    size: z.object({
        width: z.number().optional(),
        height: z.number().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
    }).optional(),
});

export type ButtonStateType = z.infer<typeof ButtonState>;

export type EventFn = () => void;

export const ButtonOptions = z.object({
    handlers: z.record(z.string(), z.function()),
    app: z.any(),
    styleTree: z.any().optional(),
    styleDef: z.any().optional(),
});

export type ButtonOptionsType = z.infer<typeof ButtonOptions>;
/**
 * styleTree: StyleTree, handlers: Record<string, EventFn>
 */
