import { createRng } from '../logic/rng';
import { INK, type Pt } from './pen';
import { along, BONE, clip, dots, type Draw, drift, frame, hair, ink, lerp, lump, MUD, oval, paint, PAPER_FILL, PLUME_RED, pt, puff, qb, ribbon, ring, rotOval, S, SHADOW, SMOKE, TAU, unit } from './decorKit';

/**
 * Deep-sea seabed decor: brittle stars, sea lilies, glass sponges, nodules,
 * vent tube worms, the black smoker and the whale fall. Each piece stands on
 * the canvas's bottom edge, centred; see the drawing contract in decorArt.ts.
 */
export type DeepDecorId = 'brittlestar' | 'sealily' | 'glasssponge' | 'nodules' | 'tubeworms' | 'blacksmoker' | 'whalebones';
// ---------------------------------------------------------------- deep sea creatures

function brittlestar(d: Draw): void {
  const cy = -13;
  puff(d, 0, -9, 34, 6, SHADOW, 0.3);
  const a0 = d.rng() * TAU;
  for (let k = 0; k < 5; k++) brittleArm(d, a0 + (k * TAU) / 5 + (d.rng() - 0.5) * 0.3, cy);
  brittleDisc(d, a0, cy);
}

/** A long snaky arm: banded plates with tiny spines, curling as it goes. */
function brittleArm(d: Draw, a: number, cy: number): void {
  const { rng } = d;
  const len = 24 + rng() * 7;
  const curl = (rng() - 0.5) * 1.8;
  const phase = rng() * TAU;
  const center = Array.from({ length: 25 }, (_, i) => {
    const u = i / 24;
    const ang = a + curl * u * u + 0.4 * u * Math.sin(u * 8 + phase);
    const r = 4 + u * len;
    return pt(Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.3);
  });
  const { left, right, shape } = ribbon(center, (u) => 1.9 * (1 - u) + 0.3);
  paint(d, shape, '#c08a63', 0.6);
  center.forEach((c, i) => {
    if (i < 2 || i % 2) return;
    hair(d, [left[i]!, right[i]!], 0.4, 0.6);
    for (const e of [left[i]!, right[i]!]) hair(d, [e, pt(e.x + (e.x - c.x) * 0.9, e.y + (e.y - c.y) * 0.9)], 0.3, 0.55);
  });
  ink(d, left, 0.6);
  ink(d, right, 0.6);
}

function brittleDisc(d: Draw, a0: number, cy: number): void {
  const disc = Array.from({ length: 31 }, (_, i) => {
    const a = (i / 30) * TAU;
    const r = 7 * (1 + 0.12 * Math.cos(5 * (a - a0)));
    return pt(Math.cos(a) * r, cy - 1 + Math.sin(a) * r * 0.6);
  });
  paint(d, disc, '#a8704f', 0.65);
  // Paired radial shields where each arm joins the disc.
  for (let k = 0; k < 5; k++) {
    for (const s of [-0.28, 0.28]) {
      const a = a0 + (k * TAU) / 5 + s;
      hair(d, oval(Math.cos(a) * 4.4, cy - 1 + Math.sin(a) * 2.6, 1.3, 0.8, 8), 0.4, 0.75);
    }
  }
  hair(d, oval(0, cy - 1, 1.6, 1, 10), 0.4, 0.7);
  dots(d, disc, 160, (x, y) => 0.2 + Math.max(0, x / 14) + Math.max(0, (y - cy) / 6) * 0.4, 0.38);
  ring(d, disc, 0.9);
}

