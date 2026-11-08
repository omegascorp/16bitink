/**
 * The animals' poses and the geometry that ties them together (no drawing,
 * so the story and its tests can use it): the pelican in its own units
 * (facing right, y down, feet at 0,0), its head's frame (x along the bill),
 * its lower jaw's frame (x along the jaw from the hinge), and the capybaras.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export const BILL_ROOT = 28;
export const BILL_LEN = 250;
export const BILL_TIP = BILL_ROOT + BILL_LEN;
/** Where the lower jaw hinges, in the head's frame. */
export const HINGE: Pt = { x: 30, y: 8 };
/** World units per pelican unit, everywhere in the short. */
export const PELICAN_K = 1.4;

export interface PelicanHead {
  /** The head's middle, own units. */
  readonly x: number;
  readonly y: number;
  /** The bill's angle below the horizontal, radians. */
  readonly a: number;
  /** The lower jaw's angle below the upper, radians. */
  readonly gape: number;
  /** How deep the pouch hangs below the lower jaw, own units. */
  readonly sack: number;
  /** Where along the jaw the pouch is deepest, 0 .. 1. */
  readonly bulge: number;
  /** 0 opaque pouch .. 1 the stretched skin shows what is inside. */
  readonly seeThrough: number;
  /** Wide eye, 0 .. 1. */
  readonly alarm: number;
  /** Sly half-shut eye, 0 .. 1. */
  readonly squint: number;
}

export interface PelicanPose {
  /** Feet on the ground, world. */
  readonly x: number;
  readonly y: number;
  /** World units per own unit. */
  readonly k: number;
  readonly face: 1 | -1;
  readonly head: PelicanHead;
  /** Body pitch, radians (plus: breast down). */
  readonly lean: number;
  /** Walking: the stride's phase (radians) and how much of a stride, 0 .. 1. */
  readonly step: number;
  readonly walk: number;
}

export interface CapybaraPose {
  /** Lying on the ground here, world. */
  readonly x: number;
  readonly y: number;
  /** World units per own unit. */
  readonly k: number;
  /** Which way it faces: 1 right, -1 left. */
  readonly face: 1 | -1;
  /** Eyelids: 0 open .. 1 shut; the deadpan is about 0.55. */
  readonly lid: number;
  /** 0 a pup .. 1 the mother. */
  readonly tone: number;
}

/** The pouch's length along the lower jaw, own units. */
export const POUCH_LEN = BILL_LEN - 10;

/** How deep the pouch hangs below the jaw at `x` along it (jaw frame): a hammock when slack, a round bag when full. */
export function pouchDepth(h: Pick<PelicanHead, 'sack' | 'bulge'>, x: number): number {
  const u = Math.max(0, Math.min(1, x / POUCH_LEN));
  const b = Math.log(0.5) / Math.log(Math.min(0.9, Math.max(0.1, h.bulge)));
  const full = Math.max(0, Math.min(1, (h.sack - 40) / 100));
  return h.sack * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, b))), 0.75 - 0.4 * full);
}

/** The capybara's head middle, own units (lying on the ground at 0,0, facing right). */
export const CAPY_HEAD: Pt = { x: 98, y: -68 };

export const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });

/** A point in the head's frame, in the pelican's own units. */
export function headToOwn(h: Pick<PelicanHead, 'x' | 'y' | 'a'>, p: Pt): Pt {
  return add({ x: h.x, y: h.y }, rot(p, h.a));
}

/** A point in the lower jaw's frame, in the head's frame. */
export function jawToHead(h: Pick<PelicanHead, 'gape'>, p: Pt): Pt {
  return add(HINGE, rot(p, h.gape));
}

/** Own units to world. */
export function ownToWorld(p: Pick<PelicanPose, 'x' | 'y' | 'k' | 'face'>, q: Pt): Pt {
  return { x: p.x + p.face * p.k * q.x, y: p.y + p.k * q.y };
}

/** World to own units. */
export function worldToOwn(p: Pick<PelicanPose, 'x' | 'y' | 'k' | 'face'>, q: Pt): Pt {
  return { x: (q.x - p.x) / (p.face * p.k), y: (q.y - p.y) / p.k };
}

/** The head's middle (own units) that puts the head-frame point `inBill` on `target` (own units), the bill at angle `a`. */
export function headFor(target: Pt, inBill: Pt, a: number): Pt {
  const r = rot(inBill, a);
  return { x: target.x - r.x, y: target.y - r.y };
}

/** The middle of a capybara's head, world. */
export function capyHeadAt(c: Pick<CapybaraPose, 'x' | 'y' | 'k' | 'face'>): Pt {
  return { x: c.x + c.face * c.k * CAPY_HEAD.x, y: c.y + c.k * CAPY_HEAD.y };
}

/** The top of the pelican's head, world: where the "!" goes. */
export function crownAt(p: PelicanPose): Pt {
  return ownToWorld(p, headToOwn(p.head, { x: -4, y: -34 }));
}
