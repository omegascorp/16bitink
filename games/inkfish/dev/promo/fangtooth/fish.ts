import {
  ANAL, BRAIN, DORSAL, EYE, type Fin, GROOVES, jawPoint, JAW, LATERAL, MARKS, type Mesh, onJaw, pectoral, pelvic, SKULL, skinAt, skinNormal,
  skinThetaAt, SOCKET_R, socketLine, SPINE, swayAt, TAIL, TEETH, type Tooth,
} from './body';
import { type FishPose, project, type Screen, toCamera, type V3, v3 } from './space';

/**
 * Draws the fangtooth model (body.ts) in pen and ink: dark skin shaded a
 * little by a light from above, a chalk outline where the body turns away,
 * chalk grooves, scales and fin rays, bone-white teeth. Everything is a
 * primitive with a depth, drawn far to near. Outlines and details boil
 * (wobble a pixel or two, BOIL_FPS times a second) as the game's drawings do.
 *
 * The X-ray (look.xray) fades the skin to glass and shows the skeleton:
 * backbone, brain, the two sockets and the fangs sliding into them.
 */
export interface FishLook {
  /** The line-boil frame. */
  readonly boil: number;
  /** 0 normal .. 1 X-ray. */
  readonly xray: number;
  /** The lateral line lighting up, 0 .. 1, at `along` (0 at the gill .. 1 at the tail). */
  readonly sense: (along: number) => number;
  /** Highlights in the X-ray, 0 .. 1. */
  readonly fangGlow: number;
  readonly socketGlow: number;
  readonly brainGlow: number;
  /** The eye, 1 normal .. 0 dim. */
  readonly eye: number;
}

const CHALK = '#dcd6e6';
const BONE = '#efe5cb';
const SKIN = [56, 40, 34] as const;
const RIM = [96, 112, 150] as const;
const GULLET = [44, 14, 17] as const;
const GLASS = [40, 96, 112] as const;
const BRAIN_PINK = '#e8a3b4';
/** The left lip's index round a skull ring and a jaw ring (the right lip is 0 on both). */
const ROOF_LIP = 25;
const JAW_LIP = 19;
const SENSE = '#ffe08a';

/** The light, from above, in front and a little left, in camera space. */
const LIGHT = (() => {
  const l = v3(-0.35, 0.8, 0.5);
  const n = Math.hypot(l.x, l.y, l.z);
  return v3(l.x / n, l.y / n, l.z / n);
})();

interface Prim {
  readonly depth: number;
  readonly draw: (ctx: CanvasRenderingContext2D) => void;
}

const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const cross = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const unit = (a: V3): V3 => {
  const n = Math.hypot(a.x, a.y, a.z) || 1;
  return v3(a.x / n, a.y / n, a.z / n);
};
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const rgb = (c: readonly number[], a = 1): string => `rgba(${c.map((v) => Math.round(clamp(v, 0, 255))).join(',')},${a.toFixed(3)})`;
const mix = (a: readonly number[], b: readonly number[], u: number): number[] => a.map((v, i) => v + (b[i]! - v) * u);

