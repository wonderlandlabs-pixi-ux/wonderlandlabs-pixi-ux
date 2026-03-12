import type { Meta, StoryObj } from '@storybook/html';
import { Application, Graphics, Sprite, Assets, Spritesheet } from 'pixi.js';
import { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import { ButtonStore } from './ButtonStore.js';

interface ButtonArgs {
    mode: 'icon' | 'iconVertical' | 'text' | 'inline';
}

/**
 * Create a default StyleTree with button styles
 */
function createDefaultStyleTree(): StyleTree {
    const tree = new StyleTree();

    // Icon button styles
    tree.set('button.padding.x', [], 8);
    tree.set('button.padding.y', [], 8);
    tree.set('button.border.radius', [], 4);
    tree.set('button.icon.size.x', [], 32);
    tree.set('button.icon.size.y', [], 32);
    tree.set('button.icon.alpha', [], 1);
    tree.set('button.stroke.color', [], { r: 0.6, g: 0.6, b: 0.6 });
    tree.set('button.stroke.size', [], 1);
    tree.set('button.stroke.alpha', [], 1);
    tree.set('button.label.font.size', [], 11);
    tree.set('button.label.font.color', [], { r: 0.2, g: 0.2, b: 0.2 });
    tree.set('button.label.font.alpha', [], 0.8);
    tree.set('button.label.padding', [], 8);

    // Icon button hover state
    tree.set('button.fill.color', ['hover'], { r: 0.9, g: 0.95, b: 1 });
    tree.set('button.fill.alpha', ['hover'], 1);
    tree.set('button.stroke.color', ['hover'], { r: 0.4, g: 0.6, b: 0.9 });

    // Icon button disabled state
    tree.set('button.icon.alpha', ['disabled'], 0.4);
    tree.set('button.stroke.alpha', ['disabled'], 0.4);

    // IconVertical button styles (icon with label below)
    tree.set('button.icon.vertical.padding.x', [], 8);
    tree.set('button.icon.vertical.padding.y', [], 8);
    tree.set('button.icon.vertical.border.radius', [], 4);
    tree.set('button.icon.vertical.icon.size.x', [], 32);
    tree.set('button.icon.vertical.icon.size.y', [], 32);
    tree.set('button.icon.vertical.icon.alpha', [], 1);
    tree.set('button.icon.vertical.icon.gap', [], 6);
    tree.set('button.icon.vertical.stroke.color', [], { r: 0.6, g: 0.6, b: 0.6 });
    tree.set('button.icon.vertical.stroke.size', [], 1);
    tree.set('button.icon.vertical.stroke.alpha', [], 1);
    tree.set('button.icon.vertical.label.font.size', [], 11);
    tree.set('button.icon.vertical.label.font.color', [], { r: 0.2, g: 0.2, b: 0.2 });
    tree.set('button.icon.vertical.label.font.alpha', [], 0.8);

    // IconVertical button hover state
    tree.set('button.icon.vertical.fill.color', ['hover'], { r: 0.9, g: 0.95, b: 1 });
    tree.set('button.icon.vertical.fill.alpha', ['hover'], 1);
    tree.set('button.icon.vertical.stroke.color', ['hover'], { r: 0.4, g: 0.6, b: 0.9 });

    // IconVertical button disabled state
    tree.set('button.icon.vertical.icon.alpha', ['disabled'], 0.4);
    tree.set('button.icon.vertical.stroke.alpha', ['disabled'], 0.4);
    tree.set('button.icon.vertical.label.font.alpha', ['disabled'], 0.4);

    // Text button styles
    tree.set('button.text.padding.x', [], 16);
    tree.set('button.text.padding.y', [], 8);
    tree.set('button.text.border.radius', [], 6);
    tree.set('button.text.fill.color', [], { r: 0.2, g: 0.5, b: 0.8 });
    tree.set('button.text.fill.alpha', [], 1);
    tree.set('button.text.label.font.size', [], 14);
    tree.set('button.text.label.font.color', [], { r: 1, g: 1, b: 1 });
    tree.set('button.text.label.font.alpha', [], 1);

    // Text button hover state
    tree.set('button.text.fill.color', ['hover'], { r: 0.3, g: 0.6, b: 0.9 });

    // Text button disabled state
    tree.set('button.text.fill.alpha', ['disabled'], 0.5);
    tree.set('button.text.label.font.alpha', ['disabled'], 0.5);

    // Inline button styles
    tree.set('button.inline.padding.x', [], 12);
    tree.set('button.inline.padding.y', [], 8);
    tree.set('button.inline.border.radius', [], 6);
    tree.set('button.inline.icon.gap', [], 8);
    tree.set('button.inline.icon.size.x', [], 20);
    tree.set('button.inline.icon.size.y', [], 20);
    tree.set('button.inline.icon.alpha', [], 1);
    tree.set('button.inline.fill.color', [], { r: 0.15, g: 0.65, b: 0.45 });
    tree.set('button.inline.fill.alpha', [], 1);
    tree.set('button.inline.label.font.size', [], 14);
    tree.set('button.inline.label.font.color', [], { r: 1, g: 1, b: 1 });
    tree.set('button.inline.label.font.alpha', [], 1);

    // Inline button hover state - blue 1px border
    tree.set('button.inline.fill.color', ['hover'], { r: 0.1, g: 0.8, b: 0.6 });
    tree.set('button.inline.stroke.color', ['hover'], { r: 0.2, g: 0.4, b: 0.9 });
    tree.set('button.inline.stroke.size', ['hover'], 1);
    tree.set('button.inline.stroke.alpha', ['hover'], 1);

    // Inline button disabled state
    tree.set('button.inline.fill.alpha', ['disabled'], 0.5);
    tree.set('button.inline.icon.alpha', ['disabled'], 0.5);
    tree.set('button.inline.label.font.alpha', ['disabled'], 0.5);

    // Primary variant (for text/inline buttons)
    tree.set('button.primary.text.fill.color', [], { r: 0.8, g: 0.2, b: 0.2 });
    tree.set('button.primary.text.fill.color', ['hover'], { r: 0.9, g: 0.3, b: 0.3 });

    return tree;
}

/**
 * Create a simple icon graphic (fallback)
 */
function createIconGraphic(size: number, color: number): Graphics {
    const g = new Graphics();
    g.rect(0, 0, size, size);
    g.fill(color);
    // Add a simple shape inside
    g.circle(size / 2, size / 2, size / 3);
    g.fill(0xffffff);
    return g;
}

/**
 * Create a sprite from the placeholder texture with optional tint
 */
function createIconSprite(texture: any, tint?: number): Sprite {
    const sprite = new Sprite(texture);
    if (tint !== undefined) {
        sprite.tint = tint;
    }
    return sprite;
}

const meta: Meta<ButtonArgs> = {
    title: 'Button',
    args: {
        mode: 'icon',
    },
    argTypes: {
        mode: {
            control: 'select',
            options: ['icon', 'iconVertical', 'text', 'inline'],
        },
    },
};

export default meta;
type Story = StoryObj<ButtonArgs>;

export const IconButtons: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '400px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 800,
            height: 400,
            backgroundColor: 0xf5f5f5,
            antialias: true,
        }).then(async () => {
            wrapper.appendChild(app.canvas);

            // Load placeholder texture
            const texture = await Assets.load('/placeholder-art.png');
            const styleTree = createDefaultStyleTree();

            // Icon-only buttons (no labels) using sprites
            const button1 = new ButtonStore({
                id: 'btn-1',
                mode: 'icon',
                sprite: createIconSprite(texture, 0x4488cc),
                onClick: () => console.log('Blue clicked'),
            }, styleTree, app);
            button1.setPosition(50, 50);

            const button2 = new ButtonStore({
                id: 'btn-2',
                mode: 'icon',
                sprite: createIconSprite(texture, 0x44cc88),
                onClick: () => console.log('Green clicked'),
            }, styleTree, app);
            button2.setPosition(110, 50);

            const button3 = new ButtonStore({
                id: 'btn-3',
                mode: 'icon',
                sprite: createIconSprite(texture, 0xcc8844),
                isDisabled: true,
            }, styleTree, app);
            button3.setPosition(170, 50);

            app.stage.addChild(button1.container);
            app.stage.addChild(button2.container);
            app.stage.addChild(button3.container);

            button1.kickoff();
            button2.kickoff();
            button3.kickoff();
        });

        return wrapper;
    },
};

