import { describe, expect, it } from 'vitest';
import { pitchForCombo } from '../src/audio/recipes';
import { FPS } from '../dev/promo/play/director';
import { cuesOf } from '../dev/promo/play/sounds';
import { BOIL_CYCLE_S } from '../dev/promo/sprites';
import { captionAt } from '../dev/promo/captions';
import { CAPTIONS, CHAIN_AT, LINE, LINKS, LOOP_S, PATH, recording, START, viewAt } from '../dev/promo/chain/story';

const rec = recording();
const inLoop = rec.events.filter((e) => e.t >= 0 && e.t < LOOP_S);

describe('promo short: wait for it… (a six-link chain reaction)', () => {
  it('loops: the board is clear at the loop’s end, as the next line rushes out of the burrow', () => {
    for (const { start, end } of rec.seams) {
      expect(start.lines[0]!.length).toBe(0);
      expect(end.lines[0]!.length).toBe(0);
      expect(end.shots.length).toBe(0);
      expect(end.gecko.angle).toBeCloseTo(start.gecko.angle, 6);
      expect(end.loaded).toBe(start.loaded);
      expect(end.next).toBe(start.next);
      expect(end.tint).toBe(start.tint);
    }
    expect(inLoop.filter((e) => e.e.type === 'rush').map((e) => e.t)).toEqual([0]);
    const [v0, v1] = [viewAt(0), viewAt(LOOP_S - 1e-9)];
    expect(v1.cx).toBeCloseTo(v0.cx, 6);
    expect(v1.z).toBeCloseTo(v0.z, 6);
  });

  it('lasts a whole number of video frames and line-boil cycles', () => {
    expect(rec.frames.length).toBe(Math.round(LOOP_S * FPS));
    expect(Math.abs(LOOP_S / BOIL_CYCLE_S - Math.round(LOOP_S / BOIL_CYCLE_S))).toBeLessThan(1e-9);
    expect(Math.abs(START * FPS - Math.round(START * FPS))).toBeLessThan(1e-9);
  });

  it('chains six links off one shot, by the game’s own rule, and pops every marble', () => {
    const pops = inLoop.filter((e) => e.e.type === 'pop');
    const chain = pops.filter((e) => e.t > CHAIN_AT && e.t < CHAIN_AT + 2);
    expect(chain.map((e) => (e.e.type === 'pop' ? e.e.combo : -1))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(inLoop.filter((e) => e.e.type === 'spit').length).toBe(4);
    const popped = pops.reduce((n, e) => n + (e.e.type === 'pop' ? e.e.count : 0), 0);
    // Every marble out of the burrow, and the four shots.
    expect(popped).toBe(LINE.length + 4);
    expect(LINKS.length).toBe(6);
    // The line never reaches the well.
    for (const f of rec.frames) expect((f.lines[0]!.at(-1)?.s ?? 0) / PATH.length).toBeLessThan(0.5);
  });

  it('opens just before the payoff: the whole line round the ring, the gecko aimed, "wait for it…" up, the chain done in 1.5 s', () => {
    const first = rec.frames[Math.round(START * FPS)]!;
    expect(first.lines[0]!.length).toBe(LINE.length);
    expect(first.shots.length).toBe(0);
    expect(START).toBeLessThan(CHAIN_AT);
    expect(CHAIN_AT - START).toBeLessThan(0.2);
    expect(CAPTIONS.find((c) => c.text.startsWith('wait'))!.from).toBeLessThan(START);
    expect(captionAt(CAPTIONS[0]!, START).alpha).toBe(1);
    const last = inLoop.filter((e) => e.e.type === 'pop' && e.e.combo === 5)[0]!;
    expect(last.t - START).toBeGreaterThan(0);
    expect(last.t - START).toBeLessThan(1.5);
  });

  it('keeps the meme captions in the clear band, one at a time', () => {
    for (const c of CAPTIONS) {
      expect(c.y - c.size).toBeGreaterThan(270);
      expect(c.y).toBeLessThan(1250);
    }
    for (let t = 0; t < LOOP_S; t += 0.05) expect(CAPTIONS.filter((c) => captionAt(c, t).alpha > 0).length).toBeLessThanOrEqual(1);
  });

  it('plays each link’s pop a step higher up the scale, inside the loop', () => {
    const pops = cuesOf(rec, () => 540).filter((c) => c.id === 'pop' && c.t > CHAIN_AT && c.t < CHAIN_AT + 2);
    expect(pops.map((c) => c.pitch)).toEqual([0, 1, 2, 3, 4, 5].map(pitchForCombo));
    expect(cuesOf(rec, () => 540).some((c) => c.id === 'rush')).toBe(true);
  });
});

describe('promo short: wait for it… framing', () => {
  it('keeps every marble of the ring between the top buttons and the credit', async () => {
    const { toScreen } = await import('../dev/promo/play/stage');
    const { pointAt } = await import('../src/logic/path');
    for (const f of rec.frames) {
      const v = viewAt(f.t);
      for (const m of f.lines[0]!) {
        if (m.s < 600) continue;
        const p = toScreen(pointAt(PATH, m.s), v);
        expect(p.y - 16 * v.z).toBeGreaterThan(270);
        expect(p.y + 16 * v.z).toBeLessThan(1228 - 40);
        expect(p.x - 16 * v.z).toBeGreaterThan(0);
        expect(p.x + 16 * v.z).toBeLessThan(1080);
      }
    }
  });
});
