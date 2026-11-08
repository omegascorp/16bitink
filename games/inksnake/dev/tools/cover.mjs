// Renders the store cover (1200x675) from a staged moment of play:
//   node dev/tools/cover.mjs <url> <out.png>
// Starts farm-6 (the hen coop), lays the snake along an S with a rat-sized lump, a mouse bolting
// from its jaws and the hen rushing out, stops the rules (the views keep drawing), hides the HUD.
import { chromium } from 'playwright-core';

const [url = 'http://localhost:5179/', out = 'cover.png'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Game') || window.__game?.scene?.isActive('Menu'), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const g = window.__game;
    for (const k of ['Result', 'Hud', 'Game', 'Menu']) if (g.scene.isActive(k) || g.scene.isPaused(k)) g.scene.stop(k);
    g.scene.start('Game', { levelId: 'farm-6' });
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.stop('Hud');
    const s = g.scene.getScene('Game');
    const w = s.world;
    w.step = () => [];
    // The body: an S from the lower left to the middle right, head first.
    const L = 700;
    const at = (d) => {
      const t = d / L;
      return { x: 600 - t * 470, y: 290 + t * 120 + Math.sin(t * Math.PI * 2.3 - 0.3) * 95 };
    };
    const pts = [];
    for (let d = 0; d <= L + 8; d += 4) pts.push(at(d));
    const sn = w.snake;
    sn.trail.pts = pts;
    sn.trail.length = L;
    sn.lumps.length = 0;
    sn.lumps.push({ s: 230, size: 30 });
    const h = pts[0];
    const n = pts[2];
    sn.heading = Math.atan2(h.y - n.y, h.x - n.x);
    sn.safe = 0;
    // Eggs in the nests; mice about the board, one bolting from the jaws.
    const mice = [{ x: h.x + Math.cos(sn.heading) * 30, y: h.y + Math.sin(sn.heading) * 30 }, { x: 330, y: 120 }, { x: 860, y: 470 }];
    let m = 0;
    for (const p of w.prey) {
      p.shown = 1;
      if (p.kind !== 'mouse') {
        p.mode = 'idle';
        continue;
      }
      const q = mice[m++ % mice.length];
      p.x = q.x;
      p.y = q.y;
      p.mode = m === 1 ? 'flee' : 'idle';
      p.heading = m === 1 ? sn.heading - 0.6 : m;
    }
    s.snakeView.gulped = () => undefined;
    s.snakeView.gulp = 9999;
    // The hawk soaring over the upper right.
    // The hen bustling out of the coop at the snake.
    const hen = w.enemies.find((e) => e.kind === 'hen');
    if (hen) {
      hen.x = 700;
      hen.y = 300;
      hen.m = 'chase';
      hen.heading = Math.atan2(h.y - 300, h.x - 700);
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out });
  if (errors.length) console.error(errors.join('\n'));
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
