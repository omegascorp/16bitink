// Saves the Reddit ad creative (a Max campaign's "Media" and "Thumbnails") to promo/reddit/:
//   pnpm --filter @16bitink/inkfish ads                 -> everything
//   pnpm --filter @16bitink/inkfish ads -- --only video -> just the files whose name contains "video"
//
// Images and thumbnails are drawn by dev/ads.html. The videos are the promo
// shorts (promo/*.mp4, made by `pnpm promo`) cut to 4:5, which converted best
// in Reddit's own study (9:16 is not on its list and gets letterboxed), with
// the overlay from dev/promo/ads/overlay.ts on top.
// Reddit's Max limits: images 10 MB (at least 1000 px wide), thumbnails 3 MB,
// videos 100 MB at 30 fps or less. Needs ffmpeg on PATH and Google Chrome.
import { spawn } from 'node:child_process';
import { access, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
// The repo's top-level promo/, shared by every game and the site.
const promoDir = path.resolve(pkg, '../../promo');
const outDir = path.join(promoDir, 'reddit');

const args = process.argv.slice(2);
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args[onlyAt + 1] : null;
if (onlyAt >= 0 && !only) throw new Error('--only takes part of a file name');
const wanted = (name) => !only || name.includes(only);

const MB = 1024 * 1024;
/** 3:4 and 1:1 from Reddit's Max image list; keep in step with IMAGE_IDS in ads/images.ts. */
const IMAGES = ['run', 'leap', 'chain', 'glowup', 'hunter'];
const IMAGE_SIZES = [{ tag: '3x4', w: 1200, h: 1600 }, { tag: '1x1', w: 1200, h: 1200 }];
/** Thumbnails are drawn at 3x and scaled down, so the kit's outlines keep their weight. Keep in step with THUMB_IDS. */
const THUMBS = ['run', 'leap', 'gulp'];
const THUMB_SIZES = [{ tag: '4x3', w: 400, h: 300 }, { tag: '1x1', w: 300, h: 300 }];
const THUMB_DRAW_SCALE = 3;

/** 4:5 at Reddit's recommended 1200x1500, from the 1080x1920 shorts. */
const VIDEO = { w: 1200, h: 1500 };
/** The 4:5 window's top edge in the 1080x1920 short: just above the captions, which start near y 250. */
const CROP = { w: 1080, h: 1350, top: 180 };
/**
 * `start` and `seconds` cut the loop; a start past 0 rotates it (the shorts
 * loop seamlessly). Reddit found under 6 s converts best, then 6-10 s, so
 * the strongest two also come as short cuts.
 */
const VIDEOS = [
  { name: 'chain-12s', src: 'inkfish-loop', start: 0, seconds: 12, overlay: 'chain' },
  { name: 'chain-6s', src: 'inkfish-loop', start: 0, seconds: 6, overlay: 'chain' },
  { name: 'perch-12s', src: 'inkfish-remember-this-perch', start: 0, seconds: 12, overlay: 'footer' },
  { name: 'perch-6s', src: 'inkfish-remember-this-perch', start: 0, seconds: 5.8, overlay: 'footer' },
  { name: 'bigger-fish-12s', src: 'inkfish-bigger-fish', start: 0, seconds: 12, overlay: 'footer' },
  // Opens on the trevally already under the tern: the calm opening is what sank the original.
  { name: 'birds-12s', src: 'inkfish-fish-eat-birds', start: 3.3, seconds: 12, overlay: 'footer' },
];

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

async function draw(page, base, query) {
  let pageError;
  const onError = (e) => { pageError = e; };
  page.on('pageerror', onError);
  try {
    await page.goto(`${base}/ads.html?${query}`);
    await page.waitForFunction(() => window.adReady === true, null, { timeout: 120_000 }).catch((e) => { throw pageError ?? e; });
    if (pageError) throw pageError;
  } finally {
    page.off('pageerror', onError);
  }
}

const grab = (page, type) => page.evaluate((t) => document.getElementById('ad').toDataURL(t, 0.92).split(',')[1], type);

async function save(file, base64, maxBytes) {
  const out = path.join(outDir, file);
  await writeFile(out, Buffer.from(base64, 'base64'));
  await checkSize(out, maxBytes);
}

async function checkSize(out, maxBytes) {
  const { size } = await stat(out);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${(size / MB).toFixed(2)} MB)`);
  if (size > maxBytes) throw new Error(`${path.basename(out)} is over Reddit's ${maxBytes / MB} MB limit`);
}

async function images(page, base) {
  for (const id of IMAGES) {
    for (const s of IMAGE_SIZES) {
      const file = `reddit-image-${id}-${s.tag}.jpg`;
      if (!wanted(file)) continue;
      await draw(page, base, `kind=image&v=${id}&w=${s.w}&h=${s.h}`);
      await save(file, await grab(page, 'image/jpeg'), 10 * MB);
    }
  }
}

async function thumbs(page, base, tmp) {
  for (const id of THUMBS) {
    for (const s of THUMB_SIZES) {
      const file = `reddit-thumb-${id}-${s.tag}.jpg`;
      if (!wanted(file)) continue;
      await draw(page, base, `kind=thumb&v=${id}&w=${s.w * THUMB_DRAW_SCALE}&h=${s.h * THUMB_DRAW_SCALE}`);
      const big = path.join(tmp, `${id}-${s.tag}.png`);
      await writeFile(big, Buffer.from(await grab(page, 'image/png'), 'base64'));
      const out = path.join(outDir, file);
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', big, '-vf', `scale=${s.w}:${s.h}:flags=lanczos`, '-q:v', '2', out]);
      await checkSize(out, 3 * MB);
    }
  }
}

async function videos(page, base, tmp) {
  for (const v of VIDEOS) {
    const file = `reddit-video-${v.name}.mp4`;
    if (!wanted(file)) continue;
    const src = path.join(promoDir, `${v.src}.mp4`);
    await access(src).catch(() => { throw new Error(`${path.relative(process.cwd(), src)} is missing: run \`pnpm promo -- --only ${v.src}\` first`); });
    await draw(page, base, `kind=overlay&v=${v.overlay}&w=${VIDEO.w}&h=${VIDEO.h}`);
    const overlay = path.join(tmp, `overlay-${v.overlay}.png`);
    await writeFile(overlay, Buffer.from(await grab(page, 'image/png'), 'base64'));
    const out = path.join(outDir, file);
    await run('ffmpeg', [
      '-y', '-loglevel', 'error',
      // Played twice over, so a rotated start can run on past the loop's end.
      '-stream_loop', '1', '-ss', String(v.start), '-t', String(v.seconds), '-i', src,
      '-i', overlay,
      '-filter_complex', `[0:v]crop=${CROP.w}:${CROP.h}:0:${CROP.top},scale=${VIDEO.w}:${VIDEO.h}:flags=lanczos[v];[v][1:v]overlay=0:0,format=yuv420p[out]`,
      '-map', '[out]', '-map', '0:a',
      '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      out,
    ]);
    await checkSize(out, 100 * MB);
  }
}

await mkdir(outDir, { recursive: true });
const tmp = path.join(outDir, '.tmp');
await mkdir(tmp, { recursive: true });
const server = await createServer({ configFile: path.join(pkg, 'vite.config.ts'), root: path.join(pkg, 'dev'), server: { port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await images(page, base);
  await thumbs(page, base, tmp);
  await videos(page, base, tmp);
} finally {
  await browser.close();
  await server.close();
  await rm(tmp, { recursive: true, force: true });
}
