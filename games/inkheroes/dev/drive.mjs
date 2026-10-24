// Dev helper: opens the game, runs a few steps in the page, screenshots.
//   node dev/drive.mjs <out-prefix> [width] [height] <step>...  each step (JS run in the page, or move:x,y / click:x,y) is followed by a shot
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const [out, width = '1400', height = '900', ...steps] = process.argv.slice(2);
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(`${base}/index.html?reset`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}-0.png` });
  let i = 1;
  for (const s of steps) {
    const m = /^(click|move):(\d+),(\d+)$/.exec(s);
    const r = m ? await (m[1] === 'click' ? page.mouse.click(+m[2], +m[3]) : page.mouse.move(+m[2], +m[3])) : await page.evaluate(s);
    if (r !== undefined) console.log('step', i, r);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}-${i}.png` });
    i++;
  }
} finally {
  await browser.close();
  await server.close();
}
