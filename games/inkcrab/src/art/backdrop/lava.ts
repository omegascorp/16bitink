import { bezier, cub, type Draw, oval, pt, ribbon } from '../kit';
import { pathOf, type Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { glow } from './estuary';

/**
 * Landforms of a young volcanic coast, Galápagos-style: a broad shield
 * volcano with lava flows streaking its flanks, cinder cones, a smoking
 * summit; basalt cliffs split into hexagonal columns, a sea arch, an
 * eroded tuff cone; fumaroles steaming; and underfoot, black rock, ropy
 * pahoehoe and a vent crusted yellow with sulphur.
 */
export const BASALT = '#58534e';
export const BASALT_LIT = '#948b80';
export const COLD = '#5d6c84';
export const CINDER = '#9b5b41';
export const TUFF = '#bf9d68';
export const SULPHUR = '#e4cb38';
const DISTANCE = '#7f8794';
const ARID = '#b2a083';
const FLOW = '#2f2c2b';
const SMOKE = '#a19a90';
const STEAM = '#f7f5ee';

/** The volcano's skyline height above the horizon at x, and its summit vent. */
export interface Volcano {
  readonly height: (x: number) => number;
  readonly vent: Pt;
}

/**
 * A drifting rag of volcanic haze: soft grey-brown puffs strung out along
 * the wind (blowing right), rising a little and thinning as it goes, inked
 * only in a few broken curls along its top.
 */
export function smokeWisp(t: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = t;
  const n = Math.max(4, Math.round(w / (h * 0.9)));
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const px = x + w * u + pen.jitter(h * 0.2);
    const py = y - h * 0.5 * Math.sin(u * Math.PI * 0.7) + pen.jitter(h * 0.25);
    const r = h * (0.25 + 0.55 * Math.sin(Math.PI * (0.1 + u * 0.75)) ** 1.5) * (0.8 + pen.rng() * 0.4);
    glow(t, px, py, r * 1.4, r, SMOKE, 0.32 * (1 - u * 0.5));
    glow(t, px - r * 0.2, py - r * 0.3, r, r * 0.7, STEAM, 0.7 * (1 - u * 0.3));
    if (u < 0.9) pen.hair(oval(px, py - r * 0.1, r * 0.95, r * 0.8, 18).slice(9, 17), 0.5, t.ink, FAR * 0.38 * (1 - u * 0.5));
  }
}

/**
 * The plume over the summit: steam and smoke boiling up from the vent in a
 * column of puffs, bent over by the wind and spreading thin downwind.
 */
export function plume(t: Draw, vent: Pt, h: number, drift: number): void {
  const { pen } = t;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const px = vent.x + drift * u ** 1.7;
    const py = vent.y - h * Math.sin((u * Math.PI) / 2) ** 0.8;
    const r = 2.5 + u * h * 0.3;
    glow(t, px, py, r * 1.5, r * 1.05, SMOKE, 0.38 * (1 - u * 0.6));
    glow(t, px - r * 0.2, py - r * 0.3, r * 1.1, r * 0.7, STEAM, 0.75 * (1 - u * 0.45));
    if (u < 0.85 && i % 2 === 0) pen.hair(oval(px, py, r, r * 0.8, 18).slice(9, 16), 0.5, t.ink, FAR * 0.42 * (1 - u * 0.6));
  }
}

/**
 * A shield volcano far across the water, Galápagos-fashion: an upturned
 * soup bowl, a long gentle apron rising to steep upper flanks and a flat
 * top notched by its caldera. Arid below, a green band of highland on the
 * windward side, black lava flows streaking down its lee flank, the shadow
 * side hatched.
 */
