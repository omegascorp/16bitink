import { type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { castShadow } from '../propsKit';
import { dizzy, headMarks, paintBody, SKIN, snailBody, type SnailBody, tentacle, trail } from './snailBody';
import { paintLip, paintSealed, paintShell, shellOutline } from './snailShell';
import type { BossArt } from './types';

/**
 * The Great Snail (chapter 3, the Greenhouse), seen from above crawling
 * towards +x: a big glossy amber spiral shell over the frame's centre, the
 * grey-olive foot out behind it to a pointed tail and out in front to the
 * head with its long eye-stalks and short feelers, a wet sheen trailing
 * behind. 'crawl0'/'crawl1' are a stretched and a bunched step; 'shell' is
 * withdrawn, the mouth shut; 'hurt' is out but stalks drooping, dizzy.
 */

interface Feelers {
  /** Eye-stalks: angle out from straight ahead, length, curl. */
  readonly stalk: readonly [number, number, number];
  /** Short feelers below them. */
  readonly low: readonly [number, number, number];
}

interface CrawlPose {
  readonly stretch: number;
  readonly sway: number;
  readonly feel: Feelers;
}

const POSES: Readonly<Record<'crawl0' | 'crawl1' | 'hurt', CrawlPose>> = {
  crawl0: { stretch: 1, sway: 0.7, feel: { stalk: [0.5, 19, -0.22], low: [0.95, 6, 0.2] } },
  crawl1: { stretch: 0.8, sway: -0.7, feel: { stalk: [0.3, 15, 0.18], low: [1.15, 4.8, 0.1] } },
  hurt: { stretch: 0.84, sway: 0.3, feel: { stalk: [0.95, 13, 2.5], low: [1.4, 4.2, 0.6] } },
};

/** The four tentacles: `upper` false draws the short feelers (under the head), true the eye-stalks. */
function feelers(d: Draw, b: SnailBody, f: Feelers, upper: boolean): void {
  const h = b.spine[b.spine.length - 1]!;
  for (const s of [-1, 1]) {
    if (upper) {
      const [a, len, curl] = f.stalk;
      tentacle(d, pt(h.x - 4.5, h.y + s * 3.6), s * a, len, 3.6, 2.3, s * curl, true);
    } else {
      const [a, len, curl] = f.low;
      tentacle(d, pt(h.x + 3.5, h.y + s * 4.6), s * a, len, 3, 2, s * curl, false);
    }
  }
}

/** Inside-of-polygon test (even-odd). */
function inside(poly: readonly Pt[], q: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** Where the neck comes out from under the shell: a pale, wrinkled mantle collar along the rim. */
function collar(d: Draw, b: SnailBody, shell: readonly Pt[]): void {
  const { pen } = d;
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (const p of shell) {
    if (p.x > 0 && inside(b.shape, p)) run.push(pt(p.x + 1.6, p.y));
    else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  pen.clipped(b.shape, () => {
    for (const r of runs.filter((q) => q.length > 2)) {
      pen.hair(r, 3.2, SKIN.light, 0.8);
      pen.hair(r.map((p) => pt(p.x + 1.7, p.y)), 0.55, d.ink, 0.55);
      for (let i = 1; i < r.length - 1; i += 2) pen.hair([r[i]!, pt(r[i]!.x + 2.2, r[i]!.y + 0.4)], 0.35, SKIN.groove, 0.5);
    }
  });
}

function drawOut(d: Draw, p: CrawlPose, hurt: boolean): void {
  const { pen } = d;
  const b = snailBody(p.stretch, p.sway);
  const shell = shellOutline();
  trail(d, b);
  castShadow(d, b.shape, pt(1.5, 2.2), 0.13);
  castShadow(d, shell, pt(3.5, 4.5), 0.16);
  feelers(d, b, p.feel, false);
  paintBody(d, b);
  headMarks(d, b);
  feelers(d, b, p.feel, true);
  pen.clipped(b.shape, () => castShadow(d, shell, pt(3, 4), 0.22));
  paintShell(d, false);
  collar(d, b, shell);
  paintLip(d);
  if (hurt) dizzy(d, b.spine[b.spine.length - 1]!);
}

function draw(d: Draw, pose: string): void {
  if (pose === 'shell') {
    castShadow(d, shellOutline(), pt(2.5, 3.2), 0.2);
    paintShell(d, true);
    paintSealed(d);
    return;
  }
  const p = pose === 'crawl1' ? POSES.crawl1 : pose === 'hurt' ? POSES.hurt : POSES.crawl0;
  drawOut(d, p, pose === 'hurt');
}

export const SNAIL_ART: BossArt = { frame: 140, res: 3, poses: ['crawl0', 'crawl1', 'shell', 'hurt'], draw };
