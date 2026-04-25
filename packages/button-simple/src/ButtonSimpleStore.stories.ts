import type {Meta, StoryObj} from '@storybook/html';
import * as Pixi from 'pixi.js';
import {StyleTree} from '@wonderlandlabs-pixi-ux/style-tree';
import {PixiProvider} from '@wonderlandlabs-pixi-ux/utils';
import {
  ButtonSimpleStore,
  CONTROL_CHECKBOX,
  CONTROL_RADIO,
  createButtonSimpleComparisonStyleTree,
  createButtonSimpleStoreClass,
  EVENT_CHECK_CHANGED,
  EVENT_RADIO_SELECTED,
  ICON_IMAGE,
  ORIENTATION_VERTICAL,
  PART_ICON,
  PART_LABEL,
  makeButtonStyle,
} from './index.js';

const STORY_BACKGROUND = new Pixi.Color('#f3eee2').toNumber();

const meta: Meta = {
  title: 'Button Simple/ButtonSimpleStore',
};

export default meta;
type Story = StoryObj;

function createStoryShell(height: number): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.width = '100%';
  wrapper.style.height = `${height}px`;
  wrapper.style.minHeight = `${height}px`;
  wrapper.style.background = 'linear-gradient(180deg, #f9f4ea 0%, #e8efe6 100%)';
  wrapper.style.border = '1px solid #ddd4c4';
  wrapper.style.borderRadius = '16px';
  wrapper.style.padding = '12px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'auto';
  return wrapper;
}

function addStoryMetric(wrapper: HTMLDivElement, label: string): HTMLDivElement {
  const metric = document.createElement('div');
  metric.style.position = 'absolute';
  metric.style.left = '18px';
  metric.style.bottom = '12px';
  metric.style.padding = '6px 8px';
  metric.style.borderRadius = '6px';
  metric.style.background = 'rgba(255, 255, 255, 0.82)';
  metric.style.color = '#263242';
  metric.style.font = '12px Menlo, Consolas, monospace';
  metric.textContent = label;
  wrapper.appendChild(metric);
  return metric;
}

async function createPixiApp(wrapper: HTMLDivElement): Promise<Pixi.Application> {
  PixiProvider.init(Pixi);
  const app = new Pixi.Application();
  await app.init({
    resizeTo: wrapper,
    backgroundColor: STORY_BACKGROUND,
    antialias: true,
  });
  wrapper.appendChild(app.canvas);
  return app;
}

function baseButtonTree(root = 'button.simple'): StyleTree {
  const tree = createButtonSimpleComparisonStyleTree();
  if (root !== 'button.simple') {
    copyButtonTreeRoot(tree, 'button.simple', root);
  }
  return tree;
}

function copyButtonTreeRoot(tree: StyleTree, from: string, to: string): void {
  for (const [key, value] of tree.entries()) {
    const [nounKey, stateKey = ''] = key.split(':');
    if (!nounKey.startsWith(from)) {
      continue;
    }
    const states = stateKey ? stateKey.split('-') : [];
    tree.set(nounKey.replace(from, to), states, value);
  }
}

function setVerticalButton(tree: StyleTree, root = 'button.simple'): StyleTree {
  tree.set(`${root}.layout.orientation`, [], ORIENTATION_VERTICAL);
  tree.set(`${root}.layout.gap`, [], 6);
  tree.set(`${root}.layout.padding.x`, [], 10);
  tree.set(`${root}.layout.padding.y`, [], 10);
  tree.set(`${root}.layout.min.width`, [], 88);
  tree.set(`${root}.layout.min.height`, [], 96);
  tree.set(`${root}.layout.border.radius`, [], 18);
  tree.set(`${root}.icon.width`, [], 22);
  tree.set(`${root}.icon.height`, [], 22);
  tree.set(`${root}.label.font.size`, [], 12);
  return tree;
}

