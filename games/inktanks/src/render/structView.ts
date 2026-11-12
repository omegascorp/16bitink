import type Phaser from 'phaser';
import { KINDS } from '../content/ch1/kinds';
import type { StructRt } from '../logic/match/types';
import { footDepth } from './tankView';
import { artState, piecesFor, WORLD_URLS, worldKey, worldStructure } from './worldArt';

/**
 * Structures on screen, made near the camera and dropped far from it.
 * Placeholders until the world art lands: the art test's density A props
 * (×2) for trees, rocks and brick walls, flat boxes in the castle
 * projection (gx, gy − z) for the rest. Canopies and roofs sit above tanks
 * and fade when the player is under or behind them.
 */
const props = import.meta.glob<string>('../../dev/art-test/assets/props/*.png', { eager: true, query: '?url', import: 'default' });
const artJson = import.meta.glob<{ props: Record<string, { x: number; y: number; w: number; h: number }> }>('../../dev/art-test/assets/art.json', { eager: true, import: 'default' });
const PROP = Object.values(artJson)[0]?.props ?? {};
const A_TO_C = 2;
const OVER = 5000;
const NEAR = 700;

type Piece = { key: string; over: boolean };
function pieces(kind: string, state: number): Piece[] {
  if (kind === 'oak') return [{ key: 'oakTrunk', over: false }, { key: 'oakCanopy', over: true }];
  if (kind === 'pine') return [{ key: 'pineTrunk', over: false }, { key: 'pineCanopy', over: true }];
  if (kind.startsWith('rock')) return [{ key: kind, over: false }];
  if (kind === 'wallBrick') return [{ key: `wall-${state}`, over: false }];
  return [];
}

export function preloadStructures(scene: Phaser.Scene): void {
  for (const [key, url] of WORLD_URLS) if (key.startsWith('world:structures/')) scene.load.image(key, url);
  for (const [path, url] of Object.entries(props)) scene.load.image(`prop:${path.slice(path.lastIndexOf('/') + 1, -4)}`, url);
}

interface View {
  objs: Phaser.GameObjects.GameObject[];
  over: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[];
  state: number;
}

export class StructLayer {
  private readonly views = new Map<number, View>();
  /** World rects that fade a structure's roof when the player is in them. */
  private readonly fades = new Map<string, { x: number; y: number; w: number; h: number }>();

  constructor(private readonly scene: Phaser.Scene, private readonly structs: readonly StructRt[]) {}

  update(view: Phaser.Geom.Rectangle, player: { x: number; y: number } | null): void {
    const x0 = view.x - NEAR / 2;
    const x1 = view.right + NEAR / 2;
    const y0 = view.y - NEAR / 2;
    const y1 = view.bottom + NEAR / 2;
    this.structs.forEach((s, i) => {
      const near = s.def.x > x0 && s.def.x < x1 && s.def.y > y0 && s.def.y < y1;
      const v = this.views.get(i);
      if (!near) {
        if (v) this.drop(i, v);
        return;
      }
      if (!v || v.state !== s.state) {
        if (v) this.drop(i, v);
        this.views.set(i, this.make(s));
      }
      const made = this.views.get(i)!;
      if (player) for (const o of made.over) o.setAlpha(this.behind(s, player) ? 0.35 : 1);
    });
  }

  private behind(s: StructRt, p: { x: number; y: number }): boolean {
    const f = this.fades.get(s.def.id);
    if (f) return p.x > f.x - 20 && p.x < f.x + f.w + 20 && p.y > f.y - 20 && p.y < f.y + f.h + 30;
    const k = KINDS[s.def.kind];
    const h = (k?.height ?? 40) + 40;
    return Math.abs(p.x - s.def.x) < 90 && p.y < s.def.y + 30 && p.y > s.def.y - h - 40;
  }

  private drop(i: number, v: View): void {
    for (const o of v.objs) o.destroy();
    this.views.delete(i);
  }

