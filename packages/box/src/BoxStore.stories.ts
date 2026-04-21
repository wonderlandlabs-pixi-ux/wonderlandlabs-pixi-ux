import type { Meta, StoryObj } from '@storybook/html';
import { BoxStore } from './BoxStore.js';
import {
    DIR_HORIZ,
    DIR_VERT,
    INSET_SCOPE_ALL,
    INSET_SCOPE_HORIZ,
    INSET_SCOPE_TOP,
    INSET_SCOPE_VERT,
    POS_CENTER,
    POS_END,
    POS_FILL,
    POS_START,
    SIZE_FRACTION,
    SIZE_PCT,
} from './constants.js';
import type { BoxAlignType, BoxCellType, RectPartialType, RectStaticType } from './types.js';
import { createSVGStoryStyles } from './storyStyles.js';
import { boxTreeToSVG } from './toSVG.js';

const meta: Meta = {
    title: 'Box/Svg/BoxStore',
};

export default meta;
type Story = StoryObj;
const storyStyles = createSVGStoryStyles();
const axisStoryParent: RectStaticType = { x: 10, y: 20, w: 300, h: 120 };

type BoxStoreScenario = {
    name: string;
    align: BoxAlignType;
    dims: RectPartialType[];
};

function withStoryBorders(cell: BoxCellType, depth = 0): BoxCellType {
    const hasBorderInset = cell.insets?.some((entry) => entry.role === 'border') ?? false;
    const borderThickness = depth === 0 ? 2 : 1;

    return {
        ...cell,
        insets: hasBorderInset
            ? cell.insets
            : [
                {
                    role: 'border',
                    inset: [
                        { scope: INSET_SCOPE_ALL, value: borderThickness },
                    ],
                },
                ...(cell.insets ?? []),
            ],
        children: cell.children?.map((child) => withStoryBorders(child, depth + 1)),
    };
}

const boxStoreScenarios: BoxStoreScenario[] = [
    {
        name: 'Stacks Horizontal Children From The Start By Default',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: 30 },
        ],
    },
    {
        name: 'Aligns The Run On The Main Axis And Children On The Cross Axis',
        align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_END },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: 30 },
        ],
    },
    {
        name: 'Resolves Width And Height Against Their Own Parent Dimensions',
        align: { direction: DIR_VERT, xPosition: POS_START, yPosition: POS_START },
        dims: [
            {
                w: { value: 50, unit: SIZE_PCT },
                h: { value: 25, unit: SIZE_PCT },
            },
        ],
    },
    {
        name: 'Stacks Vertical Children And Centers Them On The Cross Axis',
        align: { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_START },
        dims: [
            { w: 60, h: 20 },
            { w: 100, h: 30 },
        ],
    },
    {
        name: 'Uses The Largest Resolved Peer Span For Cross-Axis Fractional Sizes',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        dims: [
            { w: 50, h: 20 },
            { w: 60, h: { value: 1, unit: SIZE_FRACTION } },
            { w: 70, h: 30 },
        ],
    },
    {
        name: 'Distributes Main-Axis Fractional Spans By Weight From The Remainder',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        dims: [
            { w: 60, h: 20 },
            { w: { value: 1, unit: SIZE_FRACTION }, h: 20 },
            { w: { value: 2, unit: SIZE_FRACTION }, h: 20 },
        ],
    },
    {
        name: 'Fills The Parent Cross Span When Cross-Axis Alignment Is Fill',
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_FILL },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: { value: 1, unit: SIZE_FRACTION } },
        ],
    },
    {
        name: 'Treats Main-Axis Fill As Centered When There Are No Fractional Spans',
        align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_START },
        dims: [
            { w: 50, h: 20 },
            { w: 100, h: 20 },
        ],
    },
    {
        name: 'Treats Main-Axis Fill As Start-Aligned When Fractional Spans Are Present',
        align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_START },
        dims: [
            { w: 60, h: 20 },
            { w: { value: 1, unit: SIZE_FRACTION }, h: 20 },
        ],
    },
];

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function valueCell(value: unknown): string {
    return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
}

