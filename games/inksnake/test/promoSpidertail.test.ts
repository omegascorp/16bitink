import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { SPOKEN } from '../dev/promo/captions';
import { boilAt } from '../dev/promo/sprites';
import { quietLine, RIDE_DB, VOICE_GAIN, voiceRide } from '../dev/promo/spidertail/audio';
import { captionAt, LINES, SOUNDS, STAMP } from '../dev/promo/spidertail/script';
import {
  birdAt, BITE_AT, BURST_AT, bulbTaken, camouflage, cameraAt, CLEAN_AT, CUT_HOME, CUT_LOW, CUT_OTHER, CUT_SAD, CUT_TOP, ends, flash, FLY_AT, FRAME1, frozen, GRIP, headAt, HOME, HOPS, LOOP_S,
  lureAt, ONE_AT, PECK_AT, PECKED_AT, REGROW, said, shakeAt, shotAt, SPIDER2_AT, stamp, STOPS_AT, wrap,
} from '../dev/promo/spidertail/story';
import { paletteAt } from '../dev/promo/spidertail/scene';
import { TEMPO, WORDS } from '../dev/promo/spidertail/words';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const CUTS = [CUT_TOP, CUT_LOW, CUT_OTHER, CUT_SAD, CUT_HOME, 0, LOOP_S];

/** Time-only values and the biggest step each may take in one frame. */
const TIMED: Readonly<Record<string, readonly [(t: number) => number, number]>> = {
  zoom: [(t) => Math.log(cameraAt(t).k), 0.12],
  camX: [(t) => cameraAt(t).cx, 90],
  camY: [(t) => cameraAt(t).cy, 125],
  headX: [(t) => headAt(t).bx, 80],
  headY: [(t) => headAt(t).by, 120],
  headTurn: [(t) => headAt(t).theta, 0.5],
  jaws: [(t) => headAt(t).open, 0.7],
  lid: [(t) => headAt(t).lid, 0.2],
  lure: [(t) => lureAt(t).grow, 1.01],
  flash: [flash, 1.01],
  camo: [camouflage, 0.6],
  stamp: [stamp, 0.2],
};