/** A steady pseudo-random wobble in [-1, 1] for a point id and boil frame. */
function wobble(id: number, boil: number, axis: number): number {
  let h = (id * 374761393 + boil * 668265263 + axis * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2147483648 - 1;
}

/** Where a model point goes: the jaw turned if it is on the jaw, the tail swayed, placed and projected. */
export function placePoint(pose: FishPose, v: V3, jaw: boolean): { readonly cam: V3; readonly at: Screen } {
  const opened = jaw ? jawPoint(v, pose.jaw) : v;
  const swayed = v3(opened.x, opened.y, opened.z + swayAt(opened.x, pose.beat, pose.sway));
  const cam = toCamera(pose, swayed);
  return { cam, at: project(cam) };
}

/** A model direction (a normal), turned with the jaw if on it, in camera space. */
function placeDir(pose: FishPose, n: V3, jaw: boolean): V3 {
  const a = placePoint(pose, v3(0, 0, 0), false).cam;
  const turned = jaw ? sub(jawPoint(n, pose.jaw), jawPoint(v3(0, 0, 0), pose.jaw)) : n;
  return sub(toCamera(pose, turned), a);
}

interface Placed {
  readonly cam: V3[];
  readonly at: Screen[];
  readonly k: number;
  readonly id0: number;
}

function placeMesh(pose: FishPose, mesh: Mesh, id0: number): Placed {
  const cam: V3[] = [];
  const at: Screen[] = [];
  for (const ring of mesh.rings) {
    for (const p of ring) {
      const q = placePoint(pose, p, mesh.jaw);
      cam.push(q.cam);
      at.push(q.at);
    }
  }
  return { cam, at, k: mesh.rings[0]!.length, id0 };
}

interface Style {
  readonly look: FishLook;
  /** Outline and detail widths, px per cm. */
  readonly line: (scale: number) => number;
  readonly fine: (scale: number) => number;
  readonly amp: (scale: number) => number;
  readonly skinAlpha: number;
  readonly lineColour: string;
}

const jitter = (s: Style, at: Screen, id: number): { x: number; y: number } => {
  const a = s.amp(at.scale);
  return { x: at.x + a * wobble(id, s.look.boil, 1), y: at.y + a * wobble(id, s.look.boil, 2) };
};

/** The faces of a mesh and its outline, as primitives. */
function meshPrims(mesh: Mesh, m: Placed, s: Style, prims: Prim[], open: boolean): void {
  const n = mesh.rings.length;
  const { k } = m;
  const idx = (i: number, j: number): number => i * k + (((j % k) + k) % k);
  const front: boolean[] = [];
  const xr = s.look.xray;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < k; j++) {
      const ids = [idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)];
      const [a, b, c, d] = ids.map((q) => m.cam[q]!) as [V3, V3, V3, V3];
      const normal = unit(cross(sub(d, b), sub(c, a)));
      const centre = v3((a.x + b.x + c.x + d.x) / 4, (a.y + b.y + c.y + d.y) / 4, (a.z + b.z + c.z + d.z) / 4);
      const toEye = unit(v3(-centre.x, -centre.y, -centre.z));
      const facing = dot(normal, toEye);
      const kind = mesh.kinds[j]!;
      front[i * k + j] = facing > 0;
      if (kind === 'skin' && facing <= 0) continue;
      if (kind === 'mouth' && xr >= 0.99) continue;
      const pts = ids.map((q) => m.at[q]!);
      const depth = pts.reduce((sum, p) => sum + p.depth, 0) / 4;
      let fill: string;
      let hatch = 0;
      if (kind === 'skin') {
        const lambert = Math.max(0, dot(normal, LIGHT));
        const rim = (1 - Math.abs(facing)) ** 2;
        const colour = SKIN.map((v, q) => v * (0.62 + 0.5 * lambert) + RIM[q]! * rim * 0.35);
        fill = rgb(mix(colour, GLASS, xr), s.skinAlpha);
        // Scratchboard: pale cross-contour lines where the light falls, every other section.
        hatch = i % 2 === 0 ? clamp((lambert - 0.3) / 0.6, 0, 1) ** 1.4 * 0.5 * (1 - xr) : 0;
      } else {
        // Darker deeper in, towards the throat.
        const deep = 0.3 + 0.7 * clamp((mesh.rings[i]![0]!.x - 2.0) / 4.0, 0, 1);
        const lit = (0.55 + 0.45 * Math.abs(dot(normal, LIGHT))) * deep;
        fill = rgb(GULLET.map((v) => v * lit), 1 - xr);
      }
      const hatchFrom = hatch > 0.02 ? jitter(s, pts[0]!, m.id0 + ids[0]!) : null;
      const hatchTo = hatch > 0.02 ? jitter(s, pts[3]!, m.id0 + ids[3]!) : null;
      const hatchWidth = s.fine(pts[0]!.scale) * 0.75;
      prims.push({
        depth,
        draw: (ctx) => {
          ctx.beginPath();
          pts.forEach((p, q) => (q === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
          // Close the hairline seams between faces.
          ctx.strokeStyle = fill;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          if (hatchFrom && hatchTo) {
            ctx.save();
            ctx.globalAlpha = hatch;
            ctx.strokeStyle = CHALK;
            ctx.lineWidth = hatchWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(hatchFrom.x, hatchFrom.y);
            ctx.lineTo(hatchTo.x, hatchTo.y);
            ctx.stroke();
            ctx.restore();
          }
        },
      });
    }
  }
  // The outline: edges between a face turned to us and one turned away, and the lips.
  const isSkin = (j: number): boolean => mesh.kinds[((j % k) + k) % k] === 'skin';
  const faceFront = (i: number, j: number): boolean | null => (i < 0 || i >= n - 1 ? null : front[i * k + (((j % k) + k) % k)]!);
  const edge = (p: number, q: number, lip: boolean): void => {
    const a = m.at[p]!;
    const b = m.at[q]!;
    const pa = jitter(s, a, m.id0 + p);
    const pb = jitter(s, b, m.id0 + q);
    const depth = (a.depth + b.depth) / 2 - 0.03;
    const width = s.line((a.scale + b.scale) / 2) * (lip ? 0.75 : 1);
    prims.push({
      depth,
      draw: (ctx) => {
        ctx.strokeStyle = s.lineColour;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      },
    });
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      // Along the body, between faces (i, j-1) and (i, j).
      if (i < n - 1) {
        const before = isSkin(j - 1);
        const after = isSkin(j);
        const f1 = faceFront(i, j - 1);
        const f2 = faceFront(i, j);
        if (before && after && f1 !== f2) edge(idx(i, j), idx(i + 1, j), false);
        else if (before !== after && (open || (before && f1) || (after && f2))) edge(idx(i, j), idx(i + 1, j), true);
      }
      // Round the body, between faces (i-1, j) and (i, j).
      if (isSkin(j)) {
        const f1 = faceFront(i - 1, j);
        const f2 = faceFront(i, j);
        if (f1 !== null && f2 !== null && f1 !== f2) edge(idx(i, j), idx(i, j + 1), false);
        else if ((f1 === null || f2 === null) && (f1 ?? f2)) edge(idx(i, j), idx(i, j + 1), false);
      }
    }
  }
}

