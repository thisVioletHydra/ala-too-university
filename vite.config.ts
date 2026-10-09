import { defineConfig } from 'vitest/config';

import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'lightningcss'
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