export function shieldVolcano(t: Draw, cx: number, half: number, horizon: number, h: number): Volcano {
  const { pen } = t;
  const height = (x: number): number => {
    const u = Math.min(1, Math.abs(x - cx + half * 0.04) / half);
    const dome = (1 - u * u) ** 1.6;
    const caldera = 0.05 * Math.exp(-(((x - cx) / (half * 0.07)) ** 2));
    return Math.max(0, h * (dome - caldera) + 0.8 * Math.sin(x * 0.13) * dome);
  };
  const top: Pt[] = [];
  for (let x = cx - half; x <= cx + half; x += 3) top.push(pt(x, horizon - height(x)));
  const shape = [...top, pt(cx + half, horizon + 0.5), pt(cx - half, horizon + 0.5)];
  pen.fill(shape, PAPER_FILL, 0.92);
  pen.fill(shape, DISTANCE, 0.42);
  pen.clipped(shape, () => {
    // Zones of the slope: arid lowland apron, the green highland band on the windward (left) side.
    const zone = (lo: number, hi: number): Pt[] => [...top.map((p) => pt(p.x, horizon - height(p.x) * hi)), ...[...top].reverse().map((p) => pt(p.x, horizon - height(p.x) * lo))];
    pen.fill(zone(0, 0.35), ARID, 0.35);
    // The highland band greens the windward (left) flank, fading out round the summit.
    const { ctx } = pen;
    const green = ctx.createLinearGradient(cx - half, 0, cx + half * 0.3, 0);
    green.addColorStop(0, 'rgba(143,157,99,0)');
    green.addColorStop(0.3, 'rgba(143,157,99,0.42)');
    green.addColorStop(0.75, 'rgba(143,157,99,0.3)');
    green.addColorStop(1, 'rgba(143,157,99,0)');
    ctx.save();
    ctx.fillStyle = green;
    pathOf(ctx, zone(0.4, 0.82));
    ctx.fill();
    ctx.restore();
    // Lava flows: black tongues from high on the flanks down the face, wandering, pinching and
    // swelling, spreading into lobes on the apron; older ones paler.
    for (const [x0, dx, w, a, reach] of [[cx + half * 0.06, half * 0.24, 2.6, 0.36, 0.8], [cx + half * 0.18, half * 0.42, 2.2, 0.32, 1], [cx + half * 0.34, half * 0.22, 1.8, 0.26, 0.6], [cx - half * 0.12, -half * 0.3, 2, 0.2, 0.75], [cx - half * 0.34, -half * 0.16, 1.6, 0.16, 0.55]] as const) {
      const from = pt(x0, horizon - height(x0) + 2);
      const drop = (horizon - 1 - from.y) * reach;
      const phase = pen.rng() * 6;
      const spine: Pt[] = [];
      for (let k = 0; k <= 18; k++) {
        const u = k / 18;
        spine.push(pt(from.x + dx * u ** 1.3 + 3 * Math.sin(u * 9 + phase), from.y + drop * u));
      }
      const r = ribbon(spine, (u) => w * (0.5 + u * 1.6) * (1 + 0.45 * Math.sin(u * 13 + phase)));
      pen.fill(r.shape, FLOW, a);
      pen.hair(r.top.filter((_, i) => i % 6 < 4), 0.3, t.ink, FAR * 0.3);
      const end = spine[spine.length - 1]!;
      pen.fill(oval(end.x + dx * 0.04, end.y + 0.5, w * 2.6, w * 0.8, 12), FLOW, a * 0.8);
    }
    // The shadow side, hatched; gullies running down the slope.
    const lee = [pt(cx + half * 0.15, horizon - h * 1.2), pt(cx + half * 1.1, horizon - h * 1.2), pt(cx + half * 1.1, horizon + 2), pt(cx + half * 0.15, horizon + 2)];
    pen.clipped(lee, () => pen.hatch(shape, 1.6, 1.15, 0.35, { color: t.ink, alpha: FAR * 0.32 }));
    for (let x = cx - half * 0.8; x < cx + half * 0.8; x += 14 + pen.rng() * 18) {
      const d = Math.sign(x - cx) * (6 + pen.rng() * 8);
      pen.hair([pt(x, horizon - height(x) + 2), pt(x + d, horizon - height(x) * 0.5), pt(x + d * 1.6, horizon - 1)], 0.35, t.ink, FAR * 0.22);
    }
  });
  pen.stroke(top, 0.95, t.ink, FAR, false);
  // The caldera rim: a dark notch with its far wall showing.
  pen.fill(oval(cx, horizon - height(cx) + 0.8, half * 0.07, 1.4, 14), FLOW, 0.4);
  return { height, vent: pt(cx + half * 0.04, horizon - height(cx + half * 0.04) + 0.5) };
}

