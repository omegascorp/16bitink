import { BLOTCHES, FRECKLES, HEAD, type Mottle, type Section, SKIN, sectionAt, TIP } from './tint';

/** A screen point. */
export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface EelLook {
  /** Its spine on the screen: `f` 0 nose .. 1 tail tip (and a little past, for the fins round the tip). */
  readonly spine: (f: number) => Pt;
  /** Its greatest half-depth, screen px. */
  readonly depth: number;
  /** The line boil frame, for the ink's wobble. */
  readonly boil: number;
  /** Fins on (the dorsal and anal skin ridge running round the tip). */
  readonly fins: boolean;
  /** Draw only up to here (the rest still out of sight). */
  readonly to?: number;
}

/** One place on the spine: where, and the way to the back (unit, perpendicular to the spine). */
interface Station {
  readonly f: number;
  readonly p: Pt;
  readonly back: Pt;
  readonly along: Pt;
  readonly s: Section;
}

const SAMPLES = 260;

function stations(look: EelLook): Station[] {
  const end = Math.min(look.to ?? 1, 1) + (look.fins && (look.to ?? 1) >= 1 ? TIP : 0);
  const fs = Array.from({ length: SAMPLES + 1 }, (_, i) => end * (i / SAMPLES) ** 1.15);
  const ps = fs.map((f) => look.spine(f));
  return fs.map((f, i) => {
    const a = ps[Math.max(0, i - 1)]!;
    const b = ps[Math.min(ps.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const along = { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
    return { f, p: ps[i]!, along, back: { x: along.y, y: -along.x }, s: sectionAt(f, look.fins) };
  });
}

/** A point `v` across at a station: 0 the spine, ±1 the back's and the belly's edge, ±2 the fins' edges. */
function across(st: Station, v: number, depth: number): Pt {
  const s = st.s;
  const h = v >= 0
    ? (v <= 1 ? v * s.top : s.top + (v - 1) * s.dorsal)
    : (v >= -1 ? v * s.bottom : -s.bottom + (v + 1) * s.anal);
  return { x: st.p.x + st.back.x * h * depth, y: st.p.y + st.back.y * h * depth };
}

/** The rounded snout, from the belly side round to the back, at the first station. */
function snout(st: Station, depth: number): Pt[] {
  const out: Pt[] = [];
  for (let j = 0; j <= 10; j++) {
    const th = -Math.PI / 2 + (Math.PI * j) / 10;
    const v = Math.sin(th);
    const h = (v >= 0 ? st.s.top : st.s.bottom) * v * depth;
    const fwd = 0.95 * st.s.top * depth * Math.cos(th);
    out.push({ x: st.p.x + st.back.x * h - st.along.x * fwd, y: st.p.y + st.back.y * h - st.along.y * fwd });
  }
  return out;
}

function band(sts: readonly Station[], v0: number, v1: number, depth: number, nose: boolean): Pt[] {
  const a = sts.map((st) => across(st, v1, depth));
  const b = [...sts].reverse().map((st) => across(st, v0, depth));
  return nose ? [...a, ...b, ...snout(sts[0]!, depth)] : [...a, ...b];
}

function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = true): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  trace(ctx, pts);
  ctx.fill();
}

/** An ink line along `pts`, wobbling a little with the boil as the game's lines do. */
function ink(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, alpha: number, boil: number, close = false): void {
  const wob = pts.map((p, i) => {
    const j = 0.18 * width * Math.sin(i * 0.9 + boil * 2.3);
    return { x: p.x + j, y: p.y - j };
  });
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SKIN.ink;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  trace(ctx, wob, close);
  ctx.stroke();
}

function stationAt(sts: readonly Station[], f: number): Station {
  let best = sts[0]!;
  for (const st of sts) if (Math.abs(st.f - f) < Math.abs(best.f - f)) best = st;
  return best;
}

function mottles(ctx: CanvasRenderingContext2D, sts: readonly Station[], list: readonly Mottle[], color: string, depth: number, to: number): void {
  ctx.fillStyle = color;
  for (const m of list) {
    if (m.f > to) continue;
    const st = stationAt(sts, m.f);
    const local = Math.max(0.25, Math.min(1, (m.v >= 0 ? st.s.top : st.s.bottom) * 1.1));
    const c = across(st, m.v, depth);
    ctx.globalAlpha = m.alpha;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, m.rx * depth * local, m.ry * depth * local, Math.atan2(st.along.y, st.along.x) + m.turn, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The round body's light: a shadow building to the belly, a highlight along the back, a darker rim at the top edge. */
function roundness(ctx: CanvasRenderingContext2D, sts: readonly Station[], depth: number): void {
  for (let i = 0; i < 6; i++) fill(ctx, band(sts, -1.05, -1.05 + 0.95 * ((i + 1) / 6), depth, false), SKIN.deep, 0.085);
  for (let i = 0; i < 5; i++) fill(ctx, band(sts, 0.42 - 0.07 * (i + 1), 0.42 + 0.06 * (i + 1), depth, false), SKIN.light, 0.075);
  fill(ctx, band(sts, 0.86, 1.05, depth, false), SKIN.deep, 0.16);
}

function drawEye(ctx: CanvasRenderingContext2D, sts: readonly Station[], depth: number, boil: number): void {
  const st = stationAt(sts, HEAD.eye.f);
  const c = across(st, HEAD.eye.v, depth);
  const r = HEAD.eye.r * depth;
  const fwd = { x: -st.along.x, y: -st.along.y };
  // A soft socket, the amber iris, the round pupil and a catchlight up and forward.
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = SKIN.deep;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 1.45, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(c.x - st.back.x * r * 0.3, c.y - st.back.y * r * 0.3, r * 0.1, c.x, c.y, r);
  g.addColorStop(0, SKIN.iris);
  g.addColorStop(1, SKIN.irisEdge);
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKIN.pupil;
  ctx.beginPath();
  ctx.arc(c.x + fwd.x * r * 0.06, c.y + fwd.y * r * 0.06, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, Array.from({ length: 25 }, (_, i) => ({ x: c.x + r * Math.cos((i / 24) * Math.PI * 2), y: c.y + r * Math.sin((i / 24) * Math.PI * 2) })), Math.max(1, r * 0.16), 0.85, boil);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#fffbea';
  ctx.beginPath();
  ctx.arc(c.x + (fwd.x * 0.28 + st.back.x * 0.34) * r, c.y + (fwd.y * 0.28 + st.back.y * 0.34) * r, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(c.x - (fwd.x * 0.25 + st.back.x * 0.2) * r, c.y - (fwd.y * 0.25 + st.back.y * 0.2) * r, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

/** The tube nostril on the snout's tip, and the small hole of the back nostril above the eye. */
function drawNostrils(ctx: CanvasRenderingContext2D, sts: readonly Station[], depth: number, boil: number): void {
  const st = stationAt(sts, HEAD.nostril.f);
  const base = across(st, HEAD.nostril.v, depth);
  const dir = { x: -st.along.x * 0.75 + st.back.x * 0.66, y: -st.along.y * 0.75 + st.back.y * 0.66 };
  const len = 0.27 * depth;
  const tip = { x: base.x + dir.x * len, y: base.y + dir.y * len };
  const w = Math.max(2, 0.085 * depth);
  ctx.lineCap = 'round';
  ink(ctx, [base, tip], w + Math.max(1.4, 0.03 * depth), 0.9, boil);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = SKIN.base;
  ctx.lineWidth = w;
  trace(ctx, [base, tip], false);
  ctx.stroke();
  ctx.fillStyle = SKIN.gill;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, w * 0.32, 0, Math.PI * 2);
  ctx.fill();
  const back = across(stationAt(sts, HEAD.backNostril.f), HEAD.backNostril.v, depth);
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(back.x, back.y, Math.max(1, 0.035 * depth), 0, Math.PI * 2);
  ctx.fill();
}

/** The shut mouth running back past the eye, the throat's folds, the jaw muscles' bulge and the small round gill opening. */
function drawFace(ctx: CanvasRenderingContext2D, sts: readonly Station[], depth: number, boil: number): void {
  const head = sts.filter((st) => st.f <= HEAD.mouthEnd);
  const lip = head.map((st) => across(st, -0.06 - 0.2 * (st.f / HEAD.mouthEnd) ** 1.6, depth));
  const chin = head.map((st) => across(st, -0.16 - 0.2 * (st.f / HEAD.mouthEnd) ** 1.6, depth));
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = SKIN.pale;
  ctx.lineWidth = Math.max(1, 0.05 * depth);
  trace(ctx, chin, false);
  ctx.stroke();
  ink(ctx, lip, Math.max(1.6, 0.04 * depth), 0.92, boil);
  // The bulge of the jaw muscles behind the eye, catching the light.
  const cheek = across(stationAt(sts, 0.1), 0.42, depth);
  const st = stationAt(sts, 0.1);
  const g = ctx.createRadialGradient(cheek.x, cheek.y, 0, cheek.x, cheek.y, depth * 0.55);
  g.addColorStop(0, 'rgba(240,232,150,0.32)');
  g.addColorStop(1, 'rgba(240,232,150,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cheek.x, cheek.y, depth * 0.6, depth * 0.38, Math.atan2(st.along.y, st.along.x), 0, Math.PI * 2);
  ctx.fill();
  // Fine folds of skin across the throat.
  for (const f of [0.1, 0.118, 0.136]) {
    const s = stationAt(sts, f);
    ink(ctx, [across(s, -0.45, depth), across(stationAt(sts, f + 0.006), -0.68, depth), across(s, -0.88, depth)], Math.max(0.8, 0.018 * depth), 0.28, boil);
  }
  const gs = stationAt(sts, HEAD.gill.f);
  const gc = across(gs, HEAD.gill.v, depth);
  const turn = Math.atan2(gs.along.y, gs.along.x);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = SKIN.gill;
  ctx.beginPath();
  ctx.ellipse(gc.x, gc.y, depth * 0.035, depth * 0.05, turn, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Paints the moray along its spine: a fleshy, rayless fin ridge (the skin's
 * own colour, thinning to translucent at its edge) running from behind the
 * head round the pointed tail; the thick round body, mottled yellow-green
 * with brown blotches, shadowed along the belly and lit along the back; the
 * deep head with its long shut mouth, tube nostril, small amber eye and gill
 * opening. Restores the context's alpha and styles.
 */
export function paintEel(ctx: CanvasRenderingContext2D, look: EelLook): void {
  const sts = stations(look);
  const depth = look.depth;
  const to = look.to ?? 1;
  const whole = band(sts, -2, 2, depth, true);
  const body = band(sts, -1, 1, depth, true);
  ctx.save();
  // The fin ridge: thin at its edge, denser into the body.
  if (look.fins) {
    fill(ctx, whole, SKIN.fin, 0.6);
    fill(ctx, band(sts, 1, 1.6, depth, false), SKIN.fin, 0.4);
    fill(ctx, band(sts, -1.6, -1, depth, false), SKIN.fin, 0.4);
  }
  fill(ctx, body, SKIN.base, 1);
  ctx.save();
  trace(ctx, look.fins ? whole : body);
  ctx.clip();
  mottles(ctx, sts, BLOTCHES, SKIN.blotch, depth, to);
  ctx.restore();
  ctx.save();
  trace(ctx, body);
  ctx.clip();
  roundness(ctx, sts, depth);
  mottles(ctx, sts, FRECKLES, SKIN.pale, depth, to);
  ctx.restore();
  // Ink: a soft edge round the fins, a firm one round the head and the belly ahead of the fin, a faint seam where the fin meets the body.
  const w = Math.max(1.2, 0.03 * depth);
  if (look.fins) {
    ink(ctx, whole, w * 0.6, 0.62, look.boil, true);
    ink(ctx, sts.filter((st) => st.f > HEAD.dorsalFrom).map((st) => across(st, 1, depth)), w * 0.45, 0.2, look.boil);
    ink(ctx, sts.filter((st) => st.f > HEAD.analFrom).map((st) => across(st, -1, depth)), w * 0.45, 0.2, look.boil);
  }
  const topTo = look.fins ? HEAD.dorsalFrom + 0.02 : 1;
  const bottomTo = look.fins ? HEAD.analFrom + 0.02 : 1;
  const headTop = sts.filter((st) => st.f <= topTo).map((st) => across(st, 1, depth));
  const headBottom = sts.filter((st) => st.f <= bottomTo).map((st) => across(st, -1, depth));
  ink(ctx, [...[...headBottom].reverse(), ...snout(sts[0]!, depth), ...headTop], w, 0.85, look.boil);
  // Where the firm line meets the fin, it fades out into the seam instead of stopping short.
  if (look.fins) {
    for (const [from, v] of [[topTo, 1], [bottomTo, -1]] as const) {
      for (let i = 0; i < 5; i++) {
        const run = sts.filter((st) => st.f >= from + 0.012 * i - 0.002 && st.f <= from + 0.012 * (i + 1)).map((st) => across(st, v, depth));
        if (run.length > 1) ink(ctx, run, w * (1 - 0.12 * i), 0.85 * (1 - (i + 1) / 6), look.boil);
      }
    }
  }
  drawFace(ctx, sts, depth, look.boil);
  drawNostrils(ctx, sts, depth, look.boil);
  drawEye(ctx, sts, depth, look.boil);
  ctx.restore();
}
