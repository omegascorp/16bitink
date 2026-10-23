/**
 * Renders the web copies of every game cover (into src/assets/covers/, so the
 * build hashes them), and the home page's social preview (next to the
 * masters), from the masters in public/covers/<slug>.png (1200x675).
 * Run after changing a cover: `pnpm --filter @16bitink/web covers`.
 *
 *   <slug>-640.avif, -1200.avif   what the pages show (src/lib/covers.ts names them)
 *   <slug>-640.webp, -1200.webp   for browsers without AVIF
 *   home.jpg                      1200x630 og:image for the home page: all three games on paper
 */
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const COVERS = join(WEB, 'public', 'covers');
const COPIES = join(WEB, 'src', 'assets', 'covers');
const WIDTHS = [640, 1200];
const PAPER = '#f4eddc';
const INK = '#1b1a1f';
/** The home preview's order: the big one first. */
const HOME_GAMES = ['inkfish', 'inkcrab', 'inkmine'];

const masters = (await readdir(COVERS)).filter((f) => /^[a-z0-9-]+\.png$/.test(f) && f !== 'home.png');
if (masters.length === 0) throw new Error(`No cover PNGs in ${COVERS}`);

for (const file of masters) {
  const slug = file.replace(/\.png$/, '');
  for (const width of WIDTHS) {
    const resized = () => sharp(join(COVERS, file)).resize({ width, withoutEnlargement: true });
    await resized().avif({ quality: 70, effort: 6 }).toFile(join(COPIES, `${slug}-${width}.avif`));
    await resized().webp({ quality: 86, effort: 6 }).toFile(join(COPIES, `${slug}-${width}.webp`));
  }
  console.log(`wrote ${slug}-{${WIDTHS.join(',')}}.{avif,webp}`);
}

/** One cover with an ink border and the site's offset shadow, as a sharp composite layer. */
async function framed(slug, width, height, left, top) {
  const border = 3;
  const shadow = 5;
  const image = await sharp(join(COVERS, `${slug}.png`))
    .resize(width - border * 2, height - border * 2)
    .extend({ top: border, bottom: border, left: border, right: border, background: INK })
    .toBuffer();
  const shade = await sharp({ create: { width, height, channels: 4, background: { r: 27, g: 26, b: 31, alpha: 0.85 } } }).png().toBuffer();
  return [
    { input: shade, left: left + shadow, top: top + shadow },
    { input: image, left, top },
  ];
}

// The big cover is as tall as the two small ones stacked, all 16:9.
const W = 1200;
const H = 630;
const GAP = 24;
const small = { width: 350, height: 197 };
const big = { width: 743, height: small.height * 2 + GAP };
const left = Math.round((W - big.width - GAP - small.width) / 2);
const top = Math.round((H - big.height) / 2);
const [first, second, third] = HOME_GAMES;
const layers = [
  ...(await framed(first, big.width, big.height, left, top)),
  ...(await framed(second, small.width, small.height, left + big.width + GAP, top)),
  ...(await framed(third, small.width, small.height, left + big.width + GAP, top + small.height + GAP)),
];
await sharp({ create: { width: W, height: H, channels: 3, background: PAPER } })
  .composite(layers)
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(join(COVERS, 'home.jpg'));
console.log('wrote home.jpg');
