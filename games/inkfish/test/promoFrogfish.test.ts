import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, LINES, SOUNDS } from '../dev/promo/frogfish/script';
import { TOTAL_LEN } from '../dev/promo/frogfish/shape';
import {
  BAIT_AT, baitWorld, BLINK_AT, blinkSwap, boilAt, BOIL_STEPS, bellyAt, cameraAt, CHROMIS_LEN, chromisAt, faceAt, FAKE_AT, FROG_LEN, frogAt, frogLookAt, GONE_AT,
  happyAt, hiddenAt, innocentAt, irisAt, IRIS, IRIS_SWAP, IT_AT, K, LENGTH_AT, lidsAt, LOOP_S, moodAt, mouthAt, NEEDLE_LEN, needleAt, raisedAt, rodAt, said, shakeAt,
  SLURPED_AT, SNAP_AT, SO_AT, SPONGE_AT, STRIKE_AT, suctionAt, THEN_AT, toScreen, TWELVE_AT, TWICE_AT, WIGGLES_AT, wiggleAt, wrap, wrasseAt, BIGGER_AT,
} from '../dev/promo/frogfish/story';
import { TEMPO, WORDS } from '../dev/promo/frogfish/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const onScreen = (p: { x: number; y: number }, t: number, margin = 0): boolean => {
  const q = toScreen(cameraAt(t), p);
  return q.x > -margin && q.x < 1080 + margin && q.y > -margin && q.y < 1920 + margin;
};

