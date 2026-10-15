import { describe, expect, it } from 'vitest';
import {
  captionAt, crossAt, LINES, lensesAt, SOUNDS, washingAt, WATER_CUES,
} from '../dev/promo/raccoon/beats';
import { POOL } from '../dev/promo/raccoon/scene';
import {
  CLAM_B, CLAM_RISE, clamSizeAt, crabAt, DROP_AT, EAT_AT, floorClamAt, GRAB_AT, handsInWater, heldAt, heldScaleAt, LOOP_S, raccoonAt, said,
  SHELL_DROP, SPLASHES, toScreen,
} from '../dev/promo/raccoon/story';
import { inVoice, TEMPO, WORDS } from '../dev/promo/raccoon/words';
import { poolFloor } from '../dev/promo/raccoon/scene';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** The held crab's shell middle on screen. */
const heldCrabAt = (t: number): { x: number; y: number } => toScreen(raccoonAt(t).grip);

describe('promo short: raccoons aren\'t washing their food (narrated)', () => {
  it('loops: everything at the loop point is where it was at the start', () => {
    const [a, b] = [raccoonAt(END), raccoonAt(0)];
    expect(a.grip.x).toBeCloseTo(b.grip.x, 3);
    expect(a.grip.y).toBeCloseTo(b.grip.y, 3);
    for (const key of ['rub', 'open', 'tilt', 'sway', 'breath'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(heldAt(END)).toBe(heldAt(0));
    expect(crabAt(0)).toBeNull();
    expect(crabAt(END)).toBeNull();
    for (const f of [washingAt, crossAt, floorClamAt, clamSizeAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(lensesAt(0)).toHaveLength(0);
    expect(lensesAt(END)).toHaveLength(0);
  });

  it('never jumps: the raccoon, the crab and what it holds move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [ta, tb] = [wrap(t), wrap(t + FRAME)];
      const [p, q] = [raccoonAt(ta), raccoonAt(tb)];
      expect(Math.hypot(q.grip.x - p.grip.x, q.grip.y - p.grip.y)).toBeLessThan(5);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.2);
      expect(Math.abs(q.open - p.open)).toBeLessThan(0.35);
      const [ca, cb] = [crabAt(ta), crabAt(tb)];
      if (ca && cb) {
        expect(Math.hypot(cb.x - ca.x, cb.y - ca.y)).toBeLessThan(70);
        expect(Math.abs(cb.hidden - ca.hidden)).toBeLessThan(0.5);
      }
      // The crab only appears or vanishes off screen, or going into or out of the raccoon's hands.
      if (!ca !== !cb) {
        const seen = (ca ?? cb)!;
        const handed = heldAt(ta) === 'crab' || heldAt(tb) === 'crab';
        expect(seen.x > 1150 || handed).toBe(true);
      }
      // The floor clam only goes all at once into its hands (checked below).
      if (!(ta < CLAM_B.at && tb >= CLAM_B.at)) expect(Math.abs(floorClamAt(tb) - floorClamAt(ta))).toBeLessThan(0.1);
    }
  });

  it('hands the crab and the clam over without a jump', () => {
    // Taken: the free crab's shell is where the held one's is.
    const free = crabAt(GRAB_AT + 0.04)!;
    const held = heldCrabAt(GRAB_AT + 0.06);
    expect(Math.hypot(free.x - held.x, free.y - SHELL_DROP - held.y)).toBeLessThan(20);
    // Let go: it falls from the hands.
    const dropped = crabAt(DROP_AT + 0.01)!;
    const lastHeld = heldCrabAt(DROP_AT - 0.01);
    expect(Math.hypot(dropped.x - lastHeld.x, dropped.y - SHELL_DROP * dropped.scale - lastHeld.y)).toBeLessThan(20);
    // The next clam: picked up where it lies.
    const grip = toScreen(raccoonAt(CLAM_B.at).grip);
    expect(Math.hypot(grip.x - CLAM_B.x, grip.y - (poolFloor(CLAM_B.x) - CLAM_RISE))).toBeLessThan(12);
    expect(floorClamAt(CLAM_B.at - 0.01)).toBe(1);
    expect(floorClamAt(CLAM_B.at + 0.01)).toBe(0);
    // Eaten: gone before its hands are empty.
    expect(clamSizeAt(EAT_AT + 0.15)).toBe(0);
    expect(heldAt(EAT_AT + 0.05)).toBe('clam');
    expect(heldAt(EAT_AT + 0.2)).toBeNull();
  });

  it('opens on the hook: the raccoon dunking and rubbing its food at the pool, "washing?" crossed out', () => {
    expect(heldAt(0)).toBe('clam');
    expect(handsInWater(0)).toBe(true);
    expect(washingAt(0)).toBe(1);
    expect(crossAt(0)).toBe(1);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe("Raccoons AREN'T");
    // Already moving in the first frame: the hands rub.
    expect(Math.abs(raccoonAt(FRAME).rub - raccoonAt(0).rub)).toBeGreaterThan(0.1);
    // Off before "They dunk".
    expect(washingAt(said('dunk'))).toBe(0);
  });

  it('dunks on "dunk", lifts the clean clam out on "clean", then dunks it anyway', () => {
    expect(handsInWater(said('dunk') - 0.3)).toBe(false);
    expect(handsInWater(said('water'))).toBe(true);
    expect(SPLASHES.some((s) => Math.abs(s.at - said('dunk')) < 0.2)).toBe(true);
    expect(toScreen(raccoonAt(said('clean.')).grip).y).toBeLessThan(POOL.surface - 60);
    expect(handsInWater(said('Their') + 0.3)).toBe(true);
  });

  it('pays off in the middle: a lens on its paw packed with nerves, then dry against wet, the wet one blazing on "MORE"', () => {
    expect(lensesAt(said('paws', 1) - 0.1)).toHaveLength(0);
    const packed = lensesAt(said('packed') + 0.5);
    expect(packed).toHaveLength(1);
    expect(packed[0]!.open).toBe(1);
    expect(packed[0]!.dots).toBe(1);
    expect(lensesAt(said('packed') - 0.1)[0]!.dots).toBe(0);
    expect(lensesAt(said('nerves,') + 0.2)[0]!.glow).toBeGreaterThan(0.5);
    const more = lensesAt(said('MORE,') + 0.3);
    expect(more.map((l) => l.id)).toEqual(['dry', 'wet']);
    const [dry, wet] = more as [NonNullable<(typeof more)[0]>, NonNullable<(typeof more)[1]>];
    expect(wet.glow).toBe(1);
    expect(wet.bars).toBeCloseTo(5, 3);
    expect(dry.bars).toBe(2);
    expect(dry.glow).toBeLessThan(0.3);
    expect(lensesAt(said('wet') - 0.15).find((l) => l.id === 'wet')).toBeUndefined();
    expect(said('packed') / LOOP_S).toBeGreaterThan(0.4);
    expect(said('MORE,') / LOOP_S).toBeLessThan(0.65);
    expect(lensesAt(said('so') + 0.3)).toHaveLength(0);
  });

  it('feels without looking, eats on "caught", then finds a crab on "usually" and lets it go after "So"', () => {
    expect(raccoonAt(said('feeling')).tilt).toBeLessThan(0);
    expect(handsInWater(said('feeling'))).toBe(true);
    expect(heldAt(said('beach'))).toBeNull();
    const walking = crabAt(said('night,'))!;
    expect(walking.x).toBeLessThan(1080);
    expect(walking.hidden).toBe(0);
    expect(heldAt(said('crab.') + 0.1)).toBe('crab');
    expect(heldScaleAt(said('crab.') + 0.2)).toBeGreaterThan(1.3);
    expect(heldCrabAt(said('crab.') + 0.2).y).toBeLessThan(POOL.surface);
    expect(heldAt(said('So') + 0.3)).toBeNull();
    const freed = crabAt(said('no,') + 0.35)!;
    expect(freed.hidden).toBe(0);
    expect(freed.facing).toBe(1);
    expect(washingAt(said('no,'))).toBe(1);
    expect(crossAt(said('no,') - 0.1)).toBe(0);
    expect(crossAt(said('no,') + 0.3)).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('no,');
    expect(LOOP_S - inVoice(last.end)).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - inVoice(last.end) + inVoice(WORDS[0]!.start)).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(inVoice(w.start) + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    for (const s of [...SOUNDS, ...WATER_CUES]) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