describe('promo short: this snake\'s tail is a fake spider (narrated, InkSnake)', () => {
  it('is 21 s, a multiple of 1.5 s, and every word fits inside it, the last ending just before the loop point', () => {
    expect(LOOP_S).toBe(21);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(END)).toBe(boilAt(LOOP_S - FRAME));
    expect(boilAt(LOOP_S - FRAME + 1 / 8)).toBe(boilAt(0));
    for (const w of WORDS) expect(w.end / TEMPO).toBeLessThan(LOOP_S);
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    expect(LOOP_S - last.end / TEMPO).toBeLessThan(0.5);
  });

  it('loops: the camera, the head, the bird, the lure and the colours are where they started', () => {
    for (const [name, [f]] of Object.entries(TIMED)) expect(f(END), name).toBeCloseTo(f(0), 1);
    const [h1, h2] = [headAt(END), headAt(0)];
    for (const key of ['bx', 'by', 'theta', 'open', 'lid', 'sorrow', 'tongue'] as const) expect(h1[key], key).toBeCloseTo(h2[key], 2);
    const [b1, b2] = [birdAt(END)!, birdAt(0)!];
    expect(b1).not.toBeNull();
    for (const key of ['x', 'y', 'lift', 'wing', 'dip', 'tilt', 'eye', 'ruffle'] as const) expect(b1[key], key).toBeCloseTo(b2[key], 2);
    expect(b1.carry).toBe(b2.carry);
    expect(lureAt(END).grow).toBeCloseTo(lureAt(0).grow, 2);
    expect(lureAt(END).twitch).toBeCloseTo(lureAt(0).twitch, 2);
    expect(bulbTaken(END)).toBe(false);
    expect(paletteAt(END).tintA).toBeCloseTo(paletteAt(0).tintA, 4);
    expect(paletteAt(END).skyTop).toBe(paletteAt(0).skyTop);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 3);
    expect(captionAt(END)?.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)?.line).toBe(LINES[0]);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('never jumps: every timed value moves smoothly, frame to frame, except at the planned cuts', () => {
    for (const t of FRAMES) {
      if (CUTS.some((c) => Math.abs(wrap(t + FRAME) - c) < FRAME * 0.51 || Math.abs(wrap(t) - c) < FRAME * 0.51)) continue;
      for (const [name, [f, limit]] of Object.entries(TIMED)) {
        expect(Math.abs(f(t + FRAME) - f(t)), `${name} at ${t.toFixed(2)}`).toBeLessThan(limit);
      }
    }
  });

  it('opens close and low on the fake spider at the tail tip, the coil and horned head behind it, the warbler bending to it, nothing written but the words', () => {
    expect(shotAt(0)).toBe('hook');
    const lure = lureAt(0);
    expect(lure.grow).toBe(1);
    expect(bulbTaken(0)).toBe(false);
    const bird = birdAt(0)!;
    expect(bird.carry).toBe(false);
    expect(bird.dip).toBeGreaterThan(0.6);
    expect(bird.x).toBe(HOME.x);
    const head = headAt(0);
    expect(head.open).toBe(0);
    expect(Math.cos(head.theta)).toBeLessThan(-0.5);
    expect(camouflage(0)).toBe(0);
    expect(stamp(0)).toBe(0);
    expect(flash(0)).toBe(0);
    expect(cameraAt(0)).toEqual({ ...FRAME1, k: expect.closeTo(FRAME1.k, 2) });
    expect(FRAME1.k).toBeGreaterThan(1);
  });

  it('keeps the story in order: dawn, a landing, a lure from the bird\'s eye, five hops, the peck, the catch, the freeze, another bird, the stub, the regrowth', () => {
    expect(birdAt(3.0)).toBeNull();
    expect(cameraAt(3.1).cy).toBeLessThan(cameraAt(0).cy - 400);
    expect(birdAt(STOPS_AT + 0.4)!.lift).toBe(0);
    expect(birdAt(5.5)!.wing).toBe(0);
    expect(shotAt(SPIDER2_AT)).toBe('top');
    expect(camouflage(SPIDER2_AT)).toBeGreaterThan(0.8);
    expect(lureAt(10.2).twitch).toBeGreaterThan(0.8);
    expect(HOPS).toHaveLength(5);
    const sizes = HOPS.map((h) => h.size);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    expect(birdAt(HOPS[2]!.land - 0.1)!.lift).toBeGreaterThan(20);
    expect(cameraAt(12).k).toBeGreaterThan(cameraAt(CUT_LOW + 0.05).k);
    expect(lureAt(PECK_AT + 0.1).jolt).toBeGreaterThan(0.5);
    // The bite: the hidden head bursts up wide on "ROCK", the jaws close on this bird on "bites", eyes shut; the lure stays on the tail, whole.
    expect(headAt(BURST_AT - 0.01).open).toBe(0);
    expect(camouflage(BURST_AT - 0.1)).toBeGreaterThan(0.8);
    expect(camouflage(BURST_AT + 0.1)).toBe(0);
    expect(flash(BURST_AT + 0.02)).toBeGreaterThan(0.7);
    expect(headAt(BURST_AT + 0.15).open).toBeGreaterThan(0.9);
    expect(birdAt(BITE_AT - 0.05)!.eye).toBe(0);
    expect(headAt(BITE_AT + 0.15).open).toBeCloseTo(GRIP, 2);
    const held = birdAt(BITE_AT + 0.3)!;
    expect(held.eye).toBe(1);
    expect(held.limp).toBe(1);
    expect(held.carry).toBe(false);
    // The freeze: everything holds on the catch, the "0.2 s" shows, the lure is still there.
    const [a, b] = [headAt(said('fifth')), headAt(CUT_OTHER - 0.05)];
    expect(Math.abs(a.bx - b.bx) + Math.abs(a.by - b.by)).toBeLessThan(6);
    expect(frozen(15)).toBeGreaterThan(0.9);
    expect(stamp(said('fifth') + 0.3)).toBe(1);
    for (const t of [BITE_AT + 0.3, 15, CUT_OTHER - 0.02]) {
      expect(lureAt(t).grow).toBe(1);
      expect(bulbTaken(t)).toBe(false);
    }
    // Another day: a cut, new light, a new bird, which pulls the bulb off and flies; the snake stares at the stub.
    expect(CUT_OTHER).toBeCloseTo(ONE_AT, 1);
    expect(shotAt(ONE_AT + 0.1)).toBe('other');
    expect(birdAt(ONE_AT + 0.1)!.other).toBe(true);
    expect(birdAt(ONE_AT + 0.1)!.eye).toBe(0);
    expect(birdAt(PECKED_AT + 0.05)!.dip).toBeGreaterThan(0.9);
    expect(lureAt(CLEAN_AT - 0.02).pull).toBeGreaterThan(25);
    expect(lureAt(FLY_AT - 0.01).grow).toBe(1);
    expect(lureAt(FLY_AT + 0.01).grow).toBe(0);
    expect(birdAt(FLY_AT + 0.4)!.carry).toBe(true);
    expect(birdAt(FLY_AT + 0.4)!.wing).toBe(1);
    expect(birdAt(FLY_AT + 0.6)!.y).toBeLessThan(birdAt(FLY_AT + 0.1)!.y);
    // The sad face, the regrowth, and the cut to frame 1 inside "yes,".
    expect(birdAt(CUT_SAD + 0.2)).toBeNull();
    expect(lureAt(19.3).grow).toBe(0);
    expect(headAt(19.3).sorrow).toBeGreaterThan(0.9);
    expect(lureAt(REGROW[1]).grow).toBeGreaterThan(0.95);
    expect(lureAt(CUT_HOME + 0.05).grow).toBe(1);
    expect(CUT_HOME).toBeGreaterThan(said('yes,'));
    expect(CUT_HOME).toBeLessThan(ends('yes,'));
    expect(shotAt(CUT_HOME + 0.01)).toBe('hook');
  });

  it('has a different mood for each sentence: ten sky colours, one for each', () => {
    const times = [1, 3, 5, 9, 11.5, 12.6, 14.5, 17, 19.3];
    const skies = [...times, 20.9].map((t) => paletteAt(t).skyTop);
    expect(new Set(skies).size).toBe(9);
    expect(paletteAt(0.5).skyTop).toBe(paletteAt(20.9).skyTop);
  });

  it('keeps every word on screen with the spoken line, in order, and every noun in view when it is said', () => {
    expect(LINES[0]!.from).toBe(0);
    expect(LINES[LINES.length - 1]!.to).toBe(LOOP_S);
    const seen: string[] = [];
    for (const w of WORDS) {
      const c = captionAt((w.start + 0.01) / TEMPO);
      expect(c, w.text).not.toBeNull();
      expect(c!.line.words[c!.word]!.text).toBe(w.text);
      seen.push(c!.line.words[c!.word]!.text);
    }
    expect(seen).toEqual(WORDS.map((w) => w.text));
    // "snake", "tail", "spider": the fake spider, the tail and the viper are all in frame 1; "warbler" and "rock": the bird lands on the slab;
    // "stone", "spider", "legs": the lure on show; "peck": the bird's beak on the bulb; "ROCK": the head out of the rock; "bird", "spider": the bird flies off with it.
    expect(birdAt(said('warbler') + 0.6)).not.toBeNull();
    expect(lureAt(said('spider!', 2)).grow).toBe(1);
    expect(birdAt(said('Peck!') + 0.1)!.dip).toBeGreaterThan(0.85);
    expect(headAt(said('ROCK') + 0.1).open).toBeGreaterThan(0.5);
    expect(birdAt(ends('OFF!'))!.carry).toBe(true);
    expect(lureAt(said('snake.') + 0.3).grow).toBe(0);
  });

  it('keeps all text inside the clear area (y 270 to 1250)', () => {
    expect(SPOKEN.y).toBeGreaterThan(270);
    expect(SPOKEN.y).toBeLessThan(1250);
    expect(STAMP.y - STAMP.size * 0.8).toBeGreaterThanOrEqual(270);
    expect(STAMP.y).toBeLessThan(1250);
  });

  it('has a sound for every beat, all inside the loop', () => {
    for (const c of SOUNDS) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(LOOP_S);
      expect(c.gain).toBeGreaterThan(0);
    }
    const near = (t: number, id?: string): boolean => SOUNDS.some((c) => Math.abs(c.t - wrap(t)) < 0.15 && (!id || c.id === id));
    expect(near(PECK_AT, 'tick')).toBe(true);
    expect(near(BURST_AT, 'strike')).toBe(true);
    expect(near(CUT_SAD, 'lose')).toBe(true);
    for (const h of HOPS) expect(near(h.land, 'steps')).toBe(true);
    expect(near(REGROW[0], 'grown')).toBe(true);
  });

  it('rides the voice up by 9 dB across exactly "It hops closer…", in 40 ms ramps', () => {
    const { from, to } = quietLine();
    expect(from).toBeCloseTo(said('It'), 6);
    expect(to).toBeCloseTo(ends('closer…'), 6);
    const ride = voiceRide();
    const up = VOICE_GAIN * 10 ** (RIDE_DB / 20);
    expect(RIDE_DB).toBe(9);
    expect(ride.find(([t]) => Math.abs(t - from) < 1e-9)![1]).toBeCloseTo(up, 6);
    expect(ride.find(([t]) => Math.abs(t - to) < 1e-9)![1]).toBeCloseTo(up, 6);
    expect(ride.find(([t]) => Math.abs(t - (from - 0.04)) < 1e-9)![1]).toBeCloseTo(VOICE_GAIN, 6);
    expect(ride.find(([t]) => Math.abs(t - (to + 0.04)) < 1e-9)![1]).toBeCloseTo(VOICE_GAIN, 6);
  });
});