export const IconVerticalButtons: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '400px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 800,
            height: 400,
            backgroundColor: 0xf5f5f5,
            antialias: true,
        }).then(async () => {
            wrapper.appendChild(app.canvas);

            // Load placeholder texture
            const texture = await Assets.load('/placeholder-art.png');
            const styleTree = createDefaultStyleTree();

            // IconVertical buttons (icon with label below) using sprites
            const button1 = new ButtonStore({
                id: 'btn-1',
                mode: 'iconVertical',
                sprite: createIconSprite(texture, 0x4488cc),
                label: 'Blue',
                onClick: () => console.log('Blue clicked'),
            }, styleTree, app);
            button1.setPosition(50, 50);

            const button2 = new ButtonStore({
                id: 'btn-2',
                mode: 'iconVertical',
                sprite: createIconSprite(texture, 0x44cc88),
                label: 'Green',
                onClick: () => console.log('Green clicked'),
            }, styleTree, app);
            button2.setPosition(130, 50);

            const button3 = new ButtonStore({
                id: 'btn-3',
                mode: 'iconVertical',
                sprite: createIconSprite(texture, 0xcc8844),
                label: 'Orange',
                isDisabled: true,
            }, styleTree, app);
            button3.setPosition(210, 50);

            app.stage.addChild(button1.container);
            app.stage.addChild(button2.container);
            app.stage.addChild(button3.container);

            button1.kickoff();
            button2.kickoff();
            button3.kickoff();
        });

        return wrapper;
    },
};

