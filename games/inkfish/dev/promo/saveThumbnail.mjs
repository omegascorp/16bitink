// Saves the YouTube thumbnails for the level 1 video (dev/thumbnail.html) as PNGs:
//   pnpm --filter @16bitink/inkfish thumbnail
//   -> promo/youtube-thumb-level1-<id>.png   (upload all three to YouTube's Test & Compare)
//   -> promo/youtube-thumb-level1-check.png  (them at YouTube's display sizes, light and dark, with a duration badge)
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const outDir = path.join(pkg, 'promo');
const PREFIX = 'youtube-thumb-level1';
/** Keep in step with THUMBNAIL_IDS in thumbnail.ts. */
const IDS = ['hunter', 'glowup', 'run'];
/** YouTube's upload limit for thumbnails. */
const MAX_BYTES = 2 * 1024 * 1024;
/** Widths YouTube shows thumbnails at: home grid, search, phone feed, sidebar. */
const SIZES = [360, 246, 168];

async function render(page, base, id) {
  let pageError;
  const onError = (e) => { pageError = e; };
  page.on('pageerror', onError);
  await page.goto(`${base}/thumbnail.html?v=${id}`);
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
        <span style="position:absolute;right:4px;bottom:4px;background:rgba(0,0,0,.8);color:#fff;font:500 12px Roboto,Arial,sans-serif;padding:1px 4px;border-radius:4px">1:01</span>
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
    const file = `${PREFIX}-${id}.png`;
    const out = path.join(outDir, file);
    await writeFile(out, Buffer.from(png, 'base64'));
    const { size } = await stat(out);
    console.log(`wrote ${path.relative(process.cwd(), out)} (${(size / 1024).toFixed(0)} KB)`);
    if (size > MAX_BYTES) throw new Error(`${file} is over YouTube's 2 MB thumbnail limit`);
    pngs.push(png);
  }
  const check = path.join(outDir, `${PREFIX}-check.png`);
  await writeFile(check, await checkSheet(page, pngs));
  console.log(`wrote ${path.relative(process.cwd(), check)}`);
} finally {
  await browser.close();
  await server.close();
}
