import { describe, expect, it } from 'vitest';
import { BOIL } from '../src/art/palette';
import { droneAt } from '../dev/promo/plants/bed';
import { captionAt, LINES, SOUNDS } from '../dev/promo/plants/script';
import {
  AT, BOIL_STEPS, boilAt, boingLabel, bounceAt, cardAt, CUE_WORDS, deepAt, dwarfLabel, earthRays, earthRaysAlpha, flashAt, forestAt, galaxyAt, glintAt,
  globeAt, greenLeafAt, leafRays, leafSceneAt, LOOP_S, notesAt, redDimAt, redFlareAt, said, shakeAt, shareLabel, shockedAt, splatAt, stampAt, starfieldAt,
  sunGlowAt, swayAt, twinkleAt,
} from '../dev/promo/plants/story';
import { TEMPO, WORDS } from '../dev/promo/plants/words';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);

/** What shows of the page and everything on it (render.ts fades it as one layer). */
const onPage = (t: number, v: number): number => cardAt(t).alpha * v;

/** Every animated value that can be seen, by name: the loop must start and end on the same picture. */
const SEEN: Readonly<Record<string, (t: number) => number>> = {
  forestZoom: (t) => forestAt(t).alpha * forestAt(t).zoom,
  forestAlpha: (t) => forestAt(t).alpha,
  sunGlow: sunGlowAt,
  galaxy: galaxyAt,
  twinkle: twinkleAt,
  sway: (t) => swayAt(t, 1.3, 0.03),
  stars: (t) => starfieldAt(t).alpha,
  starsZoom: (t) => starfieldAt(t).alpha * starfieldAt(t).zoom,
  redFlare: (t) => starfieldAt(t).alpha * redFlareAt(t),
  redDim: (t) => starfieldAt(t).alpha * redDimAt(t),
  dwarfLabel, shareLabel,
  leaf: leafSceneAt,
  leafDeep: (t) => leafSceneAt(t) * deepAt(t),
  leafGlint: (t) => leafSceneAt(t) * glintAt(t),
  leafRays: (t) => (leafSceneAt(t) * leafRays(t).reduce((s, r) => s + (r.to - r.from), 0)) / 6,
  card: (t) => cardAt(t).alpha,
  flash: flashAt,
  notes: (t) => onPage(t, notesAt(t).alpha * notesAt(t).heading),
  greenLeaf: (t) => onPage(t, greenLeafAt(t).alpha),
  earthRays: (t) => onPage(t, (earthRaysAlpha(t) * earthRays(t).reduce((s, r) => s + r.to, 0)) / 6),
  bounce: (t) => onPage(t, bounceAt(t).to),
  boing: (t) => onPage(t, boingLabel(t)),
  globe: (t) => onPage(t, globeAt(t)),
  stamp: (t) => onPage(t, stampAt(t)?.alpha ?? 0),
  shake: (t) => shakeAt(t).x + shakeAt(t).y,
  drone: droneAt,
};

