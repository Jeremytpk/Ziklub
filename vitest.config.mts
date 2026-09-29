import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Emulator tests need `npm run emulators` running; run them with `npm run test:emulators`.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.emulator.test.ts'],
  },
});
