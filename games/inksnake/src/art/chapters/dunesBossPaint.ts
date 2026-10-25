import type { Rng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Blade, boxOf, coat, glaze, mapBlade, model, petalBlade, rimLight, vane } from '../critters/birdKit';
import { buildWing, covertRows, mapWing, mirrorY, paintWing, type Wing } from '../critters/birdWing';
import type { Runner, Tail, Wings } from './dunesBossParts';

/**
 * The Roadrunner's paints: olive-bronze feathers with blackish centres and
 * broad buff-white edges, so its back and wings read heavily streaked and
 * spotted; a long tail glossed bronze-green, the outer feathers tipped
 * white; short rounded wings with a white crescent across the primaries.
 */
export const RR = {
  bronze: '#7d6c4c',
  olive: '#6a6446',
  dark: '#2d2820',
  deep: '#41372a',
  buff: '#dcc79c',
  white: '#f4eddc',
  sheen: '#4d6a52',
  tail: '#5e563d',
  crest: '#34302c',
  bill: '#3a3634',
  leg: '#7e8d9c',
  legDeep: '#4d5866',
  blue: '#5a86b8',
  red: '#d6633a',
  eye: '#e7d9b6',
} as const;

/** Streaky plumage over a shape: a bronze wash and a coat of dark-centred, buff-edged feathers lying back. */
export function plumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; dir?: (p: Pt) => number; ruffle?: number; line?: number; pale?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, RR.bronze, 0.85);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx - b.rx * 0.2, b.cy - b.ry * 0.3, b.rx * 0.7, b.ry * 0.6, -0.3, RR.buff, 0.35);
    glaze(d, b.cx + b.rx * 0.2, b.cy + b.ry * 0.4, b.rx * 0.6, b.ry * 0.5, 0, RR.deep, 0.35);
  });
  const pale = o.pale ?? 0.5;
  coat(d, shape, rng, {
    dir: o.dir ?? (() => Math.PI),
    n: o.n,
    size: o.size,
    ruffle: o.ruffle,
    paint: ({ f, s, r }) => {
      pen.fill(f.shape, r < 0.5 ? RR.bronze : r < 0.8 ? RR.olive : RR.deep, 0.55);
      // The dark centre streak and the pale edge that make it streaky.
      pen.fill([f.at(0.1, 0), f.at(0.5, s * 0.16), f.at(0.85, 0), f.at(0.5, -s * 0.16)], RR.dark, 0.75);
      pen.hair(f.shape.slice(3, 16), Math.max(0.45, s * 0.14), r < pale ? RR.white : RR.buff, 0.75);
      pen.hair(f.shape.slice(3, 16), 0.25, RR.dark, 0.4);
    },
  });
  model(d, shape, Math.max(2.5, Math.min(b.rx, b.ry) * 0.45), RR.dark, { shade: 0.3, hatch: 0.25, lit: 0.12, line: 0 });
  rimLight(d, shape, RR.buff, 0.9, 0.35);
  pen.stroke(closed(shape), o.line ?? 0.95, d.ink, 1);
}

/** A flight feather: dark bronze, its edge pale-spotted; `white` lays the primaries' white crescent across it. */
export function flight(d: Draw, f: Blade, w: number, white = false): void {
  vane(d, f, w, {
    base: RR.deep, alpha: 0.92, deep: RR.dark, glazes: [RR.bronze, RR.sheen], glazeAlpha: 0.35,
    bars: 3, bar: RR.buff, barAlpha: 0.4,
    fringe: RR.buff, shaft: RR.buff, barbs: RR.dark, barbAlpha: 0.3, lit: RR.buff, line: 0.5, lineAlpha: 0.8,
  });
  if (white) d.pen.clipped(f.shape, () => d.pen.fill([f.at(0.38, -w), f.at(0.42, w), f.at(0.52, w), f.at(0.48, -w)], RR.white, 0.85));
}

/** A tail feather: long and glossy bronze-green, the outer ones broadly tipped white. */
function tailFeather(d: Draw, f: Blade, w: number, outer: number): void {
  vane(d, f, w, {
    base: RR.tail, alpha: 0.92, deep: RR.dark, glazes: [RR.bronze, RR.sheen, RR.bronze], glazeAlpha: 0.3, bars: 4, bar: RR.dark, barAlpha: 0.25,
    tip: outer > 0 ? RR.white : undefined, tipFrom: 0.84 - outer * 0.04, tipAlpha: 0.95,
    fringe: RR.buff, shaft: '#a79f80', barbs: RR.dark, barbAlpha: 0.3, lit: RR.buff, line: 0.45, lineAlpha: 0.75,
  });
}