function setWarmButton(tree: StyleTree, root = 'button.simple'): StyleTree {
  tree.set(`${root}.layout.background.color`, [], '#65513d');
  tree.set(`${root}.layout.background.color`, ['hovered'], '#82684f');
  tree.set(`${root}.layout.background.color`, ['down'], '#574535');
  tree.set(`${root}.layout.border.color`, [], '#3e2d1e');
  tree.set(`${root}.layout.border.color`, ['hovered'], '#513726');
  tree.set(`${root}.layout.border.color`, ['down'], '#342418');
  tree.set(`${root}.icon.type`, [], 'circle');
  tree.set(`${root}.icon.checked.type`, [], 'filledCircle');
  tree.set(`${root}.icon.fill.color`, [], '#ffd49b');
  tree.set(`${root}.icon.fill.color`, ['hovered'], '#ffe2b9');
  tree.set(`${root}.icon.fill.color`, ['down'], '#f6c57f');
  tree.set(`${root}.label.color`, [], '#fff8ef');
  return tree;
}

const GRID_COLUMNS = 10;
const GRID_ROWS = 10;
const GRID_START_X = 24;
const GRID_START_Y = 24;
const GRID_STEP_X = 92;
const GRID_STEP_Y = 48;

function gridPosition(index: number): { x: number; y: number } {
  return {
    x: GRID_START_X + (index % GRID_COLUMNS) * GRID_STEP_X,
    y: GRID_START_Y + Math.floor(index / GRID_COLUMNS) * GRID_STEP_Y,
  };
}

function gridLabel(index: number): string {
  return `B${String(index + 1).padStart(2, '0')}`;
}

export const CustomArrangements: Story = {
  render: () => {
    const wrapper = createStoryShell(240);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      // 1. No icon
      const noIconTree = baseButtonTree('button.no-icon');
      noIconTree.set('button.no-icon.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#ffffff'},
            hovered: {color: '#ffff00'},
            down: {color: '#cccccc'},
            disabled: {color: '#666666'},
          }
        }
      ]);

      // 2. Label then star icon
      const labelFirstTree = baseButtonTree('button.label-first');
      labelFirstTree.set('button.label-first.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#ffffff'},
            hovered: {color: '#ffffff'},
            down: {color: '#ffffff'},
            disabled: {color: '#cccccc'},
          }
        },
        {
          type: PART_ICON,
          id: 'icon',
          iconType: ICON_IMAGE,
          icon: '/icons/demo-icon.png',
          width: 16,
          height: 16,
          iconStyle: {
            active: {alpha: 1, color: '#ffffff'},
            hovered: {alpha: 1, color: '#ffff00'},
            down: {alpha: 1, color: '#cccccc'},
            disabled: {alpha: 0.5, color: '#666666'},
          }
        }
      ]);

      // 3. Label Star Label
      const multiIconTree = baseButtonTree('button.multi-icon');
      multiIconTree.set('button.multi-icon.children', [], [
        {
          type: PART_LABEL,
          id: 'label-left',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#ffffff'},
            hovered: {color: '#ffffff'},
            down: {color: '#ffffff'},
            disabled: {color: '#ffffff'},
          }
        },
        {
          type: PART_ICON,
          id: 'star-icon',
          iconType: ICON_IMAGE,
          icon: '/icons/demo-icon.png',
          width: 16,
          height: 16,
          iconStyle: {
            active: {alpha: 1, color: '#ffffff'},
            hovered: {alpha: 1, color: '#ffffff'},
            down: {alpha: 1, color: '#ffffff'},
            disabled: {alpha: 0.5, color: '#ffffff'},
          }
        },
        {
          type: PART_LABEL,
          id: 'label-right',
          text: 'Suffix',
          labelStyle: {
            active: {color: '#ffd49b'},
            hovered: {color: '#ffd49b'},
            down: {color: '#ffd49b'},
            disabled: {color: '#ffffff'},
          }
        }
      ]);

      const b1 = new ButtonSimpleStore({label: 'No Icon'}, {
        app, parentContainer: app.stage, pixi, styleTree: noIconTree, root: 'button.no-icon', x: 20, y: 40
      });
      const b2 = new ButtonSimpleStore({label: 'Label First'}, {
        app, parentContainer: app.stage, pixi, styleTree: labelFirstTree, root: 'button.label-first', x: 150, y: 40
      });
      const b3 = new ButtonSimpleStore({label: 'Label Star Label'}, {
        app, parentContainer: app.stage, pixi, styleTree: multiIconTree, root: 'button.multi-icon', x: 300, y: 40
      });

      [b1, b2, b3].forEach(b => b.kickoff());
    })();

    return wrapper;
  }
};

