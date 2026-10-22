// Dev helper: saves single promo frames as PNG for checking by eye.
//   node dev/promo/snap.mjs <outDir> "<query>" t1 t2 ... [audio]   e.g. "short=hedgehog" 0 4.2 audio
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const argv = process.argv.slice(2);
const pageAt = argv.indexOf('--page');
const pageName = pageAt >= 0 ? argv.splice(pageAt, 2)[1] : 'promo.html';
const [outDir, query, ...times] = argv;
await mkdir(outDir, { recursive: true });
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 } });
  let pageError;
  page.on('pageerror', (e) => { pageError = e; });
  await page.goto(`${base}/${pageName}?record&${query}`);
  await page.waitForFunction(() => typeof window.promo?.draw === 'function', null, { timeout: 120_000 }).catch((e) => { throw pageError ?? e; });
  for (const t of times) {
    if (t === 'audio') {
      const wav = await page.evaluate(() => window.promo.audioBase64(0));
      await writeFile(path.join(outDir, `${(query || 'kit').replace(/[^a-z0-9]+/gi, '_')}.wav`), Buffer.from(wav, 'base64'));
      continue;
    }
    const png = await page.evaluate((s) => {
      window.promo.draw(s);
      return document.getElementById('promo').toDataURL('image/png').split(',')[1];
    }, Number(t));
    await writeFile(path.join(outDir, `${(query || 'kit').replace(/[^a-z0-9]+/gi, '_')}-${t}.png`), Buffer.from(png, 'base64'));
  }
  if (pageError) throw pageError;
} finally {
  await browser.close();
  await server.close();
}