/** A cinder cone on a flank: a small, steep truncated cone of rusty scoria, its crater a notch at the top. */
export function cinderCone(t: Draw, x: number, ground: number, w: number, h: number, fade = 1): void {
  const { pen } = t;
  const rim = w * 0.2;
  const cone = [pt(x - w / 2, ground + 1), ...bezier(pt(x - w / 2, ground + 1), pt(x - rim * 1.4, ground - h * 0.9), pt(x - rim, ground - h), 6).slice(1), ...bezier(pt(x - rim, ground - h), pt(x, ground - h + 1.6), pt(x + rim, ground - h + 0.3), 4).slice(1), ...bezier(pt(x + rim, ground - h + 0.3), pt(x + rim * 1.4, ground - h * 0.9), pt(x + w / 2, ground + 1), 6).slice(1)];
  pen.fill(cone, PAPER_FILL, 0.9);
  pen.fill(cone, CINDER, 0.42 * fade);
  pen.clipped(cone, () => {
    pen.fill([pt(x + rim * 0.2, ground - h - 2), pt(x + w, ground - h - 2), pt(x + w, ground + 2), pt(x + w * 0.15, ground + 2)], COLD, 0.2 * fade);
    pen.hatch([pt(x + rim * 0.3, ground - h - 2), pt(x + w, ground - h - 2), pt(x + w, ground + 2), pt(x + w * 0.1, ground + 2)], 1.3, 1.2, 0.3, { color: t.ink, alpha: FAR * 0.4 * fade });
    for (let k = 0; k < 5; k++) {
      const gx = x - w * 0.35 + k * w * 0.17;
      pen.hair([pt(gx * 0.7 + x * 0.3, ground - h + 1), pt(gx, ground)], 0.3, t.ink, FAR * 0.3 * fade);
    }
  });
  pen.hair(cone.slice(0, -1), 0.6, t.ink, FAR * fade);
}

/** A low island on the horizon with a tuff cone humped at one end. */
export function farIsle(t: Draw, x0: number, x1: number, horizon: number, h: number): void {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 3) {
    const u = (x - x0) / (x1 - x0);
    const cone = Math.exp(-(((u - 0.72) / 0.12) ** 2));
    top.push(pt(x, horizon - h * (0.35 * Math.sin(Math.PI * u) ** 0.4 + 0.65 * cone) + 0.6 * Math.sin(x * 0.3)));
  }
  const shape = [...top, pt(x1, horizon + 0.5), pt(x0, horizon + 0.5)];
  pen.fill(shape, PAPER_FILL, 0.85);
  pen.fill(shape, DISTANCE, 0.36);
  pen.clipped(shape, () => pen.hatch([pt(x0 + (x1 - x0) * 0.74, horizon - h - 2), pt(x1 + 2, horizon - h - 2), pt(x1 + 2, horizon + 1), pt(x0 + (x1 - x0) * 0.7, horizon + 1)], 1.4, 1.2, 0.3, { color: t.ink, alpha: FAR * 0.3 }));
  pen.hair(top, 0.55, t.ink, FAR * 0.75);
}

export interface BasaltOpts {
  /** 0..1: how strongly it is washed and inked (lower for further back). */
  readonly fade?: number;
  readonly wash?: string;
  /** Round form shading: lit rim and a hatched shadow crescent. */
  readonly form?: boolean;
}

