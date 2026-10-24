import { createClimb, type Climb } from './climb';
import { STEPS } from './species';
import { T } from './timeline';

/**
 * The two chains the video draws. The cold open runs four gulps in eight
 * seconds, each predator hovering close so its mouth shares the frame with
 * its prey; the climb takes a section per step, the zoom starting on "Step
 * N" and the gulp landing mid-zoom, while the prey is still big enough to
 * see going in (the copepod and the orca gulp on their own words).
 */

/** Zoom length for each step of the climb, seconds. */
const ZOOM_S = 2.9;

export function createOpenChain(): Climb {
  return createClimb([
    { kind: 'copepod', gulp: 0, zoomFrom: 0, zoomTo: 0, frame: 109 },
    { kind: 'anchovy', gulp: T.openAnchovy + 0.15, zoomFrom: T.openAnchovy + 0.15, zoomTo: T.openMackerel - 0.3, frame: 3.4, reach: 0.07 },
    { kind: 'mackerel', gulp: T.openMackerel + 0.3, zoomFrom: T.openMackerel - 0.25, zoomTo: T.openTuna - 0.3, frame: 3.4, reach: 0.45 },
    { kind: 'tuna', gulp: T.openTuna + 0.3, zoomFrom: T.openTuna - 0.25, zoomTo: T.openOrca - 0.3, frame: 3.2, reach: 0.45 },
    { kind: 'orca', gulp: T.openOrca + 0.25, zoomFrom: T.openOrca - 0.3, zoomTo: T.biggerFish + 0.4, frame: 3.1, reach: 0.5 },
  ]);
}

export function createClimbChain(): Climb {
  const frames = [3.2, 3.6, 3.6, 3.5, 3.3, 3.1];
  const starts = [T.diatom, T.copepod, T.anchovy, T.mackerel, T.tuna, T.orca];
  const gulps = [0, T.eatsDiatom + 0.35, T.anchovy + 1.8, T.mackerel + 1.6, T.tuna + 1.6, T.catchOne + 0.3];
  return createClimb(
    STEPS.map((s, i) => ({
      kind: s.kind,
      gulp: gulps[i]!,
      zoomFrom: starts[i]! - 0.1,
      zoomTo: starts[i]! - 0.1 + ZOOM_S,
      frame: frames[i]!,
      // The copepod and the orca hover long before their gulp: keep them in the frame.
      reach: i === 1 ? 0.55 : i === 5 ? 0.55 : 1,
    })),
  );
}
