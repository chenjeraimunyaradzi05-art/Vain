import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    silent: true,
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react': path.resolve(__dirname, './node_modules/react'),
    },
  },
});
