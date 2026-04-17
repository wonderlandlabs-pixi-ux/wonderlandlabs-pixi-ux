import type { Meta, StoryObj } from '@storybook/html';
import { BoxStore } from './BoxStore.js';
import {
    DIR_HORIZ,
    DIR_VERT,
    POS_CENTER,
    POS_END,
    POS_FILL,
    POS_START,
    SIZE_FRACTION,
    SIZE_PCT,
} from './constants.js';
import type { BoxCellType, RectPXType } from './types.js';

const meta: Meta = {
    title: 'Box/BoxStore',
};

export default meta;
type Story = StoryObj;

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCellSvg(cell: BoxCellType, depth: number = 0): string {
    const location = cell.location;
    if (!location) return '';

    const colors = [
        ['#d6e4ff', '#1b263b'], // level 0
        ['#fde2e4', '#5e0b15'], // level 1
        ['#d8f3dc', '#081c15'], // level 2
        ['#fff1c1', '#432818'], // level 3
        ['#e0e1dd', '#0d1b2a'], // level 4
    ];
    const [fill, text] = colors[depth % colors.length];
    
    const rect = `<rect x="${location.x}" y="${location.y}" width="${location.w}" height="${location.h}" fill="${fill}" stroke="${text}" stroke-width="${Math.max(0.5, 2 - depth * 0.5)}" rx="${Math.max(0, 4 - depth)}" fill-opacity="0.8" />`;
    const label = `<text x="${location.x + 4}" y="${location.y + 12}" font-family="monospace" font-size="${Math.max(8, 12 - depth * 2)}" fill="${text}">${escapeHtml(cell.name)}</text>`;
    
    const childrenSvg = cell.children?.map(child => renderCellSvg(child, depth + 1)).join('') || '';
    
    return rect + label + childrenSvg;
}

function renderStoreSvg(store: BoxStore): string {
    const root = store.value;
    const location = store.location;
    const padding = 20;
    const diagramWidth = location.w + location.x + padding;
    const diagramHeight = location.h + location.y + padding;

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${diagramWidth}" height="${diagramHeight}" viewBox="0 0 ${diagramWidth} ${diagramHeight}">`,
        `<rect x="0" y="0" width="${diagramWidth}" height="${diagramHeight}" fill="#f8f9fa" />`,
        renderCellSvg({ ...root, location }),
        `</svg>`,
    ].join('');
}

function renderStoreStory(rootCell: BoxCellType): HTMLElement {
    const store = new BoxStore({ value: rootCell });
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
            <pre>${escapeHtml(JSON.stringify(rootCell, null, 2))}</pre>
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
                children: [
                    {
                        name: 'L2',
                        absolute: false,
                        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                        align: { direction: DIR_VERT, xPosition: POS_FILL, yPosition: POS_FILL },
                        children: [
                            {
                                name: 'L3',
                                absolute: false,
                                dim: { w: { value: 100, unit: SIZE_PCT }, h: { value: 1, unit: SIZE_FRACTION } },
                                align: { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_FILL },
                                children: [
                                    {
                                        name: 'L4',
                                        absolute: false,
                                        dim: { w: { value: 1, unit: SIZE_FRACTION }, h: { value: 100, unit: SIZE_PCT } },
                                        align: { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_CENTER },
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
