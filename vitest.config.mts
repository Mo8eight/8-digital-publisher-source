import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Unit tests for library code (the root jest config needs @nx/jest, which
// isn't installed). Run with: pnpm test:unit
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.base.json'] })],
  test: {
    environment: 'node',
    include: ['libraries/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
  },
});
