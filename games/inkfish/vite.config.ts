import { defineConfig } from 'vite';
import { inkfishBuildId } from './build-id.mjs';

// DEV_UNLOCK=true (set when starting the dev server) plays the game as an owner,
// the same switch the website uses locally. DEV_ALL_LEVELS=true opens every
// level without playing through. There are no URL flags for either.
export default defineConfig({
  root: 'dev',
  server: { port: 5174 },
  define: {
    __DEV_UNLOCK__: JSON.stringify(process.env.DEV_UNLOCK === 'true'),
    __DEV_ALL_LEVELS__: JSON.stringify(process.env.DEV_ALL_LEVELS === 'true'),
    __INKFISH_BUILD__: JSON.stringify(inkfishBuildId()),
  },
});
