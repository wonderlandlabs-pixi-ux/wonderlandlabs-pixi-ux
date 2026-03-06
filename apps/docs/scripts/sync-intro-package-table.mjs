import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const introPath = path.resolve(__dirname, '../docs/intro.md');
const packagesDir = path.resolve(__dirname, '../../../packages');
const tableStart = '<!-- PACKAGE_TABLE_START -->';
const tableEnd = '<!-- PACKAGE_TABLE_END -->';
const githubBase = 'https://github.com/bingomanatee/forestry-pixi/tree/main/packages';
const docsBadge = '[![View Docs](https://img.shields.io/badge/View-Docs-0F6D63?style=flat-square)]';
const githubBadge = '[![GitHub](https://img.shields.io/badge/GitHub-Source-24292e?style=flat-square&logo=github)]';

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
      if (typeof pkg.version !== 'string') {
        continue;
      }
      rows.push({
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
    lines.push(
      `| \`${row.name}\` | \`${row.version}\` | ${docsBadge}(/packages/${row.slug}) | ${githubBadge}(${githubBase}/${row.slug}) |`,
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