export const GradientBackgrounds: Story = {
  render: () => {
    const wrapper = createStoryShell(240);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      const gradTree = baseButtonTree('button.grad');
      gradTree.set('button.grad.layout.background.color', [], {
        direction: 'vertical',
        colors: ['#4a90e2', '#357abd']
      });
      gradTree.set('button.grad.layout.background.color', ['hovered'], {
        direction: 'vertical',
        colors: ['#5da1f3', '#4a90e2']
      });
      gradTree.set('button.grad.layout.background.color', ['down'], {
        direction: 'vertical',
        colors: ['#255a8f', '#1a3f65']
      });
      gradTree.set('button.grad.layout.background.color', ['disabled'], '#b2bcc7');

      const b1 = new ButtonSimpleStore({label: 'Vertical Gradient'}, {
        app, parentContainer: app.stage, pixi, styleTree: gradTree, root: 'button.grad', x: 40, y: 40
      });

      const gradTreeH = baseButtonTree('button.gradh');
      gradTreeH.set('button.gradh.layout.background.color', [], {
        direction: 'horizontal',
        colors: ['#e24a4a', '#bd3535']
      });
      gradTreeH.set('button.gradh.layout.background.color', ['hovered'], {
        direction: 'horizontal',
        colors: ['#f35d5d', '#e24a4a']
      });
      gradTreeH.set('button.gradh.layout.background.color', ['down'], {
        direction: 'horizontal',
        colors: ['#8f2525', '#651a1a']
      });
      gradTreeH.set('button.gradh.layout.background.color', ['disabled'], '#c7b2b2');

      const b2 = new ButtonSimpleStore({label: 'Horizontal Gradient'}, {
        app, parentContainer: app.stage, pixi, styleTree: gradTreeH, root: 'button.gradh', x: 250, y: 40
      });

      [b1, b2].forEach(b => b.kickoff());
    })();

    return wrapper;
  }
};

export const ImageIcons: Story = {
  render: () => {
    const wrapper = createStoryShell(240);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;

      const imgTree = baseButtonTree('button.img');
      imgTree.set('button.img.children', [], [
        {
          type: PART_ICON,
          id: 'img-icon',
          iconType: ICON_IMAGE,
          icon: '/icons/demo-icon.png',
          width: 32,
          height: 32,
          iconStyle: {
            active: {alpha: 1},
            hovered: {alpha: 1},
            down: {alpha: 0.8},
            disabled: {alpha: 0.5},
          }
        },
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#ffffff'},
            hovered: {color: '#ffffff'},
            down: {color: '#ffffff'},
            disabled: {color: '#cccccc'},
          }
        }
      ]);

      const b1 = new ButtonSimpleStore({label: 'Star Button'}, {
        app, parentContainer: app.stage, pixi, styleTree: imgTree, root: 'button.img', x: 40, y: 40
      });

      // Managed icon with image? Managed icons use shape by default, but we can override icon.type
      const managedImgTree = baseButtonTree('button.managed-img');
      managedImgTree.set('button.managed-img.icon.type', [], ICON_IMAGE);
      // But managed icon expects some specific props for image icon if we want it to work as IMAGE.
      // Currently resolveButtonSimpleStyle managed-icon uses read('icon.type', ICON_CIRCLE).
      // If we set it to ICON_IMAGE, it might fail because it doesn't have 'icon' property.
      // Let's stick to user children for image icons for now as it's more flexible.

      [b1].forEach(b => b.kickoff());
    })();

    return wrapper;
  }
};

