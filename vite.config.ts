import { defineConfig } from 'vitest/config';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';

import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  css: {
    transformer: 'lightningcss'
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