function sealily(d: Draw): void {
  const { rng } = d;
  puff(d, 0, -2, 14, 3, SHADOW, 0.35);
  for (let i = 0; i < 6; i++) {
    const s = i < 3 ? -1 : 1;
    const x = s * (5 + rng() * 7);
    hair(d, qb(pt(0, -3), pt(x * 0.5, -3.5), pt(x, -0.8), 6), 0.6, 0.85);
  }
  const top = pt((rng() - 0.5) * 6, -100 - rng() * 4);
  const stalk = qb(pt(0, -3), pt((rng() - 0.5) * 18, -52), top, 28);
  const { left, right, shape } = ribbon(stalk, (u) => 1.7 - u * 0.5);
  paint(d, shape, '#c9a865', 0.55);
  stalk.forEach((p, i) => {
    if (i === 0 || i >= stalk.length - 1) return;
    hair(d, [left[i]!, right[i]!], 0.35, 0.55);
    // Whorls of hooked cirri at every few joints.
    if (i % 4 !== 2) return;
    for (const s of [-1, 1]) hair(d, qb(p, pt(p.x + s * 5, p.y - 2), pt(p.x + s * 7, p.y + 2.5), 6), 0.45, 0.85);
  });
  ink(d, left, 0.7);
  ink(d, right, 0.7);
  crinoidCrown(d, top);
}

/** The feathery crown: arms fanning up from the cup, tips curling over. */
function crinoidCrown(d: Draw, c: Pt): void {
  const { rng } = d;
  const n = 10 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const s = (k / (n - 1) - 0.5) * 2 + (rng() - 0.5) * 0.08;
    const side = s < 0 ? -1 : 1;
    const tip = pt(c.x + s * 17, c.y - 40 * (1 - 0.55 * s * s));
    const hook = qb(tip, pt(tip.x + side * 3, tip.y - 1), pt(tip.x + side * 4, tip.y + 4), 4);
    featherArm(d, [...qb(c, pt(c.x + s * 8, c.y - 44), tip, 14), ...hook.slice(1)]);
  }
  const calyx = oval(c.x, c.y - 1.5, 3.6, 3, 14);
  paint(d, calyx, '#a9824a', 0.75);
  ring(d, calyx, 0.8);
}

function featherArm(d: Draw, arm: readonly Pt[]): void {
  const { shape } = ribbon(arm, (u) => 2.6 * (1 - u * 0.6));
  d.pen.fill(d.L(shape), '#e7d29a', 0.55);
  arm.forEach((p, i) => {
    if (i === 0 || i >= arm.length - 1) return;
    const next = arm[i + 1]!;
    const t = unit(next.x - p.x, next.y - p.y);
    const len = 3 * (1 - (i / arm.length) * 0.5);
    for (const s of [-1, 1]) hair(d, [p, pt(p.x - t.y * s * len + t.x * len * 0.6, p.y + t.x * s * len + t.y * len * 0.6)], 0.35, 0.75);
  });
  ink(d, arm, 0.65);
}

function glasssponge(d: Draw): void {
  const { rng } = d;
  const H = 122;
  const bend = (rng() - 0.5) * 14;
  const tilt = 0.28;
  const c = (u: number): Pt => pt(bend * Math.sin(u * Math.PI * 0.9), -5 - u * H);
  const r = (u: number): number => 3 + 10 * Math.pow(u, 0.35) + 1.5 * Math.pow(u, 10);
  const us = Array.from({ length: 41 }, (_, i) => i / 40);
  const left = us.map((u) => pt(c(u).x - r(u), c(u).y));
  const right = us.map((u) => pt(c(u).x + r(u), c(u).y));
  const top = c(1);
  const shape = [...left, ...oval(top.x, top.y, r(1), r(1) * tilt, 16, Math.PI, TAU), ...[...right].reverse()];
  // Glassy root tuft anchoring it in the ooze.
  for (let i = 0; i < 9; i++) {
    const x = (i / 8 - 0.5) * 26 + (rng() - 0.5) * 3;
    hair(d, qb(pt(0, -6), pt(x * 0.4, -3), pt(x, -0.7), 6), 0.45, 0.6);
  }
  puff(d, 0, -3, 22, 3, SHADOW, 0.35);
  paint(d, shape, '#bdb594', 0.3);
  clip(d, shape, () => spongeLattice(d, c, r, tilt, us));
  dots(d, shape, 1100, (x, y) => {
    const u = Math.min(1, Math.max(0, (-5 - y) / H));
    return Math.max(0, (x - c(u).x) / r(u)) * 0.7 + (1 - u) * 0.15;
  }, 0.38);
  ink(d, left, 1.1);
  ink(d, right, 1.1);
  spongeLid(d, top, r(1), tilt);
}

