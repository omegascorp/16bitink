// Screenshots a town screen at a few stages (dev tool for the Egyptian city; run from games/inkheroes):
//   node dev/pixel/town/egypt/shoot.mjs <out-prefix> <chapter 0|1> [width] [height]
// Plays the chapter from the menu, then opens its first town as it starts, with Fort and several dwellings, and with everything (Castle too).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const [out, chapter = '1', width = '1400', height = '900'] = process.argv.slice(2);
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error',
  // Another agent's manifest may be mid-edit: mend a stray apostrophe in memory (not on disk) so this still runs.
  plugins: [{ name: 'mend-manifest', enforce: 'pre', transform: (code, id) => (id.endsWith('art/pixel/manifest.ts') ? code.replace("'Pharaoh's Mummy'", '"Pharaoh\'s Mummy"') : null) }] });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(`${base}/index.html?reset&unlock`);
  await page.waitForTimeout(4000);
  await page.evaluate(async ({ c, pkg }) => {
    const maps = await import(/* @vite-ignore */ '/@fs' + pkg + '/src/level/maps.ts');
    const menu = window.__game.scene.getScene('Menu');
    menu.play(maps.CHAPTERS[Number(c)]);
  }, { c: chapter, pkg });
  await page.waitForTimeout(3000);
  await page.mouse.click(Number(width) / 2, 568);
  await page.mouse.click(Number(width) / 2, 504);
  await page.waitForTimeout(800);
  const stage = async (name, built) => {
    await page.evaluate(async ({ built, pkg }) => {
      const g = window.__game;
      const map = g.scene.getScene('Map');
      const session = map.registry.get('session');
      const adv = session.adv;
      const town = adv.towns.find((t) => t.owner === 'player') ?? adv.towns[0];
      const ids = built === 'all' ? (await import(/* @vite-ignore */ '/@fs' + pkg + '/src/logic/buildings.ts')).BUILDING_IDS : built ?? town.built;
      session.set({ ...adv, towns: adv.towns.map((t) => (t.id === town.id ? { ...t, built: ids } : t)) });
      if (g.scene.isActive('Town')) g.scene.stop('Town');
      map.scene.launch('Town', { townId: town.id });
    }, { built, pkg });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${out}-${name}.png` });
  };
  await stage('start', null);
  await stage('mid', ['villageHall', 'townHall', 'tavern', 'fort', 'guardhouse', 'guardhouse2', 'archeryRange', 'griffinTower', 'barracks', 'mageGuild1', 'templeOsiris', 'storehouse', 'blacksmith']);
  await stage('all', 'all');
  // The hall's ledger (pictures of each building).
  await page.mouse.click(Number(width) / 2 + 300, 780);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}-hall.png` });
} finally {
  await browser.close();
  await server.close();
}
