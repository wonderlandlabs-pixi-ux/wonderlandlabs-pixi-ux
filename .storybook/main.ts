import type { StorybookConfig } from '@storybook/html-vite';
import { mergeConfig } from 'vite';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const storybookDir = fileURLToPath(new URL('.', import.meta.url));

function resolveWorkspaceAliases() {
  const packagesDir = resolve(storybookDir, '../packages');
  if (!existsSync(packagesDir)) {
    return [];
  }

  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const packageName = entry.name;
      const sourceEntry = resolve(packagesDir, packageName, 'src/index.ts');
      if (!existsSync(sourceEntry)) {
        return null;
      }
      return {
        find: `@wonderlandlabs-pixi-ux/${packageName}`,
        replacement: sourceEntry,
      };
    })
    .filter((entry): entry is { find: string; replacement: string } => entry !== null);
}

const config: StorybookConfig = {
  stories: ['../packages/*/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [],

  framework: {
    name: getAbsolutePath("@storybook/html-vite"),
    options: {},
  },

  staticDirs: ['./public'],

  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: resolveWorkspaceAliases(),
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
    });
  }
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
