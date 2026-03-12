import type {Meta, StoryObj} from '@storybook/html';
import observeDrag, {dragTargetDecorator} from './index.js';
import {Application, Container, FederatedPointerEvent, Graphics, Text} from 'pixi.js';

interface DragTargetDecoratorArgs {}

const meta: Meta<DragTargetDecoratorArgs> = {
    title: 'Observe Drag/dragTargetDecorator',
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '540px';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';

        const status = document.createElement('div');
        status.style.position = 'absolute';
        status.style.left = '12px';
        status.style.top = '12px';
        status.style.padding = '8px 10px';
        status.style.background = 'rgba(255,255,255,0.9)';
        status.style.border = '1px solid #d0d0d0';
        status.style.borderRadius = '6px';
        status.style.fontFamily = 'sans-serif';
        status.style.fontSize = '12px';
        status.style.zIndex = '10';
        status.textContent = 'Left: dragTargetDecorator(). Right: snapped transform + wrapped listeners.';
        wrapper.appendChild(status);

        const app = new Application();
        const teardownFns: Array<() => void> = [];

        app.init({
            width: 900,
            height: 540,
            resizeTo: wrapper,
            backgroundColor: 0xf6f8fa,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);

            app.stage.eventMode = 'static';
            app.stage.hitArea = app.screen;

            const subscribeToDown = observeDrag<FederatedPointerEvent>({stage: app.stage});

            const boxA = makeBox('Decorator()', 130, 140, 0x4f46e5);
            const boxB = makeBox('Decorator + snap', 470, 220, 0x0f766e);

            app.stage.addChild(boxA);
            app.stage.addChild(boxB);

            const subA = subscribeToDown(
                boxA,
                dragTargetDecorator(),
                {dragTarget: boxA},
            );

            const subB = subscribeToDown(
                boxB,
                dragTargetDecorator<FederatedPointerEvent, undefined, Container>({
                    transformPoint(point) {
                        const snap = 20;
                        return {
                            x: Math.round(point.x / snap) * snap,
                            y: Math.round(point.y / snap) * snap,
                        };
                    },
                    listeners: {
                        onStart(event) {
                            boxB.alpha = 0.9;
                            status.textContent = `Snapped drag started (pointer ${event.pointerId})`;
                        },
                        onUp(event) {
                            boxB.alpha = 1;
                            status.textContent = `Snapped drag ended (pointer ${event.pointerId})`;
                        },
                        onBlocked() {
                            status.textContent = 'Drag blocked: another pointer stream is active';
                        },
                    },
                }),
                {dragTarget: boxB},
            );

            teardownFns.push(() => subA.unsubscribe(), () => subB.unsubscribe());
        });

        const cleanup = () => {
            while (teardownFns.length) {
                teardownFns.pop()?.();
            }
            app.destroy(true);
        };

        window.addEventListener('beforeunload', cleanup, {once: true});
        return wrapper;
    },
};

export default meta;
type Story = StoryObj<DragTargetDecoratorArgs>;

export const DecoratedDragTargets: Story = {};

function makeBox(labelText: string, x: number, y: number, color: number): Container {
    const box = new Container();
    box.position.set(x, y);
    box.eventMode = 'static';
    box.cursor = 'grab';

    const fill = new Graphics();
    fill.roundRect(0, 0, 220, 120, 14);
    fill.fill({color, alpha: 0.9});
    fill.stroke({color: 0x1f2937, width: 2});
    box.addChild(fill);

    const label = new Text({
        text: labelText,
        style: {
            fill: 0xffffff,
            fontSize: 20,
        },
    });
    label.anchor.set(0.5);
    label.position.set(110, 60);
    box.addChild(label);

    return box;
}
