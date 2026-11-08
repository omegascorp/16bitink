import type { Grid } from '../logic/map';
import { createRng } from '../logic/rng';
import type { Pt } from './pen';
import { blades, dabs, strokes, type Dab } from './terrainBrush';
import { coverAt, terrainAt, TILE, tileSeed } from './terrainGround';
import { rgba } from './wash';

/**
 * Roads: a worn track of dark umber earth, a darker verge where it cuts
 * into the turf, two wheel ruts and loose stones along it; over water, a
 * bridge of dark planks between lit rails.
 */
const ROAD = { verge: '#1c130b', bed: '#4e3622', crown: '#6a4c2f', rut: '#24180d', stone: '#8c7656', stoneShade: '#1a120a' } as const;
const BRIDGE = { edge: '#140d08', deck: '#4d321d', plank: '#2a1a0e', lit: '#8a6a3e', rail: '#3a2616' } as const;

/** Where a road tile's track bends: its centre, nudged so a straight road still wanders a little. */
function roadCentre(x: number, y: number): Pt {
  const rng = createRng(tileSeed(x, y, 17));
  return { x: (x + 0.5) * TILE + (rng() - 0.5) * 9, y: (y + 0.5) * TILE + (rng() - 0.5) * 9 };
}

/**
 * A track from the tile's (nudged) centre to the middle of each edge it
 * shares with another road tile, with round joints: first the dark verge
 * (`edge`), then the bed, crown, ruts and stones (`fill`).
 */
export function roadTile(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number, pass: 'edge' | 'fill'): void {
  const c = roadCentre(x, y);
  const over = terrainAt(g, x, y) === 'water';
  const links = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => coverAt(g, x + dx!, y + dy!) === 'road');
  if (links.length === 0) links.push([1, 0]);
  const ends = links.map(([dx, dy]) => ({ x: (x + 0.5 + dx! * 0.5) * TILE, y: (y + 0.5 + dy! * 0.5) * TILE }));
  const track = (width: number, color: string, alpha: number, dx = 0, dy = 0): void => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.beginPath();
    for (const e of ends) {
      ctx.moveTo(c.x + dx, c.y + dy);
      ctx.quadraticCurveTo((c.x + e.x) / 2 + dx, (c.y + e.y) / 2 + dy, e.x + dx, e.y + dy);
    }
    ctx.stroke();
    ctx.restore();
  };
  if (pass === 'edge') {
    if (over) {
      // The bridge's shadow on the water, then its dark frame.
      track(30, '#050a12', 0.55, 3, 5);
      track(29, BRIDGE.edge, 0.95);
    } else {
      track(25, ROAD.verge, 0.45);
      track(22, ROAD.verge, 0.6);
    }
    return;
  }
  const rng = createRng(tileSeed(x, y, 13));
  if (over) {
    bridge(ctx, c, ends);
    return;
  }
  track(19, ROAD.bed, 1);
  track(10, ROAD.crown, 0.55, -1, -1.5);
  const ruts: [Pt, Pt][] = [];
  const stones: Dab[] = [];
  for (const e of ends) {
    const nx = -(e.y - c.y) / TILE;
    const ny = (e.x - c.x) / TILE;
    for (const side of [-1, 1]) ruts.push([{ x: c.x + nx * 9 * side, y: c.y + ny * 9 * side }, { x: e.x + nx * 9 * side, y: e.y + ny * 9 * side }]);
    for (let i = 0; i < 4; i++) {
      const t = rng();
      const off = (rng() - 0.5) * 16;
      const r = 0.6 + rng() * 0.9;
      stones.push({ x: c.x + (e.x - c.x) * t + nx * off * 2, y: c.y + (e.y - c.y) * t + ny * off * 2, rx: r * 1.3, ry: r });
    }
  }
  strokes(ctx, ruts, ROAD.rut, 0.55, 1.6);
  strokes(ctx, ruts.map(([a, b]) => [{ x: a.x - 0.6, y: a.y - 1 }, { x: b.x - 0.6, y: b.y - 1 }] as [Pt, Pt]), ROAD.crown, 0.45, 0.6);
  dabs(ctx, stones.map((s) => ({ ...s, x: s.x + 0.5, y: s.y + 0.6 })), ROAD.stoneShade, 0.7);
  dabs(ctx, stones, ROAD.stone, 0.85);
  // Turf creeping over the verges.
  if (terrainAt(g, x, y) === 'grass') {
    for (const e of ends) {
      const nx = -(e.y - c.y) / TILE;
      const ny = (e.x - c.x) / TILE;
      for (const side of [-1, 1]) {
        const m = { x: (c.x + e.x) / 2 + nx * 10.5 * side, y: (c.y + e.y) / 2 + ny * 10.5 * side };
        blades(ctx, rng, m.x - 6, m.y - 2, 12, 4, 6, '#15240e', '#7a9443', 3);
      }
    }
  }
}

/** A plank bridge: dark deck, planks across, rails along both sides lit on top. */
function bridge(ctx: CanvasRenderingContext2D, c: Pt, ends: readonly Pt[]): void {
  for (const e of ends) {
    const len = Math.hypot(e.x - c.x, e.y - c.y) || 1;
    const ux = (e.x - c.x) / len;
    const uy = (e.y - c.y) / len;
    const nx = -uy;
    const ny = ux;
    strokes(ctx, [[c, e]], BRIDGE.deck, 1, 25);
    const planks: [Pt, Pt][] = [];
    for (let s = 0; s <= len; s += 3.4) planks.push([{ x: c.x + ux * s + nx * 12, y: c.y + uy * s + ny * 12 }, { x: c.x + ux * s - nx * 12, y: c.y + uy * s - ny * 12 }]);
    strokes(ctx, planks, BRIDGE.plank, 0.85, 0.7);
    strokes(ctx, planks.filter((_, i) => i % 3 === 1).map(([a, b]) => [{ x: a.x + ux * 1.2, y: a.y + uy * 1.2 }, { x: b.x + ux * 1.2, y: b.y + uy * 1.2 }] as [Pt, Pt]), BRIDGE.lit, 0.3, 1.4);
    for (const side of [-1, 1]) {
      const a = { x: c.x + nx * 12 * side, y: c.y + ny * 12 * side };
      const b = { x: e.x + nx * 12 * side, y: e.y + ny * 12 * side };
      strokes(ctx, [[a, b]], BRIDGE.rail, 1, 2.6);
      strokes(ctx, [[{ x: a.x - 0.4, y: a.y - 0.8 }, { x: b.x - 0.4, y: b.y - 0.8 }]], BRIDGE.lit, 0.7, 0.8);
    }
  }
}
