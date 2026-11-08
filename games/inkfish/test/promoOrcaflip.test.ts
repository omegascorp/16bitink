import { describe, expect, it } from 'vitest';
import {
  ADULT_LEN, baseShark, cameraOf, circlers, diverCutAt, hookAt, KID_LEN, onShark, ORCA1_LEN, rollOf, sharkAt, SHARK1_LEN, SIDE_FLOOR, sinkAt, snoutOf, strikeOrca, strikePoint,
} from '../dev/promo/orcaflip/poses';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/orcaflip/script';
import {
  adultLabelAt, AGAIN2_AT, AGAIN_AT, boilAt, BOIL_STEPS, BUT_AT, CAUGHT_AT, gulfAt, HIT_AT, HITS, IMPACT, KID_AT, LIVER_AT, livedAt, LOOP_S, MEXICO_AT, said, SCENE_IDS, sceneAlpha,
  SCIENTISTS_AT, shakeOf, sizeAt, SINKS_AT, SKY_AT, STARTS, TWENTY_AT, UNTIL_AT, viewfinderAt, WHY_AT, wrap,
} from '../dev/promo/orcaflip/story';
import { TEMPO, WORDS } from '../dev/promo/orcaflip/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const WRITTEN = [adultLabelAt, sizeAt, livedAt, gulfAt, viewfinderAt];

