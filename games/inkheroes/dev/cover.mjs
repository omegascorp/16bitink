// Dev helper: renders the website cover (1200x675) from the painted townscape,
// with the buildings map 1 can build, cropped round the castle.
//   node dev/cover.mjs <out.png> [left]     left: the crop's left edge in townscape units (default 175)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const [out, left = '175'] = process.argv.slice(2);
if (!out) throw new Error('usage: node dev/cover.mjs <out.png> [left]');
const COVER = { w: 1200, h: 675 };
const BUILT = ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'blacksmith', 'mageGuild1', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'];
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto(`${server.resolvedUrls.local[0].replace(/\/$/, '')}/art.html?town=${BUILT.join(',')}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
  // The townscape is 1180 units across: scale its height to the cover's and crop the width, in the page.
  const data = await page.evaluate(({ cover, left }) => {
    const src = document.querySelector('canvas');
    const scale = cover.h / src.height;
    const out = Object.assign(document.createElement('canvas'), { width: cover.w, height: cover.h });
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, -left * (src.width / 1180) * scale, 0, src.width * scale, cover.h);
    return out.toDataURL('image/png');
  }, { cover: COVER, left: Number(left) });
  await writeFile(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(`saved ${out}`);
} finally {
  await browser.close();
  await server.close();
}
