import type {RgbColor} from "./types.js";
import {Color} from "pixi.js";
import {clamp} from 'lodash-es';

export function channel(n: number):  number {
    return clamp(n, 0, 1);
}

export default function rgbToColor(arg: RgbColor) {
    const {r, g, b} = arg;
    return new Color([channel(r), channel(g), channel(b)]);
}