describe('promo short: these orcas flip whale sharks upside down (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [hookAt(0), hookAt(END)];
    expect(b.zoom).toBeCloseTo(a.zoom, 4);
    expect(b.age).toBeCloseTo(a.age, 4);
    for (const k of ['x', 'y', 'len', 'a', 's', 'tail'] as const) expect(b.shark[k], `shark ${k}`).toBeCloseTo(a.shark[k], 2);
    for (const k of ['x', 'y', 'len', 'a', 'tail', 'alpha'] as const) expect(b.orca[k], `orca ${k}`).toBeCloseTo(a.orca[k], 2);
    expect(b.shark.dent?.depth).toBeCloseTo(a.shark.dent!.depth, 2);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    const [c0, c1] = [cameraOf('hook', 0), cameraOf('hook', END)];
    expect(c1.dx).toBeCloseTo(c0.dx, 2);
    expect(c1.dy).toBeCloseTo(c0.dy, 2);
    for (const f of WRITTEN) {
      expect(f(0), f.name).toBe(0);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
  });

  it('never jumps: the hook, the shark, the orcas and the scene fades move smoothly frame to frame and across the loop point', () => {
    const crossings: number[] = [];
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      if (sceneAlpha('hook', a) > 0 && sceneAlpha('hook', b) > 0) {
        const [ha, hb] = [hookAt(a), hookAt(b)];
        expect(Math.hypot(hb.orca.x - ha.orca.x, hb.orca.y - ha.orca.y), `orca t=${t}`).toBeLessThan(80);
        expect(Math.hypot(hb.shark.x - ha.shark.x, hb.shark.y - ha.shark.y), `shark t=${t}`).toBeLessThan(40);
        expect(Math.abs(hb.zoom - ha.zoom), `zoom t=${t}`).toBeLessThan(0.03);
      }
      if (sceneAlpha('spin', a) > 0 && sceneAlpha('spin', b) > 0) {
        const [sa, sb] = [sharkAt(a), sharkAt(b)];
        expect(Math.hypot(sb.x - sa.x, sb.y - sa.y), `spin shark t=${t}`).toBeLessThan(60);
        // The one allowed jump: the roll's scale passing from one side to the other (see the next test).
        if (Math.sign(sa.s) !== Math.sign(sb.s)) crossings.push(a);
        else expect(Math.abs(sb.s - sa.s), `roll t=${t}`).toBeLessThan(0.3);
      }
      for (const id of SCENE_IDS) expect(sceneAlpha(id, b) - sceneAlpha(id, a), id).toBeLessThan(0.35);
    }
    expect(crossings).toHaveLength(1);
  });

  it('never shows the shark edge-on: the roll stops at a floor and snaps across in one frame, on the second hit, under its burst', () => {
    // A sprite scaled in y through 0 is a needle across the screen with no shark in it. So |s| never goes
    // under SIDE_FLOOR, and the only way over is a single-frame snap, which is why the frame-to-frame roll
    // limit above has this one exception. That snap has to land inside the second impact, and nowhere else.
    const [h, cross] = [HITS[1]!, [] as number[]];
    for (let t = STARTS.spin; t < STARTS.sci; t += FRAME) {
      expect(Math.abs(sharkAt(t).s), `t=${t}`).toBeGreaterThanOrEqual(SIDE_FLOOR);
      if (Math.sign(sharkAt(t).s) !== Math.sign(sharkAt(t + FRAME).s)) cross.push(t);
    }
    expect(cross).toHaveLength(1);
    expect(cross[0]!).toBeGreaterThanOrEqual(h - FRAME);
    expect(cross[0]!).toBeLessThan(h + 0.12);
    expect(Math.abs(sharkAt(cross[0]! + FRAME).s - sharkAt(cross[0]!).s)).toBeLessThan(2 * SIDE_FLOOR + 0.2);
  });

  it('lands each orca on the shark at its hit', () => {
    HITS.forEach((h, k) => {
      const [o, at] = [strikeOrca(k, h)!, strikePoint(k)];
      const nose = { x: o.x + (Math.cos(o.a) * o.len) / 2, y: o.y + (Math.sin(o.a) * o.len) / 2 };
      expect(Math.hypot(nose.x - at.x, nose.y - at.y), `orca ${k}`).toBeLessThan(2);
    });
  });

  it('opens on the hook: a huge belly-up shark and an orca slamming it from below, bubbles already bursting, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    for (const t of [0, 0.5, 1.5]) {
      const h = hookAt(t);
      expect(h.zoom).toBe(1);
      expect(h.shark.s).toBe(-1);
      expect(h.shark.len).toBeGreaterThanOrEqual(1500);
    }
    const first = hookAt(0);
    expect(first.age).toBeGreaterThan(0);
    expect(first.age).toBeLessThan(0.3);
    expect(first.orca.alpha).toBe(1);
    expect(Math.sin(first.orca.a)).toBeLessThan(-0.9);
    for (let t = 0; t <= 2.9; t += FRAME) for (const f of WRITTEN) expect(f(t), `${f.name} t=${t}`).toBe(0);
    expect(captionAt(0.3)!.line.words.map((w) => w.text).join(' ')).toBe('These orcas flip');
  });

  it('frame 1: the whole head in frame on a diagonal, the tail free to crop, the rostrum pressed into a dent in the flank', () => {
    const h = hookAt(0);
    const snout = snoutOf(h.shark);
    expect(snout.x).toBeGreaterThan(800);
    expect(snout.x).toBeLessThan(1040);
    expect(snout.y).toBeGreaterThan(280);
    // The gills, the back of the head, are in frame too.
    expect(onShark(h.shark, -540, 0).x).toBeGreaterThan(0);
    expect(Math.abs(h.shark.a)).toBeGreaterThan(0.35);
    expect(Math.abs(h.shark.a)).toBeLessThan(1);
    expect(onShark(h.shark, -2400, 0).x).toBeLessThan(0);
    expect(h.shark.gape).toBeGreaterThan(0);
    // The dent is deep, and the rostrum is at it: past the skin, not short of it.
    expect(h.shark.dent!.depth).toBeGreaterThan(90);
    const to = { x: h.nose.x - h.contact.x, y: h.nose.y - h.contact.y };
    expect(Math.hypot(to.x, to.y)).toBeLessThan(40);
    expect(to.x * Math.cos(h.orca.a) + to.y * Math.sin(h.orca.a)).toBeGreaterThan(10);
    expect(Math.hypot(h.impact.x - h.contact.x, h.impact.y - h.contact.y)).toBeLessThan(60);
    // The tall first dorsal, pointing down, is clear of the orca.
    const fin = onShark(h.shark, -1196, -490);
    expect(fin.y).toBeGreaterThan(snout.y + 400);
    expect(Math.hypot(fin.x - h.nose.x, fin.y - h.nose.y)).toBeGreaterThan(300);
    expect(fin.x).toBeLessThan(h.nose.x);
    // The bump is over by the time the scene ends, and the head stays in frame all through it.
    expect(hookAt(2.5).shark.dent).toBeUndefined();
    for (let t = 0; t < STARTS.kid + 0.3; t += FRAME) expect(snoutOf(hookAt(t).shark).x, `t=${t}`).toBeLessThan(1060);
  });

  it('uses a modern diver as the scientist, close up, the belly-up shark behind', () => {
    const { diver, shark } = diverCutAt(SCIENTISTS_AT + 0.2);
    expect(diver.pose.maskUp).toBe(false);
    expect(diver.pose.face).toBe('wide');
    expect(diver.pose.bag).toBe(false);
    expect(shark.s).toBe(-1);
    expect(diver.scale).toBeGreaterThanOrEqual(4);
  });

  it('keeps the shark in sight as it sinks, belly-up, the diver losing the race', () => {
    for (let t = STARTS.sink; t < STARTS.hook + 0.28; t += FRAME) {
      const s = sinkAt(t);
      expect(s.shark.s).toBe(-1);
      expect(s.shark.y, `t=${t}`).toBeLessThan(1760);
      expect(s.dark, `t=${t}`).toBeLessThanOrEqual(0.6);
      expect(s.shark.len, 'still a whale shark beside the diver').toBeGreaterThan(600);
    }
    // The gap opens: he's going down, it's going down faster, the beam dying short of its body (about 0.09 of its length deep either side of its centre) from just after "sinks".
    const gap = (t: number): number => sinkAt(t).shark.y - sinkAt(t).diver.pose.y;
    expect(gap(16.8)).toBeGreaterThan(gap(16) + 250);
    expect(sinkAt(16.8).diver.pose.y).toBeGreaterThan(sinkAt(16).diver.pose.y);
    for (let t = SINKS_AT + 0.4; t < STARTS.hook; t += FRAME) {
      const s = sinkAt(t);
      expect(Math.hypot(s.beamEnd.x - s.shark.x, s.beamEnd.y - s.shark.y), `t=${t}`).toBeGreaterThan(s.shark.len * 0.12);
    }
  });

  it('keeps the true sizes: the orcas are never smaller than the shark, the kid is half the adult', () => {
    expect(ORCA1_LEN).toBeGreaterThanOrEqual(SHARK1_LEN);
    expect(ADULT_LEN / KID_LEN).toBeCloseTo(2, 5);
    for (let t = KID_AT; t < STARTS.sink; t += FRAME) {
      const shark = sharkAt(t);
      for (const k of [0, 1, 2]) {
        const o = strikeOrca(k, t);
        if (o && o.alpha > 0.5) expect(o.len, `strike ${k} t=${t}`).toBeGreaterThanOrEqual(shark.len * (8 / 6) - 1);
      }
      for (const o of circlers(t)) expect(o.len, `circler t=${t}`).toBeGreaterThanOrEqual(shark.len * (8 / 6) - 1);
    }
  });

  it('puts every noun on screen as it is said', () => {
    // "These orcas flip WHALE SHARKS": the orca and the shark, in frame 1.
    expect(sceneAlpha('hook', said('orcas'))).toBe(1);
    expect(hookAt(said('WHALE')).shark.len).toBeGreaterThan(1500);
    // "The biggest fish on Earth…": the adult, with its 12 m / 40 ft.
    expect(sceneAlpha('kid', said('biggest') + 0.4)).toBe(1);
    expect(adultLabelAt(said('Earth…'))).toBe(1);
    // "this one's just a KID, twenty feet long!": the kid in front, 6 m · 20 ft.
    expect(baseShark(KID_AT + 0.3).x).toBeGreaterThan(0);
    expect(sizeAt(TWENTY_AT + 0.3)).toBe(1);
    // "They hit it … again and again": three orcas, each on its word.
    for (const [k, at] of [[0, HIT_AT], [1, AGAIN_AT], [2, AGAIN2_AT]] as const) {
      expect(sceneAlpha('spin', at)).toBe(1);
      expect(strikeOrca(k, HITS[k]! - 0.05)!.alpha, `orca ${k}`).toBeGreaterThan(0.95);
    }
    // "until its belly faces the sky…": belly up.
    expect(Math.cos(rollOf(UNTIL_AT))).toBeCloseTo(-1, 3);
    expect(sharkAt(said('sky…')).s).toBeLessThan(-0.99);
    // "Why? Scientists suspect the liver.": orcas circling, the diver with the slate, the x-ray with its label.
    expect(circlers(WHY_AT + 0.3)).toHaveLength(3);
    expect(sceneAlpha('sci', SCIENTISTS_AT + 0.4)).toBe(1);
    expect(sceneAlpha('xray', LIVER_AT)).toBe(1);
    expect(livedAt(LIVER_AT + 0.1)).toBe(1);
    // "But it sinks": the shark going down into the dark.
    expect(sceneAlpha('sink', said('sinks') + 0.1)).toBe(1);
    expect(sinkAt(said('sinks') + 0.8).shark.y).toBeGreaterThan(sinkAt(said('sinks')).shark.y + 200);
    // "Caught on camera off Mexico,": the viewfinder, the Gulf of California.
    expect(viewfinderAt(CAUGHT_AT + 0.3)).toBeGreaterThan(0.9);
    expect(gulfAt(MEXICO_AT + 0.3)).toBeGreaterThan(0.95);
  });

  it('hits on its word: a shake, a burst and the shark spinning further each time, belly-up after the third', () => {
    let roll = 0;
    HITS.forEach((h, i) => {
      expect(Math.hypot(shakeOf(0.04, 50).dx, shakeOf(0.04, 50).dy)).toBeGreaterThan(5);
      expect(Math.hypot(cameraOf('spin', h + 0.04).dx, cameraOf('spin', h + 0.04).dy), `shake ${i}`).toBeGreaterThan(3);
      const after = rollOf(h + 0.5);
      expect(after, `roll ${i}`).toBeGreaterThan(roll + 0.8);
      roll = after;
    });
    expect(roll).toBeCloseTo(Math.PI, 5);
    expect(rollOf(HITS[0]! - 0.05)).toBe(0);
  });

  it('writes the metric figure big with the US figure next to it', () => {
    expect(TEXT.size.size).toBeGreaterThanOrEqual(180);
    expect(TEXT.adult.size).toBeLessThan(TEXT.size.size);
  });

  it('comes back to frame 1 for the seam: the viewfinder pushes in on an orca charging the shark', () => {
    expect(hookAt(CAUGHT_AT).zoom).toBeLessThan(0.55);
    expect(viewfinderAt(LOOP_S - 0.02)).toBeLessThan(0.01);
    const [far, near] = [hookAt(CAUGHT_AT + 0.2), hookAt(LOOP_S + IMPACT - 0.2)];
    expect(Math.hypot(far.orca.x - far.contact.x, far.orca.y - far.contact.y)).toBeGreaterThan(Math.hypot(near.orca.x - near.contact.x, near.orca.y - near.contact.y) + 600);
    expect(hookAt(LOOP_S + IMPACT - 0.3).shark.s).toBe(-1);
    expect(hookAt(LOOP_S + IMPACT).age).toBeCloseTo(0, 6);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Mexico,');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
    expect(TEMPO).toBeLessThanOrEqual(1.2);
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
    for (let t = 0; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeGreaterThanOrEqual(270);
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.72, name).toBeGreaterThanOrEqual(270);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles (a multiple of 1.5 s), with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(Math.abs(LOOP_S / 1.5 - Math.round(LOOP_S / 1.5))).toBeLessThan(1e-9);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    for (const w of WORDS) expect(w.end / TEMPO).toBeLessThan(LOOP_S);
  });

  it('changes the sound with the mood: a hard smash on every hit, near silence on the hang, a warm glow on the liver', () => {
    for (const h of HITS) expect(SOUNDS.some((s) => s.id === 'smash' && Math.abs(s.t - h) < 0.05 && s.gain >= 0.15)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'smash' && s.t > LOOP_S - 0.3)).toBe(true);
    const hang = SOUNDS.filter((s) => s.t >= UNTIL_AT - 0.01 && s.t <= SKY_AT + 0.4);
    expect(hang.length).toBeGreaterThan(0);
    for (const s of hang) expect(s.gain, `${s.id} at ${s.t}`).toBeLessThanOrEqual(0.05);
    expect(SOUNDS.some((s) => s.id === 'powerup' && Math.abs(s.t - LIVER_AT) < 0.1)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'drop' && s.t > BUT_AT && s.t < BUT_AT + 0.3)).toBe(true);
    expect(SCIENTISTS_AT).toBeLessThan(BUT_AT);
  });
});
