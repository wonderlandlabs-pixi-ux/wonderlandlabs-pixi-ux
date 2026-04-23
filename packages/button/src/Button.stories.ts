import type {Meta, StoryObj} from '@storybook/html';
import * as Pixi from 'pixi.js';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import {PixiProvider} from '@wonderlandlabs-pixi-ux/utils';
import {ButtonStore} from './ButtonStore.js';
import {
    BTYPE_AVATAR,
    BTYPE_BASE,
    BTYPE_VERTICAL,
    BTYPE_TEXT,
} from './constants.js';
import storyStyles from './storyStyles.json' with {type: 'json'};
import capsuleStyles from './capsuleStyles.json' with {type: 'json'};
import warnStyles from './warnStyles.json' with {type: 'json'};
import { createButtonFamily } from './buttonFamily.js';

const PLACEHOLDER_ICON = '/icons/demo-icon.png';
const STORY_BACKGROUND = new Pixi.Color('#f6f1e7').toNumber();

function color(value: string | number): number {
    return new Pixi.Color(value).toNumber();
}

function createStoryStyleTree() {
    return fromJSON(storyStyles);
}

function createCapsuleOverrideTree() {
    return fromJSON(capsuleStyles);
}

function createWarnOverrideTree() {
    return fromJSON(warnStyles);
}

function createButtonFamilyTree(
    styleJson: Record<string, unknown>,
    sizes: number[],
    family = 'base',
    baselineSize = 100,
) {
    return fromJSON(createButtonFamily(styleJson, sizes, {family, baselineSize}));
}

function showAlert(message: string) {
    return () => {
        window.alert(message);
    };
}

function fullStoryIconUrl(path: string): string {
    return new URL(path, window.location.href).toString();
}

type Story = StoryObj;
type DesignerArgs = {
    variant: typeof BTYPE_BASE | typeof BTYPE_TEXT | typeof BTYPE_VERTICAL | typeof BTYPE_AVATAR;
    label: string;
    iconUrl: string;
    width: number;
    height: number;
    paddingX: number;
    paddingY: number;
    gap: number;
    borderRadius: number;
    borderWidth: number;
    backgroundColor: string;
    borderColor: string;
    labelColor: string;
    hoverBackgroundColor: string;
    hoverBorderColor: string;
    disabledLabelAlpha: number;
    fontSize: number;
    iconSize: number;
    disabled: boolean;
};

type FamilyArgs = {
    scale: number;
};

const meta: Meta<DesignerArgs> = {
    title: 'Button/Click Alerts',
    argTypes: {
        variant: {control: 'select', options: [BTYPE_BASE, BTYPE_TEXT, BTYPE_VERTICAL, BTYPE_AVATAR]},
        label: {control: 'text'},
        iconUrl: {control: 'text'},
        width: {control: {type: 'range', min: 48, max: 320, step: 2}},
        height: {control: {type: 'range', min: 32, max: 180, step: 2}},
        paddingX: {control: {type: 'range', min: 0, max: 32, step: 1}},
        paddingY: {control: {type: 'range', min: 0, max: 32, step: 1}},
        gap: {control: {type: 'range', min: 0, max: 24, step: 1}},
        borderRadius: {control: {type: 'range', min: 0, max: 64, step: 1}},
        borderWidth: {control: {type: 'range', min: 0, max: 8, step: 1}},
        backgroundColor: {control: 'color'},
        borderColor: {control: 'color'},
        labelColor: {control: 'color'},
        hoverBackgroundColor: {control: 'color'},
        hoverBorderColor: {control: 'color'},
        disabledLabelAlpha: {control: {type: 'range', min: 0.1, max: 1, step: 0.05}},
        fontSize: {control: {type: 'range', min: 10, max: 36, step: 1}},
        iconSize: {control: {type: 'range', min: 12, max: 72, step: 1}},
        disabled: {control: 'boolean'},
    },
};

export default meta;

