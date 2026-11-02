import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@app/common': '/libs/common/src/index.ts' },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