function renderStoreSvg(store: BoxStore): string {
    const root = store.layoutValue;
    return boxTreeToSVG(root, {
        title: 'BoxStore Layout',
        styleTree: [storyStyles],
    });
}

function renderStoreStory(rootCell: BoxCellType): HTMLElement {
    const storyCell = withStoryBorders(rootCell);
    const store = new BoxStore({ value: storyCell });
    store.update();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <style>
            .store-story {
                padding: 20px;
                font-family: ui-sans-serif, system-ui, sans-serif;
            }
            .canvas-container {
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: auto;
                margin-bottom: 20px;
            }
            pre {
                background: #272822;
                color: #f8f8f2;
                padding: 15px;
                border-radius: 8px;
                font-size: 12px;
                overflow: auto;
            }
        </style>
        <div class="store-story">
            <h2>BoxStore Layout</h2>
            <div class="canvas-container">
                ${renderStoreSvg(store)}
            </div>
            <h3>Store Configuration</h3>
            <pre>${escapeHtml(JSON.stringify(storyCell, null, 2))}</pre>
        </div>
    `;
    return wrapper;
}

function boxForScenario(scenario: BoxStoreScenario): BoxCellType {
    return {
        name: 'parent',
        absolute: true,
        dim: axisStoryParent,
        align: scenario.align,
        children: scenario.dims.map((dim, index) => ({
            name: `#${index}`,
            absolute: false,
            dim,
            align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        })),
    };
}

