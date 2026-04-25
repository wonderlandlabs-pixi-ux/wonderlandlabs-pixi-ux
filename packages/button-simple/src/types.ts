import {z} from 'zod';
import {
  ButtonSimpleChildSchema,
  ButtonSimpleIconChildSchema,
  ButtonSimpleImageIconChildSchema,
  ButtonSimpleLabelChildSchema,
  ButtonSimpleLayoutSchema,
  ButtonSimpleShapeIconChildSchema,
  ButtonSimpleStateSchema,
  ButtonVisualStateSchema,
  IconPartValueSchema,
  LabelPartValueSchema,
} from './schema.js';
import {IconPartStore, LabelPartStore} from "./parts.js";
import type {Graphics} from "pixi.js";
import {ButtonSimpleStoreBase} from "./ButtonSimpleStoreBase.js";

export type ButtonSimpleState = z.input<typeof ButtonSimpleStateSchema> & {
  callback?: () => boolean | void;
};

export type ButtonSimpleLayout = z.infer<typeof ButtonSimpleLayoutSchema>;

export type ButtonSimpleLabelChild = z.infer<typeof ButtonSimpleLabelChildSchema>;

export type ButtonSimpleIconChild = z.infer<typeof ButtonSimpleIconChildSchema>;
export type ButtonSimpleImageIconChild = z.infer<typeof ButtonSimpleImageIconChildSchema>;
export type ButtonSimpleShapeIconChild = z.infer<typeof ButtonSimpleShapeIconChildSchema>;

export type ButtonSimpleChild = z.infer<typeof ButtonSimpleChildSchema>;

export type ButtonSimpleOptions = {
  app: unknown;
  parentContainer: unknown;
  pixi?: unknown;
  getCheckedValues?: () => unknown[];
};
export type ButtonPartRecord = {
  child: ButtonSimpleChild;
  store: LabelPartStore | IconPartStore;
  width: number;
  height: number;
};

export type ButtonVisualState = z.infer<typeof ButtonVisualStateSchema>;

export type ButtonVisualStateRecord = Record<ButtonVisualState, Graphics>;
export type ButtonSimpleControlEvent = {
  id?: string;
  buttonValue?: unknown;
  changedButtonValue?: unknown;
  checked: boolean;
  checkedValues?: unknown[];
  button: ButtonSimpleStoreBase;
};

export type LabelPartValue = z.infer<typeof LabelPartValueSchema>;
export type IconPartValue = z.infer<typeof IconPartValueSchema>;