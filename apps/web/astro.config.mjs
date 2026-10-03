import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://16bit.ink',
  // A standalone Node server, run on DigitalOcean App Platform (see .do/app.yaml).
  adapter: node({ mode: 'standalone' }),
  security: {
    // App Platform terminates TLS and forwards plain HTTP. Trust its
    // X-Forwarded-Proto/Host only for our own domains, so origin checks and
    // the Google sign-in callback see https://16bit.ink.
    allowedDomains: [
      { hostname: '16bit.ink', protocol: 'https' },
      { hostname: '**.ondigitalocean.app', protocol: 'https' },
    ],
  },
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