/** Square lattice of glass spicules with the diagonal spiral ridges over it. */
function spongeLattice(d: Draw, c: (u: number) => Pt, r: (u: number) => number, tilt: number, us: readonly number[]): void {
  const surf = (u: number, phi: number): Pt => pt(c(u).x + r(u) * Math.sin(phi), c(u).y + r(u) * tilt * Math.cos(phi));
  const phis = Array.from({ length: 13 }, (_, i) => -Math.PI / 2 + (i / 12) * Math.PI);
  for (let u = 0.02; u < 1; u += 0.034) hair(d, phis.map((p) => surf(u, p)), 0.35, 0.5);
  for (let k = -4; k <= 4; k++) hair(d, us.map((u) => surf(u, (k / 4.5) * (Math.PI / 2))), 0.35, 0.45);
  for (const dir of [1, -1]) {
    for (let k = 0; k < 6; k++) {
      let run: Pt[] = [];
      const flush = (): void => {
        if (run.length > 1) hair(d, run, dir > 0 ? 0.7 : 0.45, dir > 0 ? 0.8 : 0.5);
        run = [];
      };
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        const phi = (k / 6) * TAU + dir * u * 7;
        if (Math.cos(phi) > 0.05) run.push(surf(u, phi));
        else flush();
      }
      flush();
    }
  }
}

/** The sieve plate capping the vase, with a frill of glassy spines. */
function spongeLid(d: Draw, top: Pt, rt: number, tilt: number): void {
  const lid = oval(top.x, top.y, rt, rt * tilt, 22);
  paint(d, lid, '#d6cfb2', 0.5);
  d.pen.hatch(d.L(lid), 1.7 * S, 0.8, 0.3 * S, { alpha: 0.55 });
  d.pen.hatch(d.L(lid), 1.7 * S, -0.8, 0.3 * S, { alpha: 0.55 });
  ring(d, lid, 0.9);
  for (let i = 0; i < 16; i++) {
    const a = Math.PI + (i / 15) * Math.PI;
    const p = pt(top.x + Math.cos(a) * rt, top.y + Math.sin(a) * rt * tilt);
    hair(d, [p, pt(p.x + Math.cos(a) * 1.2, p.y - 2.2)], 0.4, 0.7);
  }
}

function nodules(d: Draw): void {
  const { rng } = d;
  const n = 7 + Math.floor(rng() * 3);
  const list = Array.from({ length: n }, (_, i) => {
    const rx = 4 + rng() * 7;
    const x = lerp(-61 + rx, 61 - rx, (i + 0.5 + (rng() - 0.5) * 0.6) / n);
    return { x, rx, ry: rx * (0.55 + rng() * 0.3), g: -4 - rng() * 6 };
  }).sort((a, b) => a.g - b.g);
  for (const k of list) nodule(d, k.x, k.g, k.rx, k.ry);
  // Grit: a few tiny nodules between the big ones.
  for (let i = 0; i < 6; i++) {
    const p = oval(lerp(-58, 58, rng()), -2.5 - rng() * 3, 1 + rng(), 0.8, 8);
    paint(d, p, '#3b302a', 0.7);
    ring(d, p, 0.5);
  }
}

/** A black knobbly manganese lump, half sunk with mud lapping round it. */
function nodule(d: Draw, x: number, g: number, rx: number, ry: number): void {
  const { rng } = d;
  lump(d, x, g, rx, ry, '#3b302a', 0.75);
  // Knobs: little bumps, lit on the upper left.
  for (let k = 0; k < 2 + Math.floor(rx / 2.5); k++) {
    const kx = x + (rng() - 0.5) * rx * 1.1;
    const ky = g - 1 - rng() * ry * 0.7;
    const kr = 1 + rng() * 1.5;
    hair(d, oval(kx, ky, kr, kr * 0.8, 8, Math.PI * 0.9, Math.PI * 1.6), 0.55, 0.85, PAPER_FILL);
    hair(d, oval(kx, ky, kr, kr * 0.8, 8, -0.3, Math.PI * 0.6), 0.45, 0.8);
  }
  const lip = qb(pt(x - rx - 3, g + 1.2), pt(x, g - 1.6), pt(x + rx + 3, g + 1.2), 10);
  paint(d, [...lip, pt(x + rx + 3, g + 2), pt(x - rx - 3, g + 2)], MUD, 0.5);
  hair(d, lip, 0.5, 0.75);
}

