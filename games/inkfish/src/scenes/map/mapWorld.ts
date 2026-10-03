import Phaser from 'phaser';
import { ART_RES, fishKey, weedKey } from '../../art/textures';
import type { SpeciesId } from '../../levels/types';
import { createRng, rangeOf } from '../../logic/rng';
import { ZONE_WEEDS } from '../game/world';
import { ZONE_DARKNESS } from '../../levels/zones';
import { BLUE_INK, drawBlot, HAND_FONT, INK_HEX } from '../ui';
import { MAP, type MapLayout, type MapNode } from './layout';
import { bakeMapBackground } from './mapArt';
import { drawTwistIcon } from './twistIcons';
import { twistsFor } from '../../levels/twists';

export type NodeState = 'done' | 'current' | 'open' | 'closed' | 'locked';

/** A boiling sprite: its texture is redrawn on the shared boil clock. */
export interface Boiler {
  readonly sprite: Phaser.GameObjects.Image;
  readonly key: (frame: number) => string;
}

export interface MapWorld {
  readonly objects: Phaser.GameObjects.GameObject[];
  readonly boilers: Boiler[];
  /** Invisible hit areas, one per playable node. */
  readonly hits: { readonly node: MapNode; readonly zone: Phaser.GameObjects.Zone }[];
}

const PENCIL = '#a69c8a';
const ZONE_FAUNA: Readonly<Record<string, readonly SpeciesId[]>> = {
  tidepool: ['minnow', 'perch'], seagrass: ['minnow', 'puffer'], kelp: ['perch', 'pike'], reef: ['puffer', 'perch'],
  wreck: ['pike', 'eel'], dropoff: ['pike', 'eel'], twilight: ['eel', 'angler'], midnight: ['angler', 'eel'],
  abyss: ['angler', 'eel'], trench: ['angler', 'eel'],
};

function text(scene: Phaser.Scene, x: number, y: number, s: string, size: number, color: string): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: size * 0.2, y: 4 } }).setOrigin(0.5);
}

export function depthLabel(depth: readonly [number, number]): string {
  const fmt = (m: number): string => (m >= 1000 ? `${(m / 1000).toFixed(m % 1000 ? 1 : 0)} km` : `${m} m`);
  return `${fmt(depth[0])} to ${fmt(depth[1])}`;
}

