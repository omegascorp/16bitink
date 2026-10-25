import type Phaser from 'phaser';
import type { ZoneDef } from '../../level/types';
import { isRasp } from '../../logic/abilities/eggeater';
import { createRng } from '../../logic/rng';
import type { World } from '../../logic/world';
import { inZoneShape } from '../../logic/zones';
import type { ChapterView } from './types';

/** Depths: ground nests and shells under the prey, blades over the snake. */
const DEPTH = { nests: 2.55, blades: 5.2 } as const;
/** The live blades in the painted stands' colours (savannaPlaceGrass.ts): rusty red oat grass and its lit straw. */
const BLADE = 0x86502c;
const BLADE_LIT = 0xe6cf8e;
const STRAW = 0x9c7a44;
const SHELL = 0xf1e6cc;
const SHELL_EDGE = 0x8d7b5c;
/** About one blade per this many square board px of tall grass, at most this many in all. */
const BLADE_AREA = 230;
const MAX_BLADES = 900;
/** A spat shell fades out over this long, s. */
const SHELL_LIFE = 7;
/** Blades bend away from the head when it's this close, px. */
const PART = 34;

interface Blade {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly lean: number;
  readonly phase: number;
}

/** Points scattered evenly through a zone, `n` of them (or fewer, if the zone is tiny). */
function scatter(z: ZoneDef, n: number, rng: () => number): Blade[] {
  const box = z.shape === 'circle' ? { x: z.x - z.r, y: z.y - z.r, w: z.r * 2, h: z.r * 2 }
    : z.shape === 'rect' ? { x: z.x, y: z.y, w: z.w, h: z.h }
    : (() => {
      const xs = z.points.map((p) => p.x);
      const ys = z.points.map((p) => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    })();
  const out: Blade[] = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const p = { x: box.x + rng() * box.w, y: box.y + rng() * box.h };
    if (!inZoneShape(p, z)) continue;
    out.push({ ...p, len: 9 + rng() * 9, lean: -0.5 + rng() * 0.5, phase: rng() * Math.PI * 2 });
  }
  return out;
}

function areaOf(z: ZoneDef): number {
  if (z.shape === 'circle') return Math.PI * z.r * z.r;
  if (z.shape === 'rect') return z.w * z.h;
  return 0;
}

/**
 * The Savanna's own layer, over its painted boards (savannaPlace.ts): the
 * tall grass's live blades lying over the snake and swaying, parting round its head;
 * a ring of straw under each guineafowl egg (its ground nest); and the
 * folded shells the egg-eater spits out, fading where they fell.
 */
class SavannaView implements ChapterView {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly blades: Phaser.GameObjects.Graphics;
  private readonly grass: readonly Blade[];

  constructor(scene: Phaser.Scene, world: World) {
    const zones = (world.level.zones ?? []).filter((z) => z.kind === 'grass');
    const rng = createRng(4411);
    const total = zones.reduce((s, z) => s + (areaOf(z) || 20000), 0);
    const per = Math.min(1 / BLADE_AREA, MAX_BLADES / Math.max(1, total));
    this.grass = zones.flatMap((z) => scatter(z, Math.round((areaOf(z) || 20000) * per), rng));
    this.ground = scene.add.graphics().setDepth(DEPTH.nests);
    this.blades = scene.add.graphics().setDepth(DEPTH.blades);
  }

  update(world: World, time: number): void {
    this.drawGround(world);
    this.drawBlades(world, time);
  }

  private drawGround(world: World): void {
    const g = this.ground;
    g.clear();
    for (const p of world.prey) {
      if (p.kind !== 'guinea-egg' || p.mode === 'caught') continue;
      g.lineStyle(3, STRAW, 0.55 * p.shown);
      g.strokeEllipse(p.x, p.y + 1, 44, 36);
      g.lineStyle(1.4, STRAW, 0.45 * p.shown);
      g.strokeEllipse(p.x, p.y + 1, 36, 29);
    }
    const a = world.ability;
    if (!isRasp(a)) return;
    for (const s of a.shells) {
      const age = world.elapsed - s.at;
      if (age > SHELL_LIFE) continue;
      const alpha = Math.min(1, (SHELL_LIFE - age) / 2);
      const r = s.big ? 7 : 4;
      // A shell folded flat: two cupped halves, one tucked into the other.
      g.fillStyle(SHELL, 0.95 * alpha);
      g.fillEllipse(s.x, s.y, r * 2.2, r * 1.3);
      g.fillEllipse(s.x + r * 0.7, s.y + r * 0.4, r * 1.6, r);
      g.lineStyle(1, SHELL_EDGE, 0.8 * alpha);
      g.strokeEllipse(s.x, s.y, r * 2.2, r * 1.3);
      g.strokeEllipse(s.x + r * 0.7, s.y + r * 0.4, r * 1.6, r);
    }
  }

  private drawBlades(world: World, time: number): void {
    const g = this.blades;
    g.clear();
    const h = world.snake.head;
    const t = time / 1000;
    // Two passes, rust then lit straw (every third blade), so the style is set twice a frame, not per blade.
    for (const lit of [false, true]) {
      g.lineStyle(lit ? 1.1 : 1.3, lit ? BLADE_LIT : BLADE, lit ? 0.75 : 0.62);
      this.grass.forEach((b, i) => {
        if ((i % 3 === 0) !== lit) return;
        let sway = Math.sin(t * 1.4 + b.phase + b.x * 0.02) * 2.4 + b.lean * 4;
        let lift = b.len;
        const dx = b.x - h.x;
        const dy = b.y - h.y;
        const d = Math.hypot(dx, dy);
        if (d < PART) {
          // Parted by the snake's head: bent away from it, flatter.
          const k = 1 - d / PART;
          sway += (dx / (d || 1)) * 9 * k;
          lift *= 1 - 0.5 * k;
        }
        g.lineBetween(b.x, b.y, b.x + sway, b.y - lift);
      });
    }
  }

  destroy(): void {
    this.ground.destroy();
    this.blades.destroy();
  }
}

/** Makes the Savanna's layer for a level. */
export function savannaView(scene: Phaser.Scene, world: World): ChapterView {
  return new SavannaView(scene, world);
}
