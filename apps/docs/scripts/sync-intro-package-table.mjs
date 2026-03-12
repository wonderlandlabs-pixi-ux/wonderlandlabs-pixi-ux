import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const introPath = path.resolve(__dirname, '../docs/intro.md');
const docsPackagesDir = path.resolve(__dirname, '../docs/packages');
const packagesDir = path.resolve(__dirname, '../../../packages');
const tableStart = '<!-- PACKAGE_TABLE_START -->';
const tableEnd = '<!-- PACKAGE_TABLE_END -->';
const githubBase = 'https://github.com/bingomanatee/forestry-pixi/tree/main/packages';
const docsLink = '[View Docs]';
const githubBadge = '[![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)]';
const summaryBySlug = {
  box: 'Tree-based layout engine for measurable areas, alignment, constraints, and BoxTree traversal.',
  button: 'Button store that composes BoxTree layout with StyleTree-driven visual states.',
  caption: 'Caption/speech/thought bubble rendering with configurable geometry and text styling.',
  grid: 'Zoom-aware Pixi grid rendering manager for infinite canvas and artboard use cases.',
  'observe-drag': 'Serialized pointer-drag observer utilities with optional decorators for target motion.',
  resizer: 'Interactive resize handles and rectangle mutation flow for Pixi containers.',
  'root-container': 'Root container utilities for centered stage coordinates with zoom/pan behavior.',
  'style-tree': 'Hierarchical style matching engine keyed by noun paths and state selectors.',
  'ticker-forest': 'Forestry base class that schedules dirty-state resolve work on a Pixi ticker.',
  toolbar: 'Toolbar composition store for arranging and styling groups of buttons.',
  utils: 'Shared render and scale helper utilities used across Pixi UX packages.',
  window: 'Window manager and window store primitives with titlebar, drag, and resize support.',
};

async function hasDocsPage(slug) {
  for (const ext of ['.md', '.mdx']) {
    try {
      await fs.access(path.join(docsPackagesDir, `${slug}${ext}`));
      return true;
    } catch {
      // Try the next supported extension.
    }
  }

  return false;
}

async function readPackageRows() {
  const entries = await fs.readdir(packagesDir, { withFileTypes: true });
  const rows = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageDir = path.join(packagesDir, entry.name);
    const packageJsonPath = path.join(packageDir, 'package.json');

    try {
      const raw = await fs.readFile(packageJsonPath, 'utf8');
      const pkg = JSON.parse(raw);
      if (typeof pkg.name !== 'string' || !pkg.name.startsWith('@wonderlandlabs-pixi-ux/')) {
        continue;
      }
      if (entry.name === 'drag') {
        continue;
      }
      if (typeof pkg.version !== 'string') {
        continue;
      }
      rows.push({
        hasDocs: await hasDocsPage(entry.name),
        name: pkg.name,
        version: pkg.version,
        slug: entry.name,
      });
    } catch {
      // Skip dirs without a valid package.json.
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function buildTable(rows) {
  const lines = [
    '| Package | Version | Docs | GitHub |',
    '| --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    const summary = summaryBySlug[row.slug] ?? '-';
    const docsCell = row.hasDocs ? `${docsLink}(/packages/${row.slug})` : '-';
    lines.push(
      `| \`${row.name}\`<br/><sub>${summary}</sub> | \`${row.version}\` | ${docsCell} | ${githubBadge}(${githubBase}/${row.slug}) |`,
    );
  }

  return lines.join('\n');
}

async function main() {
  const rows = await readPackageRows();
  if (!rows.length) {
    throw new Error('No packages found while building intro package table.');
  }

  const introRaw = await fs.readFile(introPath, 'utf8');
  const pattern = new RegExp(`${tableStart}[\\s\\S]*?${tableEnd}`);
  if (!pattern.test(introRaw)) {
    throw new Error(`Could not find table markers in ${introPath}`);
  }

  const nextTable = `${tableStart}\n${buildTable(rows)}\n${tableEnd}`;
  const nextIntro = introRaw.replace(pattern, nextTable);
  await fs.writeFile(introPath, nextIntro, 'utf8');
}

await main();