export const HorizontalExamples: Story = {
  render: () => {
    const wrapper = createStoryShell(220);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;
      const primaryTree = baseButtonTree('button.primary');
      primaryTree.set('button.primary.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#ffffff'},
            hovered: {color: '#ffffff'},
            down: {color: '#ffffff'},
            disabled: {color: '#cccccc'},
          }
        }
      ]);
      const dangerTree = setWarmButton(baseButtonTree('button.danger'), 'button.danger');
      dangerTree.set('button.danger.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#fff8ef'},
            hovered: {color: '#fff8ef'},
            down: {color: '#fff8ef'},
            disabled: {color: '#cccccc'},
          }
        }
      ]);

      const primary = new ButtonSimpleStore({
        label: 'Launch Sequence',
        checked: true,
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        styleTree: primaryTree,
        root: 'button.primary',
        x: 40,
        y: 44,
      });

      const danger = new ButtonSimpleStore({
        label: 'Delete',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        styleTree: dangerTree,
        root: 'button.danger',
        x: 300,
        y: 44,
      });

      const disabled = new ButtonSimpleStore({
        label: 'Unavailable',
        disabled: true,
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        styleTree: primaryTree,
        root: 'button.primary',
        x: 500,
        y: 44,
      });

      [primary, danger, disabled].forEach((button) => button.kickoff());
    })();

    return wrapper;
  },
};

export const VerticalExamples: Story = {
  render: () => {
    const wrapper = createStoryShell(240);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;
      const coolTree = setVerticalButton(baseButtonTree('button.vertical'), 'button.vertical');
      coolTree.set('button.vertical.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#ffffff'},
            hovered: {color: '#ffffff'},
            down: {color: '#ffffff'},
            disabled: {color: '#cccccc'},
          }
        },
        {
          type: PART_ICON,
          id: 'star-icon',
          iconType: ICON_IMAGE,
          icon: '/icons/demo-icon.png',
          width: 24,
          height: 24,
          iconStyle: {
            active: {alpha: 1},
            hovered: {alpha: 1},
            down: {alpha: 0.8},
            disabled: {alpha: 0.5},
          }
        }
      ]);
      const warmTree = setWarmButton(setVerticalButton(baseButtonTree('button.gallery'), 'button.gallery'), 'button.gallery');
      warmTree.set('button.gallery.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#fff8ef'},
            hovered: {color: '#fff8ef'},
            down: {color: '#fff8ef'},
            disabled: {color: '#cccccc'},
          }
        }
      ]);

      const VerticalButton = createButtonSimpleStoreClass(coolTree, 'button.vertical');
      const GalleryButton = createButtonSimpleStoreClass(warmTree, 'button.gallery');

      const profile = new VerticalButton({ label: 'Profile', checked: true }, { app, parentContainer: app.stage, pixi });
      const gallery = new GalleryButton({ label: 'Gallery', checked: true }, { app, parentContainer: app.stage, pixi });
      const locked = new VerticalButton({ label: 'Locked', disabled: true }, { app, parentContainer: app.stage, pixi });

      profile.setPosition(64, 42);
      gallery.setPosition(220, 42);
      locked.setPosition(388, 42);
      [profile, gallery, locked].forEach((button) => button.kickoff());
    })();

    return wrapper;
  },
};