function renderScenarioStory(scenario: BoxStoreScenario): HTMLElement {
    const rootCell = withStoryBorders(boxForScenario(scenario));
    const store = new BoxStore({ value: rootCell });
    store.update();
    const locations = store.layoutValue.children?.map((child) => child.location).filter(Boolean) ?? [];

    const dimRows = scenario.dims.map((dim, index) => `
        <tr>
            <td>${index}</td>
            <td>${valueCell(dim.w)}</td>
            <td>${valueCell(dim.h)}</td>
            <td>${valueCell(dim)}</td>
        </tr>
    `).join('');

    const locationRows = locations.map((location, index) => `
        <tr>
            <td>${index}</td>
            <td>${location!.x}</td>
            <td>${location!.y}</td>
            <td>${location!.w}</td>
            <td>${location!.h}</td>
        </tr>
    `).join('');

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
        <style>
            :root {
                color-scheme: light;
                --bg: #f5f7fb;
                --panel: #ffffff;
                --line: #d8dee9;
                --text: #1f2937;
                --muted: #667085;
            }

            .scenario-story {
                min-height: 100vh;
                padding: 12px;
                background: var(--bg);
                color: var(--text);
                font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .scenario-layout {
                display: grid;
                grid-template-columns: minmax(360px, 720px) minmax(420px, 1fr);
                gap: 24px;
                align-items: start;
            }

            .panel {
                background: var(--panel);
                border: 1px solid var(--line);
                border-radius: 12px;
                padding: 16px;
            }

            .summary {
                display: grid;
                grid-template-columns: 120px 1fr;
                gap: 8px 12px;
                margin-bottom: 20px;
            }

            .summary dt {
                color: var(--muted);
            }

            .summary dd {
                margin: 0;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
                font-size: 12px;
            }

            th, td {
                border: 1px solid var(--line);
                text-align: left;
                padding: 8px;
                vertical-align: top;
            }

            th {
                background: #eef2f7;
            }

            code {
                white-space: pre-wrap;
                word-break: break-word;
            }

            svg {
                display: block;
                width: 100%;
                height: auto;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: #fff;
            }
        </style>
        <div class="scenario-story">
            <div class="scenario-layout">
                <section class="panel">
                    ${boxTreeToSVG(store.layoutValue, {
                        title: scenario.name,
                        styleTree: [storyStyles],
                    })}
                </section>
                <section class="panel">
                    <h2>Scenario</h2>
                    <dl class="summary">
                        <dt>Parent</dt>
                        <dd>${valueCell(axisStoryParent)}</dd>
                        <dt>Align</dt>
                        <dd>${valueCell(scenario.align)}</dd>
                    </dl>

                    <h2>Configured Dims</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>w</th>
                                <th>h</th>
                                <th>raw</th>
                            </tr>
                        </thead>
                        <tbody>${dimRows}</tbody>
                    </table>

                    <h2>Computed Rects</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>x</th>
                                <th>y</th>
                                <th>w</th>
                                <th>h</th>
                            </tr>
                        </thead>
                        <tbody>${locationRows}</tbody>
                    </table>
                </section>
            </div>
        </div>
    `;
    return wrapper;
}

export const BasicNestedLayout: Story = {
    render: () => renderStoreStory({
        name: 'root',
        absolute: true,
        dim: { x: 10, y: 10, w: 500, h: 400 },
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        children: [
            {
                name: 'sidebar',
                absolute: false,
                dim: { w: 100, h: { value: 100, unit: SIZE_PCT } },
                align: { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_START },
                children: [
                    { name: 'logo', absolute: false, dim: { w: 60, h: 60 }, align: { direction: DIR_HORIZ } },
                    { name: 'nav1', absolute: false, dim: { w: 80, h: 30 }, align: { direction: DIR_HORIZ } },
                    { name: 'nav2', absolute: false, dim: { w: 80, h: 30 }, align: { direction: DIR_HORIZ } },
                ]
            },
            {
                name: 'content',
                absolute: false,
                dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                align: { direction: DIR_VERT, xPosition: POS_START, yPosition: POS_START },
                children: [
                    {
                        name: 'header',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: 60 },
                        align: { direction: DIR_HORIZ, xPosition: POS_END, yPosition: POS_CENTER },
                        children: [
                            { name: 'user', absolute: false, dim: { w: 40, h: 40 }, align: { direction: DIR_HORIZ } },
                            { name: 'logout', absolute: false, dim: { w: 60, h: 30 }, align: { direction: DIR_HORIZ } },
                        ]
                    },
                    {
                        name: 'body',
                        absolute: false,
                        dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                        align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                        children: [
                            { name: 'card1', absolute: false, dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } }, align: { direction: DIR_HORIZ } },
                            { name: 'card2', absolute: false, dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } }, align: { direction: DIR_HORIZ } },
                            { name: 'card3', absolute: false, dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } }, align: { direction: DIR_HORIZ } },
                        ]
                    }
                ]
            }
        ]
    })
};

export const ComplexFractionalNesting: Story = {
    render: () => renderStoreStory({
        name: 'grid',
        absolute: true,
        dim: { x: 10, y: 10, w: 600, h: 600 },
        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
        children: [
            {
                name: 'row1',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                children: [
                    { name: 'r1c1', absolute: false, dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } }, align: { direction: DIR_HORIZ } },
                    { name: 'r1c2', absolute: false, dim: { w: { value: 2, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } }, align: { direction: DIR_HORIZ } },
                ]
            },
            {
                name: 'row2',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 2, unit: SIZE_FRACTION } },
                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                children: [
                    { name: 'r2c1', absolute: false, dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } }, align: { direction: DIR_HORIZ } },
                    {
                        name: 'r2c2-nested',
                        absolute: false,
                        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
                        children: [
                            { name: 'inner1', absolute: false, dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } }, align: { direction: DIR_HORIZ } },
                            { name: 'inner2', absolute: false, dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } }, align: { direction: DIR_HORIZ } },
                        ]
                    },
                ]
            }
        ]
    })
};

export const DeeplyNestedLayout: Story = {
    render: () => renderStoreStory({
        name: 'root',
        absolute: true,
        dim: { x: 10, y: 10, w: 400, h: 400 },
        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
        children: [
            {
                name: 'L1',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                insets: [{
                    role: 'padding',
                    inset: [
                        { scope: INSET_SCOPE_ALL, value: 18 },
                    ],
                }],
                children: [
                    {
                        name: 'L2',
                        absolute: false,
                        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
                        insets: [{
                            role: 'padding',
                            inset: [
                                { scope: INSET_SCOPE_ALL, value: 16 },
                            ],
                        }],
                        children: [
                            {
                                name: 'L3',
                                absolute: false,
                                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                                insets: [{
                                    role: 'padding',
                                    inset: [
                                        { scope: INSET_SCOPE_ALL, value: 14 },
                                    ],
                                }],
                                children: [
                                    {
                                        name: 'L4',
                                        absolute: false,
                                        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                                        align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
                                        insets: [{
                                            role: 'padding',
                                            inset: [
                                                { scope: INSET_SCOPE_ALL, value: 12 },
                                            ],
                                        }],
                                        children: [
                                            { name: 'Core', absolute: false, dim: { w: 20, h: 20 }, align: { direction: DIR_HORIZ } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    })
};

export const InsetAndGapRow: Story = {
    render: () => renderStoreStory({
        name: 'inset-row',
        absolute: true,
        dim: { x: 10, y: 10, w: 420, h: 180 },
        align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
        insets: [
            {
                role: 'border',
                inset: [
                    { scope: INSET_SCOPE_ALL, value: 6 },
                    { scope: INSET_SCOPE_TOP, value: 12 },
                ],
            },
            {
                role: 'padding',
                inset: [
                    { scope: INSET_SCOPE_HORIZ, value: 16 },
                    { scope: INSET_SCOPE_VERT, value: 10 },
                ],
            },
        ],
        gap: 12,
        children: [
            { name: 'left', absolute: false, dim: { w: 80, h: 40 }, align: { direction: DIR_HORIZ } },
            { name: 'mid', absolute: false, dim: { w: 120, h: 60 }, align: { direction: DIR_HORIZ } },
            { name: 'right', absolute: false, dim: { w: { value: 1, unit: SIZE_FRACTION }, h: 50 }, align: { direction: DIR_HORIZ } },
        ],
    })
};

export const BorderThicknessComparison: Story = {
    render: () => renderStoreStory({
        name: 'root',
        absolute: true,
        dim: { x: 10, y: 10, w: 520, h: 220 },
        align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
        insets: [{
            role: 'padding',
            inset: [
                { scope: INSET_SCOPE_ALL, value: 16 },
            ],
        }],
        gap: 16,
        children: [
            {
                name: 'left',
                absolute: false,
                dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                align: { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_CENTER },
                insets: [
                    {
                        role: 'border',
                        inset: [
                            { scope: INSET_SCOPE_ALL, value: 2 },
                        ],
                    },
                    {
                        role: 'padding',
                        inset: [
                            { scope: INSET_SCOPE_ALL, value: 10 },
                        ],
                    },
                ],
                children: [
                    { name: 'tool-a', absolute: false, dim: { w: 60, h: 28 }, align: { direction: DIR_HORIZ } },
                ],
            },
            {
                name: 'mid',
                absolute: false,
                dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                align: { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_CENTER },
                insets: [
                    {
                        role: 'border',
                        inset: [
                            { scope: INSET_SCOPE_ALL, value: 8 },
                        ],
                    },
                    {
                        role: 'padding',
                        inset: [
                            { scope: INSET_SCOPE_ALL, value: 10 },
                        ],
                    },
                ],
                children: [
                    { name: 'tool-b', absolute: false, dim: { w: 60, h: 28 }, align: { direction: DIR_HORIZ } },
                ],
            },
            {
                name: 'right',
                absolute: false,
                dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                align: { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_CENTER },
                insets: [
                    {
                        role: 'border',
                        inset: [
                            { scope: INSET_SCOPE_TOP, value: 4 },
                            { scope: INSET_SCOPE_HORIZ, value: 12 },
                            { scope: INSET_SCOPE_VERT, value: 18 },
                        ],
                    },
                    {
                        role: 'padding',
                        inset: [
                            { scope: INSET_SCOPE_ALL, value: 10 },
                        ],
                    },
                ],
                children: [
                    { name: 'tool-c', absolute: false, dim: { w: 60, h: 28 }, align: { direction: DIR_HORIZ } },
                ],
            },
        ],
    })
};

export const NestedInsetsAndGap: Story = {
    render: () => renderStoreStory({
        name: 'root',
        absolute: true,
        dim: { x: 10, y: 10, w: 520, h: 320 },
        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
        insets: [
            {
                role: 'border',
                inset: [
                    { scope: INSET_SCOPE_ALL, value: 8 },
                ],
            },
            {
                role: 'padding',
                inset: [
                    { scope: INSET_SCOPE_HORIZ, value: 20 },
                    { scope: INSET_SCOPE_VERT, value: 14 },
                ],
            },
        ],
        gap: 18,
        children: [
            {
                name: 'toolbar',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: 56 },
                align: { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_CENTER },
                insets: [{
                    role: 'padding',
                    inset: [
                        { scope: INSET_SCOPE_ALL, value: 6 },
                    ],
                }],
                gap: 10,
                children: [
                    { name: 'tool-a', absolute: false, dim: { w: 72, h: 24 }, align: { direction: DIR_HORIZ } },
                    { name: 'tool-b', absolute: false, dim: { w: 90, h: 24 }, align: { direction: DIR_HORIZ } },
                    { name: 'tool-c', absolute: false, dim: { w: 60, h: 24 }, align: { direction: DIR_HORIZ } },
                ],
            },
            {
                name: 'body',
                absolute: false,
                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                gap: 16,
                children: [
                    {
                        name: 'nav',
                        absolute: false,
                        dim: { w: 120, h: { value: 100, unit: SIZE_PCT } },
                        align: { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_START },
                        insets: [{
                            role: 'padding',
                            inset: [
                                { scope: INSET_SCOPE_ALL, value: 10 },
                            ],
                        }],
                        gap: 8,
                        children: [
                            { name: 'link-1', absolute: false, dim: { w: 80, h: 24 }, align: { direction: DIR_HORIZ } },
                            { name: 'link-2', absolute: false, dim: { w: 80, h: 24 }, align: { direction: DIR_HORIZ } },
                            { name: 'link-3', absolute: false, dim: { w: 80, h: 24 }, align: { direction: DIR_HORIZ } },
                        ],
                    },
                    {
                        name: 'content',
                        absolute: false,
                        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
                        insets: [{
                            role: 'padding',
                            inset: [
                                { scope: INSET_SCOPE_ALL, value: 12 },
                            ],
                        }],
                        gap: 12,
                        children: [
                            { name: 'hero', absolute: false, dim: { w: { value: 100, unit: SIZE_PCT }, h: 72 }, align: { direction: DIR_HORIZ } },
                            { name: 'list', absolute: false, dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } }, align: { direction: DIR_HORIZ } },
                        ],
                    },
                ],
            },
        ],
    })
};

export const StacksHorizontalChildrenFromTheStartByDefault: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[0]),
};

export const AlignsTheRunOnTheMainAxisAndChildrenOnTheCrossAxis: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[1]),
};

export const ResolvesWidthAndHeightAgainstTheirOwnParentDimensions: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[2]),
};

export const StacksVerticalChildrenAndCentersThemOnTheCrossAxis: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[3]),
};

export const UsesTheLargestResolvedPeerSpanForCrossAxisFractionalSizes: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[4]),
};

export const DistributesMainAxisFractionalSpansByWeightFromTheRemainder: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[5]),
};

export const FillsTheParentCrossSpanWhenCrossAxisAlignmentIsFill: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[6]),
};

export const TreatsMainAxisFillAsCenteredWhenThereAreNoFractionalSpans: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[7]),
};

export const TreatsMainAxisFillAsStartAlignedWhenFractionalSpansArePresent: Story = {
    render: () => renderScenarioStory(boxStoreScenarios[8]),
};
