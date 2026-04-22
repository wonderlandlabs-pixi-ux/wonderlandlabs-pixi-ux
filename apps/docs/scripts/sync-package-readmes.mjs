import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsPackagesDir = path.resolve(__dirname, '../docs/packages');
const packagesDir = path.resolve(__dirname, '../../../packages');

const descriptionBySlug = {
  box: 'The `@wonderlandlabs-pixi-ux/box` package',
};

const docsLinkRewrites = {
  box: new Map([
    ['./README.STYLES.md', '/packages/box-styles-composition'],
    ['./README.STYLES_COMPOSITION.md', '/packages/box-styles-composition'],
  ]),
  window: new Map([
    ['./TITLEBAR_DYNAMICS.md', '/packages/window-titlebar-dynamics'],
    ['./README.TITLEBAR_DYNAMICS.md', '/packages/window-titlebar-dynamics'],
  ]),
};

const topicMetadata = {
  box: {
    'README.STYLES_COMPOSITION.md': {
      slug: 'box-styles-composition',
      title: 'box styles and composition',
      description: 'Style keys, layering, and composition behavior for the default BoxUxPixi.',
    },
  },
  window: {
    'README.TITLEBAR_DYNAMICS.md': {
      slug: 'window-titlebar-dynamics',
      title: 'window titlebar dynamics',
      description: 'Current titlebar mechanics for @wonderlandlabs-pixi-ux/window',
    },
  },
};

function normalizeRepositoryUrl(rawUrl) {
  return rawUrl.replace(/^git\+/, '').replace(/\.git$/, '');
}

function normalizeTopicToken(token) {
  return token.toLowerCase().replaceAll('_', '-').replaceAll('.', '-');
}

function titleFromSlug(slug) {
  return slug.replaceAll('-', ' ');
}

function rewriteLinks(markdown, slug) {
  const rewrites = docsLinkRewrites[slug];
  if (!rewrites) {
    return markdown;
  }

  let next = markdown;
  for (const [from, to] of rewrites.entries()) {
    next = next.replaceAll(`](${from})`, `](${to})`);
  }

  return next;
}

function injectRepositoryLink(markdown, repositoryUrl) {
  const lines = markdown.split('\n');
  const headingIndex = lines.findIndex((line) => /^#\s+/.test(line));

  if (headingIndex === -1) {
    throw new Error('README is missing a top-level heading.');
  }

  lines.splice(headingIndex + 1, 0, '', `Repository: [${repositoryUrl}](${repositoryUrl})`, '');
  return lines.join('\n');
}

function buildDoc({ title, description, markdown, repositoryUrl }) {
  const body = repositoryUrl ? injectRepositoryLink(markdown, repositoryUrl) : markdown;

  return [
    '---',
    `title: ${title}`,
    `description: ${description}`,
    '---',
    body,
    '',
  ].join('\n');
}

async function syncPrimaryReadme({ slug, pkg, readmePath, docsPath, repositoryUrl }) {
  const readmeRaw = await fs.readFile(readmePath, 'utf8');
  const markdown = rewriteLinks(readmeRaw.trimEnd(), slug);
  const description = descriptionBySlug[slug] ?? `Package README for ${pkg.name}`;
  const nextDoc = buildDoc({
    title: slug,
    description,
    markdown,
    repositoryUrl,
  });

  await fs.writeFile(docsPath, nextDoc, 'utf8');
}

async function syncTopicReadmes({ slug, packageDir }) {
  const files = await fs.readdir(packageDir);
  const metadataByFile = topicMetadata[slug] ?? {};

  for (const fileName of files) {
    if (!/^README\..+\.md$/.test(fileName)) {
      continue;
    }

    const sourcePath = path.join(packageDir, fileName);
    const readmeRaw = await fs.readFile(sourcePath, 'utf8');
    const metadata = metadataByFile[fileName];
    const topicToken = fileName.slice('README.'.length, -'.md'.length);
    const topicSlug = metadata?.slug ?? `${slug}-${normalizeTopicToken(topicToken)}`;
    const nextDoc = buildDoc({
      title: metadata?.title ?? titleFromSlug(topicSlug),
      description: metadata?.description ?? `Topic guide for ${slug}: ${titleFromSlug(topicSlug)}`,
      markdown: rewriteLinks(readmeRaw.trimEnd(), slug),
    });

    await fs.writeFile(path.join(docsPackagesDir, `${topicSlug}.md`), nextDoc, 'utf8');
  }
}

async function main() {
  const entries = await fs.readdir(packagesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const readmePath = path.join(packagesDir, slug, 'README.md');
    const packageJsonPath = path.join(packagesDir, slug, 'package.json');
    const docsPath = path.join(docsPackagesDir, `${slug}.md`);

    try {
      await fs.access(readmePath);
      await fs.access(packageJsonPath);
      await fs.access(docsPath);
    } catch {
      continue;
    }

    const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf8');

    const pkg = JSON.parse(packageJsonRaw);
    if (typeof pkg.name !== 'string' || typeof pkg.repository?.url !== 'string') {
      throw new Error(`Missing package name or repository url for ${slug}.`);
    }

    const repositoryUrl = normalizeRepositoryUrl(pkg.repository.url);
    await syncPrimaryReadme({ slug, pkg, readmePath, docsPath, repositoryUrl });
    await syncTopicReadmes({ slug, packageDir: path.join(packagesDir, slug) });
  }
}

await main();
