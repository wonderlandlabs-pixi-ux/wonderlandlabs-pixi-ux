import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const PUBLISHED_ALIAS_TARGETS = ['drag', 'resizer', 'grid', 'root-container', 'window'];

function rewritePublishedWorkspaceImports() {
  const importPattern = new RegExp(`@wonderlandlabs-pixi-ux/(${PUBLISHED_ALIAS_TARGETS.join('|')})`, 'g');

  return {
    name: 'rewrite-published-workspace-imports',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/node_modules/@published/')) {
        return null;
      }

      const rewritten = code.replace(importPattern, '@published/$1');
      if (rewritten === code) {
        return null;
      }

      return {
        code: rewritten,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [rewritePublishedWorkspaceImports(), reactRouter()],
  optimizeDeps: {
    exclude: [
      '@wonderlandlabs-pixi-ux/root-container',
      '@wonderlandlabs-pixi-ux/grid',
      '@wonderlandlabs-pixi-ux/drag',
      '@wonderlandlabs-pixi-ux/resizer',
      '@wonderlandlabs-pixi-ux/window',
      '@published/root-container',
      '@published/grid',
      '@published/resizer',
      '@published/drag',
      '@published/window',
    ],
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});
