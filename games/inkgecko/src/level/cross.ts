import { buildPath, type Path, type Pt } from '../logic/path';
import type { TrackDef, TunnelDef } from './types';

/** Each side of a crossing, how far the tunnel below and the deck above reach along their tracks, board px. */
export const CROSS_REACH = 82;
/** A track that comes back over itself must have gone at least this far round first, board px. */
const SELF_APART = 240;

export interface Crossing {
  /** The track that goes under (through a tunnel), and the distance along it. */
  readonly lower: { readonly track: number; readonly s: number };
  /** The track carried over it. */
  readonly upper: { readonly track: number; readonly s: number };
  /** The angle between the two, radians (0..π/2). */
  readonly angle: number;
  readonly at: Pt;
}

/** Where segment ab meets segment cd, as shares along each, or null. */
function meet(a: Pt, b: Pt, c: Pt, d: Pt): { t: number; u: number } | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  return t >= 0 && t < 1 && u >= 0 && u < 1 ? { t, u } : null;
}

/** Every place the tracks cross (themselves included); the pass nearer its burrow goes under. */
export function findCrossings(paths: readonly Path[]): Crossing[] {
  const out: Crossing[] = [];
  paths.forEach((p, i) => {
    paths.forEach((q, j) => {
      if (j < i) return;
      for (let a = 0; a + 1 < p.pts.length; a++) {
        for (let b = i === j ? a + 2 : 0; b + 1 < q.pts.length; b++) {
          if (i === j && q.cum[b]! - p.cum[a]! < SELF_APART) continue;
          const hit = meet(p.pts[a]!, p.pts[a + 1]!, q.pts[b]!, q.pts[b + 1]!);
          if (!hit) continue;
          const sp = p.cum[a]! + (p.cum[a + 1]! - p.cum[a]!) * hit.t;
          const sq = q.cum[b]! + (q.cum[b + 1]! - q.cum[b]!) * hit.u;
          const da = Math.atan2(p.pts[a + 1]!.y - p.pts[a]!.y, p.pts[a + 1]!.x - p.pts[a]!.x);
          const db = Math.atan2(q.pts[b + 1]!.y - q.pts[b]!.y, q.pts[b + 1]!.x - q.pts[b]!.x);
          let angle = Math.abs(da - db) % Math.PI;
          if (angle > Math.PI / 2) angle = Math.PI - angle;
          const pShare = sp / p.length;
          const qShare = sq / q.length;
          const first = { track: i, s: sp };
          const second = { track: j, s: sq };
          const [lower, upper] = pShare <= qShare ? [first, second] : [second, first];
          out.push({ lower, upper, angle, at: { x: p.pts[a]!.x + (p.pts[a + 1]!.x - p.pts[a]!.x) * hit.t, y: p.pts[a]!.y + (p.pts[a + 1]!.y - p.pts[a]!.y) * hit.t } });
        }
      }
    });
  });
  return out;
}

/** Overlapping stretches joined into one. */
function merged(list: readonly TunnelDef[]): TunnelDef[] {
  const sorted = [...list].sort((a, b) => a.from - b.from);
  const out: TunnelDef[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    if (last && c.from <= last.to) out[out.length - 1] = { from: last.from, to: Math.max(last.to, c.to) };
    else out.push(c);
  }
  return out;
}

const round = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * Tracks with their crossings bridged: at each one the lower pass gets a
 * tunnel and the upper a raised deck over it, so the lanes never collide
 * and marbles going under are hidden. Hand-placed tunnels are kept.
 */
export function bridged(tracks: readonly TrackDef[]): TrackDef[] {
  const paths = tracks.map((t) => buildPath(t.points));
  const tunnels = tracks.map((t) => [...(t.tunnels ?? [])]);
  const raised = tracks.map((t) => [...(t.raised ?? [])]);
  for (const c of findCrossings(paths)) {
    const span = (track: number, s: number): TunnelDef => {
      const L = paths[track]!.length;
      return { from: round(Math.max(0, (s - CROSS_REACH) / L)), to: round(Math.min(1, (s + CROSS_REACH) / L)) };
    };
    tunnels[c.lower.track]!.push(span(c.lower.track, c.lower.s));
    raised[c.upper.track]!.push(span(c.upper.track, c.upper.s));
  }
  return tracks.map((t, i) => {
    const tn = merged(tunnels[i]!);
    const rs = merged(raised[i]!);
    return { points: t.points, ...(tn.length ? { tunnels: tn } : {}), ...(rs.length ? { raised: rs } : {}) };
  });
}
