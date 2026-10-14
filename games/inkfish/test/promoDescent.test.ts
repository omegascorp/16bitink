import { describe, expect, it } from 'vitest';
import { CUES } from '../dev/promo/descent/audio';
import { ACTORS, actorById, BITES, CALLOUTS, mouthAt } from '../dev/promo/descent/cast';
import { FPS_LONG, FRAME } from '../dev/promo/descent/frame';
import { END_HOLD_S, said, sectionEnd, sectionStart, T, VIDEO_S } from '../dev/promo/descent/timeline';
import { SECTIONS, VOICE_S, WORDS } from '../dev/promo/descent/words';
import { PLAIN_Y, TRENCH_FLOOR_Y, TRENCH_TOP, wallReach } from '../dev/promo/descent/terrain';
import { cameraAt, depthAt, metresAt, RECORD_M, toScreen, yAt } from '../dev/promo/descent/world';

/** The section each zone's stop is narrated in, and the zone's depth range (src/levels/zones.ts). */
/** The zones' player fish in order: each hands the dive over to the next. */
const RELAY = ['inkling', 'goby', 'perchfry', 'butterfly', 'tuna', 'mako', 'lanternfish', 'viperfish', 'loosejaw'] as const;

const STOPS: readonly (readonly [number, number, number])[] = [
  [1, 0, 5], [2, 5, 15], [3, 15, 30], [4, 30, 50], [5, 50, 120], [6, 120, 200], [8, 200, 1000], [9, 1000, 4000], [10, 4000, 6000],
];

