import { describe, expect, it, vi } from 'vitest';
import { BoxStore, prepareBoxCellTree } from '../src/BoxStore.js';
import type { BoxCellType } from '../src/types.js';
import { DIR_HORIZ, POS_START, SIZE_FRACTION } from '../src/constants.js';

describe('BoxStore prep', () => {
  it('assigns ids recursively to input trees', () => {
    const input: BoxCellType = {
      name: 'root',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
      children: [
        {
          name: 'left',
          absolute: false,
          dim: { w: 50, h: 100 },
          align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        },
      ],
    };

    const prepared = prepareBoxCellTree(input);

    expect(prepared.id).toBeTruthy();
    expect(prepared.children?.[0].id).toBeTruthy();
  });

  it('stores prepared values with ids present', () => {
    const store = new BoxStore({
      value: {
        name: 'root',
        absolute: true,
        dim: { x: 0, y: 0, w: 100, h: 100 },
        align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        children: [
          {
            name: 'left',
            absolute: false,
            dim: { w: 50, h: 100 },
            align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
          },
        ],
      },
    });

    expect(store.value.id).toBeTruthy();
    expect(store.value.children?.[0].id).toBeTruthy();
  });

  it('respects a user-provided id', () => {
    const prepared = prepareBoxCellTree({
      id: 'user-root',
      name: 'root',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
    });

    expect(prepared.id).toBe('user-root');
  });

  it('logs duplicate ids while preserving the provided values', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const prepared = prepareBoxCellTree({
      id: 'dup-root',
      name: 'root',
      absolute: true,
      dim: { x: 0, y: 0, w: 100, h: 100 },
      align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
      children: [
        {
          id: 'dup-child',
          name: 'left',
          absolute: false,
          dim: { w: 50, h: 100 },
          align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        },
        {
          id: 'dup-child',
          name: 'right',
          absolute: false,
          dim: { w: 50, h: 100 },
          align: { direction: 'horizontal', xPosition: 'start', yPosition: 'start' },
        },
      ],
    });

    expect(prepared.children?.[0].id).toBe('dup-child');
    expect(prepared.children?.[1].id).toBe('dup-child');
    expect(errorSpy).toHaveBeenCalledWith('[BoxStore] Duplicate box cell id detected: "dup-child" on node "right"');

    errorSpy.mockRestore();
  });

  it('lays out absolute children out of flow while keeping them parent-relative', () => {
    const store = new BoxStore({
      value: {
        name: 'root',
        absolute: true,
        dim: { x: 10, y: 20, w: 300, h: 120 },
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        children: [
          {
            name: 'flow',
            absolute: false,
            dim: { w: 80, h: 20 },
            align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
          },
          {
            name: 'overlay',
            absolute: true,
            dim: { x: 25, y: 15, w: 90, h: 40 },
            align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
          },
          {
            name: 'flow-2',
            absolute: false,
            dim: { w: 100, h: 30 },
            align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
          },
        ],
      },
    });

    store.update();

    expect(store.value.children?.map((child) => child.location)).toEqual([
      { x: 10, y: 20, w: 80, h: 20 },
      { x: 35, y: 35, w: 90, h: 40 },
      { x: 90, y: 20, w: 100, h: 30 },
    ]);
  });

  it('does not let absolute children consume fractional remainder', () => {
    const store = new BoxStore({
      value: {
        name: 'root',
        absolute: true,
        dim: { x: 10, y: 20, w: 300, h: 120 },
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        children: [
          {
            name: 'fixed',
            absolute: false,
            dim: { w: 60, h: 20 },
            align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
          },
          {
            name: 'overlay',
            absolute: true,
            dim: { x: 200, y: 10, w: 50, h: 20 },
            align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
          },
          {
            name: 'flex',
            absolute: false,
            dim: { w: { value: 1, unit: SIZE_FRACTION }, h: 20 },
            align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
          },
        ],
      },
    });

    store.update();

    expect(store.value.children?.map((child) => child.location)).toEqual([
      { x: 10, y: 20, w: 60, h: 20 },
      { x: 210, y: 30, w: 50, h: 20 },
      { x: 70, y: 20, w: 240, h: 20 },
    ]);
  });
});