function tubeworms(d: Draw): void {
  const { rng } = d;
  puff(d, 0, -6, 52, 6, SHADOW, 0.35);
  const n = 8 + Math.floor(rng() * 3);
  const tubes = Array.from({ length: n }, (_, i) => {
    const x = (i / (n - 1) - 0.5) * 56 + (rng() - 0.5) * 6;
    const depth = rng();
    const height = 52 + rng() * 42 - depth * 10;
    // Fan outwards a little, but keep every plume inside the canvas.
    const lean = Math.min((40 - x) / height, Math.max((-40 - x) / height, x * 0.006 + (rng() - 0.5) * 0.3));
    return { base: pt(x, -16 + depth * 8), height, lean, r: 3 + rng() * 1.6, depth };
  }).sort((a, b) => a.depth - b.depth);
  for (const t of tubes) tubeWorm(d, t.base, t.height, t.lean, t.r);
  ventMound(d);
}

/** A white chitin tube with growth rings, topped by a blood-red plume. */
function tubeWorm(d: Draw, base: Pt, height: number, lean: number, r: number): void {
  const top = pt(base.x + lean * height, base.y - height);
  const center = qb(base, pt(base.x + lean * height * 0.25, base.y - height * 0.55), top, 18);
  const { left, right, shape } = ribbon(center, () => r);
  paint(d, shape, '#d8cfb8', 0.35);
  clip(d, shape, () => {
    center.forEach((c, i) => {
      if (i % 2) return;
      hair(d, qb(left[i]!, pt(c.x, c.y + r * 0.45), right[i]!, 4), 0.35, 0.45);
    });
  });
  dots(d, shape, height * r * 1.6, (x, y) => {
    const cx = base.x + lean * height * Math.max(0, (base.y - y) / height);
    return 0.1 + 0.65 * Math.max(0, (x - cx) / r);
  }, 0.38);
  ink(d, left, 0.8);
  ink(d, right, 0.8);
  wormPlume(d, top, lean, r);
}

function wormPlume(d: Draw, top: Pt, lean: number, r: number): void {
  const { rng } = d;
  const len = r * 2.6 + rng() * 6;
  const dir = unit(lean + (rng() - 0.5) * 0.5, -1);
  const center = qb(top, pt(top.x + dir.x * len * 0.5 + (rng() - 0.5) * 3, top.y + dir.y * len * 0.5), along(top, dir, len), 10);
  const { left, right, shape } = ribbon(center, (u) => r * 1.35 * Math.sqrt(Math.max(0, 1 - u * u)) + 0.3);
  paint(d, shape, PLUME_RED, 0.85);
  // Gill lamellae as little chevrons.
  center.forEach((c, i) => {
    if (i === 0 || i === center.length - 1) return;
    hair(d, [left[i]!, pt(c.x, c.y + 1.2), right[i]!], 0.35, 0.55);
  });
  ring(d, shape, 0.75);
  const collar = oval(top.x, top.y, r * 1.08, r * 0.4, 12);
  paint(d, collar, '#e8e2d2', 0.3);
  ring(d, collar, 0.6);
}

