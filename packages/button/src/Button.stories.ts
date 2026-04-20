import type {Meta, StoryObj} from '@storybook/html';
import {Application, Color} from 'pixi.js';
import {fromJSON, digestJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import {ButtonStore} from './ButtonStore.js';
import defaultStyles from './defaultStyles.json' with {type: 'json'};
import storyStyles from './storyStyles.json' with {type: 'json'};
import capsuleStyles from './capsuleStyles.json' with {type: 'json'};
import warnStyles from './warnStyles.json' with {type: 'json'};

const PLACEHOLDER_ICON = '/icons/demo-icon.png';
const STORY_BACKGROUND = new Color('#f6f1e7').toNumber();

function color(value: string | number): number {
    return new Color(value).toNumber();
}

function createStoryStyleTree() {
    const tree = fromJSON(defaultStyles);
    digestJSON(tree, storyStyles);
    return tree;
}

function createCapsuleOverrideTree() {
    return fromJSON(capsuleStyles);
}

function createWarnOverrideTree() {
    return fromJSON(warnStyles);
}

function showAlert(message: string) {
    return () => {
        window.alert(message);
    };
}

type Story = StoryObj;

const meta: Meta = {
    title: 'Button/Click Alerts',
};

export default meta;

export const AlertButtons: Story = {
    render: () => {
        const styleTree = createStoryStyleTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '320px';
        void (async () => {
            const app = new Application();
            await app.init({
                width: 900,
                height: 320,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: 'button',
                    label: 'Primary Button',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 220, height: 52},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Primary button clicked')},
                }),
                new ButtonStore({
                    variant: 'text',
                    label: 'Text Link Button',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 300, y: 46, width: 220, height: 40},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Text button clicked')},
                }),
                new ButtonStore({
                    variant: 'icon-vert',
                    label: 'Profile',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 560, y: 24, width: 80, height: 80},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Vertical icon button clicked')},
                }),
                new ButtonStore({
                    variant: 'avatar',
                    label: 'AB',
                    size: {x: 720, y: 40, width: 72, height: 72},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Avatar button clicked')},
                }),
            ];

            buttons.forEach((button) => {
                app.stage.addChild(button.container!);
                button.kickoff();
            });
        })();

        return wrapper;
    },
};

export const AlertStates: Story = {
    render: () => {
        const styleTree = createStoryStyleTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '320px';
        void (async () => {
            const app = new Application();
            await app.init({
                width: 900,
                height: 320,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: 'button',
                    label: 'Enabled',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 190, height: 52},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Enabled button clicked')},
                }),
                new ButtonStore({
                    variant: 'button',
                    label: 'Disabled',
                    icon: PLACEHOLDER_ICON,
                    status: new Set(['disabled']),
                    size: {x: 260, y: 40, width: 190, height: 52},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('This should not fire')},
                }),
                new ButtonStore({
                    variant: 'text',
                    label: 'Hover Me',
                    size: {x: 500, y: 46, width: 160, height: 40},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Hover state button clicked')},
                }),
                new ButtonStore({
                    variant: 'avatar',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 720, y: 30, width: 88, height: 88},
                }, {
                    app,
                    styleTree,
                    handlers: {click: showAlert('Avatar icon button clicked')},
                }),
            ];

            buttons.forEach((button) => {
                app.stage.addChild(button.container!);
                button.kickoff();
            });
        })();

        return wrapper;
    },
};

export const SubmitFlow: Story = {
    render: () => {
        const styleTree = createStoryStyleTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '240px';
        void (async () => {
            const app = new Application();
            await app.init({
                width: 900,
                height: 240,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const submitButton = new ButtonStore({
                variant: 'button',
                label: 'Submit',
                icon: PLACEHOLDER_ICON,
                size: {x: 40, y: 48, width: 220, height: 52},
            }, {
                app,
                styleTree,
                handlers: {
                    click: () => {
                        submitButton.setStatus('disabled', true);
                        submitButton.set('label', 'Submitting...');

                        window.setTimeout(() => {
                            submitButton.setStatus('disabled', false);
                            submitButton.set('label', 'Submit');
                            window.alert('Submit finished');
                        }, 2000);
                    },
                },
            });

            const disabledHint = new ButtonStore({
                variant: 'text',
                label: 'Click Submit to see the temporary disabled state.',
                size: {x: 300, y: 54, width: 420, height: 36},
            }, {
                app,
                styleTree,
                handlers: {
                    click: showAlert('This helper text is also clickable'),
                },
            });

            [submitButton, disabledHint].forEach((button) => {
                app.stage.addChild(button.container!);
                button.kickoff();
            });
        })();

        return wrapper;
    },
};

export const PartialThemeOverrides: Story = {
    render: () => {
        const baseStyles = createStoryStyleTree();
        const capsuleStyles = createCapsuleOverrideTree();
        const warnStyles = createWarnOverrideTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '300px';

        void (async () => {
            const app = new Application();
            await app.init({
                width: 960,
                height: 300,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: 'button',
                    label: 'Base Theme',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 210, height: 52},
                }, {
                    app,
                    styleTree: [baseStyles],
                    handlers: {click: showAlert('Base theme clicked')},
                }),
                new ButtonStore({
                    variant: 'button',
                    label: 'Partial Capsule',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 290, y: 40, width: 220, height: 52},
                }, {
                    app,
                    styleTree: [baseStyles, capsuleStyles],
                    handlers: {click: showAlert('Capsule override clicked')},
                }),
                new ButtonStore({
                    variant: 'button',
                    label: 'Partial Warm',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 550, y: 40, width: 220, height: 52},
                }, {
                    app,
                    styleTree: [baseStyles, warnStyles],
                    handlers: {click: showAlert('Warm override clicked')},
                }),
                new ButtonStore({
                    variant: 'button',
                    label: 'Disabled Uses Base + Override',
                    icon: PLACEHOLDER_ICON,
                    status: new Set(['disabled']),
                    size: {x: 40, y: 130, width: 300, height: 52},
                }, {
                    app,
                    styleTree: [baseStyles, capsuleStyles],
                    handlers: {click: showAlert('Disabled should not click')},
                }),
            ];

            buttons.forEach((button) => {
                app.stage.addChild(button.container!);
                button.kickoff();
            });
        })();

        return wrapper;
    },
};