export const DynamicLabelGrowth: Story = {
  render: () => {
    const wrapper = createStoryShell(180);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;
      const button = new ButtonSimpleStore({
        label: 'Go',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        styleTree: (() => {
          const t = baseButtonTree();
          t.set('button.simple.children', [], [
            {
              type: PART_LABEL,
              id: 'label',
              useButtonLabel: true,
              labelStyle: {
                active: {color: '#ffffff'},
                hovered: {color: '#ffffff'},
                down: {color: '#ffffff'},
                disabled: {color: '#cccccc'},
              }
            }
          ]);
          return t;
        })(),
        x: 40,
        y: 50,
      });

      button.kickoff();
      window.setTimeout(() => button.updateState({ label: 'Proceed To Checkout' }), 1200);
      window.setTimeout(() => button.updateState({ label: 'Done', disabled: true }), 2600);
    })();

    return wrapper;
  },
};

function setCoolButton(tree: StyleTree, root = 'button.simple'): StyleTree {
  tree.set(`${root}.layout.background.color`, [], '#3d5165');
  tree.set(`${root}.layout.background.color`, ['hovered'], '#4f6882');
  tree.set(`${root}.layout.background.color`, ['down'], '#354557');
  tree.set(`${root}.layout.border.color`, [], '#1e2d3e');
  tree.set(`${root}.layout.border.color`, ['hovered'], '#263751');
  tree.set(`${root}.layout.border.color`, ['down'], '#182434');
  tree.set(`${root}.icon.type`, [], 'box');
  tree.set(`${root}.icon.checked.type`, [], 'filledBox');
  tree.set(`${root}.icon.fill.color`, [], '#9bbdff');
  tree.set(`${root}.icon.fill.color`, ['hovered'], '#b9d2ff');
  tree.set(`${root}.icon.fill.color`, ['down'], '#7f9ef6');
  tree.set(`${root}.label.color`, [], '#eff8ff');
  return tree;
}

export const RadioAndCheckboxEvents: Story = {
  render: () => {
    const wrapper = createStoryShell(300);
    const metric = addStoryMetric(wrapper, 'events: pending');

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;
      const radioButtons: ButtonSimpleStore[] = [];
      const checkboxes: ButtonSimpleStore[] = [];
      const checkedValues = () => checkboxes
        .filter((button) => button.value.checked)
        .map((button) => button.value.buttonValue);

      const radioTree = setWarmButton(baseButtonTree('button.radio'), 'button.radio');
      radioTree.set('button.radio.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#fff8ef'},
            hovered: {color: '#fff8ef'},
            down: {color: '#fff8ef'},
            disabled: {color: '#cccccc'},
          }
        }
      ]);

      const checkboxTree = setCoolButton(baseButtonTree('button.checkbox'), 'button.checkbox');
      checkboxTree.set('button.checkbox.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#eff8ff'},
            hovered: {color: '#eff8ff'},
            down: {color: '#eff8ff'},
            disabled: {color: '#cccccc'},
          }
        }
      ]);
      const RadioButton = createButtonSimpleStoreClass(radioTree, 'button.radio');
      const CheckboxButton = createButtonSimpleStoreClass(checkboxTree, 'button.checkbox');

      app.stage.on(EVENT_RADIO_SELECTED, (event: { id?: string; buttonValue?: unknown }) => {
        radioButtons.forEach((button) => button.onRadioDeselected({ id: event.id }));
        metric.textContent = `radioSelected: ${String(event.buttonValue)}`;
      });

      app.stage.on(EVENT_CHECK_CHANGED, (event: { changedButtonValue?: unknown; checkedValues?: unknown[] }) => {
        metric.textContent = `checkChanged: ${String(event.changedButtonValue)} -> [${(event.checkedValues ?? []).join(', ')}]`;
      });

      ['login', 'register', 'guest'].forEach((value, index) => {
        const button = new RadioButton({
          id: `radio-${value}`,
          label: value,
          buttonValue: value,
          controlType: CONTROL_RADIO,
          checked: index === 0,
        }, { app, parentContainer: app.stage, pixi });
        button.setPosition(40 + index * 150, 44);
        button.kickoff();
        radioButtons.push(button);
      });

      ['alerts', 'exports', 'audit'].forEach((value, index) => {
        const button = new CheckboxButton({
          id: `check-${value}`,
          label: value,
          buttonValue: value,
          controlType: CONTROL_CHECKBOX,
          checked: index === 0,
        }, { app, parentContainer: app.stage, pixi, getCheckedValues: checkedValues });
        button.setPosition(40 + index * 150, 120);
        button.kickoff();
        checkboxes.push(button);
      });

      metric.textContent = `checkChanged: init -> [${checkedValues().join(', ')}]`;
    })();

    return wrapper;
  },
};