/** Dark basalt mound at the worms' feet, studded with pale vent mussels. */
function ventMound(d: Draw): void {
  const { rng } = d;
  const [p, q] = [rng() * TAU, rng() * TAU];
  const height = (u: number): number => 13 * Math.pow(Math.sin(Math.PI * u), 0.8) * (1 + 0.25 * Math.sin(u * 17 + p) + 0.12 * Math.sin(u * 41 + q));
  const top = Array.from({ length: 31 }, (_, i) => pt(lerp(-50, 50, i / 30), -2 - height(i / 30)));
  const body = [...top, pt(50, -1), pt(-50, -1)];
  paint(d, body, '#463d37', 0.7);
  dots(d, body, 800, (_x, y) => 0.3 + 0.5 * ((y + 15) / 15), 0.42);
  for (let c = 0; c < 4; c++) {
    const x = lerp(-40, 40, rng());
    hair(d, [pt(x, -2 - height((x + 50) / 100) + 1), pt(x + 3, -6), pt(x + 1, -2)], 0.5, 0.8);
  }
  ink(d, top, 1.1);
  for (let i = 0; i < 6; i++) {
    const x = lerp(-38, 38, (i + rng()) / 6);
    const y = -2 - height((x + 50) / 100) + 3 + rng() * 3;
    const shell = rotOval(x, y, 3, 1.6, (rng() - 0.5) * 1.2, 12);
    paint(d, shell, '#d9cfae', 0.55);
    ring(d, shell, 0.6);
  }
}

// ---------------------------------------------------------------- black smoker

function blacksmoker(d: Draw): void {
  const { rng } = d;
  const H = 102;
  const lean = (rng() - 0.5) * 10;
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU, rng() * TAU];
  const cx = (u: number): number => lean * u * u;
  const half = (u: number, side: number): number =>
    (8.5 + 21 * Math.pow(1 - u, 1.7)) * (1 + 0.1 * Math.sin(u * 23 + ph[side]!) + 0.06 * Math.sin(u * 57 + ph[side + 2]!));
  const us = Array.from({ length: 41 }, (_, i) => i / 40);
  const left = us.map((u) => pt(cx(u) - half(u, 0), -3 - u * H));
  const right = us.map((u) => pt(cx(u) + half(u, 1), -3 - u * H));
  const body = [...left, ...[...right].reverse()];
  puff(d, 0, -4, 58, 7, SHADOW, 0.45);
  sideSpire(d);
  paint(d, body, '#3e342e', 0.78);
  clip(d, body, () => chimneyTexture(d, us.map((u) => pt(cx(u), -3 - u * H)), right));
  dots(d, body, 2200, (x, y) => 0.25 + 0.6 * Math.max(0, (x - cx((-3 - y) / H)) / 20), 0.42);
  ink(d, left, 1.5);
  ink(d, right, 1.5);
  flange(d, right[17]!, 1);
  flange(d, left[27]!, -1);
  const vent = pt(cx(1), -3 - H);
  const mouth = oval(vent.x, vent.y, (half(1, 0) + half(1, 1)) / 2, 2.4, 16);
  d.pen.fill(d.L(mouth), INK, 0.9);
  ring(d, mouth, 1);
  rubble(d);
  for (let i = 0; i < 4; i++) tubeWorm(d, pt(18 + i * 4 + rng() * 2, -5 - rng() * 2), 10 + rng() * 8, 0.12 + rng() * 0.2, 1.4);
  smokePlume(d, vent);
}

/** Mineral streaks, growth bands and hatched shadow on the chimney wall. */
function chimneyTexture(d: Draw, mid: readonly Pt[], right: readonly Pt[]): void {
  const { rng } = d;
  for (let i = 0; i < 6; i++) {
    const x0 = (rng() - 0.5) * 40;
    const p = rng() * TAU;
    const streak = mid.map((m, k) => pt(m.x + x0 * (1 - (k / mid.length) * 0.6) + Math.sin(k * 0.5 + p) * 2, m.y));
    d.pen.stroke(d.L(streak), (1.4 + rng() * 1.6) * S, i % 3 ? '#b8782f' : '#d1b54a', 0.35, false);
  }
  for (let y = -10; y > -120; y -= 8 + rng() * 4) {
    hair(d, Array.from({ length: 9 }, (_, i) => pt(-34 + i * 8.5, y + (rng() - 0.5) * 3)), 0.45, 0.5);
  }
  const shadeSide = [...mid.map((m) => pt(m.x + 3, m.y)), ...[...right].reverse()];
  d.pen.hatch(d.L(shadeSide), 2.3 * S, 1.2, 0.5 * S, { alpha: 0.6 });
  d.pen.hatch(d.L(shadeSide.slice(0, 20)), 2.6 * S, -0.5, 0.45 * S, { alpha: 0.45, onlyBelow: d.P(0, -45).y });
  for (const m of mid.filter((_, k) => k % 3 === 0)) hair(d, [pt(m.x - 12, m.y), pt(m.x - 11, m.y - 3)], 0.5, 0.45, PAPER_FILL);
}

