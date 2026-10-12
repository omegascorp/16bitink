import { describe, expect, it } from 'vitest';
import { BRAIN, fangPoint, jawPoint, LENGTH, sectionAt, SNOUT_X, SOCKET_R, socketLine, skinAt, skinThetaAt } from '../dev/promo/fangtooth/body';
import { HAND_LENGTH } from '../dev/promo/fangtooth/hand';
import {
  blurAt, BRAIN_AT, captionAt, darkAt, dartAt, DARK_FROM, fishAt, handShown, jawAt, LINES, LOOP_S, preyAt, restAt, scaleRateAt, SHUT_AT, SHUT_FROM,
  SNAP_AT, SOCKETS_AT, SOUNDS, xrayAt,
} from '../dev/promo/fangtooth/story';
import { TEMPO, WORDS } from '../dev/promo/fangtooth/words';
import { project, toCamera, v3 } from '../dev/promo/fangtooth/space';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
/** Where a point of the fish lands on screen at time t. */
const onScreen = (t: number, x: number, y: number): { x: number; y: number; scale: number } => project(toCamera(fishAt(t), v3(x, y, 0)));

describe('promo short: the fangtooth, biggest teeth for its size (narrated)', () => {
  it('loops: everything at the loop point is as it was at the start', () => {
    const [a, b] = [fishAt(0), fishAt(END)];
    for (const key of ['x', 'y', 'z', 'yaw', 'pitch', 'jaw', 'sway'] as const) expect(b[key]).toBeCloseTo(a[key], 4);
    expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 4);
    expect(wrap(b.flutter - a.flutter)).toBeCloseTo(0, 4);
    for (const f of [xrayAt, darkAt, blurAt, handShown, scaleRateAt, dartAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(preyAt(0)).toBeNull();
    expect(preyAt(END)).toBeNull();
    // The snout lands on the same pixel.
    const [p, q] = [onScreen(0, SNOUT_X, 0.3), onScreen(END, SNOUT_X, 0.3)];
    expect(q.x).toBeCloseTo(p.x, 1);
    expect(q.y).toBeCloseTo(p.y, 1);
  });

  it('keeps the lunge moving smoothly through the loop point', () => {
    const step = (t: number): { x: number; y: number; scale: number } => {
      const [p, q] = [onScreen(t, SNOUT_X, 0.3), onScreen(t + FRAME, SNOUT_X, 0.3)];
      return { x: q.x - p.x, y: q.y - p.y, scale: Math.log(q.scale / p.scale) };
    };
    const [before, after] = [step(LOOP_S - FRAME - 1e-6), step(0)];
    // Coming at us through the seam, at the same speed either side.
    expect(after.scale).toBeGreaterThan(0.02);
    expect(Math.abs(after.scale - before.scale)).toBeLessThan(0.01);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(6);
    expect(Math.abs(jawAt(FRAME) - jawAt(0) - (jawAt(END) - jawAt(END - FRAME)))).toBeLessThan(0.01);
  });

  it('never jumps between frames, apart from the snap itself', () => {
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      if (Math.abs(t - SNAP_AT) < 0.3) continue;
      const [a, b] = [fishAt(t), fishAt(t + FRAME)];
      expect(Math.abs(Math.log(a.z / b.z))).toBeLessThan(0.1);
      expect(Math.abs(b.yaw - a.yaw)).toBeLessThan(0.09);
      expect(Math.abs(b.jaw - a.jaw)).toBeLessThan(0.12);
    }
  });

  it('opens on its face, close and gaping, the fangs bared', () => {
    const pose = fishAt(1);
    expect(pose.jaw).toBeGreaterThan(0.85);
    // The head fills most of the width.
    const [snout, gill] = [onScreen(1, SNOUT_X, 0), onScreen(1, 1.5, 0)];
    expect(snout.scale * 6).toBeGreaterThan(600);
    expect(Math.abs(snout.x - gill.x)).toBeLessThan(snout.scale * 6);
  });

  it('is smaller than your hand', () => {
    expect(LENGTH).toBe(16);
    expect(HAND_LENGTH).toBeGreaterThan(LENGTH);
  });

  it('shuts its jaw slowly, and with it shut the fangs sit in two sockets either side of the brain', () => {
    expect(SHUT_AT - SHUT_FROM).toBeGreaterThan(1.8);
    expect(jawAt(SHUT_FROM)).toBeGreaterThan(0.9);
    expect(jawAt(SOCKETS_AT - 0.6)).toBeGreaterThan(0.1);
    for (let t = SHUT_AT; t < DARK_FROM; t += 0.1) {
      expect(jawAt(t)).toBeCloseTo(0, 3);
      expect(xrayAt(t)).toBeGreaterThan(0.99);
    }
    const brain = BRAIN.reduce((a, b) => (b.r.z > a.r.z ? b : a));
    for (const side of [1, -1] as const) {
      const socket = socketLine(side);
      // The shut fang's tip lies in its socket, near the brain's side and level with it.
      const tip = jawPoint(fangPoint(1, side), 0);
      const nearest = Math.min(...socket.map((p) => Math.hypot(p.x - tip.x, p.y - tip.y, p.z - tip.z)));
      expect(nearest).toBeLessThan(SOCKET_R);
      expect(Math.abs(tip.y - brain.c.y)).toBeLessThan(brain.r.y * 1.5);
      expect(Math.abs(tip.x - brain.c.x)).toBeLessThan(brain.r.x * 1.2);
      // Beside the brain, not through it, and inside the head.
      for (const p of socket) {
        expect(Math.abs(p.z) - SOCKET_R).toBeGreaterThan(brain.r.z);
        const s = sectionAt(p.x);
        expect(Math.abs(p.y - s.yc)).toBeLessThan(s.hy);
        expect(Math.abs(p.z) + SOCKET_R).toBeLessThan(skinAt(p.x, skinThetaAt(p.x, p.y)).z);
      }
      // Open, the tip is out of its socket, below the roof of the mouth: it really slides in as the jaw shuts.
      const open = jawPoint(fangPoint(1, side), 0.7);
      expect(Math.min(...socket.map((p) => Math.hypot(p.x - open.x, p.y - open.y, p.z - open.z)))).toBeGreaterThan(SOCKET_R);
      expect(open.y).toBeLessThan(socket[0]!.y);
    }
    expect(BRAIN_AT).toBeGreaterThan(SHUT_AT - 0.8);
  });

  it('snaps the shrimp up: its jaws reach it as it shuts, and it is gone after', () => {
    const prey = preyAt(SNAP_AT - 0.01)!;
    expect(prey).not.toBeNull();
    const rest = restAt(SNAP_AT);
    const lunged = fishAt(SNAP_AT);
    // The mouth, darted forward, in the frame the shrimp drifts in.
    const mouth = toCamera(lunged, v3(SNOUT_X - 0.3, 0.2, 0.4));
    const shrimp = toCamera(rest, prey.at);
    expect(Math.hypot(mouth.x - shrimp.x, mouth.y - shrimp.y, mouth.z - shrimp.z)).toBeLessThan(1.2);
    expect(jawAt(SNAP_AT - 0.03)).toBeGreaterThan(0.8);
    expect(jawAt(SNAP_AT + 0.06)).toBeLessThan(0.05);
    expect(preyAt(SNAP_AT + 0.05)).toBeNull();
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('because');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
