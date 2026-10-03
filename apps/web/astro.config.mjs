import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://16bit.ink',
  // We don't transform images, so skip the Cloudflare Images binding.
  adapter: cloudflare({ imageService: 'passthrough' }),
  trailingSlash: 'never',
  build: { format: 'file' },
  // No Astro dev toolbar floating over the pages (and the game) in `astro dev`.
  devToolbar: { enabled: false },
  // The game package ships TypeScript source; let Vite bundle it.
  vite: {
    ssr: { noExternal: ['@16bitink/inkfish'] },
    // Phaser is ~1.4 MB and loaded lazily on the play page only.
    build: { chunkSizeWarningLimit: 1600 },
  },
});