/** A mineral ledge sticking out of the chimney wall. */
function flange(d: Draw, at: Pt, side: number): void {
  const shelf = oval(at.x + side * 3, at.y, 6, 2.4, 16);
  paint(d, shelf, '#4a3e36', 0.85);
  hair(d, oval(at.x + side * 3, at.y + 1.2, 5, 1.6, 10, 0.1, Math.PI - 0.1), 0.5, 0.8);
  ring(d, shelf, 0.9);
}

/** A smaller dead spire leaning off the main chimney. */
function sideSpire(d: Draw): void {
  const spine = qb(pt(-10, -8), pt(-22, -34), pt(-25, -60), 16);
  const { left, right, shape } = ribbon(spine, (u) => 6.5 * (1 - u) + 2.5);
  paint(d, shape, '#4b3f37', 0.75);
  d.pen.hatch(d.L(shape), 2.4 * S, 1.2, 0.45 * S, { alpha: 0.5 });
  ink(d, left, 1.1);
  ink(d, right, 1.1);
  const tip = spine[spine.length - 1]!;
  ring(d, oval(tip.x, tip.y, 2.6, 0.9, 10), 0.8);
  for (let i = 0; i < 8; i++) puff(d, tip.x - i * 0.6, tip.y - 2 - i * 2.2, 1.5 + i * 0.5, 1.5 + i * 0.45, SMOKE, 0.22 - i * 0.022);
}

function rubble(d: Draw): void {
  const { rng } = d;
  for (let i = 0; i < 8; i++) {
    const rx = 3 + rng() * 5;
    lump(d, lerp(-52 + rx, 52 - rx, (i + rng()) / 8), -2 - rng() * 2, rx, rx * 0.65, '#4a403a', 0.72);
  }
}

/** Billowing black smoke: soft ink washes, cauliflower billows inked low down, fading as it rises. */
function smokePlume(d: Draw, vent: Pt): void {
  const { rng } = d;
  const drift = (rng() - 0.5) * 22;
  const rise = vent.y + 172;
  const ph = rng() * TAU;
  const at = (t: number): Pt => pt(vent.x + drift * Math.pow(t, 1.4) + Math.sin(t * 6 + ph) * 3 * t, vent.y - 1 - t * rise);
  const radius = (t: number): number => 4 + 34 * Math.pow(t, 0.75);
  for (let i = 0; i < 170; i++) {
    const t = Math.pow(rng(), 1.15);
    const c = at(t);
    const rad = radius(t);
    const r = rad * (0.5 + rng() * 0.4);
    puff(d, c.x + (rng() - 0.5) * rad * 0.7, c.y + (rng() - 0.5) * rad * 0.5, r, r * 0.85, SMOKE, 0.26 * Math.pow(1 - t, 1.2) + 0.025);
  }
  // A dense jet right at the vent.
  for (let i = 0; i < 6; i++) puff(d, vent.x, vent.y - 2 - i * 2.5, 3 + i * 0.8, 3 + i * 0.7, SMOKE, 0.55);
  for (let i = 0; i < 8; i++) {
    const t = 0.06 + i * 0.085 + rng() * 0.03;
    billow(d, at(t), radius(t), t, i % 2 ? 1 : -1);
  }
}