  private make(s: StructRt): View {
    const art = this.fromWorldArt(s);
    if (art) return art;
    const k = KINDS[s.def.kind];
    const ps = pieces(s.def.kind, s.state).filter((p) => this.scene.textures.exists(`prop:${p.key}`) && PROP[p.key]);
    const v: View = { objs: [], over: [], state: s.state };
    const depth = footDepth(s.def.y + 10);
    if (ps.length > 0) {
      const sx = 1;
      for (const p of ps) {
        const at = PROP[p.key]!;
        const img = this.scene.add.image(s.def.x + at.x * A_TO_C * sx, s.def.y + at.y * A_TO_C, `prop:${p.key}`).setOrigin(0, 0).setScale(A_TO_C * sx, A_TO_C).setDepth(p.over ? OVER : depth);
        v.objs.push(img);
        if (p.over) v.over.push(img);
      }
      return v;
    }
    v.objs.push(this.box(s, k?.colour ?? 0x888070, k?.height ?? 30, depth, v));
    return v;
  }

  /** The world agent's art: the state's pieces at the shared anchor, each sorted by its sortY; shadow under; roofs fade. */
  private fromWorldArt(s: StructRt): View | null {
    const w = worldStructure(s.def.kind);
    if (!w) return null;
    const pieces = piecesFor(w.name, w.art, s.state).filter((p) => this.scene.textures.exists(p.key));
    if (pieces.length === 0) return null;
    const v: View = { objs: [], over: [], state: s.state };
    const [ax, ay] = w.art.anchor;
    const [sw, sh] = w.art.size;
    const put = (key: string, depth: number) => this.scene.add.image(s.def.x, s.def.y, key).setOrigin(ax / sw, ay / sh).setDepth(depth);
    const shadow = w.art.shadows[String(artState(w.art, s.state))];
    if (shadow && this.scene.textures.exists(worldKey(shadow))) v.objs.push(put(worldKey(shadow), 15));
    for (const p of pieces) {
      const depth = w.art.layer === 'ground' ? 1 : p.sortY >= 999 ? OVER : footDepth(s.def.y + p.sortY);
      const img = put(p.key, depth);
      v.objs.push(img);
      if (p.roof || p.sortY >= 999) v.over.push(img);
    }
    const r = w.art.roofFade[String(artState(w.art, s.state))];
    if (r) this.fades.set(s.def.id, { x: s.def.x - ax + r[0], y: s.def.y - ay + r[1], w: r[2], h: r[3] });
    return v;
  }

  /** A flat placeholder: footprint, a south facade and a top lifted by its height. */
  private box(s: StructRt, colour: number, height: number, depth: number, v: View): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics().setDepth(s.def.cover ? OVER - 1 : depth).setPosition(s.def.x, s.def.y);
    const shape = s.def.shape.kind === 'multi' ? s.def.shape.polys[0]! : s.def.shape;
    const z = s.state === 0 ? 4 : height * 0.5 * (s.state === 1 ? 0.75 : 1);
    const dark = Phaser_darken(colour, 0.65);
    if (shape.kind === 'circle') {
      g.fillStyle(0x000000, 0.22).fillCircle(z * 0.6, -z * 0.3, shape.r);
      g.fillStyle(dark, 1).fillCircle(0, 0, shape.r);
      g.fillStyle(colour, s.def.cover ? 0.85 : 1).fillCircle(0, -z, shape.r);
    } else {
      const pts = shape.pts.map(([x, y]) => ({ x, y }));
      const ys = pts.map((p) => p.y);
      const xs = pts.map((p) => p.x);
      const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      g.fillStyle(0x000000, 0.22).fillRect(minX + z * 0.6, minY - z * 0.4, maxX - minX, maxY - minY);
      g.fillStyle(dark, 1).fillRect(minX, maxY - z, maxX - minX, z);
      const top = this.scene.add.graphics().setDepth(s.def.roof ? OVER : depth + 0.001).setPosition(s.def.x, s.def.y);
      top.fillStyle(colour, s.def.cover ? 0.85 : 1).fillPoints(pts.map((p) => ({ x: p.x, y: p.y - z })) as unknown as Phaser.Math.Vector2[], true);
      if (s.state === 1) top.lineStyle(2, 0x2a2018, 0.7).lineBetween(minX + 8, minY - z + 4, (minX + maxX) / 2, maxY - z - 4);
      v.objs.push(top);
      if (s.def.roof) v.over.push(top);
    }
    return g;
  }

  destroy(): void {
    for (const [i, v] of this.views) this.drop(i, v);
  }
}

function Phaser_darken(c: number, k: number): number {
  const r = Math.round(((c >> 16) & 255) * k);
  const g = Math.round(((c >> 8) & 255) * k);
  const b = Math.round((c & 255) * k);
  return (r << 16) | (g << 8) | b;
}