/** The long tail: graduated feathers fanned round its angle, the middle pair longest and on top. */
export function paintTail(d: Draw, t: Tail): Pt[][] {
  const out: { f: Blade; w: number; outer: number }[] = [];
  const pairs = 4;
  for (let k = pairs - 1; k >= 0; k--) {
    for (const s of k === 0 ? [1] : [-1, 1]) {
      const a = t.ang + s * t.spread * (k / (pairs - 1));
      const len = t.len * (1 - k * 0.14) * (t.up ? 1 - k * 0.06 : 1);
      const root = pt(t.root.x - Math.sin(t.ang) * s * k * 0.6, t.root.y + Math.cos(t.ang) * s * k * 0.6);
      out.push({ f: petalBlade(root, a, len, t.w * (t.up ? 1.1 : 1), s * 0.015 * k, 14), w: t.w, outer: k });
    }
  }
  for (const x of out) tailFeather(d, x.f, x.w, x.outer);
  // The middle pair over the rest, glossy and untipped.
  const mid = petalBlade(t.root, t.ang, t.len * 1.03, t.w * 0.95, 0, 14);
  tailFeather(d, mid, t.w, 0);
  return [...out.map((x) => x.f.shape), mid.shape];
}

interface Folded {
  readonly feathers: Blade[];
  readonly coverts: Pt[];
}

/** The folded wing along the +y flank: short and rounded, flight feathers to the rear, the spotted coverts over them. */
function foldedWing(r: Runner, mirror: boolean): Folded {
  const { bodyC: c, bodyR: R } = r;
  const f = (p: Pt): Pt => (mirror ? mirrorY(p) : p);
  const at = (x: number, y: number): Pt => pt(c.x + x * R.x, c.y + y * R.y);
  const feathers = Array.from({ length: 6 }, (_, i) => petalBlade(at(0.35 - i * 0.13, 0.78 - i * 0.03), Math.PI - 0.08 + i * 0.03, R.x * (0.95 - i * 0.05), 4.6));
  const coverts = [
    ...cub(at(0.7, 0.35), at(0.75, 0.85), at(0.45, 1.02), at(0.05, 1.0), 10),
    ...cub(at(0.05, 1.0), at(-0.35, 0.98), at(-0.6, 0.8), at(-0.5, 0.5), 8).slice(1),
    ...bezier(at(-0.5, 0.5), at(0.1, 0.3), at(0.7, 0.35), 6).slice(1, -1),
  ];
  return { feathers: feathers.map((b) => mapBlade(b, f)), coverts: coverts.map(f) };
}

/** An open wing on the +y side: thrown forward to brake, or flared up and back in a fright. */
function openWing(r: Runner, kind: Wings): Wing {
  const c = r.bodyC;
  const sh = pt(c.x + 3, c.y + 5);
  const brake = kind === 'brake';
  const lead = brake
    ? [...cub(sh, pt(sh.x + 6, sh.y + 4), pt(sh.x + 9, sh.y + 10), pt(sh.x + 8, sh.y + 15), 8), ...cub(pt(sh.x + 8, sh.y + 15), pt(sh.x + 7.5, sh.y + 19), pt(sh.x + 5, sh.y + 22), pt(sh.x + 2, sh.y + 24), 8).slice(1)]
    : [...cub(sh, pt(sh.x + 2, sh.y + 5), pt(sh.x + 2, sh.y + 10), pt(sh.x - 1, sh.y + 14), 8), ...cub(pt(sh.x - 1, sh.y + 14), pt(sh.x - 3, sh.y + 17), pt(sh.x - 6, sh.y + 19.5), pt(sh.x - 9, sh.y + 21), 8).slice(1)];
  const wrist = 0.55;
  return buildWing({
    lead, wrist,
    dir: (t) => (brake ? Math.PI - 0.15 : Math.PI + 0.25) - (t < wrist ? 0 : ((t - wrist) / (1 - wrist)) ** 1.3 * 0.45),
    chord: (t) => (t < wrist ? 14 : 14 + ((t - wrist) / (1 - wrist)) * 4),
    secondaries: 7, primaries: 8, secW: 5.2, priW: 5, fingers: 3,
    coverts: (t) => (t < wrist ? 0.55 : 0.55 - (t - wrist) * 0.5),
  });
}

/** The wings, as the pose holds them; returns their outlines (for the shadow). */
export function wingsOf(r: Runner): { paint: (d: Draw, rng: Rng) => void; outlines: Pt[][] } {
  if (r.wings === 'folded') {
    const ws = [foldedWing(r, false), foldedWing(r, true)];
    return {
      outlines: [],
      paint: (d, rng) => {
        for (const w of ws) {
          w.feathers.forEach((f, i) => flight(d, f, 4.6, i < 3));
          plumage(d, w.coverts, rng, { n: 26, size: 3, line: 0, pale: 0.75 });
          d.pen.hair(w.coverts.slice(0, 11), 0.5, d.ink, 0.55);
        }
      },
    };
  }
  const right = openWing(r, r.wings);
  const ws = [right, mapWing(right, mirrorY)];
  return {
    outlines: ws.flatMap((w) => [...w.feathers.map((x) => x.f.shape), w.coverts]),
    paint: (d, rng) => {
      for (const w of ws) {
        paintWing(d, w, {
          feather: (x) => flight(d, x.f, x.w, x.primary),
          coverts: (wing) => {
            plumage(d, wing.coverts, rng, { n: 30, size: 3.2, line: 0, pale: 0.8 });
            covertRows(wing, 2, () => 0.5, () => 3, (f) => {
              d.pen.fill(f.shape, RR.deep, 0.6);
              d.pen.hair(f.shape.slice(2, 7), 0.5, RR.white, 0.8);
            }, 0.95);
          },
        });
      }
    },
  };
}
