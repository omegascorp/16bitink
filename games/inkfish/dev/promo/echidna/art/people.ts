import { INK, type Pt } from '../../../../src/art/pen';
import { curve, mix, taper } from '../../seal/art/paint';

/**
 * The two researchers and their boat, painted the way the animals are: soft
 * gradient washes, a thin ink line, faces with eyes (a dark iris, a catchlight),
 * brows, a nose and a mouth, and gloves. Drawn live, in px, from the neck up
 * and down to the waist (the boat's side or the water hides the rest).
 */

export interface Person {
  /** The base of the neck. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  /** 1: looking right, -1: looking left. */
  readonly face: 1 | -1;
  readonly skin: string;
  readonly shirt: string;
  readonly hair: string;
  readonly hat?: 'straw' | 'cap';
  /** A dive mask pushed up on the forehead, and a snorkel. */
  readonly mask?: boolean;
  /** Head tilt, radians, positive: nose down. */
  readonly tilt: number;
  /** Where the gloved hand is (screen px). */
  readonly hand: Pt;
  /** A second hand, if any. */
  readonly hand2?: Pt;
  /** 0: a calm smile .. 1: a wide-eyed "oh". */
  readonly oh?: number;
  /** Gentle: the eyes shut and the mouth soft. */
  readonly kind?: boolean;
}

export const GLOVE = '#ff8a1f';
export const GLOVE_DARK = '#c4540c';

