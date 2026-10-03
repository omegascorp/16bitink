import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://16bit.ink',
  adapter: cloudflare(),
  trailingSlash: 'never',
  build: { format: 'file' },
  // The game package ships TypeScript source; let Vite bundle it.
  vite: {
    ssr: { noExternal: ['@16bitink/inkfish'] },
    // Phaser is ~1.4 MB and loaded lazily on the play page only.
    build: { chunkSizeWarningLimit: 1600 },
  },
});
