// Measures the stress test's FPS in Chromium: node dev/fps.mjs [seconds per mode] [headless|gpu|uncapped] [cpu throttle, e.g. 4]
// Prints the median and low FPS for GPU free rotation and RotSprite. Phones need a real device.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const [secs = '10', flavour = 'headless', throttle = '1'] = process.argv.slice(2);
const server = await createServer({ configFile: path.join(here, '..', 'vite.config.ts'), root: here, server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const args = flavour === 'gpu' ? ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] : flavour === 'uncapped' ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  for (const rot of ['free', 'rot32']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('console', (m) => m.text().startsWith('[stress]') && process.env.VERBOSE && console.log(m.text()));
    if (Number(throttle) > 1) await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
    await page.goto(`${base}/stress.html?rot=${rot}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 60_000 });
    await page.waitForTimeout(Number(secs) * 1000);
    const r = await page.evaluate(() => window.__fps);
    const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    const s = r.samples.slice(2).sort((a, b) => a - b);
    const med = s[Math.floor(s.length / 2)] ?? 0;
    console.log(`${rot.padEnd(5)} median ${med.toFixed(1)} FPS, low ${(s[0] ?? 0).toFixed(1)}, ${r.stats.views} tanks drawn, textures ≈ ${r.stats.texMB.toFixed(1)} MB (rot sheets ${r.stats.sheets}, ${r.stats.rotMB.toFixed(1)} MB; ground ${r.stats.chunks} chunks ${r.stats.groundMB.toFixed(1)} MB) on ${renderer}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
