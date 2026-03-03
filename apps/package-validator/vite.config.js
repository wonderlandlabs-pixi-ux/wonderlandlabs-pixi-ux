import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [reactRouter()],
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
