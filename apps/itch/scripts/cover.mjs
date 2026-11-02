// Renders each built game's itch.io cover (630×500, drawn at 2× for sharp
// thumbnails) from its catalog cover art and title, in the game's own fonts:
//   pnpm --filter @16bitink/itch cover inkfish      (after `build inkfish`)
// Writes dist/<slug>-cover.png. Chrome comes from CHROME_PATH, else the macOS install.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const covers = join(root, '../web/public/covers');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ALL = ['inkfish', 'inkcrab', 'inkmine', 'inkgecko', 'inksnake'];

const args = process.argv.slice(2);
const slugs = args.length === 0 ? ['inkfish'] : args.includes('all') ? ALL : args;

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The built index.html's font faces and colours, with font URLs pointed at dist/<slug>/fonts. */
function builtStyle(slug) {
  const html = readFileSync(join(dist, slug, 'index.html'), 'utf8');
  const fontFaces = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).filter((css) => css.includes('@font-face')).join('\n');
  const vars = html.match(/:root\s*\{[^}]*\}/)?.[0] ?? '';
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? slug;
  return { css: `${fontFaces.replaceAll('url(./fonts/', `url(./${slug}/fonts/`)}\n${vars}`, title };
}

function coverHtml(slug) {
  const { css, title } = builtStyle(slug);
  const art = pathToFileURL(join(covers, `${slug}.png`)).href;
  return `<!doctype html><meta charset="utf-8"><style>
${css}
html, body { margin: 0; width: 630px; height: 500px; overflow: hidden; background: var(--paper); }
.art { position: absolute; inset: 0; background: url(${art}) center / cover; }
.title {
  position: absolute; left: 0; right: 0; top: 34px; text-align: center;
  font: 700 128px/0.9 'Caveat', cursive; color: var(--accent);
  text-shadow: 0 0 6px var(--paper), 0 0 14px var(--paper), 0 0 22px var(--paper), 4px 5px 0 color-mix(in srgb, var(--ink) 25%, transparent);
}
.brand {
  position: absolute; right: 16px; bottom: 12px; padding: 2px 12px;
  font: 600 26px 'Caveat', cursive; color: var(--ink);
  background: var(--paper); border: 2px solid var(--ink); border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
</style><div class="art"></div><div class="title">${escapeHtml(title)}</div><div class="brand">16bit.ink</div>`;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  for (const slug of slugs) {
    if (!existsSync(join(dist, slug, 'index.html'))) throw new Error(`${slug}: build it first (pnpm --filter @16bitink/itch build ${slug})`);
    const page = join(dist, `_cover-${slug}.html`);
    writeFileSync(page, coverHtml(slug));
    try {
      const tab = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
      await tab.goto(pathToFileURL(page).href);
      await tab.evaluate(() => document.fonts.ready);
      const out = join(dist, `${slug}-cover.png`);
      await tab.screenshot({ path: out });
      await tab.close();
      console.log(`✔ ${out}`);
    } finally {
      rmSync(page, { force: true });
    }
  }
} finally {
  await browser.close();
}
