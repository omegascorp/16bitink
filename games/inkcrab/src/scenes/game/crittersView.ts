import Phaser from 'phaser';
import { GULL_FLIGHT_SPAN } from '../../art/birds/gullFlight';
import { CRITTER_FRAME, CRITTER_GROUND, CRITTER_RES, CRITTER_SPAN } from '../../art/critterArt';
import { HERON_BILL_HEX, HERON_CAP_HEX, HERON_IRIS_HEX, HERON_JAW_HEX, HERON_NECK, HERON_NECK_HEX, HERON_NECK_WIDTH, HERON_THROAT_HEX } from '../../art/critters/heron';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { armTip, breached, type Critter } from '../../logic/critters';
import { movementOf } from '../../logic/species';
import type { Terrain } from '../../logic/terrain';
import { BLUE_HEX, RED_HEX } from '../../art/palette';

interface CritterSprites {
  readonly mark: Phaser.GameObjects.Image;
  readonly art: Phaser.GameObjects.Image;
}

/** The octopus's arm: its mottled red-brown, and its pale suckers. */
const ARM_HEX = 0xb5654a;
const SUCKER_HEX = 0xf1d9c6;
/** Wingbeats per second for a gull in flight, its spread wings this many times its body width, and where in its frame they centre (the wings reach further back than forward). */
const FLAP_FPS = 8;
/** A walker's drawing stands on its ground line. */
const GROUND_ORIGIN = (CRITTER_FRAME / 2 + CRITTER_GROUND) / CRITTER_FRAME;
const FLIGHT_WIDTH = 1.3;
const GULL_MIDDLE = 0.5 + ((-39.7 + 28.7) / 2) / CRITTER_FRAME;
/** Radians a tree crab tips as it climbs straight up or down a root. */
const CLIMB_TILT = 0.6;
/** A heron's head and bill, in frame units: how far its head draws back above the neck as it takes aim, the head's size, the bill's length. */
const HERON_HEAD = { cocked: 16, back: 5, r: 7, bill: 30 } as const;
/** Leg-pose frames per second at a walk. */
const WALK_FPS = 9;
const BOIL_MS = 260;

/**
 * The beach's creatures. Ones that can eat the player are inked red; ones it can eat
 * get a highlighter swipe, like food. It changes as the player grows. A
 * sandfish inside the sand shows only as ripples in the hatching (red when
 * it hunts you), and in full where it breaks into a tunnel.
 */
