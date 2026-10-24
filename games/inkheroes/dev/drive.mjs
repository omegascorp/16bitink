// Dev helper: opens the game, runs a few steps in the page, screenshots.
//   node dev/drive.mjs <out-prefix> [width] [height] <step>...  each step (JS run in the page, or move:x,y / click:x,y / drag:x1,y1,x2,y2) is followed by a shot
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
    // burst:N,ms[,x,y,w,h] takes N shots ms apart (of that clip), straight after the step before it.
    const burst = /^burst:(\d+),(\d+)(?:,(\d+),(\d+),(\d+),(\d+))?$/.exec(s);
    if (burst) {
      const clip = burst[3] ? { x: +burst[3], y: +burst[4], width: +burst[5], height: +burst[6] } : undefined;
      for (let k = 0; k < +burst[1]; k++) {
        await page.screenshot({ path: `${out}-${i}-${String(k).padStart(2, '0')}.png`, clip });
        await page.waitForTimeout(+burst[2]);
      }
      i++;
      continue;
    }
    const drag = /^drag:(\d+),(\d+),(\d+),(\d+)$/.exec(s);
    if (drag) {
      await page.mouse.move(+drag[1], +drag[2]);
      await page.mouse.down();
      await page.mouse.move(+drag[3], +drag[4], { steps: 12 });
      await page.mouse.up();
    }
    const m = drag ? null : /^(click|move):(\d+),(\d+)$/.exec(s);
    const r = m ? await (m[1] === 'click' ? page.mouse.click(+m[2], +m[3]) : page.mouse.move(+m[2], +m[3])) : drag ? undefined : await page.evaluate(s);
    if (r !== undefined) console.log('step', i, r);
    if (steps[i] && steps[i].startsWith('burst:')) { i++; continue; }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}-${i}.png` });
    i++;
  }
} finally {
  await browser.close();
  await server.close();
}