export function gloveAt(ctx: CanvasRenderingContext2D, at: Pt, aim: number, s: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(aim);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -22, 0, 26);
  g.addColorStop(0, '#ffb04a');
  g.addColorStop(0.55, GLOVE);
  g.addColorStop(1, GLOVE_DARK);
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  // The mitten: palm, four fingers, a thumb.
  ctx.beginPath();
  ctx.roundRect(-4, -20, 46, 40, 14);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(14 + i * 0, -12 + i * 10.5);
    ctx.lineTo(40, -12 + i * 10.5);
    ctx.strokeStyle = 'rgba(100,40,0,0.55)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(10, -22, 17, 10, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = GLOVE;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(18, -10, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // The cuff.
  ctx.fillStyle = '#26323c';
  ctx.beginPath();
  ctx.roundRect(-16, -22, 14, 44, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function arm(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, sleeve: string, w: number, bow: number, s: number): void {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + bow };
  const pts = curve(from, mid, to, 10);
  taper(ctx, pts, w, w * 0.78, sleeve, 1);
  const aim = Math.atan2(to.y - pts[pts.length - 3]!.y, to.x - pts[pts.length - 3]!.x);
  gloveAt(ctx, to, aim, s);
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, oh: number, shut: boolean): void {
  if (shut) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y + r * 0.8, x + r, y);
    ctx.stroke();
    return;
  }
  const rr = r * (1 + 0.25 * oh);
  ctx.fillStyle = '#fbf7ee';
  ctx.beginPath();
  ctx.ellipse(x, y, rr * 1.2, rr, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  const g = ctx.createRadialGradient(x + 1, y + 1, 1, x, y, rr * 0.72);
  g.addColorStop(0, '#5a8a9a');
  g.addColorStop(0.6, '#2f5666');
  g.addColorStop(1, '#101c24');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 0.5, rr * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#07090c';
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 0.5, rr * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(x + rr * 0.34, y - rr * 0.28, rr * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function head(ctx: CanvasRenderingContext2D, p: Person): void {
  const dark = mix(p.skin, '#3a2010', 0.35);
  const light = mix(p.skin, '#ffffff', 0.22);
  const oh = p.oh ?? 0;
  ctx.save();
  ctx.rotate(p.tilt);
  // The ear and neck, then the head.
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(-37, -74, 9, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  const g = ctx.createRadialGradient(10, -92, 6, 0, -78, 62);
  g.addColorStop(0, light);
  g.addColorStop(0.6, p.skin);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-40, -84);
  ctx.bezierCurveTo(-40, -126, 36, -130, 46, -92);
  ctx.bezierCurveTo(50, -76, 54, -66, 58, -58);
  ctx.bezierCurveTo(52, -54, 50, -50, 48, -42);
  ctx.bezierCurveTo(36, -22, -34, -26, -40, -58);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Hair at the back and over the ear.
  if (!p.hat || p.hat === 'cap') {
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.moveTo(-42, -66);
    ctx.bezierCurveTo(-48, -112, -10, -134, 30, -116);
    ctx.bezierCurveTo(8, -112, -12, -100, -24, -72);
    ctx.bezierCurveTo(-30, -62, -38, -58, -42, -66);
    ctx.fill();
    ctx.stroke();
  }
  // Brows, eyes, nose, mouth.
  const brow = (x0: number, x1: number, y: number, lift: number): void => {
    ctx.strokeStyle = mix(p.hair, '#000000', 0.2);
    ctx.lineWidth = 4.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y + lift);
    ctx.quadraticCurveTo((x0 + x1) / 2, y - 5 - lift, x1, y - lift * 0.4);
    ctx.stroke();
  };
  brow(-2, 22, -104 - 3 * oh, 2 * oh);
  brow(28, 52, -102 - 3 * oh, 2 * oh);
  eye(ctx, 10, -90, 8, oh, !!p.kind);
  eye(ctx, 40, -88, 7, oh, !!p.kind);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(40, -84);
  ctx.quadraticCurveTo(52, -68, 56, -62);
  ctx.quadraticCurveTo(52, -58, 44, -60);
  ctx.stroke();
  ctx.fillStyle = 'rgba(220,110,100,0.28)';
  ctx.beginPath();
  ctx.ellipse(8, -60, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (oh > 0.5) {
    ctx.fillStyle = '#4a1418';
    ctx.ellipse(34, -44, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (p.kind) {
    ctx.moveTo(18, -42);
    ctx.quadraticCurveTo(32, -44, 44, -41);
    ctx.stroke();
  } else {
    ctx.moveTo(16, -48);
    ctx.quadraticCurveTo(32, -34, 48, -46);
    ctx.stroke();
    ctx.fillStyle = '#fbf7ee';
    ctx.beginPath();
    ctx.moveTo(22, -43);
    ctx.quadraticCurveTo(32, -37, 42, -43);
    ctx.quadraticCurveTo(32, -41, 22, -43);
    ctx.fill();
  }
  // The hat, or a mask pushed up on the forehead.
  if (p.hat === 'straw') {
    const hg = ctx.createLinearGradient(0, -150, 0, -100);
    hg.addColorStop(0, '#f3dd9c');
    hg.addColorStop(1, '#c9a85c');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(6, -112, 82, 17, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-36, -114);
    ctx.bezierCurveTo(-34, -160, 40, -160, 44, -114);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a5a78';
    ctx.fillRect(-35, -124, 78, 9);
  } else if (p.hat === 'cap') {
    ctx.fillStyle = '#1f4f7a';
    ctx.beginPath();
    ctx.moveTo(-40, -108);
    ctx.bezierCurveTo(-40, -150, 40, -152, 48, -108);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(52, -108, 26, 7, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (p.mask) {
    ctx.fillStyle = '#16202a';
    ctx.beginPath();
    ctx.roundRect(-12, -128, 84, 30, 12);
    ctx.fill();
    ctx.stroke();
    const lens = ctx.createLinearGradient(0, -124, 0, -102);
    lens.addColorStop(0, 'rgba(160,230,240,0.85)');
    lens.addColorStop(1, 'rgba(60,150,170,0.7)');
    ctx.fillStyle = lens;
    ctx.beginPath();
    ctx.roundRect(-4, -123, 68, 20, 9);
    ctx.fill();
    ctx.strokeStyle = '#ff8a1f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-38, -112);
    ctx.lineTo(-12, -112);
    ctx.stroke();
    ctx.strokeStyle = '#26323c';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-30, -96);
    ctx.lineTo(-52, -150);
    ctx.stroke();
  }
  ctx.restore();
}

/** One researcher, from the neck up and down to the waist, flipped to face `p.face`; the hands (with gloves) reach the points given. */
export function drawPerson(ctx: CanvasRenderingContext2D, p: Person): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face * p.scale, p.scale);
  const to = (pt: Pt): Pt => ({ x: ((pt.x - p.x) / p.scale) * p.face, y: (pt.y - p.y) / p.scale });
  // The torso, a sleeved shirt shaded round.
  const dark = mix(p.shirt, '#000000', 0.35);
  const g = ctx.createLinearGradient(-70, 0, 70, 0);
  g.addColorStop(0, dark);
  g.addColorStop(0.45, p.shirt);
  g.addColorStop(1, mix(p.shirt, '#ffffff', 0.2));
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-34, -6);
  ctx.bezierCurveTo(-84, 6, -92, 70, -86, 260);
  ctx.lineTo(80, 260);
  ctx.bezierCurveTo(88, 70, 76, 6, 34, -6);
  ctx.quadraticCurveTo(0, 14, -34, -6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = mix(p.skin, '#3a2010', 0.25);
  ctx.beginPath();
  ctx.moveTo(-22, -34);
  ctx.lineTo(22, -34);
  ctx.lineTo(26, 0);
  ctx.quadraticCurveTo(0, 16, -26, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The far arm behind, the head, the near arm in front.
  if (p.hand2) arm(ctx, { x: -36, y: 26 }, to(p.hand2), dark, 40, 14, 1);
  head(ctx, p);
  arm(ctx, { x: 42, y: 26 }, to(p.hand), p.shirt, 44, 18, 1);
  ctx.restore();
}

/** A research boat's side seen from the water: a white hull with a blue stripe and a fender, a low console and windscreen, an outboard motor at the stern (left). */
export function drawResearchBoat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number): void {
  const k = w / 600;
  ctx.save();
  ctx.translate(x, y + 5 * Math.sin(t * 1.5));
  ctx.rotate(0.008 * Math.sin(t * 1.1));
  ctx.scale(k, k);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  // The outboard.
  const og = ctx.createLinearGradient(-330, 0, -270, 0);
  og.addColorStop(0, '#2a3138');
  og.addColorStop(1, '#58636d');
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.roundRect(-322, -40, 56, 112, 10);
  ctx.fill();
  ctx.stroke();
  // The hull: white, shaded to the waterline, a blue stripe.
  const hull = (): void => {
    ctx.beginPath();
    ctx.moveTo(-290, -50);
    ctx.lineTo(310, -64);
    ctx.quadraticCurveTo(340, -60, 330, -40);
    ctx.lineTo(262, 52);
    ctx.lineTo(-250, 52);
    ctx.quadraticCurveTo(-288, 30, -290, -50);
    ctx.closePath();
  };
  const hg = ctx.createLinearGradient(0, -64, 0, 52);
  hg.addColorStop(0, '#fbfdfd');
  hg.addColorStop(0.6, '#dfe8ec');
  hg.addColorStop(1, '#8fa6b0');
  hull();
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  hull();
  ctx.clip();
  ctx.fillStyle = '#1f6fb2';
  ctx.fillRect(-330, -24, 700, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(-330, -62, 700, 6);
  ctx.restore();
  hull();
  ctx.stroke();
  // A rope fender hanging over the side.
  ctx.fillStyle = '#e8d9a8';
  ctx.beginPath();
  ctx.roundRect(110, -40, 30, 62, 14);
  ctx.fill();
  ctx.stroke();
  // The console and windscreen, forward (right).
  ctx.fillStyle = '#e8eef0';
  ctx.beginPath();
  ctx.roundRect(190, -128, 90, 66, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(150,215,230,0.7)';
  ctx.beginPath();
  ctx.moveTo(196, -122);
  ctx.lineTo(272, -122);
  ctx.lineTo(262, -78);
  ctx.lineTo(196, -76);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