export const PressState: Story = {
  render: () => {
    const wrapper = createStoryShell(200);

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;
      const button = new ButtonSimpleStore({
        label: 'Hold To Confirm',
      }, {
        app,
        parentContainer: app.stage,
        pixi,
        styleTree: (() => {
          const t = baseButtonTree();
          t.set('button.simple.children', [], [
            {
              type: PART_LABEL,
              id: 'label',
              useButtonLabel: true,
              labelStyle: {
                active: {color: '#ffffff'},
                hovered: {color: '#ffffff'},
                down: {color: '#ffffff'},
                disabled: {color: '#cccccc'},
              }
            }
          ]);
          return t;
        })(),
        x: 40,
        y: 44,
      });

      button.kickoff();
      window.setTimeout(() => {
        button.onPointerOver();
        button.onPointerDown();
      }, 800);
      window.setTimeout(() => button.onPointerUp(), 1800);
    })();

    return wrapper;
  },
};

export const StyleTreeButtonGrid: Story = {
  render: () => {
    const wrapper = createStoryShell(560);
    const metric = addStoryMetric(wrapper, 'style-tree grid: pending');

    void (async () => {
      const app = await createPixiApp(wrapper);
      const pixi = PixiProvider.shared;
      const styleTree = baseButtonTree();
      styleTree.set('button.simple.children', [], [
        {
          type: PART_LABEL,
          id: 'label',
          useButtonLabel: true,
          labelStyle: {
            active: {color: '#ffffff'},
            hovered: {color: '#ffffff'},
            down: {color: '#ffffff'},
            disabled: {color: '#cccccc'},
          }
        }
      ]);
      const GridButton = createButtonSimpleStoreClass(styleTree);
      const buttons: ButtonSimpleStore[] = [];
      const started = performance.now();

      for (let index = 0; index < GRID_COLUMNS * GRID_ROWS; index += 1) {
        const button = new GridButton({
          label: gridLabel(index),
          checked: index % 3 === 0,
          disabled: index % 17 === 0,
        }, { app, parentContainer: app.stage, pixi });
        const { x, y } = gridPosition(index);
        button.setPosition(x, y);
        button.kickoff();
        buttons.push(button);
      }

      app.render();
      metric.textContent = `style-tree grid: ${buttons.length} buttons in ${(performance.now() - started).toFixed(1)}ms`;
    })();

    return wrapper;
  },
};

