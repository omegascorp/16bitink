import { defineConfig } from 'vite';
import { inkfishBuildId } from './build-id.mjs';

// The CrazyGames edition (chapters 1–4, saves in the SDK's Data module):
// `pnpm build:crazygames` writes a self-contained folder to dist/crazygames,
// zipped as dist/inkfish-crazygames.zip for upload. Relative paths, since the
// portal serves the game from its own CDN folder.
export default defineConfig({
  root: 'crazygames',
  base: './',
  define: {
    __INKFISH_BUILD__: JSON.stringify(inkfishBuildId()),
  },
  build: {
    outDir: '../dist/crazygames',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 4096,
  },
});
