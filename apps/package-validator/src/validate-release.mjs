#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

const argPackages = [];
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--package' && process.argv[i + 1]) {
    argPackages.push(process.argv[i + 1]);
    i += 1;
  }
}

const defaultPackages = ['root-container', 'grid', 'resizer', 'window'];
const packageIds = argPackages.length > 0 ? argPackages : defaultPackages;

const EXPECTED_PUBLISHED_ISSUES = {
  resizer: [
    'extensionless import in node_modules/@published/resizer/dist/enableHandles.js: "./ResizerStore"',
    'extensionless import in node_modules/@published/resizer/dist/ResizerStore.js: "./types"',
    'extensionless import in node_modules/@published/resizer/dist/ResizerStore.js: "./rectTypes"',
  ],
  window: [
    'extensionless import in node_modules/@published/window/dist/WindowsManager.js: "./types"',
    'extensionless import in node_modules/@published/window/dist/WindowsManager.js: "./WindowStore"',
    'extensionless import in node_modules/@published/window/dist/types.js: "./constants"',
    'extensionless import in node_modules/@published/window/dist/styles.js: "./constants"',
    'extensionless import in node_modules/@published/window/dist/WindowStore.js: "./rgbToColor"',
    'extensionless import in node_modules/@published/window/dist/WindowStore.js: "./TitlebarStore"',
    'extensionless import in node_modules/@published/window/dist/WindowStore.js: "./styles"',
    'extensionless import in node_modules/@published/window/dist/WindowStore.js: "./constants"',
    'extensionless import in node_modules/@published/window/dist/EditableWindowStore.js: "./WindowStore"',
    'extensionless import in node_modules/@published/window/dist/TitlebarStore.js: "./rgbToColor"',
    'extensionless import in node_modules/@published/window/dist/TitlebarStore.js: "./constants"',
  ],
};

const SOURCE_ROOTS = {
  published: path.join(repoRoot, 'node_modules/@published'),
  workspace: path.join(repoRoot, 'packages'),
};

const JS_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

function existsFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function extractSpecifiers(code) {
  const out = [];
  const pattern =
    /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[^\w$])import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gm;
  for (const match of code.matchAll(pattern)) {
    const spec = match[1] ?? match[2] ?? match[3];
    if (spec) {
      out.push(spec);
    }
  }
  return out;
}

function resolveRelativeImport(fromFile, specifier) {
  const fromDir = path.dirname(fromFile);
  const base = path.resolve(fromDir, specifier);
  const ext = path.extname(specifier);
  const candidates = ext
    ? [base]
    : [`${base}.js`, `${base}.mjs`, `${base}.cjs`, path.join(base, 'index.js'), path.join(base, 'index.mjs')];

  for (const candidate of candidates) {
    if (existsFile(candidate)) {
      return { resolved: candidate, candidates };
    }
  }
  return { resolved: null, candidates };
}

async function validateGraph(entryFile) {
  const queue = [entryFile];
  const seen = new Set();
  const issues = [];
  let filesVisited = 0;

  while (queue.length > 0) {
    const filePath = queue.shift();
    if (!filePath || seen.has(filePath)) {
      continue;
    }
    seen.add(filePath);
    filesVisited += 1;

    let code = '';
    try {
      code = await fsp.readFile(filePath, 'utf8');
    } catch (error) {
      issues.push(`cannot read ${path.relative(repoRoot, filePath)}: ${error.message}`);
      continue;
    }

    for (const specifier of extractSpecifiers(code)) {
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
        continue;
      }

      if (!path.extname(specifier)) {
        issues.push(`extensionless import in ${path.relative(repoRoot, filePath)}: "${specifier}"`);
      }

      const { resolved, candidates } = resolveRelativeImport(filePath, specifier);
      if (!resolved) {
        issues.push(
          `unresolved import in ${path.relative(repoRoot, filePath)}: "${specifier}" | tried: ${candidates
            .map((c) => path.relative(repoRoot, c))
            .join(', ')}`,
        );
        continue;
      }

      if (JS_EXTENSIONS.has(path.extname(resolved))) {
        queue.push(resolved);
      }
    }
  }

  return { filesVisited, issues };
}

function entryFor(sourceMode, pkg) {
  return path.join(SOURCE_ROOTS[sourceMode], pkg, 'dist/index.js');
}

function classifyPublishedIssues(pkg, issues) {
  const expected = new Set(EXPECTED_PUBLISHED_ISSUES[pkg] ?? []);
  if (expected.size === 0) {
    return {
      unexpected: issues,
      matchedExpected: [],
      resolvedExpected: [],
    };
  }

  const matchedExpected = issues.filter((issue) => expected.has(issue));
  const unexpected = issues.filter((issue) => !expected.has(issue));
  const actual = new Set(issues);
  const resolvedExpected = Array.from(expected).filter((issue) => !actual.has(issue));

  return {
    unexpected,
    matchedExpected,
    resolvedExpected,
  };
}

async function main() {
  const checks = [];
  for (const pkg of packageIds) {
    checks.push({ source: 'published', pkg, entry: entryFor('published', pkg) });
    checks.push({ source: 'workspace', pkg, entry: entryFor('workspace', pkg) });
  }

  let failures = 0;

  for (const check of checks) {
    if (!existsFile(check.entry)) {
      failures += 1;
      console.log(`[FAIL] ${check.pkg} ${check.source}: entry missing (${path.relative(repoRoot, check.entry)})`);
      continue;
    }

    const result = await validateGraph(check.entry);
    if (result.issues.length > 0) {
      if (check.source === 'published') {
        const {unexpected, matchedExpected, resolvedExpected} = classifyPublishedIssues(check.pkg, result.issues);
        if (unexpected.length > 0) {
          failures += 1;
          console.log(`[FAIL] ${check.pkg} ${check.source} (files: ${result.filesVisited})`);
          for (const issue of unexpected) {
            console.log(`  - unexpected: ${issue}`);
          }
          for (const issue of matchedExpected) {
            console.log(`  - expected: ${issue}`);
          }
        } else {
          console.log(`[PASS] ${check.pkg} ${check.source} (files: ${result.filesVisited}, known published issues)`);
          for (const issue of matchedExpected) {
            console.log(`  - expected: ${issue}`);
          }
        }

        for (const issue of resolvedExpected) {
          console.log(`  - baseline resolved: ${issue}`);
        }
        continue;
      }

      failures += 1;
      console.log(`[FAIL] ${check.pkg} ${check.source} (files: ${result.filesVisited})`);
      for (const issue of result.issues) {
        console.log(`  - ${issue}`);
      }
    } else {
      console.log(`[PASS] ${check.pkg} ${check.source} (files: ${result.filesVisited})`);
    }
  }

  const total = checks.length;
  console.log(`\nRelease validation summary: ${total - failures}/${total} passed, ${failures} failed.`);
  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