export const TextButtons: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '400px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 800,
            height: 400,
            backgroundColor: 0xf5f5f5,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);

            const styleTree = createDefaultStyleTree();

            // Create text buttons
            const button1 = new ButtonStore({
                id: 'text-btn-1',
                label: 'Submit',
                mode: 'text',
                onClick: () => console.log('Submit clicked'),
            }, styleTree, app);
            button1.setPosition(50, 50);

            const button2 = new ButtonStore({
                id: 'text-btn-2',
                label: 'Cancel',
                mode: 'text',
                onClick: () => console.log('Cancel clicked'),
            }, styleTree, app);
            button2.setPosition(180, 50);

            const button3 = new ButtonStore({
                id: 'text-btn-3',
                label: 'Disabled',
                mode: 'text',
                isDisabled: true,
            }, styleTree, app);
            button3.setPosition(310, 50);

            app.stage.addChild(button1.container);
            app.stage.addChild(button2.container);
            app.stage.addChild(button3.container);

            button1.kickoff();
            button2.kickoff();
            button3.kickoff();
        });

        return wrapper;
    },
};

export const InlineButtons: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '400px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 800,
            height: 400,
            backgroundColor: 0xf5f5f5,
            antialias: true,
        }).then(async () => {
            wrapper.appendChild(app.canvas);

            // Load placeholder texture
            const texture = await Assets.load('/placeholder-art.png');
            const styleTree = createDefaultStyleTree();

            // Row 1: Inline buttons with left icon
            const button1 = new ButtonStore({
                id: 'inline-btn-1',
                sprite: createIconSprite(texture, 0x4488cc),
                label: 'Add Item',
                mode: 'inline',
                onClick: () => console.log('Add Item clicked'),
            }, styleTree, app);
            button1.setPosition(50, 50);

            const button2 = new ButtonStore({
                id: 'inline-btn-2',
                sprite: createIconSprite(texture, 0xcc4444),
                label: 'Delete',
                mode: 'inline',
                onClick: () => console.log('Delete clicked'),
            }, styleTree, app);
            button2.setPosition(200, 50);

            const button3 = new ButtonStore({
                id: 'inline-btn-3',
                sprite: createIconSprite(texture, 0x888888),
                label: 'Disabled',
                mode: 'inline',
                isDisabled: true,
            }, styleTree, app);
            button3.setPosition(330, 50);

            // Row 2: Inline buttons with right icon
            const button4 = new ButtonStore({
                id: 'inline-btn-4',
                label: 'Dropdown',
                rightSprite: createIconSprite(texture, 0xffffff),
                mode: 'inline',
                onClick: () => console.log('Dropdown clicked'),
            }, styleTree, app);
            button4.setPosition(50, 120);

            const button5 = new ButtonStore({
                id: 'inline-btn-5',
                sprite: createIconSprite(texture, 0x4488cc),
                label: 'Both Icons',
                rightSprite: createIconSprite(texture, 0xffffff),
                mode: 'inline',
                onClick: () => console.log('Both Icons clicked'),
            }, styleTree, app);
            button5.setPosition(200, 120);

            app.stage.addChild(button1.container);
            app.stage.addChild(button2.container);
            app.stage.addChild(button3.container);
            app.stage.addChild(button4.container);
            app.stage.addChild(button5.container);

            button1.kickoff();
            button2.kickoff();
            button3.kickoff();
            button4.kickoff();
            button5.kickoff();
        });

        return wrapper;
    },
};

