import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.emulator.test.ts'],
    exclude: ['**/node_modules/**'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