/** A lobe on one side of the plume: a pale rim (reads in dark water) with an ink line inside it. */
function billow(d: Draw, c: Pt, rad: number, t: number, side: number): void {
  const { rng } = d;
  const a = side > 0 ? -0.5 : Math.PI + 0.5;
  const lr = rad * (0.38 + rng() * 0.12);
  const lx = c.x + side * rad * 0.42;
  const ly = c.y - rad * 0.1;
  hair(d, oval(lx, ly, lr * 1.08, lr * 0.95, 12, a - 1.4, a + 1.4), 0.7, 0.3 * (1 - t), PAPER_FILL);
  hair(d, oval(lx, ly, lr, lr * 0.85, 12, a - 1.3, a + 1.3), 0.5, 0.8 * (1 - t));
}

// ---------------------------------------------------------------- whale fall

function whalebones(d: Draw): void {
  const { rng } = d;
  puff(d, 0, -6, 140, 9, SHADOW, 0.45);
  for (let i = 0; i < 5; i++) d.pen.fill(d.L(oval(lerp(-120, 110, rng()), -4 - rng() * 3, 14 + rng() * 18, 2.5, 16)), '#e8dca6', 0.2);
  const spine = qb(pt(-84, -32), pt(10, -42), pt(142, -9), 30);
  const ribs = spine.slice(2, 13);
  ribs.forEach((v, k) => whaleRib(d, v, ribScale(k, ribs.length), true));
  spine.forEach((v, i) => {
    if (i === 0) return;
    const prev = spine[i - 1]!;
    vertebra(d, v, Math.atan2(v.y - prev.y, v.x - prev.x) + (rng() - 0.5) * 0.2, 1 - 0.7 * (i / spine.length), i / spine.length > 0.55);
  });
  whaleSkull(d);
  ribs.forEach((v, k) => whaleRib(d, v, ribScale(k, ribs.length), false));
  flipper(d);
  vertebra(d, pt(108 + rng() * 20, -5), 0.3 + rng(), 0.5, false);
  whaleRib(d, pt(36 + rng() * 10, -14), 0.55, false);
  for (let i = 0; i < 16; i++) {
    const v = spine[1 + Math.floor(rng() * 20)]!;
    const p = d.P(v.x + (rng() - 0.5) * 4, v.y - 3 - rng() * 6);
    d.pen.dot(p.x, p.y, 0.7 * S, PLUME_RED, 0.9);
  }
}

const ribScale = (k: number, n: number): number => 0.45 + 0.75 * Math.sin((Math.PI * (k + 0.7)) / (n + 0.4));

/** Far ribs splay up behind the spine; near ribs arch down to the mud in front. */
function whaleRib(d: Draw, v: Pt, k: number, far: boolean): void {
  const { rng } = d;
  let bone = far
    ? qb(pt(v.x, v.y - 3), pt(v.x - 8 * k, v.y - 34 * k), pt(v.x + 10 * k, v.y - 50 * k), 14)
    : qb(pt(v.x, v.y + 3), pt(v.x - 20 * k, v.y + 8), pt(v.x - 12 * k + 3, -4 - rng() * 2), 14);
  if (rng() < 0.2) bone = bone.slice(0, 10);
  const { left, shape } = ribbon(bone, (u) => (far ? 1.5 : 2) * (1 - u * 0.45));
  paint(d, shape, BONE, far ? 0.5 : 0.35);
  if (far) d.pen.fill(d.L(shape), MUD, 0.2);
  hair(d, left.slice(2), 0.4, 0.6);
  ring(d, shape, far ? 0.75 : 0.95);
}

/** One vertebra: a spool-shaped centrum with its neural spine raking back. */
function vertebra(d: Draw, c: Pt, ang: number, size: number, chevron: boolean): void {
  const ry = 6.2 * size + 1.2;
  const base = pt(c.x + Math.sin(ang) * ry, c.y - Math.cos(ang) * ry);
  const spine = ribbon([base, pt(base.x + 4 * size, base.y - 12 * size)], (u) => (1.7 - u * 0.9) * size + 0.4);
  paint(d, spine.shape, BONE, 0.4);
  ring(d, spine.shape, 0.7);
  if (chevron) hair(d, [pt(c.x - 2, c.y + ry), pt(c.x, c.y + ry + 4 * size), pt(c.x + 2, c.y + ry)], 0.6, 0.85);
  const centrum = rotOval(c.x, c.y, 3.3, ry, ang, 14);
  paint(d, centrum, BONE, 0.4);
  hair(d, rotOval(c.x + Math.cos(ang) * 2.2, c.y + Math.sin(ang) * 2.2, 0.8, ry * 0.8, ang, 8), 0.4, 0.6);
  dots(d, centrum, 30 * size, (_x, y) => (y > c.y ? 0.7 : 0.15), 0.35);
  ring(d, centrum, 0.85);
}

