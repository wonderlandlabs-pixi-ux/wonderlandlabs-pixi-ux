/*
 * Archived on 2026-04-17.
 *
 * The standalone ComputeAxis stories were retired in favor of BoxStore stories
 * that exercise the same scenarios through the public box tree + SVG renderer
 * path. This file is kept only as storage/reference and is excluded from active
 * TypeScript compilation by packages/box/tsconfig.json.
 */

export const archivedComputeAxisStoryNames = [
    'Stacks Horizontal Children From The Start By Default',
    'Aligns The Run On The Main Axis And Children On The Cross Axis',
    'Resolves Width And Height Against Their Own Parent Dimensions',
    'Stacks Vertical Children And Centers Them On The Cross Axis',
    'Uses The Largest Resolved Peer Span For Cross-Axis Fractional Sizes',
    'Distributes Main-Axis Fractional Spans By Weight From The Remainder',
    'Fills The Parent Cross Span When Cross-Axis Alignment Is Fill',
    'Treats Main-Axis Fill As Centered When There Are No Fractional Spans',
    'Treats Main-Axis Fill As Start-Aligned When Fractional Spans Are Present',
] as const;
