import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, doorAt, LINES, placeLabel, sizeBar, SOUNDS } from '../dev/promo/goliath/script';
import {
  AND_AT, bellyAt, BIGGER_AT, BITE_AT, BITE_WORD_AT, BLACKTIP_AT, boilAt, BOIL_STEPS, cameraAt, DOOR, DOOR_AT, DOOR_SIZE, eyesAt, FISHERMAN_AT, FLORIDA_AT, FOCUS,
  FOUR_FOOT_AT, GOLIATH_AT, GROUPER_LEN, grouperAt, GULP_AT, hookAt, HUGE_AT, insertionAt, jawAt, lineBowAt, LIVE, LOOP_S, MOUTH_AT, murkAt, OPENS_AT, OPENING,
  REWINDS, rewindAt, RIP, RISES_AT, rodTipAt, said, shakeAt, SHARK_LEN, sharkAt, SHUT, snapAt, SO_AT, storyAt, storyRate, suctionAt, THERES_AT, toScreen, tugAt, wrap,
} from '../dev/promo/goliath/story';
import { TEMPO, WORDS } from '../dev/promo/goliath/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
/** The story moment and the camera at video time t. */
const at = (t: number): { s: number; v: ReturnType<typeof cameraAt> } => {
  const s = storyAt(t);
  return { s, v: cameraAt(s) };
};
const onScreen = (p: { x: number; y: number }, t: number, margin = 0): boolean => {
  const q = toScreen(at(t).v, p);
  return q.x > -margin && q.x < 1080 + margin && q.y > -margin && q.y < 1920 + margin;
};