export const MakeButtonStyleDemo: Story = {
  argTypes: {
    baseColor: {control: 'color'},
    textColor: {control: 'color'},
    fontSize: {control: {type: 'number', min: 1, max: 100, step: 1}},
    paddingX: {control: {type: 'number', min: 0, max: 100, step: 1}},
    paddingY: {control: {type: 'number', min: 0, max: 100, step: 1}},
  },
  args: {
    baseColor: '#ff6b6b',
    textColor: '#ffffff',
    fontSize: 16,
    paddingX: 20,
    paddingY: 10,
  },
  render: (args, { loaded: { app } }) => {
    const wrapper = createStoryShell(600, 350);
    const pixi = PixiProvider.shared;

    const jsonField = document.createElement('pre');
    jsonField.style.width = '50%';
    jsonField.style.height = '350px';
    jsonField.style.overflow = 'auto';
    jsonField.style.background = '#2c3e50';
    jsonField.style.color = '#ecf0f1';
    jsonField.style.padding = '10px';
    jsonField.style.fontSize = '12px';
    jsonField.style.fontFamily = 'Monaco, monospace';
    jsonField.style.borderRadius = '8px';
    jsonField.style.margin = '0';
    jsonField.style.boxSizing = 'border-box';

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '10px';
    container.style.alignItems = 'flex-start';
    container.style.width = '100%';

    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.width = '50%';
    canvasWrapper.appendChild(app.canvas);
    app.canvas.style.width = '100%';
    app.canvas.style.height = 'auto';

    const styleTree = makeButtonStyle({
      baseColor: args.baseColor,
      textColor: args.textColor,
      fontSize: args.fontSize,
      padding: { x: args.paddingX, y: args.paddingY },
    });

    // --- VARIETY: Overriding styleTree for different types ---
    // Image icon children
    const imgChildren = [
      {
        type: PART_ICON,
        id: 'img-icon',
        iconType: ICON_IMAGE,
        icon: '/icons/demo-icon.png',
        width: Math.max(16, args.fontSize),
        height: Math.max(16, args.fontSize),
        iconStyle: {
          active: { alpha: 1 },
          hovered: { alpha: 1 },
          down: { alpha: 0.8 },
          disabled: { alpha: 0.5 },
        }
      },
      {
        type: PART_LABEL,
        id: 'label',
        useButtonLabel: true,
        labelStyle: {
          active: { color: args.textColor },
          hovered: { color: args.textColor },
          down: { color: args.textColor },
          disabled: { color: '#cccccc' },
        }
      }
    ];

    // Text only children
    const textOnlyChildren = [
      {
        type: PART_LABEL,
        id: 'label',
        useButtonLabel: true,
        labelStyle: {
          active: { color: args.textColor },
          hovered: { color: args.textColor },
          down: { color: args.textColor },
          disabled: { color: '#cccccc' },
        }
      }
    ];

    console.log('MakeButtonStyleDemo: args', args);
    console.log('MakeButtonStyleDemo: styleTree fontSize', styleTree.get('button.simple.label.font.size', []));

    jsonField.textContent = JSON.stringify(styleTree.toJSON(), null, 2);

    // Clear stage before adding new buttons
    app.stage.removeChildren();

    const commonProps = {
      app,
      parentContainer: app.stage,
      pixi,
      styleTree,
    };

    // 1. Text Only Button
    const textTree = styleTree.clone();
    textTree.set('button.simple.children', [], textOnlyChildren);
    const textButton = new ButtonSimpleStore({
      label: 'Text Only',
    }, {
      ...commonProps,
      styleTree: textTree,
    });

    textButton.setPosition(150, 40);
    textButton.kickoff();

    // 2. Image Button
    const imgTree = styleTree.clone();
    imgTree.set('button.simple.children', [], imgChildren);
    const imgButton = new ButtonSimpleStore({
      label: 'Image Icon',
    }, {
      ...commonProps,
      styleTree: imgTree,
    });

    imgButton.setPosition(150, 110);
    imgButton.kickoff();

    // 3. Checkbox Button
    const checkboxButton = new ButtonSimpleStore({
      label: 'Checkbox',
      controlType: CONTROL_CHECKBOX,
    }, {
      ...commonProps,
    });
    checkboxButton.setPosition(150, 180);
    checkboxButton.kickoff();

    // 4. Radio Button
    const radioButton = new ButtonSimpleStore({
      label: 'Radio',
      controlType: CONTROL_RADIO,
    }, {
      ...commonProps,
    });
    radioButton.setPosition(150, 250);
    radioButton.kickoff();

    container.appendChild(canvasWrapper);
    container.appendChild(jsonField);
    wrapper.appendChild(container);

    return wrapper;
  },
  loaders: [
    async () => {
      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.style.height = '600px';
      const app = await createPixiApp(wrapper);
      // Remove canvas from wrapper to allow render function to place it
      if (app.canvas.parentNode) {
        app.canvas.parentNode.removeChild(app.canvas);
      }
      return { app };
    },
  ],
};
