// Dev helper: like dev/snap.mjs, but first runs SNAP_JS in the page (e.g. to move window.match's player) and waits SNAP_WAIT ms.
//   node dev/snap.mjs <out.png> "<page and query>" [width] [height] [deviceScale]
//   e.g. node dev/snap.mjs dev/art-test/shots/brawler.png "art-test.html?build=brawler" 1920 1080
//   the game: node dev/snap.mjs dev/shots/game-map.png "index.html?screen=map&save=mid" 1280 720
// Waits for window.__ready (set by art-test/main.ts). Needs Google Chrome.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..', '..');
const [out, pageQuery = 'art-test.html', width = '1400', height = '900', dpr = '1'] = process.argv.slice(2);
if (!out) throw new Error('usage: node dev/snap.mjs <out.png> "<page?query>" [width] [height]');
await mkdir(path.dirname(path.resolve(out)), { recursive: true });
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const touch = pageQuery.includes('touch=1');
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: Number(dpr), hasTouch: touch, isMobile: touch });
  let pageError;
  page.on('pageerror', (e) => { pageError = e; });
  await page.goto(`${base}/${pageQuery}`);
  if (!pageQuery.startsWith('index') || pageQuery.includes('screen=')) await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 }).catch((e) => { throw pageError ?? e; });
  else await page.waitForTimeout(4000);
  if (pageError) throw pageError;
  if (process.env.SNAP_JS) {
    await page.evaluate(process.env.SNAP_JS);
    await page.waitForTimeout(Number(process.env.SNAP_WAIT ?? 1500));
  }
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved ${out}`);
} finally {
  await browser.close();
  await server.close();
}
