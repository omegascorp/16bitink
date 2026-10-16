import { describe, expect, it } from 'vitest';
import {
  cameraLabel, captionAt, equalsAt, eyeRingAt, LINES, questionAt, sealTag, SOUNDS, surferTags, visionLabel, youngLabel,
} from '../dev/promo/surfer/script';
import {
  boilAt, BOIL_STEPS, cameraAt, eyeOf, filmingAt, type Fish, LOOP_S, noseOf, said, SEAL_X, sealAt, sharkAt, SURFACE_Y, surferAt, visionAt,
} from '../dev/promo/surfer/story';
import { TEMPO, WORDS } from '../dev/promo/surfer/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'len', 'face', 'tilt', 'effort'] as const;
const onScreen = (x: number): boolean => x > 0 && x < 1080;

const same = (a: Fish, b: Fish): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
  expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
};

/** The surfer's tag at time t (the one most shown). */
const tagAt = (t: number): { text: string; alpha: number; red: boolean } | undefined => [...surferTags(t)].sort((a, b) => b.alpha - a.alpha)[0];

/** Whether p is inside the triangle abc. */
function inside(p: { x: number; y: number }, [a, b, c]: readonly { x: number; y: number }[]): boolean {
  const side = (u: { x: number; y: number }, v: { x: number; y: number }): number => (v.x - u.x) * (p.y - u.y) - (v.y - u.y) * (p.x - u.x);
  const [d1, d2, d3] = [side(a!, b!), side(b!, c!), side(c!, a!)];
  return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}

/** The shark's view, as render.ts draws it (scene.ts's viewCone, without the canvas). */
async function coneAt(t: number): Promise<readonly { x: number; y: number }[]> {
  const { viewCone } = await import('../dev/promo/surfer/scene');
  return viewCone(eyeOf(sharkAt(t)));
}