/** A mass of black basalt: dark wash, cool hatched shade, a warm lit rim, pitted with gas holes, inked. */
export function basaltRock(t: Draw, shape: readonly Pt[], o: BasaltOpts = {}): void {
  const { pen } = t;
  const fade = o.fade ?? 1;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, o.wash ?? BASALT, 0.55 * fade);
  if (o.form !== false) {
    pen.crescent(shape, pt(size * 0.12, size * 0.18), () => pen.fill(shape, BASALT_LIT, 0.4 * fade));
    pen.crescent(shape, pt(-size * 0.15, -size * 0.24), () => {
      pen.fill(shape, COLD, 0.22 * fade);
      pen.hatch(shape, Math.max(1.5, size / 40), 1.05, 0.38, { color: t.ink, alpha: FAR * 0.45 * fade });
    });
  }
  // Vesicles: the gas holes that pit lava, and a few glints off glassy crust.
  const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  pen.stipple(shape, Math.round(area * 0.03), () => 0.5, 0.35, '#2d2a28');
  pen.stipple(shape, Math.round(area * 0.008), (_, y) => (y < Math.min(...ys) + size * 0.4 ? 0.8 : 0.1), 0.4, PAPER_FILL);
  pen.stroke(edges(shape, 3), 0.85, t.ink, FAR * fade, false);
}

/**
 * A basalt cliff in columnar joints: a colonnade of tall prismatic columns
 * (each with a lit face and a face in shade, cracked across at intervals)
 * under a band of chaotic, fanning entablature, the talus at its foot.
 * `height(x)` is above the foot. Returns its skyline.
 */
export function columnCliff(t: Draw, x0: number, x1: number, foot: number, height: (x: number) => number, fade = 1): Pt[] {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) top.push(pt(x, foot - height(x) + 0.8 * Math.sin(x * 0.5)));
  const shape = [...top, pt(x1, foot + 3), pt(x0, foot + 3)];
  basaltRock(t, shape, { fade, form: false });
  pen.clipped(shape, () => {
    const { ctx } = pen;
    const peak = Math.max(...top.map((p) => foot - p.y));
    const g = ctx.createLinearGradient(0, foot - peak, 0, foot);
    g.addColorStop(0, `rgba(148,139,128,${0.35 * fade})`);
    g.addColorStop(1, `rgba(93,108,132,${0.22 * fade})`);
    ctx.fillStyle = g;
    ctx.fillRect(x0, foot - peak - 2, x1 - x0, peak + 6);
    for (let x = x0 + pen.rng() * 4; x < x1; ) {
      const w = 6 + pen.rng() * 5;
      const colTop = foot - height(x + w / 2) * (0.72 + pen.rng() * 0.06);
      // The column's face turned from the light, and the edge between its faces.
      pen.fill([pt(x + w * 0.62, colTop), pt(x + w, colTop), pt(x + w, foot + 3), pt(x + w * 0.62, foot + 3)], COLD, 0.26 * fade);
      if (pen.rng() < 0.35) pen.fill([pt(x, colTop), pt(x + w * 0.62, colTop), pt(x + w * 0.62, foot + 3), pt(x, foot + 3)], BASALT_LIT, 0.22 * fade);
      pen.hair([pt(x + w * 0.62, colTop), pt(x + w * 0.62 + pen.jitter(0.5), foot)], 0.4, t.ink, FAR * 0.45 * fade);
      pen.hair([pt(x + w, colTop - 2), pt(x + w + pen.jitter(0.6), foot)], 0.65, t.ink, FAR * 0.8 * fade);
      // Cross-joints, slightly bowed, every few px up the column.
      for (let y = foot - 4 - pen.rng() * 6; y > colTop + 3; y -= 7 + pen.rng() * 9) {
        pen.hair(bezier(pt(x + 0.5, y), pt(x + w * 0.45, y + 1), pt(x + w - 0.5, y + 0.2), 4), 0.4, t.ink, FAR * 0.5 * fade);
      }
      x += w;
    }
    // The entablature: thin, curving columns fanning every way in the band under the cap.
    for (let x = x0; x < x1; x += 3 + pen.rng() * 3) {
      const y0 = foot - height(x) + 3;
      const y1 = foot - height(x) * 0.72;
      if (y1 - y0 < 6) continue;
      const lean = pen.jitter(4);
      pen.hair(bezier(pt(x, y0), pt(x + lean, (y0 + y1) / 2), pt(x + lean * 0.4, y1), 5), 0.4, t.ink, FAR * 0.45 * fade);
    }
    pen.hair(top.map((p) => pt(p.x, foot - (foot - p.y) * 0.72)), 0.55, t.ink, FAR * 0.6 * fade);
    // Wet black rock and white streaks of guano near the foot.
    pen.fill([...top.map((p) => pt(p.x, foot - 7 - 1.2 * Math.sin(p.x * 0.13))), pt(x1, foot + 3), pt(x0, foot + 3)], '#2f2d2b', 0.3 * fade);
  });
  pen.stroke(top, 0.95, t.ink, FAR * fade, false);
  return top;
}

