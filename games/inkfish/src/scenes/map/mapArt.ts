import type Phaser from 'phaser';
import { makeCanvas } from '../../art/pen';
import { createRng } from '../../logic/rng';
import { ZONE_DARKNESS } from '../../levels/zones';
import { MAP, type MapLayout } from './layout';

/** Background is baked at half resolution: washes and sand are soft anyway. */
const BG_RES = 0.5;
const CHUNK = 2048;

/** Darkness at a world x, blending across zone borders. */
function darknessAt(layout: MapLayout, x: number): number {
  const zones = layout.zones;
  const centers = zones.map((z) => (z.x0 + z.x1) / 2);
  if (x <= centers[0]!) return ZONE_DARKNESS[zones[0]!.chapter.info.zone];
  for (let i = 0; i < zones.length - 1; i++) {
    if (x <= centers[i + 1]!) {
      const t = (x - centers[i]!) / (centers[i + 1]! - centers[i]!);
      const a = ZONE_DARKNESS[zones[i]!.chapter.info.zone];
      const b = ZONE_DARKNESS[zones[i + 1]!.chapter.info.zone];
      return a + (b - a) * t;
    }
  }
  return ZONE_DARKNESS[zones[zones.length - 1]!.chapter.info.zone];
}

/**
 * Water washes (darker with depth), sand and stipple, baked into a few
 * canvas chunks so the long map costs a handful of sprites per frame.
 */
export function bakeMapBackground(scene: Phaser.Scene, layout: MapLayout): Phaser.GameObjects.Image[] {
  const images: Phaser.GameObjects.Image[] = [];
  const rng = createRng(7);
  for (let x0 = 0, i = 0; x0 < layout.width; x0 += CHUNK, i++) {
    // Chunks butt edge to edge on whole pixels: overlapping them would paint
    // the translucent washes twice and draw a dark stripe at every seam.
    const wWorld = Math.min(CHUNK, layout.width - x0);
    const { canvas, ctx } = makeCanvas(Math.ceil(wWorld * BG_RES), Math.ceil(layout.height * BG_RES));
    ctx.scale(BG_RES, BG_RES);
    // Water, in two seamless washes: zone darkness left to right, then depth top to bottom.
    const across = ctx.createLinearGradient(0, 0, wWorld, 0);
    for (let x = 0; x <= wWorld; x += 128) {
      const dark = darknessAt(layout, x0 + x);
      across.addColorStop(x / wWorld, `rgba(${dark > 0.5 ? '28,42,74' : '44,79,134'},${0.06 + dark * 0.62})`);
    }
    ctx.fillStyle = across;
    ctx.fillRect(0, MAP.surfaceY, wWorld, layout.height - MAP.surfaceY);
    const down = ctx.createLinearGradient(0, MAP.surfaceY, 0, layout.height);
    down.addColorStop(0, 'rgba(44,79,134,0.02)');
    down.addColorStop(1, 'rgba(28,42,74,0.22)');
    ctx.fillStyle = down;
    ctx.fillRect(0, MAP.surfaceY, wWorld, layout.height - MAP.surfaceY);
    // Sand below the seabed line, stippled more densely with depth.
    ctx.beginPath();
    ctx.moveTo(0, layout.height);
    for (let x = 0; x <= wWorld; x += 12) ctx.lineTo(x, layout.floorAt(x0 + x));
    ctx.lineTo(wWorld, layout.floorAt(x0 + wWorld));
    ctx.lineTo(wWorld, layout.height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214,198,160,0.75)';
    ctx.fill();
    ctx.fillStyle = '#1b1a1f';
    for (let k = 0; k < wWorld * 1.6; k++) {
      const x = rng() * wWorld;
      const top = layout.floorAt(x0 + x);
      const d = rng();
      ctx.globalAlpha = 0.25 + d * 0.45;
      ctx.beginPath();
      ctx.arc(x, top + 6 + d * d * (layout.height - top), 0.8 + rng() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const key = `map-bg-${i}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
    images.push(scene.add.image(x0, 0, key).setOrigin(0).setScale(1 / BG_RES));
  }
  return images;
}
