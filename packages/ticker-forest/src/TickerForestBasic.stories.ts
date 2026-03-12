import type {Meta, StoryObj} from '@storybook/html';
import {Application, Graphics, Text} from 'pixi.js';
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
