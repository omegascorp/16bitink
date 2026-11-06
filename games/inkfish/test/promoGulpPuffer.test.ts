import { describe, expect, it } from 'vitest';
import { INKFISH_FULL_CHAPTERS } from '../content/paid';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { canSwallow, PLAYER_ABILITY } from '../src/logic/abilities';
import { relationTo } from '../src/logic/sizing';
import { SPECIES_INFO } from '../src/levels/species';
import {
  CAPTIONS, captionAlpha, F_MAX, FREEZE_AT, GAME_PUFF, growthBar, HEAVES, inflate, insertion, jolt, LOOP_S, POP_AT, PUFFER_LEN, PUFFER_SIZE, pufferAt, puffAlarm,
  SOUNDS, swell, toScreen, viewAt, viperBelly, viperEyes, viperFish, viperJaw, VIPER_PX, VIPER_SIZE, type View, type WorldFish,
} from '../dev/promo/gulppuffer/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

interface P { readonly x: number; readonly y: number }
const seen = (f: WorldFish, v: View) => ({ ...toScreen(f, v), length: v.zoom * f.length });

function expectSameOnScreen(a: WorldFish, va: View, b: WorldFish, vb: View): void {
  const sa = seen(a, va);
  const sb = seen(b, vb);
  expect(sb.x).toBeCloseTo(sa.x, 1);
  expect(sb.y).toBeCloseTo(sa.y, 1);
  expect(sb.length).toBeCloseTo(sa.length, 1);
  expect(b.facing).toBe(a.facing);
  expect(wrap(b.tilt - a.tilt)).toBeCloseTo(0, 3);
  expect(b.effort).toBeCloseTo(a.effort, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

const puffer = (t: number): WorldFish => pufferAt(t).fish;
const rowsOf = (text: string): number => text.split('\n').length;

describe('promo short: never swallow a pufferfish', () => {
  it('loops: the last frame is the first, the camera, both fish, jaw, eyes, belly and "!" all back where they began', () => {
    const [va, vb] = [viewAt(0), viewAt(END)];
    expect(vb.zoom).toBeCloseTo(va.zoom, 6);
    expect(vb.x).toBeCloseTo(va.x, 6);
    expect(vb.y).toBeCloseTo(va.y, 6);
    expectSameOnScreen(viperFish(0), va, viperFish(END), vb);
    expectSameOnScreen(puffer(0), va, puffer(END), vb);
    const [a, b] = [pufferAt(0), pufferAt(END)];
    expect(a.kind).toBe('swallowed');
    expect(b.kind).toBe('swallowed');
    if (a.kind === 'swallowed' && b.kind === 'swallowed') {
      expect(b.squash).toBeCloseTo(a.squash, 3);
      expect(b.stretch).toBeCloseTo(a.stretch, 3);
    }
    expect(viperJaw(END)).toBeCloseTo(viperJaw(0), 3);
    expect(viperBelly(END).size).toBeCloseTo(viperBelly(0).size, 3);
    expect(viperEyes(END)).toBe(viperEyes(0));
    expect(puffAlarm(END)).toBeCloseTo(puffAlarm(0), 3);
    expect(inflate(END)).toBeCloseTo(inflate(0), 6);
    expect(insertion(END)).toBeCloseTo(insertion(0), 6);
    expect(jolt(END)).toBe(jolt(0));
    expect(growthBar(END)).toEqual(growthBar(0));
  });

  it('has no zoom loop: the viper is the same size all the way round', () => {
    for (let t = 0; t < LOOP_S; t += 0.25) expect(viperFish(t).length).toBe(VIPER_PX);
  });

  it('opens on the jaws swung wide round a small, smug, deflated puffer, with its "!"', () => {
    const p = pufferAt(0);
    expect(p.kind).toBe('swallowed');
    expect(viperJaw(0)).toBeGreaterThan(2.5);
    expect(inflate(0)).toBe(1);
    expect(swell(0)).toBe(0);
    expect(puffAlarm(0)).toBeGreaterThan(0.9);
    expect(insertion(0)).toBeGreaterThan(0.2);
    // The puffer is in front of the lips and over them: on screen its middle is past the viper's nose, its head inside it.
    const v = viewAt(0);
    const you = seen(viperFish(0), v);
    const it = seen(puffer(0), v);
    expect(it.x).toBeGreaterThan(you.x + you.length * 0.3);
    expect(it.x - it.length / 2).toBeLessThan(you.x + you.length / 2);
    expect(Math.abs(it.y - you.y)).toBeLessThan(0.35 * you.length);
    // Big in frame: viper and puffer fill the width, the viper over 500 px.
    expect(you.length).toBeGreaterThan(500);
    expect(it.x + it.length / 2).toBeLessThan(1080);
    expect(you.x - you.length / 2).toBeGreaterThan(0);
  });

  it('is faithful to the game: a viper with the gape, a puffer that is its peer, one the game puffs into a predator', () => {
    expect(PLAYER_ABILITY.viperfish).toBe('gape');
    expect(SPECIES_INFO.puffer.behaviour).toBe('puff');
    expect(SPECIES_INFO.puffer.spiky).toBe(true);
    expect(relationTo(VIPER_SIZE, PUFFER_SIZE)).toBe('peer');
    expect(canSwallow('gape', relationTo(VIPER_SIZE, PUFFER_SIZE))).toBe(true);
    expect(canSwallow('ink', relationTo(VIPER_SIZE, PUFFER_SIZE))).toBe(false);
    // Puffed (the game: 1.7 times its size) it is far too big to swallow.
    expect(relationTo(VIPER_SIZE, PUFFER_SIZE * GAME_PUFF)).toBe('predator');
    expect(canSwallow('gape', relationTo(VIPER_SIZE, PUFFER_SIZE * GAME_PUFF))).toBe(false);
    expect(F_MAX).toBeGreaterThanOrEqual(GAME_PUFF);
    // A size the game spawns puffers at.
    const sizes = INKFISH_FULL_CHAPTERS.flatMap((c) => c.levels.flatMap((l) => l.spawns.filter((s) => s.species === 'puffer').map((s) => s.size)));
    expect(sizes.length).toBeGreaterThan(0);
    expect(PUFFER_LEN).toBeGreaterThan(0);
  });

  it('swells a heave at a time, to a ball far past the viper’s depth, then pops: spat out, flung, deflating', () => {
    expect(inflate(1.4)).toBe(1);
    const at = [1.45, ...HEAVES.map((h) => h + 0.6)];
    for (let i = 1; i < at.length; i++) expect(inflate(at[i]!)).toBeGreaterThan(inflate(at[i - 1]!) + 0.1);
    expect(inflate(POP_AT - 0.01)).toBeGreaterThan(F_MAX - 0.05);
    expect(pufferAt(POP_AT - 0.01).kind).toBe('swallowed');
    // Jaws forced wider with each swell; belly stretched thin round it.
    expect(viperJaw(HEAVES[2] + 0.6)).toBeGreaterThan(viperJaw(1) + 0.4);
    expect(viperBelly(FREEZE_AT + 0.5).size).toBeGreaterThan(2);
    expect(viperEyes(FREEZE_AT + 0.5)).toBe('cross');
    // The pop: the viper's jaw drops limp and it shoots backwards; the puffer flies out.
    const before = viperFish(POP_AT - 0.01);
    const after = viperFish(POP_AT + 0.5);
    expect(after.x).toBeLessThan(before.x - 25);
    expect(viperJaw(POP_AT + 0.3)).toBeLessThan(viperJaw(POP_AT - 0.01) - 1);
    expect(viperBelly(POP_AT + 0.5).size).toBeLessThan(0.1);
    expect(pufferAt(POP_AT + 0.5).kind).toBe('swimming');
    expect(puffer(POP_AT + 0.6).x).toBeGreaterThan(before.x + 150);
    // Slowly deflates back to its own size.
    expect(inflate(6.5)).toBeLessThan(inflate(POP_AT + 0.5));
    expect(inflate(6.5)).toBeGreaterThan(1.1);
    expect(inflate(8.5)).toBe(1);
    // It looks back at the viper, which narrows its eyes.
    expect(puffer(9.5).facing).toBe(-1);
    expect(viperEyes(10)).toBe('narrow');
  });

  it('moves smoothly on screen: no frame jumps further than the pop, camera included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const next = (t + FRAME) % LOOP_S;
      const [v, w] = [viewAt(t), viewAt(next)];
      for (const [fa, fb, limit] of [[viperFish(t), viperFish(next), 45], [puffer(t), puffer(next), 110]] as const) {
        const a = seen(fa, v);
        const b = seen(fb, w);
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(limit);
        expect(Math.abs(a.length - b.length)).toBeLessThan(30);
      }
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(40);
    }
  });

  it('keeps both fish in frame and clear of the captions and the growth bar', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) {
      const v = viewAt(t);
      const s = seen(viperFish(t), v);
      expect(s.length).toBeGreaterThan(380);
      expect(s.x - s.length / 2).toBeGreaterThan(0);
      expect(s.x + s.length / 2).toBeLessThan(1080);
      expect(s.y).toBeGreaterThan(560);
      expect(s.y).toBeLessThan(1000);
      const it = seen(puffer(t), v);
      expect(it.x).toBeGreaterThan(200);
      expect(it.x).toBeLessThan(1080);
      expect(it.y).toBeGreaterThan(450);
      expect(it.y).toBeLessThan(1000);
    }
  });

  it('keeps the growth bar in every frame, unmoved: nothing was eaten', () => {
    for (let t = 0; t < LOOP_S; t += 0.1) expect(growthBar(t)).toEqual(growthBar(0));
    expect(growthBar(0).alpha).toBe(1);
  });

  it('shows the words in the right places, none on frame 1, none outside y 270 .. 1250', () => {
    const text = CAPTIONS.map((c) => c.text);
    expect(text).toEqual(['easy meal', 'wait', 'WAIT', 'how did THAT\nnot fit', 'one more try']);
    for (const c of CAPTIONS) {
      expect(captionAlpha(c, 0)).toBe(0);
      expect(captionAlpha(c, END)).toBe(0);
      expect(c.from).toBeGreaterThanOrEqual(0.15);
      expect(c.y).toBeGreaterThan(270);
      expect(c.y + (rowsOf(c.text) - 1) * c.size * 1.02 + c.size * 0.4).toBeLessThan(1250);
    }
    const by = (name: string) => CAPTIONS.find((c) => c.text === name)!;
    expect(by('easy meal').from).toBe(0.2);
    expect(by('easy meal').to).toBe(2);
    // "wait" as it swells, the bigger "WAIT" on the second heave, the question after the pop, the vow before the lunge.
    expect(by('wait').from).toBeGreaterThan(1.9);
    expect(by('wait').from).toBeLessThan(HEAVES[1]);
    expect(by('WAIT').from).toBeLessThanOrEqual(HEAVES[1] + 0.1);
    expect(by('WAIT').from).toBeGreaterThanOrEqual(HEAVES[1] - 0.1);
    expect(by('WAIT').size).toBeGreaterThan(by('wait').size);
    expect(by('how did THAT\nnot fit').from).toBeGreaterThan(POP_AT);
    expect(by('one more try').to).toBeLessThan(11.55);
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length).toBeLessThanOrEqual(1);
  });

  it('is boil-compatible: a whole number of video frames and line-boil cycles, every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });

  it('keeps the beat of silence before the pop, and lands the pop 35-50% of the way in', () => {
    const quiet = SOUNDS.filter((c) => c.t > FREEZE_AT && c.t < POP_AT);
    expect(quiet).toEqual([]);
    expect(SOUNDS.some((c) => c.id === 'boom' && c.t === POP_AT)).toBe(true);
    expect(POP_AT - Math.max(...SOUNDS.filter((c) => c.t < POP_AT).map((c) => c.t))).toBeGreaterThan(0.8);
    expect(POP_AT / LOOP_S).toBeGreaterThan(0.35);
    expect(POP_AT / LOOP_S).toBeLessThan(0.5);
    // A cue for each heave and for the lunge that comes round to frame 1.
    for (const h of HEAVES) expect(SOUNDS.some((c) => c.id === 'suck' && c.t === h)).toBe(true);
    expect(SOUNDS.some((c) => c.id === 'lunge' && c.t > 11 && c.t < 12)).toBe(true);
  });
});