describe('long-form: fish get weirder the deeper you go', () => {
  it('has its narration in order, one section after another, inside the video', () => {
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.start);
    for (let i = 1; i < SECTIONS.length; i++) expect(SECTIONS[i]!.start).toBeGreaterThan(SECTIONS[i - 1]!.end);
    expect(SECTIONS).toHaveLength(13);
    expect(VIDEO_S).toBeLessThanOrEqual(VOICE_S);
    expect(Math.abs(VIDEO_S * FPS_LONG - Math.round(VIDEO_S * FPS_LONG))).toBeLessThan(1e-6);
    // The end card holds for YouTube's shortest end screen after the last word, and no longer.
    expect(VIDEO_S - WORDS[WORDS.length - 1]!.end).toBeCloseTo(END_HOLD_S, 1);
  });

  it('finds every beat in the narration, in its own section', () => {
    expect(() => said('a word nobody says')).toThrow();
    const beats = Object.entries(T).filter(([k]) => k !== 'end');
    for (const [name, t] of beats) {
      expect(Number.isFinite(t), name).toBe(true);
      expect(t, name).toBeGreaterThanOrEqual(0);
      expect(t, name).toBeLessThan(VIDEO_S);
    }
    expect(T.tripodfish).toBeGreaterThan(sectionStart(10));
    expect(T.tripodfish).toBeLessThan(sectionEnd(10));
    expect(T.record).toBeLessThan(T.payoff);
  });

  it('maps world height to depth one-to-one, deeper all the way down', () => {
    let last = -Infinity;
    for (let y = -300; y < 17500; y += 41) {
      const m = metresAt(y);
      expect(m).toBeGreaterThan(last);
      expect(yAt(m)).toBeCloseTo(y, 6);
      last = m;
    }
  });

  it('stops in each zone while the narrator talks about it', () => {
    for (const [section, top, bottom] of STOPS) {
      for (const u of [0.25, 0.5, 0.9]) {
        const t = sectionStart(section) + u * (sectionEnd(section) - sectionStart(section));
        const m = depthAt(t);
        expect(m, `section ${section} at ${t.toFixed(1)}s`).toBeGreaterThanOrEqual(top);
        expect(m, `section ${section} at ${t.toFixed(1)}s`).toBeLessThanOrEqual(bottom);
      }
    }
    // The reveal reads the record, and the trench section is in the trench.
    expect(Math.round(depthAt(T.baby + 1))).toBe(RECORD_M);
    expect(depthAt(sectionEnd(11))).toBeGreaterThan(6000);
  });

  it('never swings back above the surface once the dive has started', () => {
    for (let t = T.puddle; t < VIDEO_S; t += 0.05) expect(toScreen(0, t)).toBeLessThan(260);
    // And it only goes down from the tide pool to the record.
    for (let t = T.puddle; t + 0.05 < T.payoff; t += 0.05) expect(cameraAt(t + 0.05)).toBeGreaterThanOrEqual(cameraAt(t) - 1e-6);
  });

  it('keeps every named animal in the picture while it is ringed', () => {
    for (const c of CALLOUTS) {
      const a = actorById(c.actor);
      for (let t = Math.max(c.from, a.from); t < Math.min(c.to, a.to); t += 0.2) {
        const p = a.place(t);
        const y = toScreen(p.y, t);
        expect(p.x, `${c.label} at ${t.toFixed(1)}s`).toBeGreaterThan(80);
        expect(p.x, `${c.label} at ${t.toFixed(1)}s`).toBeLessThan(FRAME.width - 80);
        // Below the depth, the dials and the chapter cards.
        expect(y, `${c.label} at ${t.toFixed(1)}s`).toBeGreaterThan(240);
        expect(y, `${c.label} at ${t.toFixed(1)}s`).toBeLessThan(FRAME.height - 60);
      }
    }
  });

  it('bites what it bites: the prey is gone at the bite, and the eater’s mouth is on it', () => {
    for (const b of BITES) {
      if (!b.prey) continue;
      const prey = actorById(b.prey);
      const eater = actorById(b.eater);
      expect(prey.to, b.prey).toBeCloseTo(b.t, 6);
      const m = mouthAt(eater, b.t - 0.05);
      const p = prey.place(b.t - 0.05);
      expect(Math.hypot(m.x - p.x, m.y - p.y), `${b.eater} → ${b.prey}`).toBeLessThan(eater.length * 0.6);
    }
  });

  it('hands each zone’s fish over to the next without stacking them, or popping one in or out', () => {
    const onScreen = (id: string, t: number): boolean => {
      const a = actorById(id);
      const p = a.place(t);
      const y = toScreen(p.y, t);
      const r = a.length / 2;
      return p.x > -r && p.x < FRAME.width + r && y > -r && y < FRAME.height + r;
    };
    for (let i = 1; i < RELAY.length; i++) {
      const a = actorById(RELAY[i - 1]!);
      const b = actorById(RELAY[i]!);
      // Across the game card and the lights going off there's no hand-over to see.
      if (a.to <= b.from) continue;
      expect(onScreen(a.id, a.to - 1e-3), `${a.id} gone on screen`).toBe(false);
      expect(onScreen(b.id, b.from), `${b.id} appears on screen`).toBe(false);
      for (let t = b.from; t < a.to; t += 0.02) {
        if (!onScreen(a.id, t) || !onScreen(b.id, t)) continue;
        const p = a.place(t);
        const q = b.place(t);
        const apart = Math.hypot(p.x - q.x, toScreen(p.y, t) - toScreen(q.y, t));
        expect(apart, `${a.id} and ${b.id} at ${t.toFixed(2)}s`).toBeGreaterThan((a.length + b.length) / 2);
      }
    }
    const last = actorById(RELAY[RELAY.length - 1]!);
    expect(onScreen(last.id, last.to - 1e-3), `${last.id} gone on screen`).toBe(false);
  });

  it('stands nothing on water: life on the abyssal plain is on the mud, and nothing in the trench is inside its walls', () => {
    const lips = [wallReach(TRENCH_TOP, -1), FRAME.width - wallReach(TRENCH_TOP, 1)] as const;
    for (const a of ACTORS) {
      const onGround = a.kind === 'critter' || a.shape === 'tripodfish';
      for (let t = a.from; t < a.to; t += 0.25) {
        const p = a.place(t);
        const y = toScreen(p.y, t);
        if (p.alpha < 0.25 || p.x < -a.length || p.x > FRAME.width + a.length || y < -a.length || y > FRAME.height + a.length) continue;
        const half = 0.4 * a.length;
        const at = `${a.id} at ${t.toFixed(1)}s`;
        if (onGround && Math.abs(p.y - PLAIN_Y) < 120) expect(p.x + half < lips[0] || p.x - half > lips[1], `${at} is over the trench`).toBe(true);
        if (p.y > TRENCH_TOP) {
          expect(p.x - half, `${at} is in the left wall`).toBeGreaterThan(wallReach(p.y, -1));
          expect(p.x + half, `${at} is in the right wall`).toBeLessThan(FRAME.width - wallReach(p.y, 1));
          expect(p.y, `${at} is under the floor`).toBeLessThan(TRENCH_FLOOR_Y);
        }
      }
    }
  });

  it('never pops an animal in or out in plain sight: they swim in and out, fade into the dark, or a cut hides it', () => {
    // A cut covers the picture: the flash on "puddle", the game card and the black after "lights off", the end card.
    const covered = (t: number): boolean =>
      Math.abs(t - T.puddle) < 0.25 || (t >= T.game && t <= T.everythingChanges + 0.6) || t >= T.startTidePool + 0.6;
    const eaten = new Set(BITES.map((b) => b.prey));
    const seen = (id: string, t: number): boolean => {
      const a = actorById(id);
      const p = a.place(t);
      const y = toScreen(p.y, t);
      const r = a.length * 0.45;
      return p.alpha > 0.05 && p.x > -r && p.x < FRAME.width + r && y > -r && y < FRAME.height + r;
    };
    for (const a of ACTORS) {
      if (!covered(a.from)) expect(seen(a.id, a.from), `${a.id} pops in at ${a.from.toFixed(2)}s`).toBe(false);
      if (!covered(a.to) && !eaten.has(a.id) && a.to < VIDEO_S) expect(seen(a.id, a.to - 1e-3), `${a.id} pops out at ${a.to.toFixed(2)}s`).toBe(false);
    }
  });

  it('gives every animal a real span on screen, and plays every sound inside the video', () => {
    for (const a of ACTORS) expect(a.to, a.id).toBeGreaterThan(a.from);
    expect(new Set(ACTORS.map((a) => a.id)).size).toBe(ACTORS.length);
    for (const c of CUES) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(VIDEO_S);
    }
  });
});
