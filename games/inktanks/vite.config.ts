import { defineConfig } from 'vite';

// The InkTanks art test: `pnpm --filter @16bitink/inktanks dev`, then /art-test.html.
export default defineConfig({
  root: 'dev',
  server: { port: 5179, hmr: process.env.NO_HMR !== 'true' },
});
