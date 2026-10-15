// Saves the YouTube channel banner (dev/banner.html) and the Facebook page cover
// (dev/facebook.html) as PNGs:
//   pnpm --filter @16bitink/inkfish banner
//   -> promo/youtube-banner.png          (upload this)
//   -> promo/youtube-banner-guides.png   (the same with desktop and phone crops outlined)
//   -> promo/facebook-cover.png          (upload this)
//   -> promo/facebook-cover-guides.png
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
// The repo's top-level promo/, shared by every game and the site.
const outDir = path.resolve(pkg, '../../promo');

async function save(page, base, html, query, file) {
  let pageError;
  const onError = (e) => { pageError = e; };
  page.on('pageerror', onError);
  await page.goto(`${base}/${html}${query}`);
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
  await save(page, base, 'banner.html', '', 'youtube-banner.png');
  await save(page, base, 'banner.html', '?guides', 'youtube-banner-guides.png');
  await save(page, base, 'facebook.html', '', 'facebook-cover.png');
  await save(page, base, 'facebook.html', '?guides', 'facebook-cover-guides.png');
} finally {
  await browser.close();
  await server.close();
}
