import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER_HEX, RED_HEX } from '../../art/palette';
import { createRng } from '../../logic/rng';
import { drawBlots, inkText } from '../ui';
import { MAP, type MapLayout, type MapNode } from './layout';
import { drawMissionIcons } from './missionIcons';
import type { MissionKind } from '../../logic/mission';

/** done: played; current: the next to play; open: playable; closed: not reached yet; draft: its beach isn't built. */
export type NodeState = 'done' | 'current' | 'open' | 'closed' | 'draft';

const PENCIL = '#8a8578';
const PENCIL_HEX = 0x8a8578;
/** Footprint pairs along the route, this far apart. */
const STRIDE = 10;

export interface RouteHit {
  readonly node: MapNode;
  readonly zone: Phaser.GameObjects.Zone;
}

/** A hand-drawn ring: a circle with a little wobble, its ends overlapping. */
function ring(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, seed: number): void {
  const rng = createRng(seed);
  const n = 24;
  const pts = Array.from({ length: n + 3 }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - 0.4;
    const rr = r + (rng() - 0.5) * 1.8;
    return new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  });
  g.strokePoints(pts, false);
}

/** Crab tracks from one level to the next: pairs of little prints either side of the line. */
function tracks(g: Phaser.GameObjects.Graphics, a: MapNode, b: MapNode, color: number, alpha: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  g.fillStyle(color, alpha);
  for (let s = MAP.nodeRadius + 6, k = 0; s < len - MAP.nodeRadius - 4; s += STRIDE, k++) {
    // A slight sideways wander, as a crab scuttles.
    const wob = Math.sin(s / 23 + a.index) * 4;
    const cx = a.x + ux * s - uy * wob;
    const cy = a.y + uy * s + ux * wob;
    const side = k % 2 ? 1 : -1;
    g.fillEllipse(cx - uy * 3.5 * side, cy + ux * 3.5 * side, 3.2, 2.2);
  }
}

/**
 * The level route over the chart: tracks between levels, a ring per level
 * with its number, ink blots under played ones, its mission's icons over it. Played stretches are inked,
 * the way ahead is pencil.
 */
export function buildRoute(
  scene: Phaser.Scene, layout: MapLayout, states: ReadonlyMap<string, NodeState>, blots: ReadonlyMap<string, number>, names: ReadonlyMap<string, string>,
  missions: ReadonlyMap<string, readonly MissionKind[]> = new Map(),
): { objects: Phaser.GameObjects.GameObject[]; hits: RouteHit[] } {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);
  const state = (n: MapNode): NodeState => states.get(n.levelId) ?? 'draft';
  for (let i = 1; i < layout.nodes.length; i++) {
    const a = layout.nodes[i - 1]!;
    const b = layout.nodes[i]!;
    if (a.region !== b.region) continue;
    const walked = state(a) === 'done' && state(b) !== 'closed' && state(b) !== 'draft';
    tracks(g, a, b, walked ? BLUE_HEX : PENCIL_HEX, walked ? 0.75 : state(b) === 'draft' ? 0.3 : 0.5);
  }
  const hits: RouteHit[] = [];
  for (const n of layout.nodes) {
    const s = state(n);
    const draft = s === 'draft';
    const r = MAP.nodeRadius;
    g.fillStyle(PAPER_HEX, draft ? 0.6 : 0.95).fillCircle(n.x, n.y, r);
    if (s === 'done') g.fillStyle(BLUE_HEX, 0.16).fillCircle(n.x, n.y, r);
    g.lineStyle(s === 'current' ? 3 : 2, draft || s === 'closed' ? PENCIL_HEX : s === 'current' ? RED_HEX : BLUE_HEX, draft ? 0.6 : 1);
    ring(g, n.x, n.y, r, 300 + n.index);
    if (s === 'current') {
      g.lineStyle(1.2, RED_HEX, 0.6);
      ring(g, n.x, n.y, r + 5, 900 + n.index);
    }
    if (s === 'done') drawBlots(g, n.x, n.y + r + 13, blots.get(n.levelId) ?? 0, 5);
    // The level's mission, in red pencil by its ring (clear of the crab marker over the current one).
    const kinds = missions.get(n.levelId);
    if (kinds && !draft) drawMissionIcons(g, n.x + r + 16, n.y - r + 4, kinds, s === 'closed' ? 0.45 : 0.9);
    const label = inkText(scene, n.x, n.y, String(n.index + 1), 24, draft || s === 'closed' ? PENCIL : BLUE).setAlpha(draft ? 0.7 : 1);
    objects.push(label);
    if (draft || s === 'closed') continue;
    const zone = scene.add.zone(n.x, n.y, r * 2.4, r * 2.4).setInteractive({ useHandCursor: true });
    const name = inkText(scene, n.x, n.y - r - 18, names.get(n.levelId) ?? '', 20).setVisible(false);
    zone.on('pointerover', () => name.setVisible(s !== 'current'));
    zone.on('pointerout', () => name.setVisible(false));
    objects.push(zone, name);
    hits.push({ node: n, zone });
  }
  return { objects, hits };
}