export const AllModes: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '400px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 800,
            height: 400,
            backgroundColor: 0xf5f5f5,
            antialias: true,
        }).then(async () => {
            wrapper.appendChild(app.canvas);

            // Load placeholder texture
            const texture = await Assets.load('/placeholder-art.png');
            const styleTree = createDefaultStyleTree();

            // Row 1: Icon button (icon only, no label)
            const iconBtn = new ButtonStore({
                id: 'icon-demo',
                mode: 'icon',
                sprite: createIconSprite(texture, 0x4488cc),
                onClick: () => console.log('Icon clicked'),
            }, styleTree, app);
            iconBtn.setPosition(50, 30);

            // Row 2: IconVertical button (icon with label below)
            const iconVerticalBtn = new ButtonStore({
                id: 'icon-vertical-demo',
                mode: 'iconVertical',
                sprite: createIconSprite(texture, 0x8844cc),
                label: 'Vertical',
                onClick: () => console.log('IconVertical clicked'),
            }, styleTree, app);
            iconVerticalBtn.setPosition(50, 100);

            // Row 3: Text button
            const textBtn = new ButtonStore({
                id: 'text-demo',
                mode: 'text',
                label: 'Text Mode',
                onClick: () => console.log('Text clicked'),
            }, styleTree, app);
            textBtn.setPosition(50, 190);

            // Row 4: Inline button (icon + text side-by-side)
            const inlineBtn = new ButtonStore({
                id: 'inline-demo',
                mode: 'inline',
                sprite: createIconSprite(texture, 0x44cc88),
                label: 'Inline Mode',
                onClick: () => console.log('Inline clicked'),
            }, styleTree, app);
            inlineBtn.setPosition(50, 250);

            app.stage.addChild(iconBtn.container);
            app.stage.addChild(iconVerticalBtn.container);
            app.stage.addChild(textBtn.container);
            app.stage.addChild(inlineBtn.container);

            iconBtn.kickoff();
            iconVerticalBtn.kickoff();
            textBtn.kickoff();
            inlineBtn.kickoff();
        });

        return wrapper;
    },
};
