/**
 * Renders the home-screen icons into public/icons/ and the favicon into public/.
 * Run after changing the art in scripts/icons/: `pnpm --filter @16bitink/web icons`.
 *
 * Each icon set has:
 *   <name>-180.png           iOS apple-touch-icon (opaque; iOS rounds the corners)
 *   <name>-192.png, -512.png manifest icons, purpose "any"
 *   <name>-maskable-512.png  manifest icon, purpose "maskable" (art inside the 80% safe zone)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { inkcrabArt } from './icons/inkcrab.mjs';
import { inkfishArt } from './icons/inkfish.mjs';
import { INK, PAPER, SIZE, brandDrop, paper } from './icons/paper.mjs';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const OUT = join(PUBLIC, 'icons');

/** Maskable icons get cropped to a circle or squircle, so the art shrinks into the safe zone. */
const MASKABLE_SCALE = 0.8;

const ICONS = {
  '16bitink': () => brandDrop({ top: 45, scale: 1.1 }),
  inkfish: (opts) => inkfishArt(opts),
  inkcrab: (opts) => inkcrabArt(opts),
};

function svg(art, { maskable = false } = {}) {
  const c = SIZE / 2;
  const s = maskable ? MASKABLE_SCALE : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
    ${paper()}
    <g transform="translate(${c} ${c}) scale(${s}) translate(${-c} ${-c})">${art}</g>
  </svg>`;
}

async function png(source, size, file) {
  await sharp(Buffer.from(source), { density: (72 * size) / SIZE })
    .resize(size, size)
    .flatten()
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, file));
}

/**
 * A tab favicon: the drop alone on a transparent background, without the fine detail.
 * On a dark tab strip the black ink would vanish, so there the ink turns paper-coloured.
 */
function favicon() {
  const dark = `@media (prefers-color-scheme: dark) { [fill="${INK}"] { fill: ${PAPER} } [stroke="${INK}"] { stroke: ${PAPER} } }`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="96 50 320 412"><style>${dark}</style>${brandDrop({ detail: false })}</svg>\n`;
}

await mkdir(OUT, { recursive: true });
for (const [name, art] of Object.entries(ICONS)) {
  const any = svg(art({ maskable: false }));
  await png(any, 180, `${name}-180.png`);
  await png(any, 192, `${name}-192.png`);
  await png(any, 512, `${name}-512.png`);
  await png(svg(art({ maskable: true }), { maskable: true }), 512, `${name}-maskable-512.png`);
}
await writeFile(join(PUBLIC, 'favicon.svg'), favicon());
console.log(`icons written to ${OUT}`);
