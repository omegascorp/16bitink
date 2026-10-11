import Phaser from 'phaser';
import type { FindId } from '../../logic/finds';

type Icon = (g: Phaser.GameObjects.Graphics, x: number, y: number) => void;
type P = Phaser.Math.Vector2;
const v = (x: number, y: number): P => new Phaser.Math.Vector2(x, y);

/** Points round an oval, its radius pushed out by `r(t)` at angle t. */
function loop(x: number, y: number, rx: number, ry: number, n: number, r: (t: number) => number = () => 1): P[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return v(x + Math.cos(t) * rx * r(t), y + Math.sin(t) * ry * r(t));
  });
}

/** A four-pointed sparkle, filled. */
function star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.fillPoints(Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 === 0 ? r : r * 0.3;
    return v(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }), true);
}

/** A cowrie: a fat oval with the toothed slit of its mouth along it. */
const cowrie: Icon = (g, x, y) => {
  g.strokeEllipse(x, y + 1, 13, 9);
  g.fillPoints([v(x - 4.5, y + 1), v(x, y + 0.2), v(x + 4.5, y + 1), v(x, y + 1.6)], true);
  for (const dx of [-3.2, -1.1, 1.1, 3.2]) {
    g.lineBetween(x + dx, y - 0.3, x + dx * 1.15, y - 2);
    g.lineBetween(x + dx, y + 2.1, x + dx * 1.15, y + 3.8);
  }
};

/** A desert rose: a scalloped rosette, a smaller ring of petals inside, a curl at its heart. */
const desertrose: Icon = (g, x, y) => {
  g.strokePoints(loop(x, y + 1, 6, 5, 48, (t) => 0.82 + 0.18 * Math.abs(Math.sin(t * 3.5))), true);
  g.strokePoints(loop(x, y + 0.4, 3.2, 2.6, 30, (t) => 0.8 + 0.2 * Math.abs(Math.sin(t * 2.5 + 0.6))), true);
  g.fillCircle(x, y + 0.2, 0.9);
};

/** An urchin test: a dome on its flat base, dotted in rows from the crown. */
const urchin: Icon = (g, x, y) => {
  g.beginPath();
  g.arc(x, y + 5, 6, Math.PI, 0);
  g.closePath();
  g.strokePath();
  for (const l of [-0.85, -0.3, 0.3, 0.85]) {
    for (const k of [0.38, 0.62, 0.86]) {
      const phi = (k * Math.PI) / 2;
      g.fillCircle(x + Math.sin(phi) * l * 5.6, y + 5 - Math.cos(phi) * 5.6, 0.55);
    }
  }
  g.fillCircle(x, y - 0.4, 0.6);
};

/** A sea bean: a fat kidney of a seed, a shine on it, its dark scar in the notch. */
const seabean: Icon = (g, x, y) => {
  const bean = (k: number): P[] => loop(x, y + 1.5, 6.4 * k, 4.8 * k, 40, (t) => 1 - 0.42 * Math.max(0, -Math.sin(t)) ** 2);
  g.strokePoints(bean(1), true);
  // A shine on its glossy flank, and the scar at the notch.
  g.strokePoints(bean(0.62).slice(16, 24), false);
  g.fillEllipse(x, y - 0.6, 2.6, 1.5);
};

/** Olivine: a cluster of three crystals, pointed, the tallest one shaded. */
const olivine: Icon = (g, x, y) => {
  const prism = (bx: number, w: number, h: number, lean: number): P[] => [
    v(x + bx - w / 2, y + 6), v(x + bx - w / 2 + lean * 0.7, y + 6 - h * 0.72), v(x + bx + lean, y + 6 - h),
    v(x + bx + w / 2 + lean * 0.7, y + 6 - h * 0.72), v(x + bx + w / 2, y + 6),
  ];
  g.strokePoints(prism(-3.6, 3.2, 7, -2.2), true);
  g.strokePoints(prism(3.6, 3.2, 6.5, 2.2), true);
  const tall = prism(0, 3.6, 11, 0);
  g.strokePoints(tall, true);
  g.fillPoints([tall[2]!, tall[3]!, tall[4]!, v(x, y + 6)], true);
};

