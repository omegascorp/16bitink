import { defineConfig } from 'vite';

// DEV_UNLOCK=true (set when starting the dev server) plays the game as an owner,
// the same switch the website uses locally. There is no URL flag for it.
export default defineConfig({
  root: 'dev',
  server: { port: 5174 },
  define: { __DEV_UNLOCK__: JSON.stringify(process.env.DEV_UNLOCK === 'true') },
});