/** A sea arch of basalt: a rock with the sea showing through the hole worn in it. */
export function seaArch(t: Draw, x0: number, x1: number, foot: number, h: number, hole: readonly [number, number, number]): void {
  const { pen } = t;
  const [a, b, hh] = hole;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 3) {
    const u = (x - x0) / (x1 - x0);
    top.push(pt(x, foot - h * Math.sin(Math.PI * u) ** 0.35 * (0.85 + 0.15 * Math.sin(u * 7)) - 1.2 * Math.sin(x * 0.4)));
  }
  const arch = bezier(pt(b, foot + 2), pt((a + b) / 2 + (b - a) * 0.1, foot - hh * 2), pt(a, foot + 2), 14);
  const shape = [pt(x0, foot + 2), ...top, pt(x1, foot + 2), ...arch];
  basaltRock(t, shape, {});
  pen.clipped(shape, () => {
    for (let x = x0 + 6; x < x1 - 4; x += 5 + pen.rng() * 4) pen.hair([pt(x, foot - h * 0.9), pt(x + pen.jitter(1), foot)], 0.4, t.ink, FAR * 0.4);
    pen.hair(arch.map((p) => pt(p.x + 2.5, p.y - 2)), 1.5, COLD, 0.35);
  });
}

/**
 * A tuff cone half eaten by the sea: ochre ash in layers that follow its
 * old slopes, gullied, its seaward side a cliff that shows the bedding.
 */
export function tuffCone(t: Draw, x0: number, x1: number, foot: number, h: number): void {
  const { pen } = t;
  const height = (x: number): number => {
    const u = (x - x0) / (x1 - x0);
    const cone = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.7;
    const cut = u > 0.82 ? Math.max(0, 1 - (u - 0.82) / 0.18) ** 0.4 : 1;
    const crater = 0.12 * Math.exp(-(((u - 0.46) / 0.08) ** 2));
    return h * (cone * cut - crater);
  };
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 3) top.push(pt(x, foot - Math.max(0, height(x))));
  const shape = [...top, pt(x1, foot + 2), pt(x0, foot + 2)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, TUFF, 0.48);
  pen.clipped(shape, () => {
    for (let k = 1; k < 9; k++) pen.hair(top.map((p) => pt(p.x, p.y + k * 5 + 1.5 * Math.sin(p.x * 0.05 + k))), 0.4, '#7d6440', 0.45);
    for (let x = x0 + 12; x < x1 - 8; x += 9 + pen.rng() * 9) {
      const y = foot - height(x) + 3;
      pen.fill(ribbon(bezier(pt(x, y), pt(x + pen.jitter(3), (y + foot) / 2), pt(x + pen.jitter(4), foot), 6), (u) => 1 + u * 2.5).shape, COLD, 0.2);
    }
    pen.fill([pt(x0 + (x1 - x0) * 0.55, foot - h * 1.2), pt(x1 + 2, foot - h * 1.2), pt(x1 + 2, foot + 2), pt(x0 + (x1 - x0) * 0.5, foot + 2)], COLD, 0.15);
    pen.hatch([pt(x0 + (x1 - x0) * 0.8, foot - h), pt(x1 + 2, foot - h), pt(x1 + 2, foot + 2), pt(x0 + (x1 - x0) * 0.78, foot + 2)], 1.4, 1.25, 0.35, { color: t.ink, alpha: FAR * 0.4 });
  });
  pen.stroke(top, 0.9, t.ink, FAR, false);
}