/** An agate: a pebble ringed with bands, a solid core. */
const agate: Icon = (g, x, y) => {
  g.strokeEllipse(x, y + 1, 13, 10);
  g.strokeEllipse(x + 0.4, y + 1.3, 8.4, 6.2);
  g.strokeEllipse(x + 0.7, y + 1.5, 4.4, 3);
  g.fillEllipse(x + 0.8, y + 1.6, 1.6, 1.1);
};

/** A gold doubloon: a coin, a beaded inner ring and a cross with barred ends. */
const doubloon: Icon = (g, x, y) => {
  g.strokeCircle(x, y + 1, 5.8);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * 4.4, y + 1 + Math.sin(a) * 4.4, 0.4);
  }
  g.lineBetween(x, y - 1.8, x, y + 3.8);
  g.lineBetween(x - 2.8, y + 1, x + 2.8, y + 1);
  for (const [ax, ay, bx, by] of [[-1, -1.8, 1, -1.8], [-1, 3.8, 1, 3.8], [-2.8, 0, -2.8, 2], [2.8, 0, 2.8, 2]] as const) g.lineBetween(x + ax, y + ay, x + bx, y + by);
};

/** A pearl: a round bead with a glint, sat in the lip of its oyster. */
const pearl: Icon = (g, x, y) => {
  g.strokeCircle(x, y - 0.5, 4);
  g.beginPath();
  g.arc(x, y - 0.5, 2.3, Math.PI * 1.05, Math.PI * 1.45);
  g.strokePath();
  g.beginPath();
  g.arc(x, y + 2.4, 6.5, 0.1, Math.PI - 0.1);
  g.closePath();
  g.strokePath();
  star(g, x + 3.8, y - 4.4, 2);
};

/** Labradorite: a faceted stone with a flash running across it in streaks. */
const labradorite: Icon = (g, x, y) => {
  const stone: P[] = [v(x - 5.5, y + 6), v(x - 6.5, y + 1), v(x - 3.5, y - 4), v(x + 2, y - 5), v(x + 6.5, y - 1), v(x + 5.5, y + 6)];
  g.strokePoints(stone, true);
  g.lineBetween(x - 3.5, y - 4, x - 1, y + 1);
  g.lineBetween(x - 1, y + 1, x - 5.5, y + 6);
  g.lineBetween(x - 1, y + 1, x + 6.5, y - 1);
  g.fillPoints([v(x - 0.5, y + 4.8), v(x + 4.8, y + 0.6), v(x + 5.4, y + 1.8), v(x + 0.6, y + 5.4)], true);
  g.lineBetween(x - 3.6, y + 4.4, x + 3.4, y - 1.3);
};

/** An opal: a domed oval of stone, flecked with fire, a sparkle on it. */
const opal: Icon = (g, x, y) => {
  g.strokeEllipse(x, y + 1.5, 13, 9);
  for (const [dx, dy, a] of [[-3.5, 1, 0.5], [-0.5, 3.5, -0.4], [2.5, 1.5, 0.9], [-1.5, -1.2, -0.9], [3.6, 4, 0.2]] as const) {
    g.lineBetween(x + dx - Math.cos(a), y + dy - Math.sin(a), x + dx + Math.cos(a), y + dy + Math.sin(a));
  }
  star(g, x + 2.6, y - 1.6, 2.6);
};

/** Each beach's find as a little red pencil sketch for the map, in sketch units about 12 across, centred on x, y. */
export const FIND_ICONS: Readonly<Record<FindId, Icon>> = {
  cowrie, desertrose, urchin, seabean, olivine, agate, doubloon, pearl, labradorite, opal,
};
