import Phaser from 'phaser';
import { DECOR_SIZE, type DecorId } from '../../art/decorArt';
import { isGlowDecor } from '../../art/decorGlow';
import { SHORE_SIZE } from '../../art/shoreArt';
import { BOAT_SPEC } from '../../art/skyArt';
import {
  ART_RES, birdKey, CLOUD_COUNT, cloudKey, decorGlowKey, ensureBirdTextures, ensureDecorTextures, ensureJellyTextures, ensureShoreTextures,
  jellyGlowKey, jellyKey, shoreKey,
} from '../../art/textures';
import { makeCanvas } from '../../art/pen';
import { JELLY_INFO, ZONE_JELLY } from '../../levels/jellies';
import { ZONE_SHORE } from '../../levels/shore';
import { ZONE_NIGHT, ZONE_SKY } from '../../levels/zones';
import { ZONE_BIRDS } from '../../logic/birds';
import { createRng, rangeOf, type Rng } from '../../logic/rng';
import { boatKey, ZONE_BOATS } from '../game/boats';
import type { GlowTwins } from '../game/glowTwins';
import { ZONE_DECOR } from '../game/seabedDecor';
import { MAP, type MapLayout, type MapZone } from './layout';
import type { Boiler } from './mapWorld';

/**
 * The map shows each chapter the way its levels look: sky, islands, boats
 * and birds over the sunlit chapters; the zone's own seabed landmarks and
 * jellyfish; and below the reach of sunlight, night with living light.
 */

type Add = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

/** Decor is drawn smaller on the map than in a level: the map is a chart, not a dive. */
const DECOR_SCALE = 0.55;
/** Every chapter's landmarks show on the map (the wreck, the whale fall, the volcano...), plus a few small pieces. */
const SMALL_DECOR = 3;

export interface PlacedMapDecor {
  readonly kind: DecorId;
  readonly sprite: Phaser.GameObjects.Image;
}

