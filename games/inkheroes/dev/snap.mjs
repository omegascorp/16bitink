// Dev helper: screenshots a dev page to PNG, for checking art by eye.
//   node dev/snap.mjs <out.png> "<page and query>" [width] [height]
//   e.g. node dev/snap.mjs /tmp/wolf.png "specimens.html?only=wolf" 1400 900
// Waits for window.__ready (set by specimens.ts), or 4 s for other pages. Needs Google Chrome.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const [out, pageQuery = 'specimens.html', width = '1400', height = '900'] = process.argv.slice(2);
if (!out) throw new Error('usage: node dev/snap.mjs <out.png> "<page?query>" [width] [height]');
await mkdir(path.dirname(path.resolve(out)), { recursive: true });
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
  let pageError;
  page.on('pageerror', (e) => { pageError = e; });
  await page.goto(`${base}/${pageQuery}`);
  if (pageQuery.startsWith('specimens')) await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 }).catch((e) => { throw pageError ?? e; });
  else await page.waitForTimeout(4000);
  if (pageError) throw pageError;
  await page.screenshot({ path: out, fullPage: pageQuery.startsWith('specimens') });
  console.log(`saved ${out}`);
} finally {
  await browser.close();
  await server.close();
}