export const AlertButtons: Story = {
    render: () => {
        const styleTree = createStoryStyleTree();
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '320px';
        void (async () => {
            PixiProvider.init(Pixi);
            const app = new Pixi.Application();
            await app.init({
                width: 900,
                height: 320,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: BTYPE_BASE,
                    label: 'Primary Button',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 220, height: 52},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree,
                    handlers: {click: showAlert('Primary button clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_TEXT,
                    label: 'Text Link Button',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 300, y: 46, width: 220, height: 40},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree,
                    handlers: {click: showAlert('Text button clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_VERTICAL,
                    label: 'Profile',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 560, y: 24, width: 80, height: 80},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree,
                    handlers: {click: showAlert('Vertical icon button clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_AVATAR,
                    label: 'AB',
                    size: {x: 720, y: 40, width: 72, height: 72},
                }, {
                    app,
                    pixi: PixiProvider.shared,
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
            PixiProvider.init(Pixi);
            const app = new Pixi.Application();
            await app.init({
                width: 900,
                height: 320,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: BTYPE_BASE,
                    label: 'Enabled',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 190, height: 52},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree,
                    handlers: {click: showAlert('Enabled button clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_BASE,
                    label: 'Disabled',
                    icon: PLACEHOLDER_ICON,
                    state: 'disabled',
                    size: {x: 260, y: 40, width: 190, height: 52},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree,
                    handlers: {click: showAlert('This should not fire')},
                }),
                new ButtonStore({
                    variant: BTYPE_TEXT,
                    label: 'Hover Me',
                    size: {x: 500, y: 46, width: 160, height: 40},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree,
                    handlers: {click: showAlert('Hover state button clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_AVATAR,
                    icon: PLACEHOLDER_ICON,
                    size: {x: 720, y: 30, width: 88, height: 88},
                }, {
                    app,
                    pixi: PixiProvider.shared,
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
            PixiProvider.init(Pixi);
            const app = new Pixi.Application();
            await app.init({
                width: 900,
                height: 240,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const submitButton = new ButtonStore({
                variant: BTYPE_BASE,
                label: 'Submit',
                icon: PLACEHOLDER_ICON,
                isDebug: true,
                size: {x: 40, y: 48, width: 220, height: 52},
            }, {
                app,
                pixi: PixiProvider.shared,
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
                variant: BTYPE_TEXT,
                label: 'Click Submit to see the temporary disabled state.',
                isDebug: true,
                size: {x: 300, y: 54, width: 420, height: 36},
            }, {
                app,
                pixi: PixiProvider.shared,
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
            PixiProvider.init(Pixi);
            const app = new Pixi.Application();
            await app.init({
                width: 960,
                height: 300,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            wrapper.appendChild(app.canvas);

            const buttons = [
                new ButtonStore({
                    variant: BTYPE_BASE,
                    label: 'Base Theme',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 40, y: 40, width: 210, height: 52},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree: [baseStyles],
                    handlers: {click: showAlert('Base theme clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_BASE,
                    label: 'Partial Capsule',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 290, y: 40, width: 220, height: 52},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree: [baseStyles, capsuleStyles],
                    handlers: {click: showAlert('Capsule override clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_BASE,
                    label: 'Partial Warm',
                    icon: PLACEHOLDER_ICON,
                    size: {x: 550, y: 40, width: 220, height: 52},
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree: [baseStyles, warnStyles],
                    handlers: {click: showAlert('Warm override clicked')},
                }),
                new ButtonStore({
                    variant: BTYPE_BASE,
                    label: 'Disabled Uses Base + Override',
                    icon: PLACEHOLDER_ICON,
                    state: 'disabled',
                    size: {x: 40, y: 130, width: 300, height: 52},
                }, {
                    app,
                    pixi: PixiProvider.shared,
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

function createDesignerOverrideJSON(args: DesignerArgs) {
    const hasBackground = args.variant !== BTYPE_TEXT;
    const variant = args.variant === BTYPE_BASE ? 'button' : args.variant;
    return {
        button: {
            [variant]: {
                base: {
                    100: {
                        container: {
                            background: {
                                width: {
                                    '$*': args.width,
                                },
                                height: {
                                    '$*': args.height,
                                },
                                padding: {
                                    '$*': [args.paddingY, args.paddingX],
                                },
                                fill: {
                                    '$*': hasBackground ? color(args.backgroundColor) : null,
                                    '$hover': hasBackground ? color(args.hoverBackgroundColor) : null,
                                },
                            },
                            border: {
                                color: {
                                    '$*': color(args.borderColor),
                                    '$hover': color(args.hoverBorderColor),
                                },
                                width: {
                                    '$*': hasBackground ? args.borderWidth : 0,
                                    '$hover': hasBackground ? args.borderWidth : 0,
                                },
                                radius: {
                                    '$*': args.borderRadius,
                                },
                            },
                            content: {
                                gap: {
                                    '$*': args.gap,
                                },
                            },
                        },
                        label: {
                            font: {
                                color: {
                                    '$*': color(args.labelColor),
                                },
                                alpha: {
                                    '$disabled': args.disabledLabelAlpha,
                                },
                            },
                            size: {
                                '$*': args.fontSize,
                            },
                        },
                        icon: {
                            alpha: {
                                '$disabled': args.disabledLabelAlpha,
                            },
                            size: {
                                width: {
                                    '$*': args.iconSize,
                                },
                                height: {
                                    '$*': args.iconSize,
                                },
                            },
                        },
                    },
                },
            },
        },
    };
}

export const Designer: StoryObj<DesignerArgs> = {
    args: {
        variant: BTYPE_BASE,
        label: "Another Label is the",
        iconUrl: fullStoryIconUrl(PLACEHOLDER_ICON),
        width: 182,
        height: 56,
        paddingX: 19,
        paddingY: 9,
        gap: 10,
        borderRadius: 14,
        borderWidth: 5,
        backgroundColor: "#812f2f",
        borderColor: "#2d47a2",
        labelColor: "#f8fff8",
        hoverBackgroundColor: "#da2ada",
        hoverBorderColor: '#3b82f6',
        disabledLabelAlpha: 0.45,
        fontSize: 23,
        iconSize: 28,
        disabled: true,
    },
    render: (args) => {
        const baseStyles = createStoryStyleTree();
        const overrideJSON = createDesignerOverrideJSON(args);
        const overrideStyles = fromJSON(overrideJSON);
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '320px';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '16px';
        wrapper.style.alignItems = 'stretch';

        const preview = document.createElement('div');
        preview.style.flex = '1 1 auto';
        preview.style.minWidth = '0';

        const code = document.createElement('textarea');
        code.readOnly = true;
        code.value = JSON.stringify(overrideJSON, null, 2);
        code.style.width = '320px';
        code.style.height = '100%';
        code.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
        code.style.fontSize = '12px';
        code.style.lineHeight = '1.4';
        code.style.padding = '12px';
        code.style.border = '1px solid #d8d0bf';
        code.style.borderRadius = '8px';
        code.style.background = '#fffdf8';
        code.style.color = '#3a3125';

        wrapper.appendChild(preview);
        wrapper.appendChild(code);

        void (async () => {
            PixiProvider.init(Pixi);
            const app = new Pixi.Application();
            await app.init({
                width: 640,
                height: 320,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            preview.appendChild(app.canvas);

            const button = new ButtonStore({
                variant: args.variant,
                label: args.label || undefined,
                icon: args.iconUrl || undefined,
                state: args.disabled ? 'disabled' : 'start',
                size: {
                    x: 80,
                    y: args.variant === BTYPE_VERTICAL ? 36 : 60,
                    width: args.width,
                    height: args.height,
                },
            }, {
                app,
                pixi: PixiProvider.shared,
                styleTree: [baseStyles, overrideStyles],
                handlers: {click: showAlert('Designer button clicked')},
            });

            app.stage.addChild(button.container!);
            button.kickoff();
        })();

        return wrapper;
    },
};

const FAMILY_SIZES = [50, 100, 133, 200];

export const ButtonFamily: StoryObj<FamilyArgs> = {
    args: {
        scale: 125,
    },
    argTypes: {
        scale: {control: {type: 'range', min: 0, max: 500, step: 5}},
    },
    render: (args) => {
        const baseStyles = createStoryStyleTree();
        const familyBaseJSON = {
            button: {
                button: {
                    base: {
                        100: {
                            container: {
                                background: {
                                    fill: {
                                        '$*': '#f1ede4',
                                        '$hover': '#e4ddd0',
                                    },
                                    padding: {
                                        '$*': [4, 18],
                                    },
                                    width: {
                                        '$*': 150,
                                    },
                                    height: {
                                        '$*': 30,
                                    },
                                },
                                border: {
                                    width: {
                                        '$*': 1,
                                    },
                                    color: {
                                        '$*': '#6e6557',
                                        '$hover': '#2d4f80',
                                    },
                                    radius: {
                                        '$*': 8,
                                    },
                                },
                                content: {
                                    gap: {
                                        '$*': 6,
                                    },
                                },
                            },
                            label: {
                                font: {
                                    color: {
                                        '$*': '#332b20',
                                    },
                                },
                                size: {
                                    '$*': 13,
                                },
                            },
                            icon: {
                                size: {
                                    width: {
                                        '$*': 16,
                                    },
                                    height: {
                                        '$*': 16,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        } satisfies Record<string, unknown>;
        const familyStyles = createButtonFamilyTree(familyBaseJSON, FAMILY_SIZES, 'capsule');
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '420px';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '16px';
        wrapper.style.alignItems = 'stretch';

        const preview = document.createElement('div');
        preview.style.flex = '1 1 auto';
        preview.style.minWidth = '0';

        const code = document.createElement('textarea');
        code.readOnly = true;
        code.value = JSON.stringify({
            family: 'capsule',
            authored: createButtonFamily(familyBaseJSON, FAMILY_SIZES, {family: 'capsule'}),
            dynamicScale: args.scale,
            note: 'Missing capsule.<scale> styles are synthesized from capsule.100 at runtime.',
        }, null, 2);
        code.style.width = '360px';
        code.style.height = '100%';
        code.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
        code.style.fontSize = '12px';
        code.style.lineHeight = '1.4';
        code.style.padding = '12px';
        code.style.border = '1px solid #d8d0bf';
        code.style.borderRadius = '8px';
        code.style.background = '#fffdf8';
        code.style.color = '#3a3125';

        wrapper.appendChild(preview);
        wrapper.appendChild(code);

        void (async () => {
            PixiProvider.init(Pixi);
            const app = new Pixi.Application();
            await app.init({
                width: 860,
                height: 420,
                backgroundColor: STORY_BACKGROUND,
                antialias: true,
            });
            preview.appendChild(app.canvas);

            FAMILY_SIZES.forEach((sizeValue, index) => {
                const button = new ButtonStore({
                    variant: BTYPE_BASE,
                    family: 'capsule',
                    label: `capsule.${sizeValue} authored`,
                    icon: PLACEHOLDER_ICON,
                    scale: sizeValue,
                    size: {
                        x: 40,
                        y: 30 + (index * 62),
                    },
                }, {
                    app,
                    pixi: PixiProvider.shared,
                    styleTree: [baseStyles, familyStyles],
                    handlers: {click: showAlert(`Family size ${sizeValue} clicked`)},
                });

                app.stage.addChild(button.container!);
                button.kickoff();
            });

            const dynamicButton = new ButtonStore({
                variant: BTYPE_BASE,
                family: 'capsule',
                label: `capsule.${args.scale} dynamic`,
                icon: PLACEHOLDER_ICON,
                scale: args.scale,
                size: {
                    x: 320,
                    y: 80,
                },
            }, {
                app,
                pixi: PixiProvider.shared,
                styleTree: [baseStyles, familyStyles],
                handlers: {click: showAlert(`Dynamic family size ${args.scale} clicked`)},
            });

            const baselineButton = new ButtonStore({
                variant: BTYPE_BASE,
                family: 'capsule',
                label: 'capsule.100 baseline',
                icon: PLACEHOLDER_ICON,
                scale: 100,
                size: {
                    x: 320,
                    y: 170,
                },
            }, {
                app,
                pixi: PixiProvider.shared,
                styleTree: [baseStyles, familyStyles],
                handlers: {click: showAlert('Baseline family size 100 clicked')},
            });

            app.stage.addChild(dynamicButton.container!);
            dynamicButton.kickoff();
            app.stage.addChild(baselineButton.container!);
            baselineButton.kickoff();
        })();

        return wrapper;
    },
};
