// Saves YouTube thumbnails (dev/thumbnail.html) as PNGs, with a check sheet of them at YouTube's display sizes:
//   pnpm --filter @16bitink/inkfish thumbnail            -> promo/youtube-thumb-level1-<id>.png (+ -check.png)
//   pnpm --filter @16bitink/inkfish thumbnail descent    -> promo/longform/1 - thumb-<id>.png (+ 1 - thumb-check.png)
// Upload all three of a set to YouTube's Test & Compare.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
/** Keep the ids in step with THUMBNAIL_IDS (thumbnail.ts), DESCENT_THUMBNAILS (descent/thumbnails.ts), FOODCHAIN_THUMBNAILS (foodchain/thumbnails.ts), SWALLOWYOU_THUMBNAILS (swallowyou/thumbnails.ts) and SEAMONSTERS_THUMBNAILS (seamonsters/thumbnails.ts). */
const SETS = {
  level1: { ids: ['hunter', 'glowup', 'run'], dir: 'promo', prefix: 'youtube-thumb-level1-', badge: '1:01' },
  descent: { ids: ['split', 'line', 'layers'], dir: 'promo/longform', prefix: '1 - thumb-', badge: '5:44' },
  foodchain: { ids: ['split', 'nest', 'wrong', 'lunch'], dir: 'promo/longform', prefix: '2 - thumb-', badge: '4:34' },
  swallowyou: { ids: ['throat', 'lineup', 'inside'], dir: 'promo/longform', prefix: '3 - thumb-', badge: '4:06' },
  seamonsters: { ids: ['legend', 'lineup', 'eye'], dir: 'promo/longform', prefix: '4 - thumb-', badge: '4:37' },
};
const setName = process.argv[2] ?? 'level1';
const SET = SETS[setName];
if (!SET) throw new Error(`Unknown set "${setName}": use one of ${Object.keys(SETS).join(', ')}`);
// The repo's top-level promo/, shared by every game and the site.
const outDir = path.resolve(pkg, '../..', SET.dir);
const IDS = SET.ids;
/** YouTube's upload limit for thumbnails. */
const MAX_BYTES = 2 * 1024 * 1024;
/** Widths YouTube shows thumbnails at: home grid, search, phone feed, sidebar. */
const SIZES = [360, 246, 168];

async function render(page, base, id) {
  let pageError;
  const onError = (e) => { pageError = e; };
  page.on('pageerror', onError);
  await page.goto(`${base}/thumbnail.html?set=${setName}&v=${id}`);
  await page.waitForFunction(() => window.thumbnailReady === true, null, { timeout: 120_000 }).catch((e) => { throw pageError ?? e; });
  page.off('pageerror', onError);
  return page.evaluate(() => document.getElementById('thumbnail').toDataURL('image/png').split(',')[1]);
}

/** A sheet of every thumbnail at each display size, on YouTube's light and dark pages. */
async function checkSheet(page, pngs) {
  const row = (png, label, bg, fg) => `<div style="background:${bg};color:${fg};padding:16px 24px;display:flex;gap:24px;align-items:flex-start">${SIZES.map((w) => `
    <figure style="margin:0;width:${w}px;font:12px Roboto,Arial,sans-serif">
      <div style="position:relative;width:${w}px;border-radius:${w > 200 ? 12 : 8}px;overflow:hidden">
        <img src="data:image/png;base64,${png}" style="display:block;width:${w}px;aspect-ratio:16/9">
        <span style="position:absolute;right:4px;bottom:4px;background:rgba(0,0,0,.8);color:#fff;font:500 12px Roboto,Arial,sans-serif;padding:1px 4px;border-radius:4px">${SET.badge}</span>
      </div>
      <figcaption style="margin-top:6px">${label}, ${w}px wide</figcaption>
    </figure>`).join('')}</div>`;
  const rows = (bg, fg) => IDS.map((id, i) => row(pngs[i], id, bg, fg)).join('');
  await page.setViewportSize({ width: 920, height: 600 });
  await page.setContent(`<body style="margin:0">${rows('#fff', '#0f0f0f')}${rows('#0f0f0f', '#f1f1f1')}</body>`);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  return page.screenshot({ fullPage: true });
}

await mkdir(outDir, { recursive: true });
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pngs = [];
  for (const id of IDS) {
    const png = await render(page, base, id);
    const file = `${SET.prefix}${id}.png`;
    const out = path.join(outDir, file);
    await writeFile(out, Buffer.from(png, 'base64'));
    const { size } = await stat(out);
    console.log(`wrote ${path.relative(process.cwd(), out)} (${(size / 1024).toFixed(0)} KB)`);
    if (size > MAX_BYTES) throw new Error(`${file} is over YouTube's 2 MB thumbnail limit`);
    pngs.push(png);
  }
  const check = path.join(outDir, `${SET.prefix}check.png`);
  await writeFile(check, await checkSheet(page, pngs));
  console.log(`wrote ${path.relative(process.cwd(), check)}`);
} finally {
  await browser.close();
  await server.close();
}