/** Clouds, a horizon island, a fishing boat and a bird over each chapter that has open sky. */
export function mapSky(scene: Phaser.Scene, layout: MapLayout, add: Add, boilers: Boiler[]): void {
  const rng = createRng(21);
  for (const z of layout.zones) {
    const zone = z.chapter.info.zone;
    if (!ZONE_SKY[zone]) continue;
    const alpha = z.chapter.locked ? 0.45 : 1;
    const cx = (z.x0 + z.x1) / 2;
    add(scene.add.image(rangeOf(rng, z.x0, z.x1), rangeOf(rng, 40, 85), cloudKey(Math.floor(rng() * CLOUD_COUNT)))
      .setScale(rangeOf(rng, 0.4, 0.55) / ART_RES).setAlpha(0.8 * alpha));
    const shore = ZONE_SHORE[zone]?.[Math.floor(rng() * (ZONE_SHORE[zone]?.length ?? 1))];
    if (shore) {
      ensureShoreTextures(scene, [shore]);
      const { h } = SHORE_SIZE[shore];
      add(scene.add.image(rangeOf(rng, z.x0 + 80, cx - 120), MAP.surfaceY + 2, shoreKey(shore)).setOrigin(0.5, (h - 4) / h)
        .setScale(0.32 / ART_RES).setAlpha(0.6 * alpha));
    }
    const boats = ZONE_BOATS[zone];
    if (boats?.length) {
      const kind = boats[Math.floor(rng() * boats.length)]!;
      const spec = BOAT_SPEC[kind];
      const boat = add(scene.add.image(rangeOf(rng, cx + 40, z.x1 - 120), MAP.surfaceY, boatKey(kind))
        .setOrigin(0.5, spec.waterline / spec.h).setScale(0.5 / ART_RES).setFlipX(rng() < 0.5).setAlpha(alpha));
      scene.tweens.add({ targets: boat, angle: 2.5, y: boat.y + 2, duration: rangeOf(rng, 1600, 2400), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    const birds = ZONE_BIRDS[zone]?.kinds;
    if (birds?.length) {
      const kind = birds[Math.floor(rng() * birds.length)]!;
      ensureBirdTextures(scene, [kind]);
      const x = rangeOf(rng, z.x0 + 60, z.x1 - 60);
      const bird = add(scene.add.image(x, rangeOf(rng, 55, 105), birdKey(kind, 0)).setScale(0.4).setAlpha(alpha));
      const dir = rng() < 0.5 ? -1 : 1;
      bird.setFlipX(dir < 0);
      scene.tweens.add({ targets: bird, x: x + dir * 160, duration: rangeOf(rng, 7000, 10000), yoyo: true, repeat: -1, ease: 'Sine.InOut', onYoyo: () => bird.toggleFlipX(), onRepeat: () => bird.toggleFlipX() });
      boilers.push({ sprite: bird, key: (f) => birdKey(kind, f) });
    }
  }
}

/** Each chapter's landmark and a few of its small seabed pieces, as its levels have them. */
export function mapDecor(scene: Phaser.Scene, layout: MapLayout, add: Add): PlacedMapDecor[] {
  const rng = createRng(33);
  return layout.zones.flatMap((z) => {
    const { common, landmarks } = ZONE_DECOR[z.chapter.info.zone];
    const alpha = z.chapter.locked ? 0.45 : 1;
    const cx = (z.x0 + z.x1) / 2;
    const picks: { kind: DecorId; x: number; scale: number }[] = landmarks.map((kind, i) => ({
      kind, x: cx + (i - (landmarks.length - 1) / 2) * 420 + rangeOf(rng, -60, 60), scale: DECOR_SCALE,
    }));
    for (let i = 0; i < SMALL_DECOR; i++) {
      picks.push({ kind: common[Math.floor(rng() * common.length)]!, x: rangeOf(rng, z.x0 + 40, z.x1 - 40), scale: DECOR_SCALE * rangeOf(rng, 0.8, 1.1) });
    }
    ensureDecorTextures(scene, [...new Set(picks.map((p) => p.kind))]);
    return picks.map(({ kind, x, scale }) => {
      const sink = Math.min(8, DECOR_SIZE[kind].h * 0.06);
      const sprite = add(scene.add.image(x, layout.floorAt(x) + sink, `decor-${kind}`).setOrigin(0.5, 1).setScale(scale / ART_RES)
        .setFlipX(rng() < 0.5).setAlpha(alpha));
      return { kind, sprite };
    });
  });
}

/** Night over the deep chapters, blending in across zone borders, with marine snow; baked into one image. */
export function mapNight(scene: Phaser.Scene, layout: MapLayout): Phaser.GameObjects.Image {
  const res = 0.25;
  const top = MAP.surfaceY;
  const { canvas, ctx } = makeCanvas(Math.ceil(layout.width * res), Math.ceil((layout.height - top) * res));
  ctx.scale(res, res);
  const across = ctx.createLinearGradient(0, 0, layout.width, 0);
  layout.zones.forEach((z) => {
    const { alpha, color } = ZONE_NIGHT[z.chapter.info.zone];
    const rgb = `${(color >> 16) & 255},${(color >> 8) & 255},${color & 255}`;
    // Flat across the zone, blending into the next over the gap between their routes.
    across.addColorStop((z.x0 + MAP.zonePad) / layout.width, `rgba(${rgb},${alpha})`);
    across.addColorStop((z.x1 - MAP.zonePad) / layout.width, `rgba(${rgb},${alpha})`);
  });
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, layout.width, layout.height - top);
  // Marine snow: pale specks wherever the night is.
  const rng = createRng(55);
  for (const z of layout.zones) {
    if (ZONE_NIGHT[z.chapter.info.zone].alpha === 0) continue;
    for (let i = 0; i < (z.x1 - z.x0) / 6; i++) {
      ctx.fillStyle = `rgba(223,232,255,${rangeOf(rng, 0.1, 0.3)})`;
      ctx.beginPath();
      ctx.arc(rangeOf(rng, z.x0, z.x1), rangeOf(rng, 0, layout.height - top), rangeOf(rng, 1.5, 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const key = 'map-night';
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  return scene.add.image(0, top, key).setOrigin(0).setScale(1 / res);
}

/** Lights the glowing scenery that sits under the night. */
export function lightMapDecor(decor: readonly PlacedMapDecor[], glows: GlowTwins, add: Add): void {
  for (const d of decor) {
    if (!isGlowDecor(d.kind)) continue;
    const glow = glows.attach(d.sprite, decorGlowKey(d.kind), { alpha: 0.9, pulse: 0.12 });
    if (glow) add(glow);
  }
}

/** The chapter's own jellyfish, drifting near its route; glowing ones light up. */
export function mapJellies(scene: Phaser.Scene, z: MapZone, layout: MapLayout, add: Add, boilers: Boiler[], glows: GlowTwins, rng: Rng): void {
  const kind = ZONE_JELLY[z.chapter.info.zone];
  ensureJellyTextures(scene, [kind]);
  const x = rangeOf(rng, z.x0 + 80, z.x1 - 80);
  const y = Math.max(MAP.surfaceY + 60, layout.floorAt(x) - rangeOf(rng, 230, 300));
  const sprite = add(scene.add.image(x, y, jellyKey(kind, 0)).setScale((0.4 * JELLY_INFO[kind].scale) / ART_RES).setAlpha(z.chapter.locked ? 0.45 : 1));
  scene.tweens.add({ targets: sprite, y: y - 24, duration: rangeOf(rng, 2200, 3000), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  boilers.push({ sprite, key: (f) => jellyKey(kind, f) });
  if (JELLY_INFO[kind].glow && ZONE_NIGHT[z.chapter.info.zone].alpha > 0) {
    const glow = glows.attach(sprite, jellyGlowKey(kind), { alpha: 0.85, pulse: 0.5 });
    if (glow) add(glow);
  }
}

