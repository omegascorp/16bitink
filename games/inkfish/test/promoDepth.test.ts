import { describe, expect, it } from 'vitest';
import {
  ARRIVE_AT, bubbleAt, HOLD_S, READ_Y, STOP_HOLDS, STOP_METRES, swimmerMetres, cameraAt, captionAlpha, counterMetres, HOOK_CAPTIONS, LOOP_S, metresAt, PAYOFF_CAPTIONS, POP_AT, REWIND_FROM,
  snailfishAt, SNAILFISH_M, SWIMMERS, swimmerAt, toScreen, WRAP_AT, yAt, zoneAt,
} from '../dev/promo/depth/dive';
import { VIDEO } from '../dev/promo/short';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const onScreen = (y: number): boolean => y > -300 && y < VIDEO.height + 300;

describe('promo short: how deep do fish live?', () => {
  it('maps world height to depth one-to-one, deeper all the way down', () => {
    let last = -Infinity;
    for (let y = -500; y < 12000; y += 37) {
      const m = metresAt(y);
      expect(m).toBeGreaterThan(last);
      expect(yAt(m)).toBeCloseTo(y, 6);
      last = m;
    }
  });

  it('sinks from rest at the surface to rest on the snailfish, and rushes back up to rest where it began', () => {
    expect(cameraAt(0)).toBeCloseTo(cameraAt(END), 4);
    const speed = (t: number): number => (cameraAt(t + 1e-4) - cameraAt(t)) / 1e-4;
    expect(Math.abs(speed(1e-4))).toBeLessThan(1);
    expect(Math.abs(speed(END - 2e-4))).toBeLessThan(1);
    for (let t = 0; t + 0.05 < ARRIVE_AT; t += 0.05) expect(cameraAt(t + 0.05)).toBeGreaterThanOrEqual(cameraAt(t) - 1e-9);
    expect(counterMetres(0)).toBe(0);
    expect(counterMetres((ARRIVE_AT + REWIND_FROM) / 2)).toBe(SNAILFISH_M);
  });

  it('holds the snailfish mid-screen, at the height the depth is read, at the record depth', () => {
    const t = (ARRIVE_AT + REWIND_FROM) / 2;
    const s = snailfishAt(t);
    expect(Math.abs(s.x - VIDEO.width / 2)).toBeLessThan(60);
    expect(Math.abs(s.y - READ_Y)).toBeLessThan(15);
  });

  it('stops at each depth long enough to read, with its fish still on screen and the counter showing that depth', () => {
    expect(STOP_HOLDS).toHaveLength(STOP_METRES.length);
    expect(HOLD_S).toBeGreaterThanOrEqual(1.5);
    STOP_HOLDS.forEach((hold, i) => {
      const mid = (hold.from + hold.to) / 2;
      expect(cameraAt(hold.to)).toBeCloseTo(cameraAt(hold.from), 6);
      expect(counterMetres(mid)).toBe(STOP_METRES[i]);
      const fish = SWIMMERS.filter((s) => s.stop === i);
      expect(fish.length).toBeGreaterThanOrEqual(2);
      for (const s of fish) {
        for (const at of [hold.from, hold.to]) {
          const p = swimmerAt(s, at);
          expect(p.x - s.length / 2, s.name).toBeGreaterThan(0);
          expect(p.x + s.length / 2, s.name).toBeLessThan(VIDEO.width);
          // Between the depth counter and the platforms' buttons at the bottom.
          expect(p.y, s.name).toBeGreaterThan(560);
          expect(p.y, s.name).toBeLessThan(1250);
        }
        expect(zoneAt(swimmerMetres(s)).from).toBeLessThanOrEqual(swimmerMetres(s));
      }
      // No other stop's fish in the picture.
      for (const other of SWIMMERS.filter((s) => s.stop !== i)) {
        const p = swimmerAt(other, mid);
        expect(p.y + other.length / 2 < 0 || p.y - other.length / 2 > VIDEO.height, `${other.name} at stop ${i}`).toBe(true);
      }
    });
    // Stops in order, from the surface down, all before the snailfish.
    expect(STOP_METRES).toEqual([...STOP_METRES].sort((a, b) => a - b));
    expect(STOP_HOLDS[STOP_HOLDS.length - 1]!.to).toBeLessThan(ARRIVE_AT);
    expect(REWIND_FROM - ARRIVE_AT).toBeGreaterThanOrEqual(2.5);
  });

  it('loops: every fish is off screen when its clock wraps, and back where it started by the loop point', () => {
    for (const s of SWIMMERS) {
      expect(onScreen(swimmerAt(s, WRAP_AT - 1e-6).y), s.name).toBe(false);
      expect(onScreen(swimmerAt(s, WRAP_AT).y), s.name).toBe(false);
      const a = swimmerAt(s, 0);
      const b = swimmerAt(s, END);
      expect(b.x).toBeCloseTo(a.x, 3);
      expect(b.y).toBeCloseTo(a.y, 2);
    }
    expect(onScreen(toScreen(yAt(SNAILFISH_M), 0))).toBe(false);
  });

  it('pops the bubble at the surface just before the loop point', () => {
    const last = bubbleAt(POP_AT - 1e-4)!;
    expect(last).not.toBeNull();
    expect(Math.abs(last.y - toScreen(0, POP_AT))).toBeLessThan(10);
    expect(bubbleAt(END)).toBeNull();
    expect(bubbleAt(0)).toBeNull();
  });

  it('shows the hook across the loop point and the payoff only at the bottom', () => {
    for (const c of [...HOOK_CAPTIONS, ...PAYOFF_CAPTIONS]) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(captionAlpha(HOOK_CAPTIONS[0]!, 0)).toBe(1);
    expect(captionAlpha(PAYOFF_CAPTIONS[0]!, (ARRIVE_AT + REWIND_FROM) / 2)).toBe(1);
    expect(captionAlpha(PAYOFF_CAPTIONS[0]!, 5)).toBe(0);
  });

  it('lasts a whole number of video frames and line-boil cycles', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
  });
});
