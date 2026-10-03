import { describe, expect, it } from 'vitest';
import { STRIKE, strikeExtension, tentacleReach } from '../src/logic/squid';

describe('giant squid strike', () => {
  const out = STRIKE.windup + STRIKE.out;

  it('winds up first, giving you a moment to dodge', () => {
    expect(STRIKE.windup).toBeGreaterThanOrEqual(300);
    for (let t = 0; t <= STRIKE.windup; t += 20) expect(strikeExtension(t)).toBe(0);
  });

  it('then shoots the tentacles out fast, holds, and reels them back in', () => {
    expect(strikeExtension(out)).toBeCloseTo(1);
    expect(strikeExtension(out + STRIKE.hold / 2)).toBe(1);
    expect(strikeExtension(STRIKE.total)).toBe(0);
    expect(strikeExtension(STRIKE.total + 500)).toBe(0);
    // Faster out than back.
    expect(STRIKE.out).toBeLessThan(STRIKE.back);
  });

  it('only grows or holds while striking, then only shrinks', () => {
    let prev = 0;
    for (let t = 0; t <= out + STRIKE.hold; t += 10) {
      expect(strikeExtension(t)).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = strikeExtension(t);
    }
    for (let t = out + STRIKE.hold; t <= STRIKE.total; t += 10) {
      expect(strikeExtension(t)).toBeLessThanOrEqual(prev + 1e-9);
      prev = strikeExtension(t);
    }
  });

  it('reaches a few body lengths, more for a bigger squid', () => {
    expect(tentacleReach(100)).toBeGreaterThan(tentacleReach(60));
    expect(tentacleReach(80)).toBeGreaterThan(80 * 3);
  });
});

describe('giant squid arms', async () => {
  const { LIMBS, REST_POSE, limbPoints, clubPoint, CLUB_LENGTH, ARM_POINTS, TENTACLE_POINTS } = await import('../src/art/squidPose');
  const length = (pts: readonly { x: number; y: number }[]): number =>
    pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0);

  it('has eight arms and two feeding tentacles, all growing from the crown', () => {
    expect(LIMBS.filter((l) => l.kind === 'arm')).toHaveLength(8);
    expect(LIMBS.filter((l) => l.kind === 'tentacle')).toHaveLength(2);
    for (const limb of LIMBS) {
      const pts = limbPoints(limb, REST_POSE);
      expect(pts[0]).toEqual(limb.root);
      expect(pts).toHaveLength(limb.kind === 'arm' ? ARM_POINTS : TENTACLE_POINTS);
      expect(length(pts)).toBeCloseTo(limb.length, 0);
    }
  });

  it('writhes over time without the arms changing length', () => {
    const arm = LIMBS[0]!;
    const a = limbPoints(arm, { ...REST_POSE, t: 0 });
    const b = limbPoints(arm, { ...REST_POSE, t: 1.3 });
    expect(a.at(-1)).not.toEqual(b.at(-1));
    expect(length(b)).toBeCloseTo(arm.length, 0);
  });

  it('shoots the tentacle clubs onto the target, clubs keeping their size', () => {
    const aim = { x: 420, y: 60 };
    for (const limb of LIMBS.filter((l) => l.kind === 'tentacle')) {
      const pts = limbPoints(limb, { ...REST_POSE, strike: 1, aim });
      const tip = pts.at(-1)!;
      expect(Math.hypot(tip.x - aim.x, tip.y - aim.y)).toBeLessThan(8);
      const club = pts.slice(-6);
      expect(length(club)).toBeCloseTo(CLUB_LENGTH, 0);
      const mid = clubPoint(pts);
      expect(Math.hypot(mid.x - aim.x, mid.y - aim.y)).toBeLessThan(CLUB_LENGTH);
    }
  });

  it('presses the arms together when jetting away', () => {
    const spread = (pose: typeof REST_POSE): number => {
      const tips = LIMBS.filter((l) => l.kind === 'arm').map((l) => limbPoints(l, pose).at(-1)!.y);
      return Math.max(...tips) - Math.min(...tips);
    };
    expect(spread({ ...REST_POSE, stream: 1 })).toBeLessThan(spread(REST_POSE) * 0.6);
  });
});
