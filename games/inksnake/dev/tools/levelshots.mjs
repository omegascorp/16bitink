// Screenshots levels mid-play: node dev/tools/levelshots.mjs <url> <outDir> <seconds> <levelId...>
// Starts each level through the dev page's exposed Phaser game and reports page errors.
import { chromium } from 'playwright-core';

const [url, out, seconds, ...ids] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => (window.__game?.scene?.getScenes(true).length ?? 0) > 0, null, { timeout: 30000 });
  // Paid chapters load in the background after the menu: wait for them.
  await page.waitForTimeout(2500);
  for (const id of ids) {
    await page.evaluate((levelId) => {
      const g = window.__game;
      for (const k of ['Result', 'Hud', 'Game']) if (g.scene.isActive(k) || g.scene.isPaused(k)) g.scene.stop(k);
      g.scene.stop('Menu');
      g.scene.start('Game', { levelId });
    }, id);
    await page.waitForTimeout(Number(seconds) * 1000);
    await page.screenshot({ path: `${out}/${id}.png` });
    console.log(`shot ${id}`);
  }
  if (errors.length) console.error('ERRORS:\n' + [...new Set(errors)].join('\n'));
} finally {
  await browser.close();
}
