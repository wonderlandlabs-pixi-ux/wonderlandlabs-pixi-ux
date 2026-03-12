import type {Meta, StoryObj} from '@storybook/html';
import observeDrag, {dragTargetDecorator} from './index.js';
import {createRootContainer, createZoomPan, makeStageZoomable} from '@wonderlandlabs-pixi-ux/root-container';
import {Application, Container, FederatedPointerEvent, Graphics, Text} from 'pixi.js';

interface ObserveDragArgs {}

const meta: Meta<ObserveDragArgs> = {
    title: 'Observe Drag/Three Draggables',
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '620px';
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
        status.textContent = 'Ready. Drag any box. Only one pointer stream can own moves at a time.';
        wrapper.appendChild(status);

        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.left = '12px';
        instructions.style.top = '56px';
        instructions.style.padding = '8px 10px';
        instructions.style.background = 'rgba(255,255,255,0.9)';
        instructions.style.border = '1px solid #d0d0d0';
        instructions.style.borderRadius = '6px';
        instructions.style.fontFamily = 'sans-serif';
        instructions.style.fontSize = '12px';
        instructions.style.zIndex = '10';
        instructions.textContent = 'Wheel to zoom. Drag boxes inside the zoomable root-container.';
        wrapper.appendChild(instructions);

        const app = new Application();
        const teardownFns: Array<() => void> = [];

        app.init({
            width: 900,
            height: 620,
            resizeTo: wrapper,
            backgroundColor: 0xf7f7f7,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);

            const subscribeToDown = observeDrag<FederatedPointerEvent>({stage: app.stage});
            const {root} = createRootContainer(app);
            const {zoomPan} = createZoomPan(app, root);
            const {destroy: destroyZoomable} = makeStageZoomable(app, zoomPan, {
                minZoom: 0.4,
                maxZoom: 4,
                zoomSpeed: 0.12,
            });

            app.stage.addChild(root);
            root.addChild(zoomPan);

            teardownFns.push(destroyZoomable);

            const guide = new Graphics();
            guide.roundRect(-420, -260, 840, 520, 16);
            guide.stroke({color: 0xd4d4d4, width: 2});
            zoomPan.addChild(guide);

            const guideText = new Text({
                text: 'Zoomable root-container space',
                style: {
                    fontSize: 14,
                    fill: 0x555555,
                },
            });
            guideText.position.set(-400, -245);
            zoomPan.addChild(guideText);

            const configs = [
                {id: 'box-a', label: 'Box A', x: -290, y: -120, color: 0xf25f5c},
                {id: 'box-b', label: 'Box B', x: -10, y: 40, color: 0x247ba0},
                {id: 'box-c', label: 'Box C', x: 250, y: -70, color: 0x70c1b3},
            ];

            for (const config of configs) {
                const container = new Container();
                container.position.set(config.x, config.y);
                container.eventMode = 'static';
                container.cursor = 'grab';

                const box = new Graphics();
                box.roundRect(0, 0, 170, 110, 12);
                box.fill({color: config.color, alpha: 0.85});
                box.stroke({color: 0x2b2b2b, width: 2});
                container.addChild(box);

                const label = new Text({
                    text: config.label,
                    style: {
                        fontSize: 20,
                        fill: 0xffffff,
                    },
                });
                label.anchor.set(0.5);
                label.position.set(85, 55);
                container.addChild(label);

                zoomPan.addChild(container);
                teardownFns.push(
                    makeObservedDraggable({
                        id: config.id,
                        target: container,
                        subscribeToDown,
                        setStatus: (message) => {
                            status.textContent = message;
                        },
                    }),
                );
            }
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
type Story = StoryObj<ObserveDragArgs>;

export const ThreeDraggables: Story = {};

function makeObservedDraggable(args: {
    id: string;
    target: Container;
    subscribeToDown: ReturnType<typeof observeDrag<FederatedPointerEvent>>;
    setStatus: (message: string) => void;
}): () => void {
    const {id, target, subscribeToDown, setStatus} = args;

    const resetCycleState = () => {
        target.cursor = 'grab';
        target.alpha = 1;
    };

    const downSubscription = subscribeToDown(
        target,
        dragTargetDecorator<FederatedPointerEvent, undefined, Container>({
            listeners: {
                onStart(event) {
                    target.cursor = 'grabbing';
                    target.alpha = 0.95;
                    setStatus(`${id}: drag accepted for pointer ${event.pointerId}`);
                },
                onUp(event) {
                    resetCycleState();
                    setStatus(`${id}: drag complete (terminal pointer ${event.pointerId})`);
                },
                onBlocked() {
                    setStatus(`${id}: drag busy (another stream owns pointer tracking)`);
                },
                onError(error, phase) {
                    const message = error instanceof Error ? error.message : String(error);
                    resetCycleState();
                    setStatus(`${id}: drag ${phase} error: ${message}`);
                },
            },
        }),
        {dragTarget: target},
    );

    return () => {
        downSubscription.unsubscribe();
    };
}
