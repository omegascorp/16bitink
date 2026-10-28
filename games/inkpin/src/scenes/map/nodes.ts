import Phaser from 'phaser';
import { PENCIL } from '../../art/atlas';
import { INK, INK_HEX, RED } from '../../art/palette';
import { createRng } from '../../logic/rng';
import { paintStop, STOP_RES, type StopKind } from '../../art/atlasStops';
import type { Progress } from '../progress';
import { isOpen } from '../progress';
import { MAP, type MapLayout, type MapNode } from './layout';

const FONT = 'Caveat';
const SOFT_INK = '#4a463e';
const RED_HEX = 0xb3322b;
const PENCIL_HEX = 0x8a8578;

/**
 * done: won; current: where Nib waits, the next to play; open: playable;
 * closed: not reached yet; draft: its chapter isn't built yet.
 */
export type NodeState = 'done' | 'current' | 'open' | 'closed' | 'draft';

/** Each level's state, and the level Nib waits at: the first open one not won, else the last won. */
export function mapStates(order: readonly string[], progress: Progress, allOpen: boolean): { states: Map<string, NodeState>; current: string } {
  const open = (i: number): boolean => allOpen || isOpen(progress, order, i);
  const next = order.find((id, i) => !progress.levels[id] && open(i));
  const lastDone = [...order].reverse().find((id) => progress.levels[id]);
  const current = next ?? lastDone ?? order[0] ?? '';
  const states = new Map<string, NodeState>();
  order.forEach((id, i) => {
    if (id === current && !progress.levels[id]) states.set(id, 'current');
    else if (progress.levels[id]) states.set(id, 'done');
    else states.set(id, open(i) ? 'open' : 'closed');
  });
  return { states, current };
}

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

/** Three ink blots (done, every coin, first try): earned ones filled. */
export function drawBlots(g: Phaser.GameObjects.Graphics, cx: number, cy: number, earned: number, r: number): void {
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * r * 2.8;
    if (i < earned) g.fillStyle(INK_HEX, 0.85).fillCircle(x, cy, r);
    g.lineStyle(Math.max(1.2, r * 0.18), INK_HEX, i < earned ? 1 : 0.45).strokeCircle(x, cy, r);
  }
}

/**
 * Each level's stop on the trail: a gold coin once won, a paper seal while
 * open, a faded one before, a pencil circle for drafts; its number, its name
 * and blots beside it, and a red ring round the one Nib is up to.
 */
export function buildNodes(
  scene: Phaser.Scene, layout: MapLayout, layer: Phaser.GameObjects.Layer, states: ReadonlyMap<string, NodeState>,
  names: ReadonlyMap<string, string>, progress: Progress, textRes: number,
): { hits: NodeHit[]; current: Phaser.GameObjects.Graphics | null } {
  const g = scene.add.graphics();
  layer.add(g);
  const hits: NodeHit[] = [];
  let current: Phaser.GameObjects.Graphics | null = null;
  const text = (x: number, y: number, s: string, size: number, color: string, ox = 0.5): void => {
    layer.add(scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: '700', color, stroke: '#f6eedb', strokeThickness: 5, padding: { x: 6, y: 4 } }).setOrigin(ox, 0.5).setResolution(textRes));
  };
  for (const n of layout.nodes) {
    const state = states.get(n.levelId) ?? 'draft';
    const r = MAP.nodeRadius;
    if (state === 'draft') {
      g.lineStyle(1.4, PENCIL_HEX, 0.55);
      ring(g, n.x, n.y, r - 8, 700 + n.index);
      continue;
    }
    const reachable = state !== 'closed';
    const kind: StopKind = state === 'done' ? 'gold' : reachable ? 'paper' : 'faded';
    const key = `stop-${kind}`;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, paintStop(kind, r));
    layer.add(scene.add.image(n.x, n.y, key).setScale(1 / STOP_RES));
    if (state === 'current') {
      const halo = scene.add.graphics();
      halo.lineStyle(3, RED_HEX, 0.95);
      ring(halo, 0, 0, r + 6, 900 + n.index);
      halo.lineStyle(1.3, RED_HEX, 0.6);
      ring(halo, 0, 0, r + 12, 950 + n.index);
      halo.setPosition(n.x, n.y);
      layer.add(halo);
      current = halo;
    }
    text(n.x, n.y, String(n.local + 1), 28, state === 'done' ? INK : reachable ? INK : PENCIL);
    // Name and blots towards the middle of the page, where there's room.
    const side = n.x >= MAP.mid ? -1 : 1;
    const lx = n.x + side * (r + 16);
    const name = names.get(n.levelId);
    const done = state === 'done';
    if (name) text(lx, n.y - (done ? 10 : 0), name, 24, reachable ? (state === 'current' ? RED : SOFT_INK) : PENCIL, side > 0 ? 0 : 1);
    if (done) drawBlots(g, lx + side * 24, n.y + 17, progress.levels[n.levelId]?.blots ?? 0, 6);
    const zone = scene.add.zone(n.x, n.y, r * 2.8, r * 2.8).setInteractive({ useHandCursor: true });
    layer.add(zone);
    hits.push({ node: n, state, zone });
  }
  return { hits, current };
}