describe('promo short: this fish eats faster than you can BLINK (narrated)', () => {
  it('loops: the frog, its mouth, the rod, the chromis, the camera and every effect are where they started', () => {
    for (const key of ['x', 'y', 'zoom'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 2);
    for (const key of ['x', 'y', 'tilt'] as const) expect(frogAt(END)[key]).toBeCloseTo(frogAt(0)[key], 3);
    for (const key of ['jaw', 'throat', 'belly'] as const) expect(frogLookAt(END)[key]).toBeCloseTo(frogLookAt(0)[key], 2);
    expect(rodAt(END).angle).toBeCloseTo(rodAt(0).angle, 3);
    expect(rodAt(END).bend).toBeCloseTo(rodAt(0).bend, 3);
    const [a, b] = [chromisAt(END)!, chromisAt(0)!];
    expect(a).not.toBeNull();
    expect(dist(a, b)).toBeLessThan(3);
    expect(a.tilt).toBeCloseTo(b.tilt, 2);
    for (const fn of [suctionAt, lidsAt, irisAt, happyAt, innocentAt, wiggleAt, raisedAt]) expect(fn(END)).toBeCloseTo(fn(0), 2);
    expect(faceAt(END, a).lid).toBeCloseTo(faceAt(0, b).lid, 2);
    expect(Math.hypot(shakeAt(END).x - shakeAt(0).x, shakeAt(END).y - shakeAt(0).y)).toBeLessThan(1);
    expect(moodAt(END).to).toBe(moodAt(0).to);
    expect(wrasseAt(END)).toBeNull();
    expect(needleAt(END)).toBeNull();
    // The line boil steps a whole number of cycles a loop.
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(boilAt(END)).toBe(BOIL_STEPS - 1);
    expect(LOOP_S * BOIL_FPS).toBe(BOIL_STEPS);
    // Gone from the picture before the loop point, the credit too.
    expect(creditAt(END, LOOP_S)).toBe(0);
  });

  it('never jumps, except inside a blink or the dark of the spotlight', () => {
    let snaps = 0;
    for (const t of FRAMES) {
      const hidden = hiddenAt(t) || hiddenAt(t + FRAME);
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      if (!hidden) {
        expect(Math.abs(Math.log(d.zoom / c.zoom))).toBeLessThan(0.12);
        expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThan(80);
        expect(dist(frogAt(t), frogAt(t + FRAME))).toBeLessThan(40);
      }
      const step = frogLookAt(t + FRAME).jaw - frogLookAt(t).jaw;
      if (step < -0.25) snaps++;
      else if (!hidden) expect(Math.abs(step)).toBeLessThan(0.75);
    }
    // The jaws snap shut on "gone!" (and in the hook's blink, unseen).
    expect(snaps).toBeGreaterThanOrEqual(1);
    expect(snaps).toBeLessThanOrEqual(3);
  });

  it('frame 1 is the hook shown literally: close on the mouth exploded open, a fish half sucked in, water rushing in, nothing written but the caption', () => {
    for (const t of [0, 0.3]) {
      const look = frogLookAt(t);
      expect(look.jaw).toBeGreaterThan(0.95);
      expect(look.throat).toBeGreaterThan(0.9);
      const fish = chromisAt(t)!;
      expect(fish.inMouth).toBe(true);
      expect(dist(fish, mouthAt(t).at)).toBeLessThan(CHROMIS_LEN * 0.6);
      expect(suctionAt(t)).toBe(1);
      const cam = cameraAt(t);
      expect(cam.zoom).toBeGreaterThan(1.4);
      // The mouth in the middle of the picture, above the captions.
      const m = toScreen(cam, mouthAt(t).at);
      expect(m.x).toBeGreaterThan(400);
      expect(m.x).toBeLessThan(900);
      expect(m.y).toBeGreaterThan(400);
      expect(m.y).toBeLessThan(1100);
      // Opened big: the mouth is taller than a fifth of the screen's width.
      expect(mouthAt(t).height * cam.zoom).toBeGreaterThan(216);
      expect(lidsAt(t)).toBe(0);
      expect(irisAt(t)).toBeGreaterThan(1.15);
      expect(moodAt(t).to).toBe('thrill');
      expect(creditAt(t, LOOP_S)).toBe(0);
    }
    // Slow motion: it barely moves between the first frames.
    expect(dist(chromisAt(0)!, chromisAt(0.3)!)).toBeLessThan(25);
    expect(captionAt(0)!.line.words[0]!.text).toBe('This');
  });

  it('blinks on "BLINK!": the screen shuts, and when it opens the fish is gone and the frogfish looks innocent', () => {
    expect(Math.abs(blinkSwap(0) - BLINK_AT)).toBeLessThan(0.25);
    expect(lidsAt(blinkSwap(0))).toBe(1);
    expect(chromisAt(blinkSwap(0) - 0.06)).not.toBeNull();
    expect(chromisAt(blinkSwap(0) + 0.01)).toBeNull();
    expect(frogLookAt(blinkSwap(0) + 0.3).jaw).toBe(0);
    expect(lidsAt(blinkSwap(0) + 0.3)).toBe(0);
    expect(innocentAt(blinkSwap(0) + 0.35)).toBe(1);
  });

  it('pulls back to the frog among sponges on "sits still, pretending to be a sponge", a wrasse passing over it, its eye following, then peeking shut', () => {
    expect(moodAt(said('sits')).to).toBe('sneaky');
    expect(cameraAt(SPONGE_AT).zoom).toBeLessThan(1);
    expect(onScreen(frogAt(SPONGE_AT), SPONGE_AT)).toBe(true);
    const fish = wrasseAt(said('pretending'))!;
    expect(fish).not.toBeNull();
    expect(onScreen(fish, said('pretending'))).toBe(true);
    // It sits still: the frog doesn't move.
    expect(dist(frogAt(said('sits')), frogAt(SPONGE_AT))).toBeLessThan(5);
    expect(faceAt(SPONGE_AT + 0.3, fish).lid).toBeGreaterThan(0.7);
  });

  it('raises its rod and wiggles the bait on "wiggles a little fake bait", the wrasse turning round on "fake bait" and creeping up to it', () => {
    expect(moodAt(WIGGLES_AT).to).toBe('hush');
    expect(raisedAt(WIGGLES_AT + 0.4)).toBe(1);
    expect(wiggleAt(BAIT_AT)).toBe(1);
    expect(cameraAt(BAIT_AT).zoom).toBeGreaterThan(1.6);
    expect(onScreen(baitWorld(BAIT_AT), BAIT_AT, -100)).toBe(true);
    expect(wrasseAt(FAKE_AT - 0.2)!.facing).toBe(1);
    expect(wrasseAt(BAIT_AT + 0.3)!.facing).toBe(-1);
    // Closer to the bait as it creeps.
    const near = (t: number): number => dist(wrasseAt(t)!, baitWorld(t));
    expect(near(THEN_AT)).toBeLessThan(near(BAIT_AT + 0.3) - 80);
  });

  it('strikes on "Then": the mouth balloons through "TWELVE times bigger…" and snaps shut on "gone!" with the wrasse inside', () => {
    expect(moodAt(THEN_AT + 0.05).to).toBe('shock');
    expect(frogLookAt(THEN_AT - 0.05).jaw).toBe(0);
    expect(frogLookAt(THEN_AT + 0.15).jaw).toBeGreaterThan(0.25);
    // Growing, in slow motion.
    expect(frogLookAt(TWELVE_AT).jaw).toBeGreaterThan(frogLookAt(THEN_AT + 0.3).jaw + 0.15);
    expect(frogLookAt(TWELVE_AT + 0.35).throat).toBeGreaterThan(1.1);
    expect(frogLookAt(BIGGER_AT + 0.2).jaw).toBeGreaterThan(0.95);
    expect(wrasseAt(TWELVE_AT + 0.2)!.inMouth).toBe(true);
    expect(frogLookAt(SNAP_AT + 0.1).jaw).toBe(0);
    expect(wrasseAt(SNAP_AT + 0.1)).toBeNull();
    expect(Math.abs(SNAP_AT - GONE_AT)).toBeLessThan(0.1);
    expect(Math.hypot(shakeAt(SNAP_AT + 0.05).x, shakeAt(SNAP_AT + 0.05).y)).toBeGreaterThan(5);
    expect(innocentAt(SNAP_AT + 0.6)).toBe(1);
  });

  it('blinks to a needlefish almost twice its length sticking out of its mouth, its belly a balloon, slurped in on "length."', () => {
    expect(NEEDLE_LEN / FROG_LEN).toBeGreaterThan(1.7);
    expect(NEEDLE_LEN / FROG_LEN).toBeLessThan(2);
    expect(FROG_LEN).toBeCloseTo(TOTAL_LEN * K, 5);
    expect(lidsAt(blinkSwap(1))).toBe(1);
    expect(needleAt(blinkSwap(1) - 0.02)).toBeNull();
    const n = needleAt(IT_AT + 0.1)!;
    expect(n.inMouth).toBe(true);
    expect(moodAt(IT_AT).to).toBe('laugh');
    // Most of it still outside when it first shows: longer than the frog.
    const tail = { x: n.x - n.facing * Math.cos(n.tilt) * 0.54 * n.length, y: n.y + Math.sin(n.tilt) * 0.54 * n.length };
    expect(dist(tail, mouthAt(IT_AT + 0.1).at)).toBeGreaterThan(FROG_LEN);
    expect(bellyAt(TWICE_AT + 0.5)).toBeGreaterThan(bellyAt(IT_AT + 0.1));
    expect(needleAt(SLURPED_AT + 0.05)).toBeNull();
    expect(happyAt(SLURPED_AT + 0.3)).toBe(1);
    expect(Math.abs(SLURPED_AT - LENGTH_AT)).toBeLessThan(0.6);
  });

  it('closes to a spotlight on "So watch closely", the chromis creeping up to the wiggling bait, and strikes into frame 1', () => {
    expect(moodAt(SO_AT + 0.1).to).toBe('drama');
    expect(irisAt(IRIS_SWAP)).toBe(0);
    expect(irisAt(IRIS.spot)).toBeLessThan(0.3);
    expect(irisAt(STRIKE_AT)).toBeGreaterThan(1.15);
    expect(belliesGone()).toBe(true);
    const c = chromisAt(15.5)!;
    expect(c.inMouth).toBe(false);
    expect(dist(chromisAt(STRIKE_AT - 0.05)!, baitWorld(STRIKE_AT - 0.05))).toBeLessThan(dist(c, baitWorld(15.5)));
    expect(frogLookAt(STRIKE_AT - 0.05).jaw).toBe(0);
    expect(frogLookAt(STRIKE_AT + 0.12).jaw).toBeGreaterThan(0.9);
    expect(chromisAt(STRIKE_AT + 0.25)!.inMouth).toBe(true);
    expect(wrap(STRIKE_AT + 0.3)).toBeLessThan(LOOP_S);
  });

  it('captions every word in order, from the loop point, and the voice ends before the loop does', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    LINES.forEach((l, i) => {
      expect(l.to).toBeGreaterThan(l.from);
      if (i > 0) expect(l.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    });
    expect(LINES[0]!.from).toBe(0);
    expect(LINES.at(-1)!.to).toBe(LOOP_S);
    expect(WORDS.at(-1)!.end / TEMPO).toBeLessThan(LOOP_S - 0.2);
    expect(captionAt(GONE_AT + 0.05)!.line.words.map((w) => w.text)).toEqual(['gone!']);
  });

  it('plays the game’s sounds inside the loop, with a big gulp on "gone!"', () => {
    for (const c of SOUNDS) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(LOOP_S);
      expect(c.gain).toBeLessThanOrEqual(0.5);
    }
    expect(SOUNDS.some((c) => c.id === 'eatBig' && Math.abs(c.t - SNAP_AT) < 0.05 && c.gain >= 0.4)).toBe(true);
  });
});

/** The long beat's belly is let down in the spotlight's dark. */
function belliesGone(): boolean {
  return bellyAt(IRIS_SWAP + 0.05) === 0 && frogLookAt(IRIS.spot).belly === 0;
}