function whaleSkull(d: Draw): void {
  const skull = [
    pt(-84, -26), pt(-86, -40), pt(-94, -48), pt(-104, -48), pt(-112, -44), pt(-124, -36), pt(-136, -28), pt(-146, -21),
    pt(-147, -18), pt(-140, -16), pt(-124, -16), pt(-110, -15), pt(-98, -13), pt(-90, -16), pt(-85, -20),
  ];
  paint(d, skull, BONE, 0.35);
  clip(d, skull, () => {
    for (let y = -24; y < -12; y += 1.6) hair(d, [pt(-150, y), pt(-84, y + 2)], 0.35, 0.45);
    hair(d, qb(pt(-104, -42), pt(-124, -30), pt(-146, -19), 10), 0.45, 0.7);
    hair(d, qb(pt(-90, -24), pt(-96, -20), pt(-108, -22), 6), 0.5, 0.75);
  });
  d.pen.fill(d.L(oval(-97, -31, 4.5, 3.5, 14)), INK, 0.75);
  d.pen.fill(d.L(oval(-110, -43, 4, 1.4, 10)), INK, 0.7);
  dots(d, skull, 350, (x, y) => 0.15 + Math.max(0, (y + 26) / 14) * 0.6 + Math.max(0, (x + 95) / 15) * 0.3, 0.38);
  ring(d, skull, 1.3);
  // The great bowed lower jaw lying in front.
  const jaw = ribbon(qb(pt(-146, -12), pt(-118, -1), pt(-86, -10), 16), (u) => 1.6 + 1.6 * u);
  paint(d, jaw.shape, BONE, 0.4);
  hair(d, jaw.left.slice(3), 0.4, 0.6);
  ring(d, jaw.shape, 1.1);
}

function flipper(d: Draw): void {
  const blade = oval(-66, -18, 6, 5, 14);
  paint(d, blade, BONE, 0.4);
  hair(d, [pt(-70, -20), pt(-63, -15)], 0.4, 0.6);
  ring(d, blade, 0.9);
  const arm = ribbon(qb(pt(-62, -14), pt(-57, -11), pt(-50, -8), 6), () => 1.8);
  paint(d, arm.shape, BONE, 0.4);
  ring(d, arm.shape, 0.9);
  for (let f = 0; f < 4; f++) {
    for (let j = 0; j < 3; j++) {
      const bone = rotOval(-46 + j * 4.2 + f * 0.8, -9.5 + f * 1.6 + j * 1.2, 1.8, 0.75, 0.3 + f * 0.12, 8);
      paint(d, bone, BONE, 0.4);
      ring(d, bone, 0.6);
    }
  }
}

// ---------------------------------------------------------------- dispatch

const DRAW: Readonly<Record<DeepDecorId, (d: Draw) => void>> = {
  brittlestar, sealily, glasssponge, nodules, tubeworms, blacksmoker, whalebones,
};

/** Pieces that may be drawn mirrored so repeats don't all face the same way. */
const MIRRORS: ReadonlySet<DeepDecorId> = new Set<DeepDecorId>(['whalebones', 'blacksmoker']);

/** Draws a deep-sea decor piece; returns false if `kind` isn't one of this file's. */
export function drawDeepDecor(ctx: CanvasRenderingContext2D, kind: DeepDecorId, seed: number): boolean {
  if (!Object.prototype.hasOwnProperty.call(DRAW, kind)) return false;
  const mirror = MIRRORS.has(kind) && createRng(seed * 13 + 1)() < 0.5;
  DRAW[kind](frame(ctx, seed, mirror));
  return true;
}