/** Everything that scrolls: water, seabed, scenery, the route and its level nodes. */
export function buildMapWorld(scene: Phaser.Scene, layout: MapLayout, states: ReadonlyMap<string, NodeState>, blots: ReadonlyMap<string, number>): MapWorld {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const boilers: Boiler[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    objects.push(o);
    return o;
  };
  const rng = createRng(4);

  add(scene.add.tileSprite(0, 0, layout.width, layout.height, 'paper').setOrigin(0));
  bakeMapBackground(scene, layout).forEach(add);

  // Surface and seabed lines in crisp vector pen.
  const lines = add(scene.add.graphics());
  lines.lineStyle(1.4, INK_HEX, 0.75).beginPath();
  for (let x = 0; x <= layout.width; x += 14) lines.lineTo(x, MAP.surfaceY + Math.sin(x / 80) * 5);
  lines.strokePath();
  lines.lineStyle(1.5, INK_HEX, 0.85).beginPath();
  for (let x = 0; x <= layout.width; x += 10) lines.lineTo(x, layout.floorAt(x) + (rng() - 0.5) * 1.2);
  lines.strokePath();

  layout.zones.forEach((z, zi) => {
    const locked = z.chapter.locked;
    const alpha = locked ? 0.45 : 1;
    const info = z.chapter.info;
    // On dark water, pencil and ink flip to pale so they stay legible.
    const dark = ZONE_DARKNESS[info.zone] > 0.45;
    const pencil = dark ? '#d8cfbd' : PENCIL;
    const flora = ZONE_WEEDS[info.zone];
    for (let i = 0; i < Math.ceil(flora.rocks / 2); i++) {
      const x = rangeOf(rng, z.x0, z.x1);
      add(scene.add.image(x, layout.floorAt(x) + 8, `rock-${i % 3}`).setOrigin(0.5, 0.94).setScale(rangeOf(rng, 0.45, 0.8) / ART_RES).setAlpha(alpha));
    }
    for (let i = 0; i < Math.ceil(flora.count / 2.5) && flora.kinds.length; i++) {
      const x = rangeOf(rng, z.x0, z.x1);
      const kind = flora.kinds[i % flora.kinds.length]!;
      const sprite = add(scene.add.image(x, layout.floorAt(x) + 6, weedKey(kind, 0)).setOrigin(0.5, 1).setScale(rangeOf(rng, 0.5, 0.8) / ART_RES).setAlpha(alpha));
      boilers.push({ sprite, key: (f) => weedKey(kind, f) });
    }
    if (info.zone === 'wreck') {
      const x = (z.x0 + z.x1) / 2 + 60;
      add(scene.add.image(x, layout.floorAt(x) + 14, 'wreck').setOrigin(0.5, 1).setScale(0.75 / ART_RES).setAlpha(alpha));
    }
    // Ambient fish drift above the route, the zone's locals.
    for (let i = 0; i < 3; i++) {
      const species = ZONE_FAUNA[info.zone]![i % 2]!;
      const x = rangeOf(rng, z.x0 + 60, z.x1 - 60);
      const y = Math.max(MAP.surfaceY + 50, layout.floorAt(x) - rangeOf(rng, 190, 300));
      const sprite = add(scene.add.image(x, y, fishKey(species, 'light', 0)).setScale(rangeOf(rng, 0.16, 0.26)).setAlpha(alpha * 0.85));
      const dir = rng() < 0.5 ? -1 : 1;
      sprite.setFlipX(dir < 0);
      scene.tweens.add({ targets: sprite, x: x + dir * 70, y: y + rangeOf(rng, -12, 12), duration: rangeOf(rng, 5000, 8000), yoyo: true, repeat: -1, ease: 'Sine.InOut', onYoyo: () => sprite.setFlipX(!sprite.flipX), onRepeat: () => sprite.setFlipX(!sprite.flipX) });
      boilers.push({ sprite, key: (f) => fishKey(species, 'light', f) });
    }
    // Depth marker where the zone begins (the surface needs no label).
    if (zi > 0) add(scene.add.text(z.x0, layout.floorAt(z.x0) + 28, depthLabel([info.depth[0], info.depth[0]]).split(' to ')[0]!, { fontFamily: HAND_FONT, fontSize: '22px', color: '#4a463e' }).setOrigin(0.5, 0));
    // Chapter heading: the player fish of this chapter, its name and depth.
    const cx = (z.x0 + z.x1) / 2;
    const hy = Math.max(MAP.surfaceY + 70, z.floorY - 330);
    const ink = locked ? pencil : dark ? '#ece4d2' : '#1b1a1f';
    const title = add(text(scene, cx + 34, hy, `${info.id}. ${info.name}`, 38, locked ? pencil : dark ? '#c9d8f5' : BLUE_INK));
    add(text(scene, cx + 34, hy + 38, locked ? `${depthLabel(info.depth)}, full game` : depthLabel(info.depth), 22, ink));
    const portrait = add(scene.add.image(title.x - title.width / 2 - 34, hy + 4, fishKey(info.player, 'light', 0)).setScale(0.3).setAlpha(locked ? 0.5 : 1));
    boilers.push({ sprite: portrait, key: (f) => fishKey(info.player, 'light', f) });
  });

  // The route: a dotted pencil line through every node; solid ink where you have been.
  const route = add(scene.add.graphics());
  layout.nodes.forEach((n, i) => {
    const prev = layout.nodes[i - 1];
    if (!prev) return;
    const s = states.get(n.levelId);
    const travelled = s === 'done' || s === 'current';
    const steps = Math.ceil(Phaser.Math.Distance.Between(prev.x, prev.y, n.x, n.y) / 12);
    route.fillStyle(travelled ? 0x1f3f8a : INK_HEX, travelled ? 0.8 : 0.35);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      route.fillCircle(prev.x + (n.x - prev.x) * t, prev.y + (n.y - prev.y) * t + Math.sin(t * Math.PI) * 10, travelled ? 2.4 : 1.8);
    }
  });

  const hits: MapWorld['hits'][number][] = [];
  const nodesG = add(scene.add.graphics());
  const firstOfZone = layout.zones.map((_, zi) => layout.nodes.findIndex((m) => m.zone === zi));
  for (const n of layout.nodes) {
    const state = states.get(n.levelId) ?? 'closed';
    const r = state === 'current' ? 30 : 25;
    const deep = ZONE_DARKNESS[layout.zones[n.zone]!.chapter.info.zone] > 0.45;
    const twists = twistsFor(layout.zones[n.zone]!.chapter.info.id, n.index - firstOfZone[n.zone]!);
    const faded = state === 'locked' || state === 'closed';
    if (twists.includes('boss')) {
      // The chapter's giant: a red pencil ring around the node.
      nodesG.lineStyle(2, 0xa3342b, faded ? 0.45 : 0.9).strokeCircle(n.x, n.y, r + 7);
    }
    const icons = twists.filter((t) => t !== 'grow' && t !== 'boss');
    icons.forEach((t, k) => drawTwistIcon(nodesG, t, n.x + (k - (icons.length - 1) / 2) * 19, n.y - r - 14, deep ? 0xd8cfbd : INK_HEX, faded ? 0.5 : 0.9));
    if (state === 'locked') {
      // Dashed pencil circle: drawn, but not inked yet.
      nodesG.lineStyle(1.6, deep ? 0xd8cfbd : 0xa69c8a, 0.9);
      for (let a = 0; a < Math.PI * 2; a += 0.5) nodesG.beginPath().arc(n.x, n.y, r, a, a + 0.28).strokePath();
    } else {
      nodesG.fillStyle(state === 'done' ? 0xdfe6f5 : 0xfffaf0, 1).fillCircle(n.x, n.y, r);
      nodesG.lineStyle(state === 'current' ? 3 : 2, state === 'closed' ? 0xb8ad98 : 0x1f3f8a, 1).strokeCircle(n.x, n.y, r);
      nodesG.lineStyle(0.8, state === 'closed' ? 0xb8ad98 : 0x1f3f8a, 0.6).strokeCircle(n.x + 1, n.y - 1, r - 3);
    }
    const color = state === 'locked' ? (deep ? '#d8cfbd' : PENCIL) : state === 'closed' ? PENCIL : state === 'done' ? BLUE_INK : '#1b1a1f';
    add(text(scene, n.x, n.y, String(n.index + 1), state === 'current' ? 30 : 26, color));
    const b = blots.get(n.levelId) ?? 0;
    if (state === 'done') for (let k = 0; k < 3; k++) drawBlot(nodesG, n.x - 16 + k * 16, n.y + r + 12, 5, b > k, n.index * 3 + k);
    if (state !== 'locked' && state !== 'closed') {
      const zone = add(scene.add.zone(n.x, n.y, r * 2.4, r * 2.4).setInteractive({ useHandCursor: true }));
      hits.push({ node: n, zone });
    }
  }
  return { objects, boilers, hits };
}