/** The tail end of the body is open: a cap over it, behind the tail fin. */
function capPrim(m: Placed, s: Style, prims: Prim[]): void {
  const pts = m.at.slice(0, m.k);
  const depth = pts.reduce((sum, p) => sum + p.depth, 0) / pts.length;
  prims.push({
    depth,
    draw: (ctx) => {
      ctx.beginPath();
      pts.forEach((p, q) => (q === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = rgb(mix(SKIN.map((v) => v * 0.7), GLASS, s.look.xray), s.skinAlpha);
      ctx.fill();
    },
  });
}

/** The inside of the open mouth: the far cheek, from lip to lip, dark, behind everything. */
function gulletPrim(pose: FishPose, s: Style, prims: Prim[]): void {
  if (pose.jaw < 0.02) return;
  // The far side: the lips whose side of the head is turned away from us.
  const left = placePoint(pose, v3(4, 0, 1), false).cam;
  const right = placePoint(pose, v3(4, 0, -1), false).cam;
  const far = left.z < right.z ? 1 : -1;
  const lip = (ring: readonly V3[], last: number): V3 => (far > 0 ? ring[last]! : ring[0]!);
  const roof = SKULL.rings.filter((r) => r[0]!.x >= 1.9).map((r) => lip(r, ROOF_LIP));
  const floor = JAW.rings.filter((r) => r[0]!.x >= 1.9).map((r) => (far > 0 ? r[0]! : r[JAW_LIP]!));
  const pts = [...roof.map((p) => placePoint(pose, p, false).at), ...floor.reverse().map((p) => placePoint(pose, p, true).at)];
  const depth = Math.max(...pts.map((p) => p.depth)) + 3;
  prims.push({
    depth,
    draw: (ctx) => {
      ctx.beginPath();
      pts.forEach((p, q) => (q === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = rgb(GULLET.map((v) => v * 0.3), 1 - s.look.xray);
      ctx.fill();
    },
  });
}

function finPrim(pose: FishPose, fin: Fin, s: Style, id0: number, prims: Prim[]): void {
  const outline = fin.outline.map((p) => placePoint(pose, p, false).at);
  const rays = fin.rays.map(([a, b]) => [placePoint(pose, a, false).at, placePoint(pose, b, false).at] as const);
  const depth = outline.reduce((sum, p) => sum + p.depth, 0) / outline.length;
  const scale = outline[0]!.scale;
  const xr = s.look.xray;
  prims.push({
    depth,
    draw: (ctx) => {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      outline.forEach((p, q) => {
        const j = jitter(s, p, id0 + q);
        if (q === 0) ctx.moveTo(j.x, j.y);
        else ctx.lineTo(j.x, j.y);
      });
      ctx.closePath();
      ctx.fillStyle = rgb(mix([70, 52, 46], GLASS, xr), 0.72 * s.skinAlpha + 0.1);
      ctx.fill();
      ctx.strokeStyle = s.lineColour;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = s.fine(scale) * 0.8;
      rays.forEach(([a, b], q) => {
        const ja = jitter(s, a, id0 + 40 + q);
        const jb = jitter(s, b, id0 + 60 + q);
        ctx.beginPath();
        ctx.moveTo(ja.x, ja.y);
        ctx.lineTo(jb.x, jb.y);
        ctx.stroke();
      });
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = s.line(scale) * 0.7;
      ctx.beginPath();
      outline.forEach((p, q) => {
        const j = jitter(s, p, id0 + q);
        if (q === 0) ctx.moveTo(j.x, j.y);
        else ctx.lineTo(j.x, j.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    },
  });
}

/** A tapered tooth from its centre line on screen. */
function toothPath(ctx: CanvasRenderingContext2D, line: readonly Screen[], r: number): void {
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  line.forEach((p, q) => {
    const a = line[Math.max(0, q - 1)]!;
    const b = line[Math.min(line.length - 1, q + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const u = q / (line.length - 1);
    const w = r * p.scale * (1 - u) ** 0.85;
    left.push({ x: p.x - (dy / len) * w, y: p.y + (dx / len) * w });
    right.push({ x: p.x + (dy / len) * w, y: p.y - (dx / len) * w });
  });
  ctx.beginPath();
  [...left, ...right.reverse()].forEach((p, q) => (q === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

function placeTooth(pose: FishPose, t: Tooth): Screen[] {
  return t.line.map((p) => placePoint(pose, p, t.jaw).at);
}

function toothPrim(pose: FishPose, t: Tooth, s: Style, prims: Prim[]): void {
  const line = placeTooth(pose, t);
  const depth = line[Math.floor(line.length / 2)]!.depth;
  const glow = t.fang ? s.look.fangGlow : 0;
  const alpha = t.fang ? 1 - s.look.xray : 1 - 0.85 * s.look.xray;
  if (alpha <= 0.01) return;
  prims.push({
    depth,
    draw: (ctx) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      toothPath(ctx, line, t.r);
      ctx.fillStyle = BONE;
      ctx.fill();
      ctx.strokeStyle = glow > 0 ? SENSE : '#2a1d18';
      ctx.lineWidth = Math.max(1, line[0]!.scale * 0.018);
      ctx.stroke();
      ctx.restore();
    },
  });
}

/** Marks on the skin: rough scales on the body, stipple on the head. Only those turned to us. */
function markPrims(pose: FishPose, s: Style, prims: Prim[]): void {
  const fade = 1 - s.look.xray;
  if (fade <= 0.01) return;
  const axis = (() => {
    const a = placePoint(pose, v3(0, 0, 0), false).at;
    const b = placePoint(pose, v3(1, 0, 0), false).at;
    return Math.atan2(b.y - a.y, b.x - a.x);
  })();
  MARKS.forEach((mk, q) => {
    const jaw = onJaw(mk.x, mk.theta);
    const p = placePoint(pose, skinAt(mk.x, mk.theta), jaw);
    const n = unit(placeDir(pose, skinNormal(mk.x, mk.theta), jaw));
    const facing = dot(n, unit(v3(-p.cam.x, -p.cam.y, -p.cam.z)));
    if (facing < 0.15) return;
    const at = jitter(s, p.at, 9000 + q);
    const size = mk.size * p.at.scale;
    prims.push({
      depth: p.at.depth - 0.02,
      draw: (ctx) => {
        ctx.save();
        ctx.globalAlpha = fade * (mk.kind === 'dot' ? 0.4 : 0.3) * Math.min(1, facing * 1.6);
        if (mk.kind === 'dot') {
          ctx.fillStyle = CHALK;
          ctx.beginPath();
          ctx.arc(at.x, at.y, Math.max(0.8, size), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = CHALK;
          ctx.lineWidth = Math.max(0.9, s.fine(p.at.scale) * 0.6);
          ctx.beginPath();
          ctx.arc(at.x, at.y, Math.max(1.5, size * 0.5), axis + Math.PI * 0.6, axis + Math.PI * 1.4);
          ctx.stroke();
        }
        ctx.restore();
      },
    });
  });
}

/** A line drawn on the skin (x, y on the left; mirrored), segment by segment, only where turned to us. */
function skinLinePrims(
  pose: FishPose, pts: readonly (readonly [number, number])[], s: Style, id0: number, prims: Prim[], style: (u: number, scale: number) => { colour: string; width: number; alpha: number; ridge?: boolean; glow?: number },
): void {
  for (const side of [1, -1] as const) {
    const placed = pts.map(([x, y]) => {
      const th = side * skinThetaAt(x, y);
      const jaw = onJaw(x, th);
      const p = placePoint(pose, skinAt(x, th), jaw);
      const n = unit(placeDir(pose, skinNormal(x, th), jaw));
      return { p, facing: dot(n, unit(v3(-p.cam.x, -p.cam.y, -p.cam.z))) };
    });
    // Runs of the line turned to us, each drawn in one go: a dark channel, then its pale ridge.
    let run: { x: number; y: number; depth: number; scale: number; u: number; facing: number }[] = [];
    const flush = (): void => {
      if (run.length < 2) {
        run = [];
        return;
      }
      const pts = run;
      const mid = pts[Math.floor(pts.length / 2)]!;
      const look = style(mid.u, mid.scale);
      const facing = pts.reduce((sum, p) => sum + p.facing, 0) / pts.length;
      prims.push({
        depth: pts.reduce((sum, p) => sum + p.depth, 0) / pts.length - 0.03,
        draw: (ctx) => {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const alpha = look.alpha * Math.min(1, facing * 2);
          if (look.ridge) {
            ctx.globalAlpha = alpha * 0.75;
            ctx.strokeStyle = '#0b0706';
            ctx.lineWidth = look.width * 2.4;
            strokeLine(ctx, pts.map((p) => ({ x: p.x, y: p.y + look.width * 0.6 })));
          }
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = look.colour;
          ctx.lineWidth = look.width;
          if (look.glow) {
            ctx.shadowColor = SENSE;
            ctx.shadowBlur = 22 * look.glow;
          }
          strokeLine(ctx, look.ridge ? pts.map((p) => ({ x: p.x, y: p.y - look.width * 0.5 })) : pts);
          ctx.restore();
        },
      });
      run = [];
    };
    placed.forEach((p, q) => {
      if (p.facing < 0.05) {
        flush();
        return;
      }
      const j = jitter(s, p.p.at, id0 + q + (side > 0 ? 0 : 500));
      run.push({ x: j.x, y: j.y, depth: p.p.at.depth, scale: p.p.at.scale, u: q / Math.max(1, placed.length - 1), facing: p.facing });
    });
    flush();
  }
}

function eyePrims(pose: FishPose, s: Style, prims: Prim[]): void {
  for (const side of [1, -1] as const) {
    const th = side * skinThetaAt(EYE.x, EYE.y);
    const p = placePoint(pose, skinAt(EYE.x, th), false);
    const n = unit(placeDir(pose, skinNormal(EYE.x, th), false));
    const facing = dot(n, unit(v3(-p.cam.x, -p.cam.y, -p.cam.z)));
    if (facing < 0.05) continue;
    // Foreshortened: squashed across the line of sight.
    const nx = placePoint(pose, v3(EYE.x + 1, EYE.y, 0), false).at;
    const o = placePoint(pose, v3(EYE.x, EYE.y, 0), false).at;
    const angle = Math.atan2(nx.y - o.y, nx.x - o.x);
    const r = EYE.r * p.at.scale;
    const at = jitter(s, p.at, 7700 + side);
    const look = s.look;
    prims.push({
      depth: p.at.depth - 0.04,
      draw: (ctx) => {
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.rotate(angle);
        ctx.scale(Math.max(0.25, facing), 1);
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
        ctx.fillStyle = '#17110f';
        ctx.fill();
        ctx.strokeStyle = s.lineColour;
        ctx.lineWidth = s.fine(p.at.scale) / Math.max(0.25, facing);
        ctx.globalAlpha = 0.55 + 0.45 * look.eye;
        ctx.stroke();
        // A dull silvery iris, a black pupil and a dim glint.
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = rgb(mix([60, 66, 74], [150, 160, 170], look.eye * 0.6));
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r * 0.1, 0, r * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = '#050405';
        ctx.fill();
        ctx.globalAlpha = 0.5 * look.eye;
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.3, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      },
    });
  }
}

// ---------------------------------------------------------------- the X-ray

/** An ellipsoid's outline on screen: centre, radii and angle (exact for a distant camera, close enough here). */
function ellipsoidOnScreen(pose: FishPose, c: V3, r: V3): { x: number; y: number; rx: number; ry: number; angle: number; depth: number } {
  const o = placePoint(pose, c, false).at;
  const axes = [v3(r.x, 0, 0), v3(0, r.y, 0), v3(0, 0, r.z)].map((a) => {
    const p = placePoint(pose, v3(c.x + a.x, c.y + a.y, c.z + a.z), false).at;
    return { x: p.x - o.x, y: p.y - o.y };
  });
  const sxx = axes.reduce((sum, a) => sum + a.x * a.x, 0);
  const syy = axes.reduce((sum, a) => sum + a.y * a.y, 0);
  const sxy = axes.reduce((sum, a) => sum + a.x * a.y, 0);
  const tr = (sxx + syy) / 2;
  const det = Math.sqrt(Math.max(0, ((sxx - syy) / 2) ** 2 + sxy * sxy));
  return { x: o.x, y: o.y, rx: Math.sqrt(tr + det), ry: Math.sqrt(Math.max(0, tr - det)), angle: 0.5 * Math.atan2(2 * sxy, sxx - syy), depth: o.depth };
}

function strokeLine(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[]): void {
  ctx.beginPath();
  pts.forEach((p, q) => (q === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawXray(ctx: CanvasRenderingContext2D, pose: FishPose, s: Style): void {
  const xr = s.look.xray;
  if (xr <= 0.01) return;
  const look = s.look;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The backbone.
  ctx.globalAlpha = 0.45 * xr;
  ctx.strokeStyle = BONE;
  const spine = SPINE.map((p) => placePoint(pose, p, false).at);
  ctx.lineWidth = Math.max(1.2, spine[0]!.scale * 0.03);
  strokeLine(ctx, spine);
  spine.forEach((p) => {
    const r = p.scale * 0.12;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r);
    ctx.lineTo(p.x, p.y + r);
    ctx.stroke();
  });
  ctx.restore();

  // Brain and the two sockets with their fangs, far to near.
  const items: Prim[] = [];
  const fangs = TEETH.filter((t) => t.fang);
  for (const side of [1, -1] as const) {
    const socket = socketLine(side).map((p) => placePoint(pose, p, false).at);
    const fang = fangs.find((t) => Math.sign(t.line[0]!.z) === side)!;
    const fangLine = placeTooth(pose, fang);
    items.push({
      depth: socket[Math.floor(socket.length / 2)]!.depth,
      draw: (c) => {
        const w = SOCKET_R * 2 * socket[0]!.scale;
        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        // The socket: a dark channel through the skull with a thin bony wall.
        c.globalAlpha = xr * 0.8;
        c.strokeStyle = BONE;
        c.lineWidth = w + 4;
        strokeLine(c, socket);
        c.globalAlpha = xr;
        c.strokeStyle = '#08141b';
        c.lineWidth = w;
        strokeLine(c, socket);
        if (look.socketGlow > 0) {
          c.globalAlpha = xr * look.socketGlow * 0.5;
          c.strokeStyle = SENSE;
          c.lineWidth = w + 10;
          c.globalCompositeOperation = 'lighter';
          strokeLine(c, socket);
          c.globalCompositeOperation = 'source-over';
        }
        // The fang, bright, sliding along it.
        c.globalAlpha = xr;
        c.shadowColor = SENSE;
        c.shadowBlur = 18 * look.fangGlow;
        toothPath(c, fangLine, fang.r);
        c.fillStyle = BONE;
        c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = '#3a2a1a';
        c.lineWidth = Math.max(1, fangLine[0]!.scale * 0.016);
        c.stroke();
        c.restore();
      },
    });
  }
  for (const lobe of BRAIN) {
    const e = ellipsoidOnScreen(pose, lobe.c, lobe.r);
    items.push({
      depth: e.depth,
      draw: (c) => {
        c.save();
        c.globalAlpha = xr;
        c.translate(e.x, e.y);
        c.rotate(e.angle);
        c.shadowColor = BRAIN_PINK;
        c.shadowBlur = 30 * look.brainGlow;
        c.beginPath();
        c.ellipse(0, 0, e.rx, Math.max(1, e.ry), 0, 0, Math.PI * 2);
        c.fillStyle = BRAIN_PINK;
        c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = '#7a3448';
        c.lineWidth = Math.max(1.2, e.rx * 0.06);
        c.stroke();
        // Folds.
        c.globalAlpha = xr * 0.6;
        c.beginPath();
        c.moveTo(-e.rx * 0.5, -e.ry * 0.1);
        c.quadraticCurveTo(0, e.ry * 0.4, e.rx * 0.5, -e.ry * 0.15);
        c.stroke();
        c.restore();
      },
    });
  }
  items.sort((a, b) => b.depth - a.depth).forEach((p) => p.draw(ctx));
}

/** Draws the fangtooth at `pose`. */
export function drawFangtooth(ctx: CanvasRenderingContext2D, pose: FishPose, look: FishLook): void {
  const xr = look.xray;
  const s: Style = {
    look,
    line: (scale) => clamp(scale * 0.05, 1.8, 6),
    fine: (scale) => clamp(scale * 0.028, 1, 3.5),
    amp: (scale) => clamp(scale * 0.012, 0.5, 2),
    skinAlpha: 1 - 0.82 * xr,
    lineColour: xr > 0 ? rgb(mix([220, 214, 230], [159, 232, 244], xr)) : CHALK,
  };
  const prims: Prim[] = [];
  const skull = placeMesh(pose, SKULL, 0);
  const jaw = placeMesh(pose, JAW, 5000);
  gulletPrim(pose, s, prims);
  meshPrims(SKULL, skull, s, prims, pose.jaw > 0.03);
  meshPrims(JAW, jaw, s, prims, pose.jaw > 0.03);
  capPrim(skull, s, prims);
  finPrim(pose, DORSAL, s, 20000, prims);
  finPrim(pose, ANAL, s, 20100, prims);
  TAIL.forEach((f, q) => finPrim(pose, f, s, 20200 + q * 100, prims));
  for (const side of [1, -1] as const) {
    finPrim(pose, pectoral(side, pose.flutter + (side > 0 ? 0 : 1.3)), s, 20500 + side * 50, prims);
    finPrim(pose, pelvic(side), s, 20700 + side * 50, prims);
  }
  for (const t of TEETH) toothPrim(pose, t, s, prims);
  markPrims(pose, s, prims);
  GROOVES.forEach((g, q) => skinLinePrims(pose, g, s, 30000 + q * 1000, prims, (_, scale) => ({ colour: s.lineColour, width: s.fine(scale), alpha: 0.8 * (1 - 0.5 * xr), ridge: xr < 0.5 })));
  skinLinePrims(pose, LATERAL, s, 40000, prims, (u, scale) => {
    const glow = look.sense(u);
    return { colour: glow > 0.05 ? SENSE : s.lineColour, width: s.fine(scale) * (1 + 2.4 * glow), alpha: 0.45 + 0.55 * glow, glow };
  });
  eyePrims(pose, s, prims);
  prims.sort((a, b) => b.depth - a.depth);
  ctx.save();
  for (const p of prims) p.draw(ctx);
  ctx.restore();
  drawXray(ctx, pose, s);
}