describe('promo short: plants on most planets could be black (narrated)', () => {
  it('loops: every animated value at the loop point is what it was at the start', () => {
    for (const [name, f] of Object.entries(SEEN)) expect(f(END), name).toBeCloseTo(f(0), 3);
    expect(stampAt(END)).toBeNull();
    expect(stampAt(0)).toBeNull();
    expect(shockedAt(END)).toBe(shockedAt(0));
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END)).toBe(BOIL - 1);
  });

  it('opens on one picture: the black forest under the red sun, alone, no labels, cards or numbers', () => {
    expect(forestAt(0).alpha).toBe(1);
    expect(forestAt(0).away).toBe(1);
    for (const f of [leafSceneAt, dwarfLabel, shareLabel, flashAt, (t: number) => starfieldAt(t).alpha, (t: number) => cardAt(t).alpha]) expect(f(0)).toBe(0);
    expect(stampAt(0)).toBeNull();
    // Still the same picture for the first couple of seconds, pushing in slowly.
    expect(forestAt(2).alpha).toBe(1);
    expect(forestAt(2).zoom).toBeGreaterThan(forestAt(0).zoom);
    expect(forestAt(2).zoom - forestAt(0).zoom).toBeLessThan(0.1);
  });

  it('never jumps between frames, except the page popping in on "NASA" and the stamp slamming on "WRONG"', () => {
    let slams = 0;
    let pops = 0;
    for (const t of FRAMES) {
      const next = t + FRAME;
      if (forestAt(t).alpha > 0) expect(Math.abs(Math.log(forestAt(next).zoom / forestAt(t).zoom)), `forest zoom at ${t}`).toBeLessThan(0.2);
      if (starfieldAt(t).alpha > 0) expect(Math.abs(Math.log(starfieldAt(next).zoom / starfieldAt(t).zoom)), `star zoom at ${t}`).toBeLessThan(0.25);
      for (const [name, f] of Object.entries(SEEN)) {
        if (['forestZoom', 'starsZoom', 'flash', 'card', 'stamp', 'shake', 'notes', 'greenLeaf', 'bounce'].includes(name)) continue;
        // The Earth pops up with an overshoot: quick, but over several frames.
        expect(Math.abs(f(next) - f(t)), `${name} at ${t.toFixed(3)}`).toBeLessThan(name === 'globe' ? 0.35 : 0.25);
      }
      if (Math.abs(cardAt(next).alpha - cardAt(t).alpha) > 0.25) {
        pops++;
        expect(Math.abs(t - AT.nasa)).toBeLessThan(0.2);
      }
      const [s, u] = [stampAt(t), stampAt(next)];
      if (s && u && Math.abs(u.scale - s.scale) > 0.25) slams++;
      expect(Math.hypot(shakeAt(next).x - shakeAt(t).x, shakeAt(next).y - shakeAt(t).y)).toBeLessThan(55);
      const [g, h] = [greenLeafAt(t), greenLeafAt(next)];
      if (cardAt(t).alpha > 0) expect(Math.abs(h.tilt - g.tilt) + Math.abs(h.wilt - g.wilt) * 0.55, `green leaf at ${t}`).toBeLessThan(0.12);
    }
    expect(pops).toBeLessThanOrEqual(2);
    expect(slams).toBeGreaterThanOrEqual(1);
    expect(slams).toBeLessThanOrEqual(3);
  });

  it('hangs every beat on its word', () => {
    const texts: Readonly<Record<keyof typeof CUE_WORDS, string>> = {
      stars: 'stars', galaxy: 'galaxy,', plants: 'plants', black: 'BLACK.', most: 'Most', red: 'red', dwarfs: 'dwarfs,', dim: 'dim', a: 'A', soak: 'soak',
      every: 'EVERY', gets: 'gets…', pitch: 'pitch', pitchBlack: 'black.', nasa: 'NASA', scientists: 'scientists', worked: 'worked', out: 'out!', our: 'Our',
      ourPlants: 'plants?', they: 'They', bounce: 'bounce', straight: 'straight', back: 'back.', honestly: 'Honestly,', earths: 'Earth\'s', wrong: 'WRONG.',
      outThere: 'Out', sun: 'sun…',
    };
    for (const [k, i] of Object.entries(CUE_WORDS)) {
      expect(WORDS[i]!.text, k).toBe(texts[k as keyof typeof CUE_WORDS]);
      expect(AT[k as keyof typeof CUE_WORDS]).toBeCloseTo(WORDS[i]!.start / TEMPO, 9);
    }
    expect(() => said(WORDS.length)).toThrow();
  });

  it('"BLACK": the sun throbs and the camera punches in', () => {
    expect(sunGlowAt(AT.black + 0.05)).toBeGreaterThan(sunGlowAt(AT.black - 0.4) + 0.35);
    expect(forestAt(AT.black + 0.05).push).toBeGreaterThan(forestAt(AT.black - 0.4).push + 0.03);
    expect(forestAt(AT.black + 0.05).alpha).toBe(1);
  });

  it('"Most stars are red dwarfs, dim and red": out to the stars, the red ones flare, then dim', () => {
    expect(forestAt(AT.most + 1.2).alpha).toBe(0);
    expect(starfieldAt(AT.red).alpha).toBe(1);
    expect(starfieldAt(AT.red).zoom).toBeCloseTo(1, 2);
    expect(redFlareAt(AT.dwarfs + 0.2)).toBe(1);
    expect(dwarfLabel(AT.dwarfs)).toBeGreaterThan(0.9);
    expect(redDimAt(AT.dim + 0.6)).toBe(1);
    expect(shareLabel(AT.dim + 0.3)).toBe(1);
  });

  it('"A plant there would soak up EVERY colour of light": the rays land on the black leaf and drain into it', () => {
    expect(leafSceneAt(AT.soak)).toBe(1);
    expect(starfieldAt(AT.soak).alpha).toBe(0);
    const before = leafRays(AT.soak);
    for (const r of before) expect(r.to).toBeLessThan(0.2);
    const landed = leafRays(AT.gets);
    for (const r of landed) {
      expect(r.to).toBe(1);
      expect(r.from).toBe(0);
    }
    for (const r of leafRays(AT.nasa)) expect(r.from).toBe(1);
    expect(deepAt(AT.pitchBlack + 0.3)).toBe(1);
  });

  it('"NASA scientists worked this out!": the page pops in with a flash, the finding written on it', () => {
    expect(cardAt(AT.nasa + 0.05).alpha).toBe(1);
    expect(flashAt(AT.nasa)).toBeGreaterThan(0.9);
    expect(notesAt(AT.worked).heading).toBe(1);
    expect(notesAt(AT.out + 0.4).black).toBe(1);
    expect(notesAt(AT.out + 0.4).ring).toBe(1);
    expect(leafSceneAt(AT.nasa + 0.6)).toBe(0);
  });

  it('"Our plants? They bounce green light straight back": the Earth leaf, and the green ray boinging off it', () => {
    expect(notesAt(AT.our + 0.1).alpha).toBe(0);
    expect(greenLeafAt(AT.our + 0.3).pop).toBeCloseTo(1, 3);
    expect(bounceAt(AT.bounce - 0.1).to).toBe(0);
    for (const r of earthRays(AT.bounce)) expect(r.to).toBe(1);
    expect(bounceAt(AT.back).to).toBe(1);
    expect(bounceAt(AT.bounce + 0.1).wobble).toBeGreaterThan(0.5);
    expect(boingLabel(AT.bounce + 0.2)).toBe(1);
  });

  it('"Earth\'s plants are doing it WRONG": the Earth pops up, the stamp slams down and the leaf wilts, shocked', () => {
    expect(globeAt(AT.earths + 0.3)).toBeCloseTo(1, 3);
    expect(stampAt(AT.wrong - 0.1)).toBeNull();
    expect(stampAt(AT.wrong + 0.1)!.scale).toBe(1);
    expect(shockedAt(AT.wrong - 0.05)).toBe(false);
    expect(shockedAt(AT.wrong + 0.1)).toBe(true);
    expect(greenLeafAt(AT.wrong + 0.5).wilt).toBe(1);
    expect(Math.abs(shakeAt(AT.wrong + 0.1).x)).toBeGreaterThan(1);
    expect(splatAt(AT.wrong + 0.3)).toBeGreaterThan(0);
  });

  it('"Out there, under a red sun…": the page fades and the camera pushes back into the forest, landing on frame 1', () => {
    expect(cardAt(AT.outThere + 0.6).alpha).toBe(0);
    expect(forestAt(AT.sun).alpha).toBe(1);
    expect(forestAt(AT.outThere).zoom).toBeLessThan(0.85);
    // Still pushing in, slowly, as it crosses the loop point.
    expect(forestAt(LOOP_S - 0.5).zoom).toBeLessThan(forestAt(END).zoom);
    expect(forestAt(0.5).zoom).toBeGreaterThan(forestAt(0).zoom);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    // "BLACK." and "WRONG." get lines of their own.
    expect(LINES.find((l) => l.words[0]!.text === 'BLACK.')!.words).toHaveLength(1);
    expect(LINES.find((l) => l.words[0]!.text === 'WRONG.')!.words).toHaveLength(1);
  });

  it('is 22.5 s, a whole number of frames and boil cycles, the voice ending just before the loop point and every sound inside it', () => {
    expect(LOOP_S).toBe(22.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-9);
    expect(BOIL_STEPS % BOIL).toBe(0);
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('sun…');
    const gap = LOOP_S - last.end / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // One hit on "BLACK", one stamp on "WRONG", one boing on "bounce".
    expect(SOUNDS.filter((s) => s.id === 'hit' && Math.abs(s.t - AT.black) < 0.1)).toHaveLength(1);
    expect(SOUNDS.filter((s) => s.id === 'stamp' && Math.abs(s.t - AT.wrong) < 0.05)).toHaveLength(1);
    expect(SOUNDS.filter((s) => s.id === 'boing' && Math.abs(s.t - AT.bounce) < 0.05)).toHaveLength(1);
    // The drone under the forest, silent on the bright page.
    expect(droneAt(1)).toBeGreaterThan(0.9);
    expect(droneAt(AT.wrong)).toBe(0);
  });
});
