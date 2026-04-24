import { describe, expect, it } from 'vitest';
import { AXIS, UNIT_BASIS } from '../src/constants';
import { MeasurementSchema } from '../src/types';
import {
  applyAxisConstraints,
  resolveConstraintValuePx,
  resolveMeasurement,
  resolveMeasurementPx,
} from '../src/sizeUtils';

describe('sizeUtils', () => {
  describe('MeasurementSchema.parse', () => {
    it('accepts numeric input as px shorthand', () => {
      expect(MeasurementSchema.parse(24)).toEqual({
        mode: UNIT_BASIS.PX,
        value: 24,
      });
    });

    it('accepts canonical object modes (px and %)', () => {
      expect(MeasurementSchema.parse({
        mode: UNIT_BASIS.PX,
        value: 15,
      })).toEqual({
        mode: UNIT_BASIS.PX,
        value: 15,
      });

      expect(MeasurementSchema.parse({
        mode: UNIT_BASIS.PERCENT,
        value: 0.4,
      })).toEqual({
        mode: UNIT_BASIS.PERCENT,
        value: 0.4,
      });
    });

    it('accepts fraction mode (/) with explicit base', () => {
      expect(MeasurementSchema.parse({
        mode: UNIT_BASIS.FRACTION,
        value: 1,
        base: 4,
      })).toEqual({
        mode: UNIT_BASIS.PERCENT,
        value: 0.25,
      });
    });

    it('requires base for fraction mode (/)', () => {
      expect(() => MeasurementSchema.parse({
        mode: UNIT_BASIS.FRACTION,
        value: 0.5,
      })).toThrow(/required|invalid input/i);
    });
  });

  describe('resolveMeasurement', () => {
    it('resolves px measurements directly', () => {
      expect(resolveMeasurement({ mode: UNIT_BASIS.PX, value: 320 })).toBe(320);
    });

    it('resolves % measurements against parent pixels', () => {
      expect(resolveMeasurement(
        { mode: UNIT_BASIS.PERCENT, value: 0.25 },
        { axis: AXIS.Y, parentPixels: 200 },
      )).toBe(50);
    });

    it('throws on % measurements without parent pixels', () => {
      expect(() => resolveMeasurement(
        { mode: UNIT_BASIS.PERCENT, value: 0.5 },
        { axis: AXIS.X },
      )).toThrow(/requires parent x/i);
    });

    it('works with values parsed from numeric and fraction input', () => {
      const numericPx = MeasurementSchema.parse(80);
      const fractionPercent = MeasurementSchema.parse({
        mode: UNIT_BASIS.FRACTION,
        value: 1,
        base: 5,
      });

      expect(resolveMeasurement(numericPx)).toBe(80);
      expect(resolveMeasurement(fractionPercent, { axis: AXIS.X, parentPixels: 500 })).toBe(100);
    });
  });

  describe('resolveMeasurementPx', () => {
    it('keeps parity with resolveMeasurement for px and %', () => {
      expect(resolveMeasurementPx(AXIS.X, { mode: UNIT_BASIS.PX, value: 320 })).toBe(320);
      expect(resolveMeasurementPx(AXIS.Y, { mode: UNIT_BASIS.PERCENT, value: 0.25 }, 200)).toBe(50);
    });
  });

  describe('resolveConstraintValuePx', () => {
    it('returns the provided constraint value', () => {
      expect(resolveConstraintValuePx(4)).toBe(4);
    });

    it('returns undefined when missing', () => {
      expect(resolveConstraintValuePx(undefined)).toBeUndefined();
    });
  });

  describe('applyAxisConstraints', () => {
    it('applies only min when min is greater than max', () => {
      expect(applyAxisConstraints(5, { min: 10, max: 8 })).toBe(10);
    });

    it('clamps within a normal min/max range', () => {
      expect(applyAxisConstraints(5, { min: 2, max: 4 })).toBe(4);
      expect(applyAxisConstraints(1, { min: 2, max: 4 })).toBe(2);
      expect(applyAxisConstraints(3, { min: 2, max: 4 })).toBe(3);
    });

    it('applies only min when max is absent', () => {
      expect(applyAxisConstraints(1, { min: 2 })).toBe(2);
      expect(applyAxisConstraints(3, { min: 2 })).toBe(3);
    });

    it('applies only max when min is absent', () => {
      expect(applyAxisConstraints(10, { max: 7 })).toBe(7);
      expect(applyAxisConstraints(5, { max: 7 })).toBe(5);
    });

    it('returns base when no constraints are provided', () => {
      expect(applyAxisConstraints(6, undefined)).toBe(6);
      expect(applyAxisConstraints(6, {})).toBe(6);
    });
  });
});