describe('promo short: to a shark, you look like THIS (narrated)', () => {
  it('loops: the shark, the seal, the surfer and every note are where they were at the start', () => {
    same(sharkAt(END), sharkAt(0));
    same(sealAt(END)!, sealAt(0)!);
    const [s0, s1] = [surferAt(0), surferAt(END)];
    expect(s1.x).toBeCloseTo(s0.x, 2);
    expect(s1.y).toBeCloseTo(s0.y, 2);
    expect(Math.cos(s1.stroke - s0.stroke)).toBeCloseTo(1, 3);
    for (const f of [visionAt, cameraAt, filmingAt, sealTag, equalsAt, cameraLabel, visionLabel, youngLabel, eyeRingAt, questionAt]) {
      expect(f(END)).toBeCloseTo(f(0), 4);
    }
    expect(tagAt(END)!.text).toBe(tagAt(0)!.text);
    expect(tagAt(END)!.alpha).toBeCloseTo(tagAt(0)!.alpha, 4);
  });

  it('never jumps: the shark, the seal and the tags move on smoothly, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      const [p, q] = [sharkAt(a), sharkAt(b)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(15);
      expect(Math.abs(q.face - p.face)).toBeLessThan(0.3);
      expect(Math.abs(q.tilt - p.tilt)).toBeLessThan(0.08);
      const [m, n] = [sealAt(a), sealAt(b)];
      if (m && n) {
        expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeLessThan(20);
        if (onScreen(m.x - m.len / 2)) expect(Math.abs(n.face - m.face)).toBeLessThan(0.3);
      } else if (m || n) {
        // It only comes and goes off the right of the frame.
        expect((m ?? n)!.x - 0.5 * (m ?? n)!.len).toBeGreaterThan(1080);
      }
      expect(Math.abs(visionAt(b) - visionAt(a))).toBeLessThan(0.15);
      const sum = (x: number): number => surferTags(x).reduce((s, g) => s + g.alpha, 0);
      expect(Math.abs(sum(b) - sum(a))).toBeLessThan(0.6);
    }
  });

  it('opens on the hook: "you" on the surfer, the shark below looking up, the seal swimming in to sit beside him on "THIS"', () => {
    expect(tagAt(0)).toMatchObject({ text: 'you', alpha: 1 });
    const s = sharkAt(0);
    expect(onScreen(s.x)).toBe(true);
    expect(s.y - SURFACE_Y).toBeGreaterThan(300);
    expect(s.tilt).toBeGreaterThan(0.1);
    const seal = sealAt(0)!;
    expect(onScreen(seal.x - seal.len / 2)).toBe(true);
    expect(sealAt(0.3)!.x).toBeLessThan(seal.x);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('To a shark,');
    const at = said('THIS.') + 0.3;
    expect(sealAt(at)!.x).toBeCloseTo(SEAL_X, -1);
    expect(sealTag(at)).toBe(1);
    expect(equalsAt(at)).toBe(1);
    expect(tagAt(at)!.text).toBe('you');
  });

  it('films them from below on "Scientists filmed surfers and seals from below", tagging each as it is named', () => {
    expect(cameraAt(said('Scientists') + 0.4)).toBe(1);
    expect(cameraLabel(said('Scientists') + 0.3)).toBe(1);
    expect(filmingAt(said('below,'))).toBe(1);
    expect(tagAt(said('surfers') + 0.2)).toMatchObject({ text: 'surfer', alpha: 1 });
    expect(sealTag(said('seals'))).toBe(1);
    expect(sealAt(said('seals'))).not.toBeNull();
    // The hook's "=" is gone while they're filmed.
    expect(equalsAt(said('surfers'))).toBe(0);
  });

  it('turns to grey, blurred shark vision on "saw them the way a young white shark does", taking in both silhouettes', async () => {
    expect(visionAt(said('saw') - 0.2)).toBe(0);
    expect(visionAt(said('young'))).toBe(1);
    expect(visionLabel(said('young'))).toBe(1);
    expect(youngLabel(said('shark') + 0.1)).toBe(1);
    expect(cameraAt(said('young'))).toBe(0);
    for (const w of ['young', 'eyes', 'APART.']) {
      const t = said(w);
      const cone = await coneAt(t);
      const surfer = surferAt(t);
      expect(inside({ x: surfer.x, y: surfer.y + 20 }, cone)).toBe(true);
      expect(inside(sealAt(t)!, cone)).toBe(true);
    }
  });

  it('rings its eye on "eyes", puts a "?" over it on "couldn\'t", and "=" between the blobs on "APART"', () => {
    expect(eyeRingAt(said('eyes') + 0.3)).toBe(1);
    expect(questionAt(said("couldn't") - 0.1)).toBe(0);
    expect(questionAt(said("couldn't") + 0.2)).toBeGreaterThan(0.95);
    expect(equalsAt(said('APART.') - 0.2)).toBe(0);
    expect(equalsAt(said('APART.') + 0.2)).toBe(1);
    expect(sealTag(said('APART.'))).toBe(1);
  });

  it('rises softly towards the surfer on "sharks bite people", tags him "seal?", and turns away well short of him', () => {
    expect(visionAt(said('sharks'))).toBe(0);
    expect(sealAt(said('people:'))).toBeNull();
    expect(sharkAt(said('seal.')).y).toBeLessThan(sharkAt(said('It')).y - 120);
    expect(tagAt(said('people:') + 0.2)).toMatchObject({ text: 'person', alpha: 1 });
    expect(tagAt(said('seal.') + 0.2)).toMatchObject({ text: 'seal?', alpha: 1, red: true });
    // Never closer than ~2 surfer heights under the surface: no contact, no bite.
    for (let t = 0; t < LOOP_S; t += FRAME) expect(noseOf(sharkAt(t)).y - SURFACE_Y).toBeGreaterThan(200);
    // It veers off right and down once "seal." is said.
    const [a, b] = [sharkAt(said('seal.') + 0.7), sharkAt(said('seal.') + 1.2)];
    expect(a.face).toBe(1);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it('paddles on into "So next time you paddle out, remember:", the shark circling below and the seal coming back', () => {
    expect(tagAt(said('you', 2) + 0.2)).toMatchObject({ text: 'you', alpha: 1 });
    for (const w of ['So', 'paddle', 'remember:']) expect(onScreen(sharkAt(said(w)).x)).toBe(true);
    expect(sharkAt(said('remember:') + 0.3).face).toBe(-1);
    expect(sealAt(said('remember:'))).not.toBeNull();
    expect(visionAt(said('remember:'))).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('remember:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop and nothing bright on the bite beat', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    // A low thud on "THIS", a ding on "APART".
    expect(SOUNDS.some((s) => s.id === 'boom' && Math.abs(s.t - said('THIS.')) < 0.05 && s.pitch < 1)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'clang' && Math.abs(s.t - said('APART.')) < 0.05)).toBe(true);
    const soft = SOUNDS.filter((s) => s.t > said('sharks') - 0.5 && s.t < said('So'));
    expect(soft.length).toBeGreaterThan(0);
    for (const s of soft) {
      expect(['lunge', 'dash']).toContain(s.id);
      expect(s.pitch).toBeLessThan(1);
    }
  });
});