export class CrittersView {
  private readonly sprites = new Map<number, CritterSprites>();
  private readonly ripples: Phaser.GameObjects.Graphics;
  private readonly arms: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number) {
    this.ripples = scene.add.graphics().setDepth(3.5);
    this.arms = scene.add.graphics().setDepth(4.5);
  }

  sync(critters: ReadonlyMap<number, Critter>, playerSize: number, time: number): void {
    const g = this.ripples.clear();
    this.arms.clear();
    for (const [id, s] of this.sprites) {
      if (critters.has(id)) continue;
      s.mark.destroy();
      s.art.destroy();
      this.sprites.delete(id);
    }
    for (const c of critters.values()) {
      const s = this.sprites.get(c.id) ?? this.create(c);
      const move = movementOf(c.species);
      // A tree crab up in the roots (letting go, it falls with vx and vy from the walker).
      const climbing = move === 'climb' && !c.onGround && (c.letGo ?? 0) === 0;
      const walking = Math.hypot(c.vx, climbing ? c.vy : 0) > 1 && (c.onGround || move === 'swim' || climbing);
      const f = Math.floor(time / (walking ? 1000 / WALK_FPS : BOIL_MS) + c.id) % BOIL;
      const cx = c.x + c.w / 2;
      const bottom = c.y + c.h;
      if (c.flight) {
        // A gull in the air: wings beating, centred on its box; harmless, so never red.
        const wing = Math.floor(time / (1000 / FLAP_FPS) + c.id) % BOIL;
        const kf = (c.w * FLIGHT_WIDTH) / GULL_FLIGHT_SPAN / CRITTER_RES;
        s.art.setTexture(TEX.bird(c.species, false, false, wing)).setOrigin(GULL_MIDDLE, 0.5).setScale(kf * c.dir, kf).setPosition(cx, c.y + c.h / 2).setVisible(true);
        s.mark.setVisible(false);
        continue;
      }
      const k = c.w / CRITTER_SPAN[c.species] / CRITTER_RES;
      const danger = c.size > playerSize;
      const striking = move === 'wade' && c.strike !== undefined;
      s.art.setTexture(striking ? TEX.heronStrike(danger, f) : TEX.critter(c.species, danger, f)).setOrigin(0.5, GROUND_ORIGIN).setScale(k * c.dir, k).setPosition(cx, bottom);
      // A tree crab in the roots tips nose up (or down) climbing.
      const tilt = climbing ? Math.max(-1, Math.min(1, -c.vy / (Math.hypot(c.vx, c.vy) || 1))) * CLIMB_TILT * c.dir : 0;
      s.art.setRotation(-tilt);
      if (striking) this.heronNeck(c, danger);
      s.mark.setVisible(c.size < playerSize).setPosition(cx, c.y + c.h * 0.4).setDisplaySize(c.w * 1.6, c.h * 1.5);
      const hidden = movementOf(c.species) === 'burrow' && !breached(this.terrain, c, this.tile);
      s.art.setVisible(!hidden);
      if (hidden) this.ripple(g, c, c.size > playerSize, time);
      if (move === 'den' && c.arm > 0.02) this.arm(c, c.size > playerSize, time);
    }
  }

  /**
   * An octopus's arm reaching out of its den: a tapering, wriggling curve
   * with a row of pale suckers, inked red when it can catch you.
   */
  private arm(c: Critter, danger: boolean, time: number): void {
    const g = this.arms;
    const from = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
    const tip = armTip(c, this.tile);
    const dx = tip.x - from.x;
    const dy = tip.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const ink = danger ? RED_HEX : BLUE_HEX;
    const thick = c.w * 0.28;
    const steps = 14;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      // An S-curl that travels down the arm as it feels about.
      const curl = Math.sin(u * Math.PI * 1.5 + time / 160 + c.id) * len * 0.12 * u;
      pts.push({ x: from.x + dx * u + nx * curl, y: from.y + dy * u + ny * curl });
    }
    for (let i = 0; i < steps; i++) {
      const u = i / steps;
      const w = thick * (1 - u * 0.85);
      const [a, b] = [pts[i]!, pts[i + 1]!];
      g.lineStyle(w + 1.6, ink, 0.95).lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(w, ARM_HEX, 1).lineBetween(a.x, a.y, b.x, b.y);
    }
    // Suckers along the underside.
    g.fillStyle(SUCKER_HEX, 0.95);
    for (let i = 2; i < steps; i += 2) {
      const u = i / steps;
      const p = pts[i]!;
      const r = Math.max(0.7, thick * 0.22 * (1 - u * 0.7));
      g.fillCircle(p.x - nx * thick * 0.25 * (1 - u), p.y - ny * thick * 0.25 * (1 - u) + r * 0.5, r);
    }
  }

  /**
   * A striking heron's neck, head and bill (its body is the headless
   * drawing). Taking aim it draws its head back and up, bill on the crab;
   * stabbing, the neck shoots out and the bill tip goes where the logic says.
   */
  private heronNeck(c: Critter, danger: boolean): void {
    const g = this.arms;
    const u = c.w / CRITTER_SPAN.heron;
    const base = { x: c.x + c.w / 2 + c.dir * HERON_NECK.x * u, y: c.y + c.h + (HERON_NECK.y - CRITTER_GROUND) * u };
    const bill = HERON_HEAD.bill * u;
    const aim = { x: c.aimX, y: c.aimY };
    const tip = armTip(c, this.tile);
    const stretched = Math.hypot(tip.x - base.x, tip.y - base.y) > HERON_HEAD.cocked * u + bill;
    const head = stretched
      ? { x: tip.x - aim.x * bill, y: tip.y - aim.y * bill }
      : { x: base.x - c.dir * HERON_HEAD.back * u, y: base.y - HERON_HEAD.cocked * u };
    const end = stretched ? tip : { x: head.x + aim.x * bill, y: head.y + aim.y * bill };
    const ink = danger ? RED_HEX : BLUE_HEX;
    const neck = HERON_NECK_WIDTH * u;
    // Neck: an inked edge, then the grey wash with the pale throat stripe down its front.
    g.lineStyle(neck + 2.2 * u, ink, 0.95).lineBetween(base.x, base.y, head.x, head.y);
    g.lineStyle(neck, HERON_NECK_HEX, 1).lineBetween(base.x, base.y, head.x, head.y);
    g.lineStyle(neck * 0.3, HERON_THROAT_HEX, 1).lineBetween(base.x + c.dir * neck * 0.25, base.y, head.x + aim.x * neck * 0.2, head.y + neck * 0.15);
    // The dagger bill: dark above, yellow below, to a point.
    const nx = -aim.y;
    const ny = aim.x;
    const root = HERON_HEAD.r * 0.55 * u;
    const up = ny < 0 ? 1 : -1;
    const jaw = [head.x - nx * root * up, head.y - ny * root * up, end.x, end.y, head.x, head.y];
    const top = [head.x + nx * root * up, head.y + ny * root * up, end.x, end.y, head.x, head.y];
    g.fillStyle(HERON_JAW_HEX, 1).fillTriangle(jaw[0]!, jaw[1]!, jaw[2]!, jaw[3]!, jaw[4]!, jaw[5]!);
    g.fillStyle(HERON_BILL_HEX, 1).fillTriangle(top[0]!, top[1]!, top[2]!, top[3]!, top[4]!, top[5]!);
    g.lineStyle(1.1 * u + 0.4, ink, 0.95).strokeTriangle(head.x - nx * root, head.y - ny * root, end.x, end.y, head.x + nx * root, head.y + ny * root);
    // Head: the black cap, and the yellow eye looking down the bill.
    const r = HERON_HEAD.r * u;
    g.fillStyle(HERON_NECK_HEX, 1).fillCircle(head.x, head.y, r);
    g.fillStyle(HERON_CAP_HEX, 1).fillEllipse(head.x - aim.x * r * 0.2, head.y - r * 0.45, r * 2.1, r * 1.1);
    g.lineStyle(1.1 * u + 0.4, ink, 0.95).strokeCircle(head.x, head.y, r);
    g.fillStyle(HERON_IRIS_HEX, 1).fillCircle(head.x + aim.x * r * 0.35, head.y + aim.y * r * 0.35 - r * 0.1, r * 0.3);
    g.fillStyle(ink, 1).fillCircle(head.x + aim.x * r * 0.4, head.y + aim.y * r * 0.4 - r * 0.1, r * 0.13);
  }

  /** Bow waves in the sand ahead of a swimming sandfish, and a wake behind it. */
  private ripple(g: Phaser.GameObjects.Graphics, c: Critter, danger: boolean, time: number): void {
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const color = danger ? RED_HEX : BLUE_HEX;
    const h = c.h * 0.9 + 3;
    for (let i = 0; i < 3; i++) {
      // Each arc drifts back from the head and fades, so the ripples seem to stream past.
      const t = ((time / 420 + i / 3 + c.id * 0.37) % 1);
      const x = cx + c.dir * (c.w * 0.45 - t * c.w * 0.9);
      const r = h * (0.55 + 0.45 * (1 - t));
      g.lineStyle(1.3, color, 0.85 * (1 - t) + 0.1);
      g.beginPath();
      g.arc(x, cy, r, c.dir > 0 ? -Math.PI / 2.6 : Math.PI - Math.PI / 2.6, c.dir > 0 ? Math.PI / 2.6 : Math.PI + Math.PI / 2.6);
      g.strokePath();
    }
  }

  private create(c: Critter): CritterSprites {
    const mark = this.scene.add.image(0, 0, TEX.highlight(c.id % BOIL)).setBlendMode(Phaser.BlendModes.MULTIPLY).setAlpha(0.8).setDepth(3);
    const art = this.scene.add.image(0, 0, TEX.critter(c.species, false, 0)).setOrigin(0.5, GROUND_ORIGIN).setDepth(4);
    const s = { mark, art };
    this.sprites.set(c.id, s);
    return s;
  }
}
