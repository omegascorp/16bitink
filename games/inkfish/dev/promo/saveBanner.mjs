// Saves the YouTube channel banner (dev/banner.html) as PNG:
//   pnpm --filter @16bitink/inkfish banner
//   -> promo/youtube-banner.png         (upload this)
//   -> promo/youtube-banner-guides.png  (the same with desktop and phone crops outlined)
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const outDir = path.join(pkg, 'promo');

async function save(page, base, query, file) {
  let pageError;
  const onError = (e) => { pageError = e; };
  page.on('pageerror', onError);
  await page.goto(`${base}/banner.html${query}`);
  await page.waitForFunction(() => window.bannerReady === true, null, { timeout: 120_000 }).catch((e) => { throw pageError ?? e; });
  page.off('pageerror', onError);
  const png = await page.evaluate(() => document.getElementById('banner').toDataURL('image/png').split(',')[1]);
  const out = path.join(outDir, file);
  await writeFile(out, Buffer.from(png, 'base64'));
  console.log(`wrote ${path.relative(process.cwd(), out)}`);
}

await mkdir(outDir, { recursive: true });
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await save(page, base, '', 'youtube-banner.png');
  await save(page, base, '?guides', 'youtube-banner-guides.png');
} finally {
  await browser.close();
  await server.close();
}
