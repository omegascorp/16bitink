import { describe, expect, it } from 'vitest';
import { Ride, RIDE_SPEED } from '../src/scenes/map/ride';

const TILE = 48;
const legMs = TILE / RIDE_SPEED;

/** A ride over `tiles` tiles east, each leg started by the one before as it arrives. */
function rideEast(tiles: number): { ride: Ride; seen: number[]; arrived: number[] } {
  const seen: number[] = [];
  const arrived: number[] = [];
  const ride = new Ride((x) => seen.push(x));
  const go = (i: number): void => {
    if (i < tiles) ride.go({ x: i * TILE, y: 0 }, { x: (i + 1) * TILE, y: 0 }, () => {
      arrived.push(i + 1);
      go(i + 1);
    });
  };
  go(0);
  return { ride, seen, arrived };
}

describe('the ride', () => {
  it('keeps one pace across tiles: the time left at a tile goes straight into the next', () => {
    const { ride, seen } = rideEast(6);
    const frame = 1000 / 60;
    const places: number[] = [];
    for (let i = 0; i < 40; i++) {
      ride.update(frame);
      places.push(seen[seen.length - 1]!);
    }
    places.slice(1).forEach((x, i) => expect(x - places[i]!).toBeCloseTo(frame * RIDE_SPEED, 6));
  });

  it('crosses several tiles in one long frame, in order', () => {
    const { ride, arrived, seen } = rideEast(3);
    ride.update(legMs * 2.5);
    expect(arrived).toEqual([1, 2]);
    expect(seen[seen.length - 1]).toBeCloseTo(2.5 * TILE);
    ride.update(legMs);
    expect(arrived).toEqual([1, 2, 3]);
    expect(ride.moving).toBe(false);
    expect(seen[seen.length - 1]).toBe(3 * TILE);
  });

  it('takes a diagonal at the same pace as a straight step', () => {
    let done = false;
    const ride = new Ride(() => undefined);
    ride.go({ x: 0, y: 0 }, { x: TILE, y: TILE }, () => (done = true));
    ride.update(legMs * 1.4);
    expect(done).toBe(false);
    ride.update(legMs * 0.02);
    expect(done).toBe(true);
  });
});
