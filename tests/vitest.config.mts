import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    timeout: 30000,
    reporter: 'verbose',
    outputFile: {
      json: path.join(__dirname, 'logs', 'test-results.json'),
    },
  },
});