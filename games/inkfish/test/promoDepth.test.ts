import { describe, expect, it } from 'vitest';
import {
  ARRIVE_AT, bubbleAt, READ_Y, cameraAt, captionAlpha, counterMetres, HOOK_CAPTIONS, LOOP_S, metresAt, PAYOFF_CAPTIONS, POP_AT, REWIND_FROM,
  snailfishAt, SNAILFISH_M, SWIMMERS, swimmerAt, toScreen, WRAP_AT, yAt, zoneAt, ZONES,
} from '../dev/promo/depth/dive';
import { VIDEO } from '../dev/promo/short';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const onScreen = (y: number): boolean => y > -300 && y < VIDEO.height + 300;

describe('promo short: how deep do fish live?', () => {
  it('maps world height to depth one-to-one, deeper all the way down', () => {
    let last = -Infinity;
    for (let y = -500; y < 9800; y += 37) {
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
    for (let t = 0; t + 0.05 < ARRIVE_AT; t += 0.05) expect(cameraAt(t + 0.05)).toBeGreaterThanOrEqual(cameraAt(t));
    expect(counterMetres(0)).toBe(0);
    expect(counterMetres((ARRIVE_AT + REWIND_FROM) / 2)).toBe(SNAILFISH_M);
  });

  it('holds the snailfish mid-screen, at the height the depth is read, at the record depth', () => {
    const t = (ARRIVE_AT + REWIND_FROM) / 2;
    const s = snailfishAt(t);
    expect(Math.abs(s.x - VIDEO.width / 2)).toBeLessThan(60);
    expect(Math.abs(s.y - READ_Y)).toBeLessThan(15);
  });

  it('passes every fish across the screen on the way down, each in its real zone', () => {
    for (const s of SWIMMERS) {
      let seen = false;
      for (let t = 0; t < ARRIVE_AT; t += 0.1) {
        const p = swimmerAt(s, t);
        if (onScreen(p.y) && p.x > 0 && p.x < VIDEO.width) seen = true;
      }
      expect(seen, s.name).toBe(true);
      expect(zoneAt(s.metres).from).toBeLessThanOrEqual(s.metres);
    }
    // Zones in order, from the surface down.
    expect(ZONES.map((z) => z.from)).toEqual([...ZONES.map((z) => z.from)].sort((a, b) => a - b));
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
