import { inkfishBuildId } from '@16bitink/inkfish/build-id';
import { defineConfig, type Plugin } from 'vite';
import { downloadFonts, googleCssUrl } from './build/fonts';
import { findEdition, type Edition } from './src/editions';

// The itch.io edition of one game (ITCH_GAME, default inkfish): its free
// chapter as a self-contained folder in dist/<slug>, with relative paths since
// itch.io serves it from a CDN subfolder. `pnpm build` (scripts/build.mjs)
// builds it and zips it for upload; `ITCH_GAME=inkmine pnpm dev` plays it locally.
const edition = findEdition(process.env.ITCH_GAME ?? 'inkfish');

const GAME_MODULE = 'virtual:itch-game';

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** A catalog colour, which goes into a <style>: only hex colours are let through. */
function cssColor(value: string): string {
  if (!/^#[0-9a-f]{3,8}$/i.test(value)) throw new Error(`Theme colour "${value}" isn't a hex colour`);
  return value;
}

/** A module from a game's paid content (games/<slug>/content/), which only 16bit.ink serves to owners. */
const isPaidContent = (id: string): boolean => /[\\/]games[\\/][^\\/]+[\\/]content[\\/]/.test(id);

/** Resolves `virtual:itch-game` to the game's package, and fills index.html from the catalog. */
function itchEdition(e: Edition): Plugin {
  let fontsHtml = '';
  let serving = false;
  return {
    name: 'itch-edition',
    configResolved(config) {
      serving = config.command === 'serve';
    },
    async resolveId(id, importer) {
      if (id !== GAME_MODULE) return null;
      const resolved = await this.resolve(`@16bitink/${e.slug}`, importer, { skipSelf: true });
      if (!resolved) throw new Error(`Can't resolve @16bitink/${e.slug}: add it to apps/itch/package.json`);
      return resolved;
    },
    async buildStart() {
      if (!e.fonts) return;
      if (serving) {
        fontsHtml = `<link href="${googleCssUrl(e.fonts.googleCss)}" rel="stylesheet" />`;
        return;
      }
      const fonts = await downloadFonts(e.fonts.googleCss);
      for (const [fileName, source] of fonts.data) this.emitFile({ type: 'asset', fileName, source });
      fontsHtml = `<style>\n${fonts.css}</style>`;
    },
    // The edition is free: fail the build if any game's paid content (content/) found its way in.
    generateBundle(_options, bundle) {
      const sources = Object.values(bundle).flatMap((out) => (out.type === 'chunk' ? out.moduleIds : out.originalFileNames));
      const paid = sources.filter(isPaidContent);
      if (paid.length > 0) this.error(`Paid content in the itch.io build:\n${paid.join('\n')}`);
    },
    // Function replacers, so a `$` in the values is kept as written; the fonts go in last, so nothing rewrites them.
    transformIndexHtml: (html) =>
      html
        .replaceAll('%TITLE%', () => escapeHtml(e.title))
        .replace('%PAPER%', () => cssColor(e.theme.paper))
        .replace('%INK%', () => cssColor(e.theme.ink))
        .replace('%ACCENT%', () => cssColor(e.theme.accent))
        .replace('<!-- %FONTS% -->', () => fontsHtml),
  };
}

export default defineConfig({
  base: './',
  plugins: [itchEdition(edition)],
  define: {
    __ITCH_EDITION__: JSON.stringify({ slug: edition.slug, price: edition.price, fonts: edition.fonts?.await ?? [] }),
    // What the games' own builds define; the itch.io edition is never unlocked.
    __INKFISH_BUILD__: JSON.stringify(inkfishBuildId()),
    __DEV_UNLOCK__: 'false',
    __DEV_ALL_LEVELS__: 'false',
  },
  build: {
    outDir: `dist/${edition.slug}`,
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 4096,
  },
});
