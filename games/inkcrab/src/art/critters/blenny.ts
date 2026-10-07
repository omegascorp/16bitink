import { bezier, closed, cub, type Draw, edge, mottle, oval, pt, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { fin } from './fin';

/**
 * A shanny (Lipophrys pholis), the rock-pool blenny, side-on and facing
 * right, swimming: a blunt, steep-browed head with big eyes set high, thick
 * lips, one long dorsal fin from nape to tail with a dip halfway, a long
 * anal fin, a fan of pectoral and little finger-like pelvic fins under the
 * throat. Mottled olive-brown, paler below. The fins ripple by frame.
 */
const BODY = '#86784a';
const DARK = '#4a4026';
const BELLY = '#d8cc98';
const FIN = '#9c8a56';
const IRIS = '#c98a3e';

export function blenny(d: Draw): void {
  const { pen } = d;
  const cy = d.g - 14;
  const ph = -d.f * (TAU / 3);
  const wave = (x: number, amp: number): number => Math.sin(x * 0.22 + ph) * amp;
  const sway = [0, 1.4, -1.2][d.f]!;
  // The tail: a rounded fan, swinging a little.
  const tailEdge = bezier(pt(-37, cy - 7.5 + sway), pt(-50, cy + sway * 1.2), pt(-37, cy + 7.5 + sway), 10);
  const tailBase = tailEdge.map((_, i) => pt(-31.5, cy - 3.6 + (7.2 * i) / (tailEdge.length - 1)));
  fin(d, tailBase, tailEdge, { wash: FIN, rays: 8 });
  // The far pectoral, just showing.
  fin(d, [pt(20, cy - 1), pt(19, cy + 5)], [pt(13, cy - 4 + wave(0, 0.8)), pt(11, cy + 7)], { wash: FIN, rays: 0, far: true });
  // The long dorsal: low over the nape, a dip in the middle, higher soft rays behind.
  const dorsalBase: Pt[] = [];
  const dorsalEdge: Pt[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const x = 22 - t * 52;
    const by = cy - 10 + t * t * 5.6 + (t < 0.15 ? (0.15 - t) * 8 : 0);
    const h = (t < 0.45 ? 5 + t * 3 : t < 0.55 ? 6.4 - Math.sin(((t - 0.45) / 0.1) * Math.PI) * 1.4 : 7.6 - (t - 0.55) * 4) * (t > 0.95 ? (1 - t) * 20 : 1);
    dorsalBase.push(pt(x, by + 1.2));
    dorsalEdge.push(pt(x - 1, by - h + wave(x, 0.9)));
  }
  fin(d, dorsalBase, dorsalEdge, { wash: FIN, rays: 24 });
  // The anal fin, along the belly behind the vent.
  const analBase: Pt[] = [];
  const analEdge: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = 4 - t * 34;
    const by = cy + 8 - t * t * 4.6;
    const h = 5 * Math.min(1, t * 8) * (t > 0.9 ? (1 - t) * 10 : 1);
    analBase.push(pt(x, by - 1));
    analEdge.push(pt(x - 1.4, by + h - wave(x + 3, 0.7)));
  }
  fin(d, analBase, analEdge, { wash: FIN, rays: 14 });
  // The body: a steep, blunt forehead, a long body tapering to the tail.
  const body = [
    ...cub(pt(36.5, cy + 2.4), pt(38, cy - 3.5), pt(35, cy - 10), pt(27, cy - 10.6), 10),
    ...cub(pt(27, cy - 10.6), pt(14, cy - 11.2), pt(-12, cy - 9), pt(-32, cy - 3.6), 16).slice(1),
    pt(-32.5, cy + 3.6),
    ...cub(pt(-32, cy + 3.6), pt(-16, cy + 8.6), pt(6, cy + 9.6), pt(22, cy + 8.8), 14).slice(1),
    ...cub(pt(22, cy + 8.8), pt(30, cy + 8.2), pt(35, cy + 6), pt(36.5, cy + 2.4), 8).slice(1),
  ];
  skin(d, body, BODY, 0.8);
  // A second, lighter wash so the off-register rim reads as a sheen along the back, not a gap.
  tint(d, body, BODY, 0.3);
  pen.clipped(body, () => {
    tint(d, [...cub(pt(40, cy + 3), pt(14, cy + 5), pt(-10, cy + 4), pt(-34, cy + 1.5), 12), pt(-34, cy + 12), pt(40, cy + 12)], BELLY, 0.75);
    // Dark blotches in a broken row along the back and another along the flank.
    for (let i = 0; i < 8; i++) {
      const x = 18 - i * 6.4 + pen.jitter(1);
      tint(d, oval(x, cy - 5.5 + i * 0.5, 2.6, 2, 10), DARK, 0.5);
      tint(d, oval(x - 2.5, cy + 1 + i * 0.2, 2, 1.5, 10), DARK, 0.35);
    }
    // The lateral line arching over the pectoral, then straight back.
    pen.hair(cub(pt(20, cy - 6), pt(10, cy - 6), pt(0, cy - 3), pt(-28, cy - 1), 12), 0.45, d.ink, 0.4);
  });
  mottle(d, body, 120, cy - 10, cy + 6, DARK, 0.5);
  shade(d, body, 0.38);
  edge(d, body, 1.2);
  // Gill cover, lips and the pores along the head.
  pen.hair(cub(pt(21, cy - 7), pt(17, cy - 2), pt(17, cy + 3), pt(21, cy + 8), 8), 0.7, d.ink, 0.75);
  pen.hair(bezier(pt(37, cy + 2.3), pt(34, cy + 4.2), pt(29.5, cy + 3.6), 6), 0.9, d.ink, 0.95);
  pen.hair(bezier(pt(35.5, cy + 0.6), pt(33, cy + 1.6), pt(31, cy + 1.8), 4), 0.5, d.ink, 0.6);
  for (const [x, y] of [[33.5, cy - 7], [31, cy - 9], [24, cy - 4]] as const) pen.dot(x, y, 0.4, d.ink, 0.6);
  // The eye: big, high on the head, a coppery iris round a dark pupil.
  const eye = oval(29.6, cy - 4.6, 3.3, 3.1, 14);
  pen.fill(eye, PAPER_FILL, 1);
  pen.fill(eye, IRIS, 0.75);
  pen.dot(30.2, cy - 4.4, 2, d.ink, 0.95);
  pen.dot(30.8, cy - 5.3, 0.65, PAPER_FILL, 0.95);
  pen.stroke(closed(eye), 0.8, d.ink, 0.95, false);
  pen.hair(bezier(pt(26.5, cy - 7.2), pt(29.5, cy - 9.2), pt(32.6, cy - 7), 5), 0.6, d.ink, 0.7);
  // The near pectoral: a broad fan behind the gill, rays spread and rippling.
  const pBase = [pt(19.5, cy - 2), pt(19, cy + 1.5), pt(18.6, cy + 5)];
  const pEdge = [
    ...bezier(pt(11, cy - 6 + wave(1, 0.8)), pt(5, cy + 0.5 + wave(4, 1)), pt(10, cy + 8 + wave(7, 0.6)), 6),
  ];
  const pB = Array.from({ length: pEdge.length }, (_, i) => {
    const k = (i / (pEdge.length - 1)) * 2;
    const j = Math.min(1, Math.floor(k));
    const a = pBase[j]!;
    const b = pBase[j + 1]!;
    return pt(a.x + (b.x - a.x) * (k - j), a.y + (b.y - a.y) * (k - j));
  });
  fin(d, pB, pEdge, { wash: FIN, alpha: 0.6, rays: 9 });
  // Pelvic fins: two stiff finger rays under the throat, for propping on rock.
  for (const [dx, lean] of [[0, 0], [1.6, 0.8]] as const) {
    const root = pt(25 + dx, cy + 7.8);
    const knee = pt(root.x - 1 + lean + wave(dx, 0.5), cy + 11.5);
    pen.stroke([root, knee, pt(knee.x - 1.4, cy + 13.4)], 0.9, d.ink, 0.9, false);
  }
}
