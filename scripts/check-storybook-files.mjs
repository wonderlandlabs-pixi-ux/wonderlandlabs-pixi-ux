import { execFileSync } from 'node:child_process';

if (process.platform !== 'darwin') {
  process.exit(0);
}

const args = [
  '.',
  '-path',
  './node_modules',
  '-prune',
  '-o',
  '-type',
  'f',
  '-flags',
  '+dataless',
  '-print',
];

let output = '';

try {
  output = execFileSync('find', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[storybook-preflight] Unable to scan for dataless files: ${message}`);
  process.exit(0);
}

const files = output
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => line.startsWith('./.storybook/') || line.startsWith('./packages/'));

if (files.length === 0) {
  process.exit(0);
}

console.error('Storybook cannot start because some repo files are iCloud-offloaded ("dataless").');
console.error('Download these files locally or move the repo out of iCloud-managed storage, then retry:');

for (const file of files) {
  console.error(`  - ${file}`);
}

process.exit(1);
