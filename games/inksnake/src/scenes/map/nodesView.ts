import Phaser from 'phaser';
import { CRITTER_ART } from '../../art/critters/index';
import { BLUE, INK_HEX, RED_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import { createRng } from '../../logic/rng';
import { drawBlots, HAND_FONT } from '../ui';
import { MAP, type MapLayout, type MapNode } from './layout';
import type { NodeState } from './states';

const SOFT_INK = '#4a463e';
const PENCIL = '#8a8578';
const PENCIL_HEX = 0x8a8578;
/** The egg in a nest, world px long. */
const EGG = MAP.nodeRadius * 1.5;

export interface NodeHit {
  readonly node: MapNode;
  readonly state: NodeState;
  readonly zone: Phaser.GameObjects.Zone;
}

/** A hand-drawn ring: a circle with a little wobble, its ends overlapping. */
function ring(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, seed: number): void {
  const rng = createRng(seed);
  const n = 26;
  const pts = Array.from({ length: n + 3 }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - 0.4;
    const rr = r + (rng() - 0.5) * 2;
    return new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  });
  g.strokePoints(pts, false);
}

/**
 * Each level's nest on the map: its egg (painted once reachable, a ghost
 * of one before, a pencil circle for drafts), its number, its name and
 * blots beside it, and a red ring round the one the snake is up to.
 */
export function buildNodes(
  scene: Phaser.Scene, layout: MapLayout, layer: Phaser.GameObjects.Layer, states: ReadonlyMap<string, NodeState>,
  names: ReadonlyMap<string, string>, blots: ReadonlyMap<string, number>, textRes: number,
): { hits: NodeHit[]; current: Phaser.GameObjects.Image | null } {
  const g = scene.add.graphics();
  layer.add(g);
  const hits: NodeHit[] = [];
  let current: Phaser.GameObjects.Image | null = null;
  const text = (x: number, y: number, s: string, size: number, color: string, ox = 0.5): Phaser.GameObjects.Text => {
    const t = scene.add.text(x, y, s, { fontFamily: HAND_FONT, fontSize: `${size}px`, color, stroke: '#fffaf0', strokeThickness: 5, padding: { x: 6, y: 4 } })
      .setOrigin(ox, 0.5).setResolution(textRes);
    layer.add(t);
    return t;
  };
  for (const n of layout.nodes) {
    const state = states.get(n.levelId) ?? 'draft';
    const r = MAP.nodeRadius;
    if (state === 'draft') {
      g.lineStyle(1.4, PENCIL_HEX, 0.55);
      ring(g, n.x, n.y, r - 6, 700 + n.index);
      continue;
    }
    const eggRes = CRITTER_ART.egg?.res ?? 3;
    const marble = scene.add.image(n.x, n.y, TEX.critter('egg', 'egg', n.index % 3)).setScale(EGG / 20 / eggRes).setRotation(-Math.PI / 2 + Math.sin(n.index * 1.7) * 0.4);
    layer.add(marble);
    const reachable = state === 'done' || state === 'current' || state === 'open';
    if (!reachable) marble.setTint(0xc9c2b4).setAlpha(state === 'locked' ? 0.5 : 0.6);
    if (state === 'current') {
      g.lineStyle(3, RED_HEX, 0.95);
      ring(g, n.x, n.y, r + 3, 900 + n.index);
      g.lineStyle(1.3, RED_HEX, 0.6);
      ring(g, n.x, n.y, r + 9, 950 + n.index);
      current = marble;
    } else if (state === 'done') {
      g.lineStyle(2, INK_HEX, 0.8);
      ring(g, n.x, n.y, r - 1, 900 + n.index);
    }
    text(n.x, n.y, String(n.index + 1), 26, reachable ? BLUE : PENCIL);
    // Name and blots on the side towards the middle of the plan, where there's room.
    const side = n.x >= MAP.mid ? -1 : 1;
    const lx = n.x + side * (r + 14);
    const name = names.get(n.levelId);
    if (name) text(lx, n.y - (state === 'done' ? 10 : 0), name, 23, reachable ? SOFT_INK : PENCIL, side > 0 ? 0 : 1);
    if (state === 'done') drawBlots(g, lx + side * 26, n.y + 16, blots.get(n.levelId) ?? 0, 6);
    const zone = scene.add.zone(n.x, n.y, r * 2.6, r * 2.6).setInteractive({ useHandCursor: true });
    layer.add(zone);
    hits.push({ node: n, state, zone });
  }
  return { hits, current };
}
