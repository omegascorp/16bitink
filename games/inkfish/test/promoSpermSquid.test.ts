import { describe, expect, it } from 'vitest';
import { JAW, openJaw } from '../dev/promo/kraken/whale';
import { SCARS } from '../dev/promo/spermsquid/art';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/spermsquid/script';
import {
  AT, BOIL_STEPS, BUS, BUS_SQUID_SCALE, BUS_TENTACLE, CUTS, beamAt, daylightAt, feetAt, fightPlaceAt, hookPlaceAt, hookSquidFrame, LOOP_S, metresOf,
  moodAt, readoutAt, sceneAt, shakeAt, swallowAt, toScreen, wrap,
} from '../dev/promo/spermsquid/story';
import { LOOP_S as WORDS_LOOP, TEMPO, WORDS } from '../dev/promo/spermsquid/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../src/art/textures';

const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: this whale swallows giant squid without chewing (narrated)', () => {
  it('loops on a whole number of 1.5 s beats, frames and line-boil steps', () => {
    expect(LOOP_S).toBe(WORDS_LOOP);
    expect(LOOP_S % 1.5).toBe(0);
    expect(Number.isInteger(LOOP_S * 30)).toBe(true);
    expect(BOIL_STEPS).toBe(LOOP_S * BOIL_FPS);
    expect(Number.isInteger(BOIL_STEPS)).toBe(true);
  });

  it('loops seamlessly: every state at the loop point equals frame 1', () => {
    expect(wrap(LOOP_S)).toBe(0);
    expect(sceneAt(LOOP_S)).toEqual(sceneAt(0));
    expect(swallowAt(LOOP_S)).toEqual(swallowAt(0));
    expect(hookPlaceAt(LOOP_S)).toEqual(hookPlaceAt(0));
    expect(moodAt(LOOP_S)).toEqual(moodAt(0));
    expect(shakeAt(LOOP_S)).toEqual(shakeAt(0));
    expect(daylightAt(LOOP_S)).toBe(daylightAt(0));
    expect(captionAt(LOOP_S)).toEqual(captionAt(0));
    expect(creditAt(0, LOOP_S)).toBeCloseTo(creditAt(LOOP_S, LOOP_S), 6);
    // Frame 1 is the hook, the voice's last line runs to the cut back into it.
    expect(sceneAt(0).name).toBe('swallow');
    expect(sceneAt(LOOP_S - 1e-6).name).toBe('eye');
  });

  it('opens on the hook: the jaw wide, the squid half in the mouth, its head and arms still out', () => {
    for (const t of [0, 0.5, 1.2, 2]) {
      const sw = swallowAt(t);
      expect(sw.open, `t=${t}`).toBeGreaterThan(0.6);
      expect(sw.p, `t=${t}`).toBeLessThan(0.2);
      const sq = hookSquidFrame(sw);
      // Its crown of arms (squid body x 110) ahead of the dropped jaw's tip, its mantle tip (x -124) back inside the mouth.
      const tip = openJaw(JAW.tip, sw.open);
      const crownX = sq.x + Math.cos(sq.angle) * 110 * sq.scale;
      const tailX = sq.x - Math.cos(sq.angle) * 124 * sq.scale;
      expect(crownX, `t=${t}`).toBeGreaterThan(tip.x);
      expect(tailX, `t=${t}`).toBeLessThan(tip.x - 250);
    }
    // The head fills about 85% of the frame's width.
    const place = hookPlaceAt(0);
    const snout = toScreen(place, { x: 0, y: 0 });
    const back = toScreen(place, { x: -930, y: 0 });
    expect((snout.x - back.x) / 1080).toBeGreaterThan(0.78);
    expect(snout.x).toBeLessThan(1000);
  });

  it('swallows it whole on "without chewing!": the squid all inside and the jaw shut', () => {
    const after = swallowAt(AT.chewing + 0.15);
    expect(after.open).toBe(0);
    expect(after.p).toBe(1);
    expect(sceneAt(AT.chewing + 0.15).name).toBe('swallow');
  });

  it('cuts to each beat on its words', () => {
    const on = (t: number): string => sceneAt(t).name;
    expect(on(AT.dives)).toBe('dive');
    expect(on(AT.bus)).toBe('bus');
    expect(on(AT.teeth)).toBe('teeth');
    expect(on(AT.swallows)).toBe('teeth');
    expect(on(AT.fight)).toBe('fight');
    expect(on(AT.scars)).toBe('fight');
    expect(on(AT.nobody)).toBe('film');
    expect(on(AT.witness)).toBe('eye');
    for (let i = 1; i < CUTS.length; i++) expect(CUTS[i]!.from).toBeGreaterThan(CUTS[i - 1]!.from);
    expect(beamAt(AT.ever).on).toBe(1);
    expect(fightPlaceAt(AT.scars).zoom).toBeGreaterThan(1.4);
  });

  it('shows every number in feet and metres, true to the facts', () => {
    expect(readoutAt(AT.feet + 0.3)).toBe(1);
    expect(feetAt(AT.feet + 0.3)).toBe(1000);
    // Settled on 1,000 ft while "thousand" is still being said, and held.
    expect(feetAt(AT.thousand + 0.25)).toBe(1000);
    expect(feetAt(AT.feet)).toBe(1000);
    expect(readoutAt(AT.thousand + 0.25)).toBe(1);
    expect(metresOf(1000)).toBe(300);
    // Mantle tip to club tip spans the bus, both 40 ft (12 m).
    expect((124 + 110 + BUS_TENTACLE) * BUS_SQUID_SCALE).toBeCloseTo(BUS.x1 - BUS.x0, 6);
    // Sucker scars about an inch across: the head is ~930 local px for ~5.5 m, so an inch is ~4.3 px.
    for (const s of SCARS) expect(2 * s.r).toBeLessThan(2 * 4.3);
    expect(SCARS.length).toBeGreaterThan(40);
  });

  it('times the words inside the loop, ending at least 0.2 s before it', () => {
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end - 1e-6);
    for (const w of WORDS) expect(w.end).toBeGreaterThan(w.start);
    expect(WORDS[0]!.start).toBeGreaterThanOrEqual(0);
    expect(WORDS[WORDS.length - 1]!.end / TEMPO).toBeLessThanOrEqual(LOOP_S - 0.2);
    expect(WORDS.map((w) => w.text).join(' ')).toBe(
      'This whale eats GIANT squid… without chewing! It dives a thousand feet into the dark, where squid as long as a BUS are waiting. '
        + 'Teeth? Only on the bottom jaw. It just… swallows. But the squid fight back: whales come up covered in sucker SCARS! '
        + 'And nobody has ever filmed it. So the only witness is',
    );
  });

  it('captions in phrases, each line inside the loop, and every text between y 270 and 1250', () => {
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.from).toBeGreaterThanOrEqual(0);
      expect(l.to).toBeLessThanOrEqual(LOOP_S);
      expect(l.to).toBeGreaterThan(l.from);
    }
    expect(LINES.filter((l) => l.words.length > 1).length).toBeGreaterThan(LINES.length / 2);
    for (const t of FRAMES) expect(captionAt(t), `t=${t}`).not.toBeNull();
    for (const { y, size } of Object.values(TEXT)) {
      expect(y - size * 0.8).toBeGreaterThanOrEqual(270);
      expect(y + size * 0.25).toBeLessThanOrEqual(1250);
    }
  });

  it('keeps the effects quiet and inside the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.45);
    }
  });
});