describe('promo short: this fish swallowed a shark in one bite (narrated)', () => {
  it('loops: the story clock, the camera, both fish, the hook and every note are where they started', () => {
    expect(storyAt(END)).toBeCloseTo(storyAt(0), 5);
    expect(storyRate(END)).toBeCloseTo(storyRate(0), 4);
    expect(storyAt(0)).toBe(OPENING);
    const [a, b] = [cameraAt(storyAt(END)), cameraAt(storyAt(0))];
    for (const key of ['x', 'y', 'zoom'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    const [g1, g2] = [grouperAt(storyAt(END), END), grouperAt(storyAt(0), 0)];
    for (const key of ['x', 'y', 'tilt', 'effort'] as const) expect(g1[key]).toBeCloseTo(g2[key], 2);
    expect(Math.cos(g1.beat - g2.beat)).toBeCloseTo(1, 4);
    const [s1, s2] = [sharkAt(storyAt(END), END), sharkAt(storyAt(0), 0)];
    expect(s1.kind).toBe('swallowed');
    expect(s2.kind).toBe('swallowed');
    if (s1.kind === 'swallowed' && s2.kind === 'swallowed') {
      expect(dist(s1.fish, s2.fish)).toBeLessThan(0.5);
      expect(s1.fish.tilt).toBeCloseTo(s2.fish.tilt, 2);
    }
    expect(dist(hookAt(storyAt(END), END).at, hookAt(storyAt(0), 0).at)).toBeLessThan(0.5);
    for (const f of [jawAt, suctionAt, murkAt, insertionAt, lineBowAt, tugAt, snapAt]) expect(f(storyAt(END))).toBeCloseTo(f(storyAt(0)), 3);
    expect(bellyAt(storyAt(END)).size).toBeCloseTo(bellyAt(storyAt(0)).size, 3);
    for (const f of [rewindAt, placeLabel, sizeBar, doorAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(dist(rodTipAt(END), rodTipAt(0))).toBeLessThan(0.01);
  });

  it('never jumps: the story, the camera, the fish and the hook move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [p, q] = [at(t), at(t + FRAME)];
      // On screen px a frame: the rewinds run the story back at up to about 12 times speed, so they may move about twice as far.
      const fast = rewindAt(t) > 0 || rewindAt(t + FRAME) > 0 ? 2.2 : 1;
      const px = 85 * fast;
      expect(Math.abs(q.s - p.s)).toBeLessThan(0.45);
      expect(Math.abs(Math.log(q.v.zoom / p.v.zoom))).toBeLessThan(0.09 * fast);
      expect(dist(q.v, p.v) * p.v.zoom).toBeLessThan(px);
      expect(dist(grouperAt(p.s, t), grouperAt(q.s, t + FRAME)) * p.v.zoom).toBeLessThan(px);
      // The jaws shut on the shark in a tenth of a second (outside the rewinds, which are quicker still).
      if (fast === 1) expect(Math.abs(jawAt(q.s) - jawAt(p.s))).toBeLessThan(0.6);
      const [a, b] = [sharkAt(p.s, t), sharkAt(q.s, t + FRAME)];
      // The last slurp pulls the shark in within a few frames, the quickest move outside the rewinds.
      const slurp = p.s > 15 && p.s < SHUT ? 1.6 : 1;
      if (a.kind !== 'gone' && b.kind !== 'gone') expect(dist(a.fish, b.fish) * p.v.zoom).toBeLessThan(px * slurp);
      // The hook springs free once; otherwise it moves with the fish.
      if ((p.s < RIP) === (q.s < RIP)) expect(dist(hookAt(p.s, t).at, hookAt(q.s, t + FRAME).at) * p.v.zoom).toBeLessThan(px);
    }
  });

  it('opens on the shark half way into the wide-open mouth, the line taut up out of frame, and nothing written but the words', () => {
    const { s, v } = at(0);
    const shark = sharkAt(s, 0);
    expect(shark.kind).toBe('swallowed');
    expect(insertionAt(s)).toBeGreaterThan(0.25);
    expect(insertionAt(s)).toBeLessThan(0.5);
    expect(jawAt(s)).toBeGreaterThanOrEqual(1);
    expect(suctionAt(s)).toBe(1);
    expect(murkAt(s)).toBe(0);
    expect(lineBowAt(s)).toBe(0);
    // A close-up: the grouper bigger than the screen is wide, the lips near the middle, the rod far above the top.
    expect(GROUPER_LEN * v.zoom).toBeGreaterThan(800);
    const lips = toScreen(v, hookAt(s, 0).at);
    expect(Math.abs(lips.x - FOCUS.x)).toBeLessThan(250);
    expect(lips.y).toBeGreaterThan(500);
    expect(lips.y).toBeLessThan(1000);
    expect(toScreen(v, rodTipAt(0)).y).toBeLessThan(0);
    for (const f of [placeLabel, sizeBar, doorAt, rewindAt]) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('shuts its jaws on the shark on "bite!", with a jolt', () => {
    expect(BITE_AT - BITE_WORD_AT).toBeGreaterThan(0);
    expect(BITE_AT - BITE_WORD_AT).toBeLessThan(0.3);
    expect(sharkAt(storyAt(BITE_AT - 0.2), BITE_AT - 0.2).kind).toBe('swallowed');
    expect(sharkAt(storyAt(BITE_AT + 0.02), BITE_AT + 0.02).kind).toBe('gone');
    expect(jawAt(storyAt(BITE_AT + 0.02))).toBeLessThan(0.05);
    expect(Math.hypot(shakeAt(BITE_AT + 0.05).x, shakeAt(BITE_AT + 0.05).y)).toBeGreaterThan(2);
  });

  it('rewinds to the boat on "Florida, twenty fourteen", then plays the story at the pace of the words', () => {
    for (const t of [3.5, 4.0, 4.5]) expect(storyRate(t)).toBeLessThan(-1);
    expect(rewindAt(4)).toBe(1);
    expect(placeLabel(FLORIDA_AT + 0.3)).toBe(1);
    for (const t of [LIVE.from + 0.1, 8, 12, 15, 18]) {
      expect(storyAt(t)).toBeCloseTo(t, 6);
      expect(rewindAt(t)).toBe(0);
    }
    // "A fisherman": the surface, the boat's rod and the shark on its line, all in one picture.
    const { v } = at(FISHERMAN_AT);
    const surface = toScreen(v, { x: 0, y: 0 }).y;
    expect(surface).toBeGreaterThan(300);
    expect(surface).toBeLessThan(1000);
    expect(onScreen(rodTipAt(FISHERMAN_AT), FISHERMAN_AT)).toBe(true);
    const shark = sharkAt(storyAt(FISHERMAN_AT), FISHERMAN_AT);
    expect(shark.kind).toBe('hooked');
    if (shark.kind === 'hooked') expect(onScreen(shark.fish, FISHERMAN_AT)).toBe(true);
  });

  it('measures the four-foot blacktip as it is said, close up', () => {
    expect(sizeBar(FOUR_FOOT_AT + 0.25)).toBe(1);
    expect(sizeBar(FOUR_FOOT_AT - 0.2)).toBe(0);
    const shark = sharkAt(storyAt(BLACKTIP_AT), BLACKTIP_AT);
    expect(shark.kind).toBe('hooked');
    if (shark.kind === 'hooked') {
      expect(onScreen(shark.fish, BLACKTIP_AT)).toBe(true);
      expect(shark.fish.length * at(BLACKTIP_AT).v.zoom).toBeGreaterThan(350);
    }
    // Four feet: 1.2 m, a little over half the grouper.
    expect(SHARK_LEN / GROUPER_LEN).toBeGreaterThan(0.5);
    expect(SHARK_LEN / GROUPER_LEN).toBeLessThan(0.65);
  });

  it('raises something huge out of the murk on "rises from below", and shows the grouper on "goliath"', () => {
    expect(murkAt(storyAt(HUGE_AT - 0.3))).toBe(1);
    const rising = [RISES_AT, RISES_AT + 0.4].map((t) => grouperAt(storyAt(t), t));
    expect(rising[1]!.y).toBeLessThan(rising[0]!.y - 100);
    expect(murkAt(storyAt(RISES_AT + 0.3))).toBeLessThan(0.75);
    expect(murkAt(storyAt(RISES_AT + 0.3))).toBeGreaterThan(0.4);
    expect(onScreen(rising[1]!, RISES_AT + 0.4)).toBe(true);
    const shark = sharkAt(storyAt(RISES_AT), RISES_AT);
    if (shark.kind === 'hooked') expect(rising[0]!.y).toBeGreaterThan(shark.fish.y + 600);
    expect(murkAt(storyAt(GOLIATH_AT + 0.35))).toBe(0);
    expect(onScreen(grouperAt(storyAt(GOLIATH_AT), GOLIATH_AT), GOLIATH_AT)).toBe(true);
  });

  it('stands a door beside it on "door", as big as it is', () => {
    expect(doorAt(DOOR_AT - 0.2)).toBe(0);
    expect(doorAt(DOOR_AT + 0.4)).toBe(1);
    expect(doorAt(MOUTH_AT + 0.25)).toBe(0);
    const g = grouperAt(DOOR_AT, DOOR_AT);
    // Its top at the grouper's nose and its foot at the tail, within 10%.
    expect(DOOR_SIZE.h / (Math.sin(g.tilt) * GROUPER_LEN)).toBeGreaterThan(0.9);
    expect(DOOR_SIZE.h / (Math.sin(g.tilt) * GROUPER_LEN)).toBeLessThan(1.1);
    expect(Math.abs(DOOR.top + DOOR_SIZE.h / 2 - g.y)).toBeLessThan(20);
    for (const x of [DOOR.x - DOOR_SIZE.w / 2, DOOR.x + DOOR_SIZE.w / 2]) expect(onScreen({ x, y: DOOR.top }, DOOR_AT + 0.3)).toBe(true);
  });

  it('opens its mouth on "opens its mouth", sucks the shark in on "and…" and shuts on "GULP!"', () => {
    expect(jawAt(OPENS_AT - 0.05)).toBe(0);
    expect(jawAt(MOUTH_AT + 0.15)).toBeGreaterThanOrEqual(1);
    expect(sharkAt(AND_AT - 0.05, AND_AT - 0.05).kind).toBe('hooked');
    expect(suctionAt(AND_AT + 0.2)).toBe(1);
    expect(sharkAt(GULP_AT, GULP_AT).kind).toBe('swallowed');
    expect(SHUT).toBeGreaterThan(GULP_AT);
    expect(SHUT).toBeLessThan(GULP_AT + 0.4);
    expect(sharkAt(SHUT + 0.01, SHUT + 0.01).kind).toBe('gone');
    expect(jawAt(SHUT)).toBe(0);
    expect(snapAt(SHUT + 0.05)).toBeGreaterThan(0.5);
    expect(eyesAt(SHUT + 0.1)).toBe('squeeze');
    expect(Math.hypot(shakeAt(SHUT + 0.05).x, shakeAt(SHUT + 0.05).y)).toBeGreaterThan(5);
    expect(bellyAt(SHUT + 1).size).toBeGreaterThan(0.4);
  });

  it('lets the empty hook spring free on "There\'s always a bigger fish", the grouper smiling', () => {
    expect(RIP).toBeLessThan(THERES_AT);
    expect(RIP).toBeGreaterThan(SHUT + 0.5);
    const lips = hookAt(RIP - 0.01, RIP - 0.01);
    expect(lips.shown).toBe(false);
    const free = hookAt(BIGGER_AT, BIGGER_AT);
    expect(free.shown).toBe(true);
    expect(free.at.y).toBeLessThan(lips.at.y - 200);
    expect(onScreen(free.at, BIGGER_AT)).toBe(true);
    expect(eyesAt(BIGGER_AT)).toBe('happy');
    expect(bellyAt(BIGGER_AT).size).toBeGreaterThan(0.4);
  });

  it('rewinds to the opening frame on "So yes,"', () => {
    expect(storyRate(REWINDS[1].from + 0.3)).toBeLessThan(-1);
    expect(rewindAt(REWINDS[1].from + 0.3)).toBe(1);
    expect(REWINDS[1].from).toBeGreaterThan(SO_AT);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('So')).toBe(SO_AT);
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
  });

  it('shows the credit around the payoff, never in the hook or at the seam', () => {
    expect(creditAt(SHUT, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(3, LOOP_S)).toBe(0);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
