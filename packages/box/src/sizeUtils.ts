import { AXIS } from './constants.js';
import type { AxisConstraintLike, Measurement } from './types.js';

type AxisValue = (typeof AXIS)[keyof typeof AXIS];

export type ResolveMeasurementOptions = {
  axis?: AxisValue;
  parentPixels?: number;
};

export function resolveMeasurement(
  measurement: Measurement,
  options: ResolveMeasurementOptions = {},
): number {
  const { axis, parentPixels } = options;
  if (measurement.mode === 'px') {
    return measurement.value;
  }
  if (parentPixels === undefined) {
    const label = axis ?? 'axis';
    throw new Error(`% size requires parent ${label}`);
  }
  return parentPixels * measurement.value;
}

export function resolveMeasurementPx(
  axis: AxisValue,
  measurement: Measurement,
  parentPixels?: number,
): number {
  return resolveMeasurement(measurement, { axis, parentPixels });
}

export function resolveConstraintValuePx(value: number | undefined): number | undefined {
  return value;
}

export function applyAxisConstraints(
  base: number,
  constraint: AxisConstraintLike | undefined,
): number {
  const min = constraint?.min;
  const max = constraint?.max;

  if (min !== undefined && max !== undefined && min > max) {
    return Math.max(base, min);
  }

  let out = base;
  if (min !== undefined) {
    out = Math.max(out, min);
  }
  if (max !== undefined) {
    out = Math.min(out, max);
  }
  return out;
}
