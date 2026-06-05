import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // ink / ink-testing-library 内部用了 top-level await,必须走 ESM 不能 cjs require
    server: {
      deps: {
        inline: ['ink', 'ink-testing-library', 'react-devtools-core', 'yoga-layout'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['bin/**/*.ts', 'lib/**/*.ts', 'src/**/*.ts'],
    },
  },
});