/** Steam rising off a fumarole: a thin column of soft white puffs drifting downwind and fading. */
export function steam(t: Draw, x: number, y: number, h: number, s = 1): void {
  const { pen } = t;
  for (let k = 0; k < 7; k++) {
    const u = k / 6;
    const px = x + h * 0.35 * u ** 1.5 + pen.jitter(0.8);
    const py = y - h * u;
    const r = (1.5 + u * 4) * s;
    glow(t, px, py, r * 1.3, r, STEAM, 0.85 * (1 - u * 0.65));
    if (k % 2 === 1) pen.hair(oval(px, py, r, r * 0.8, 14).slice(7, 12), 0.4, t.ink, FAR * 0.3 * (1 - u * 0.5));
  }
}

/** A small vent in the rock, its mouth crusted yellow with sulphur crystals and a wisp of steam rising. */
export function sulphurVent(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const mound = [...bezier(pt(x - 16 * s, ground + 2), pt(x - 7 * s, ground - 10 * s), pt(x, ground - 9 * s), 10), ...bezier(pt(x, ground - 9 * s), pt(x + 8 * s, ground - 10 * s), pt(x + 18 * s, ground + 2), 10).slice(1)];
  basaltRock(t, mound, {});
  const crust = oval(x, ground - 8 * s, 9 * s, 3.4 * s, 18).map((p) => pt(p.x + pen.jitter(0.8), p.y + pen.jitter(0.6)));
  pen.fill(crust, PAPER_FILL, 1);
  pen.fill(crust, SULPHUR, 0.7);
  pen.stipple(crust, Math.round(90 * s), () => 0.8, 0.45, '#b89a1c');
  pen.hair(crust, 0.45, t.ink, FAR * 0.7);
  // Yellow spatters down the mound, and the dark mouth.
  for (let k = 0; k < 7; k++) pen.fill(oval(x + pen.jitter(12 * s), ground - pen.rng() * 6 * s, 1.4 * s, 0.8 * s, 8), SULPHUR, 0.6);
  pen.fill(oval(x + 0.5 * s, ground - 8.4 * s, 3 * s, 1.2 * s, 12), '#2a2624', 0.75);
  steam(t, x + 0.5 * s, ground - 11 * s, 34 * s, s);
}

/** Ropy pahoehoe: the skin of a lava flow wrinkled into rows of bowed folds, pushed out the way it flowed. */
export function ropes(t: Draw, x: number, y: number, w: number, rows: number): void {
  const { pen } = t;
  for (let k = 0; k < rows; k++) {
    const yy = y + k * 2.4;
    const half = w / 2 - k * 1.2;
    if (half < 4) break;
    const fold = cub(pt(x - half, yy - 1), pt(x - half * 0.4, yy + 3 + k * 0.4), pt(x + half * 0.4, yy + 3 + k * 0.4), pt(x + half, yy - 1), 12);
    pen.hair(fold, 0.5, t.ink, FAR * 0.55);
    pen.hair(fold.map((p) => pt(p.x + 0.4, p.y - 0.8)), 0.6, PAPER_FILL, 0.35);
  }
}
