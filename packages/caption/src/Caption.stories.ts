import type { Meta, StoryObj } from '@storybook/html';
import { Application, Graphics } from 'pixi.js';
import { CaptionStore } from './CaptionStore.js';
import type { CaptionShape } from './types.js';

interface CaptionArgs {
    shape: CaptionShape;
    text: string;
    cornerRadius: number;
    pointerEnabled: boolean;
    speakerX: number;
    speakerY: number;
    pointerBaseWidth: number;
    autoSize: boolean;
    width: number;
    height: number;
    padding: number;
    edgeCircleCount: number;
    edgeCircleRadiusRatio: number;
    edgeCircleOutsetRatio: number;
}

const meta: Meta<CaptionArgs> = {
    title: 'Caption/CaptionStore',
    argTypes: {
        shape: {
            control: { type: 'select' },
            options: ['rect', 'oval', 'thought'],
        },
        text: { control: 'text' },
        cornerRadius: {
            control: { type: 'range', min: 0, max: 48, step: 1 },
        },
        pointerEnabled: { control: 'boolean' },
        speakerX: {
            control: { type: 'range', min: 0, max: 900, step: 1 },
        },
        speakerY: {
            control: { type: 'range', min: 0, max: 600, step: 1 },
        },
        pointerBaseWidth: {
            control: { type: 'range', min: 4, max: 48, step: 1 },
        },
        autoSize: { control: 'boolean' },
        width: {
            control: { type: 'range', min: 120, max: 400, step: 1 },
        },
        height: {
            control: { type: 'range', min: 60, max: 260, step: 1 },
        },
        padding: {
            control: { type: 'range', min: 4, max: 40, step: 1 },
        },
        edgeCircleCount: {
            control: { type: 'range', min: 6, max: 80, step: 1 },
        },
        edgeCircleRadiusRatio: {
            control: { type: 'range', min: 0.02, max: 0.2, step: 0.005 },
        },
        edgeCircleOutsetRatio: {
            control: { type: 'range', min: 0, max: 1.2, step: 0.05 },
        },
    },
    args: {
        shape: 'thought',
        text: 'Caption bubble with optional pointer triangle',
        cornerRadius: 16,
        pointerEnabled: true,
        speakerX: 640,
        speakerY: 380,
        pointerBaseWidth: 18,
        autoSize: true,
        width: 280,
        height: 120,
        padding: 14,
        edgeCircleCount: 40,
        edgeCircleRadiusRatio: 0.1,
        edgeCircleOutsetRatio: 0.45,
    },
};

export default meta;
type Story = StoryObj<CaptionArgs>;

export const Playground: Story = {
    render: (args) => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '620px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 900,
            height: 620,
            backgroundColor: 0x10203a,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);

            const caption = new CaptionStore({
                id: 'caption-demo',
                text: args.text,
                x: 170,
                y: 170,
                shape: args.shape,
                cornerRadius: args.cornerRadius,
                autoSize: args.autoSize,
                width: args.width,
                height: args.height,
                padding: args.padding,
                pointer: {
                    enabled: args.pointerEnabled,
                    baseWidth: args.pointerBaseWidth,
                    length: 34,
                    speaker: {
                        x: args.speakerX,
                        y: args.speakerY,
                    },
                },
                thought: {
                    edgeCircleCount: args.edgeCircleCount,
                    edgeCircleRadiusRatio: args.edgeCircleRadiusRatio,
                    edgeCircleOutsetRatio: args.edgeCircleOutsetRatio,
                },
                backgroundStyle: {
                    fill: {
                        color: { r: 0.08, g: 0.12, b: 0.16 },
                        alpha: 0.94,
                    },
                    stroke: {
                        color: { r: 0.73, g: 0.83, b: 0.94 },
                        width: 2,
                        alpha: 1,
                    },
                },
                textStyle: {
                    fontSize: 21,
                    fill: 0xf3f6fb,
                    align: 'center',
                    wordWrap: true,
                },
            }, app);

            const speaker = new Graphics();
            speaker.circle(args.speakerX, args.speakerY, 9);
            speaker.fill({ color: 0xffb347 });
            speaker.circle(args.speakerX, args.speakerY, 13);
            speaker.stroke({ color: 0xffffff, width: 1.5, alpha: 0.85 });

            app.stage.addChild(caption.container);
            app.stage.addChild(speaker);
        });

        return wrapper;
    },
};

