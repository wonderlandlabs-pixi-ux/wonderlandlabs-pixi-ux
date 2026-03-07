import {defineConfig} from 'vitest/config';

export default defineConfig({
    esbuild: {
        target: 'es2020',
    },
    test: {
        globals: true,
        environment: 'node',
        include: [
            'test/**/*.test.ts',
            'packages/observe-drag/test/**/*.test.ts',
        ],
    },
});
