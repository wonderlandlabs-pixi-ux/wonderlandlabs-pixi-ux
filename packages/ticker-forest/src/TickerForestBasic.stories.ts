import type {Meta, StoryObj} from '@storybook/html';
import {Application, Graphics, Text} from 'pixi.js';
import {Subject, Subscription} from 'rxjs';
import {TickerForest} from './TickerForest.js';

type ShapeState = {
    x: number;
    y: number;
    hovered: boolean;
    clicks: number;
};

class HoverMoveStore extends TickerForest<ShapeState> {
    readonly shape: Graphics;
    readonly label: Text;

    constructor(app: Application) {
        super(
            {
                value: {
                    x: 120,
                    y: 120,
                    hovered: false,
                    clicks: 0,
                },
            },
            {
                app,
                container: app.stage,
            },
        );

        this.shape = new Graphics();
        this.shape.eventMode = 'static';
        this.shape.cursor = 'pointer';

        this.label = new Text({
            text: '',
            style: {
                fill: 0x111111,
                fontSize: 14,
            },
        });
        this.label.eventMode = 'none';
    }

    protected resolve(): void {
        const {x, y, hovered, clicks} = this.value;

        this.shape.clear();
        this.shape.rect(0, 0, 120, 80);
        this.shape.fill(hovered ? 0xff3b30 : 0x4287f5);
        this.shape.stroke({width: 2, color: 0x111111});
        this.shape.position.set(x, y);

        this.label.text = `x: ${x} | clicks: ${clicks}`;
        this.label.position.set(x, y - 26);
    }
}

type DebugState = {
    x: number;
    y: number;
    renders: number;
};

type DebugEvent = {
    type: string;
    detail?: Record<string, unknown>;
};

abstract class DebugTickerForest<T> extends TickerForest<T> {
    readonly events: Subject<DebugEvent>;

    constructor(
        value: T,
        app: Application,
        events: Subject<DebugEvent>,
    ) {
        super({value}, {app, container: app.stage});
        this.events = events;
    }

    override dirty(): void {
        this.events.next({
            type: 'dirty',
            detail: this.debugDetail(),
        });
        super.dirty();
    }

    protected resolve(): void {
        this.events.next({
            type: 'resolve-start',
            detail: this.debugDetail(),
        });
        this.debugResolve();
        this.events.next({
            type: 'resolve-complete',
            detail: this.debugDetail(),
        });
    }

    protected abstract debugResolve(): void;
    protected abstract debugDetail(): Record<string, unknown>;
}

class DebugRectStore extends DebugTickerForest<DebugState> {
    readonly shape: Graphics;
    readonly label: Text;

    constructor(app: Application, events: Subject<DebugEvent>) {
        super(
            {
                x: 120,
                y: 120,
                renders: 0,
            },
            app,
            events,
        );

        this.shape = new Graphics();
        this.label = new Text({
            text: '',
            style: {
                fill: 0x111111,
                fontSize: 14,
            },
        });
        this.label.eventMode = 'none';
    }

    protected debugResolve(): void {
        const nextRenders = this.value.renders + 1;
        this.shape.clear();
        this.shape.roundRect(0, 0, 140, 90, 12);
        this.shape.fill(0x3b82f6);
        this.shape.stroke({width: 2, color: 0x1f2937});
        this.shape.position.set(this.value.x, this.value.y);

        this.label.text = `renders: ${nextRenders}`;
        this.label.position.set(this.value.x, this.value.y - 28);

        this.mutate((draft) => {
            draft.renders = nextRenders;
        });
    }

    protected debugDetail(): Record<string, unknown> {
        return {
            renders: this.value.renders,
        };
    }
}

interface StoryArgs {}

const meta: Meta<StoryArgs> = {
    title: 'TickerForest/Basic',
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '420px';

        const app = new Application();
        app.init({
            width: 800,
            height: 420,
            backgroundColor: 0xf2f2f2,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);
            app.stage.eventMode = 'static';

            const store = new HoverMoveStore(app);
            app.stage.addChild(store.shape, store.label);

            store.shape.on('pointerover', () => {
                store.mutate((draft) => {
                    draft.hovered = true;
                });
                store.dirty();
            });

            store.shape.on('pointerout', () => {
                store.mutate((draft) => {
                    draft.hovered = false;
                });
                store.dirty();
            });

            store.shape.on('pointerdown', () => {
                store.mutate((draft) => {
                    draft.x += 20;
                    draft.clicks += 1;
                });
                store.dirty();
            });

            store.kickoff();
        });

        return wrapper;
    },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const HoverAndClick: Story = {
    args: {},
};

function makeLogPanel(): {panel: HTMLPreElement; push: (event: DebugEvent) => void} {
    const panel = document.createElement('pre');
    panel.style.width = '360px';
    panel.style.height = '420px';
    panel.style.margin = '0';
    panel.style.padding = '12px';
    panel.style.overflow = 'auto';
    panel.style.border = '1px solid #d1d5db';
    panel.style.borderRadius = '8px';
    panel.style.background = '#ffffff';
    panel.style.color = '#111827';
    panel.style.fontSize = '12px';
    panel.style.lineHeight = '1.4';

    const lines: string[] = [];
    const push = (event: DebugEvent) => {
        const line = `${new Date().toLocaleTimeString()} ${event.type}${event.detail ? ` ${JSON.stringify(event.detail)}` : ''}`;
        lines.push(line);
        if (lines.length > 80) {
            lines.shift();
        }
        panel.textContent = lines.join('\n');
        panel.scrollTop = panel.scrollHeight;
    };

    return {panel, push};
}

export const DebugRect: Story = {
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '16px';
        wrapper.style.alignItems = 'flex-start';

        const canvasWrap = document.createElement('div');
        canvasWrap.style.width = '800px';
        canvasWrap.style.height = '420px';

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.flexDirection = 'column';
        controls.style.gap = '12px';

        const button = document.createElement('button');
        button.textContent = 'Dirty Once';
        button.style.padding = '8px 12px';

        const autoButton = document.createElement('button');
        autoButton.textContent = 'Dirty 5 Times';
        autoButton.style.padding = '8px 12px';

        const {panel, push} = makeLogPanel();
        const events = new Subject<DebugEvent>();
        let subscription: Subscription | undefined;

        controls.appendChild(button);
        controls.appendChild(autoButton);
        controls.appendChild(panel);
        wrapper.appendChild(canvasWrap);
        wrapper.appendChild(controls);

        const app = new Application();
        app.init({
            width: 800,
            height: 420,
            backgroundColor: 0xf2f2f2,
            antialias: true,
        }).then(() => {
            canvasWrap.appendChild(app.canvas);
            subscription = events.subscribe(push);
            const store = new DebugRectStore(app, events);
            app.stage.addChild(store.shape, store.label);

            button.onclick = () => {
                events.next({type: 'manual-dirty-click'});
                store.dirty();
            };

            autoButton.onclick = () => {
                events.next({type: 'multi-dirty-click'});
                for (let index = 0; index < 5; index += 1) {
                    store.dirty();
                }
            };

            store.kickoff();
            events.next({type: 'kickoff-complete'});
        });

        wrapper.addEventListener('DOMNodeRemoved', () => {
            subscription?.unsubscribe();
            events.complete();
        });

        return wrapper;
    },
};