export const SideBySide: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '520px';
        wrapper.style.position = 'relative';

        const app = new Application();
        app.init({
            width: 1200,
            height: 520,
            backgroundColor: 0x0d1b2a,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);

            const rectSpeaker = { x: 175, y: 395 };
            const ovalSpeaker = { x: 600, y: 395 };
            const thoughtSpeaker = { x: 1015, y: 395 };

            const rectCaption = new CaptionStore({
                id: 'caption-rect',
                text: 'Rect caption\nrounded corners',
                x: 70,
                y: 90,
                shape: 'rect',
                cornerRadius: 18,
                autoSize: false,
                width: 260,
                height: 140,
                padding: 16,
                pointer: {
                    enabled: true,
                    baseWidth: 12,
                    length: 32,
                    speaker: rectSpeaker,
                },
                backgroundStyle: {
                    fill: { color: { r: 0.12, g: 0.14, b: 0.18 }, alpha: 0.95 },
                    stroke: { color: { r: 0.82, g: 0.87, b: 0.94 }, width: 2, alpha: 1 },
                },
                textStyle: {
                    fontSize: 20,
                    fill: 0xf5f7fa,
                    align: 'center',
                    wordWrap: true,
                },
            }, app);

            const ovalCaption = new CaptionStore({
                id: 'caption-oval',
                text: 'Oval caption\nwith pointer',
                x: 470,
                y: 100,
                shape: 'oval',
                autoSize: false,
                width: 280,
                height: 130,
                padding: 16,
                pointer: {
                    enabled: true,
                    baseWidth: 24,
                    length: 36,
                    speaker: ovalSpeaker,
                },
                backgroundStyle: {
                    fill: { color: { r: 0.11, g: 0.16, b: 0.14 }, alpha: 0.95 },
                    stroke: { color: { r: 0.77, g: 0.92, b: 0.84 }, width: 2, alpha: 1 },
                },
                textStyle: {
                    fontSize: 20,
                    fill: 0xf3f7f4,
                    align: 'center',
                    wordWrap: true,
                },
            }, app);

            const thoughtCaption = new CaptionStore({
                id: 'caption-thought',
                text: 'Thought caption\nedge circles',
                x: 860,
                y: 90,
                shape: 'thought',
                autoSize: false,
                width: 270,
                height: 145,
                padding: 16,
                pointer: {
                    enabled: true,
                    baseWidth: 10,
                    length: 30,
                    speaker: thoughtSpeaker,
                },
                thought: {
                    edgeCircleCount: 40,
                    edgeCircleRadiusRatio: 0.08,
                    edgeCircleOutsetRatio: 0.45,
                },
                backgroundStyle: {
                    fill: { color: { r: 0.17, g: 0.12, b: 0.17 }, alpha: 0.95 },
                    stroke: { color: { r: 0.93, g: 0.79, b: 0.94 }, width: 2, alpha: 1 },
                },
                textStyle: {
                    fontSize: 20,
                    fill: 0xf9f3fa,
                    align: 'center',
                    wordWrap: true,
                },
            }, app);

            const markerStyle = { color: 0xffb347, alpha: 1, width: 2 };
            const marker1 = new Graphics();
            marker1.circle(rectSpeaker.x, rectSpeaker.y, 9);
            marker1.fill({ color: 0xffb347 });
            marker1.circle(rectSpeaker.x, rectSpeaker.y, 13);
            marker1.stroke(markerStyle);

            const marker2 = new Graphics();
            marker2.circle(ovalSpeaker.x, ovalSpeaker.y, 9);
            marker2.fill({ color: 0xffb347 });
            marker2.circle(ovalSpeaker.x, ovalSpeaker.y, 13);
            marker2.stroke(markerStyle);

            const marker3 = new Graphics();
            marker3.circle(thoughtSpeaker.x, thoughtSpeaker.y, 9);
            marker3.fill({ color: 0xffb347 });
            marker3.circle(thoughtSpeaker.x, thoughtSpeaker.y, 13);
            marker3.stroke(markerStyle);

            app.stage.addChild(rectCaption.container);
            app.stage.addChild(ovalCaption.container);
            app.stage.addChild(thoughtCaption.container);
            app.stage.addChild(marker1, marker2, marker3);
        });

        return wrapper;
    },
};
