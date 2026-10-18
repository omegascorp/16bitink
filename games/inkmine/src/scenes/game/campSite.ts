import type Phaser from 'phaser';
import { ASTER_CAMP, ASTER_PERSON, SLEEP_POD } from '../../art/aster/camp';
import { ART_RES, BOIL } from '../../art/palette';
import { bakeAsterCamp, TEX } from '../../art/textures';
import type { Mine } from '../../logic/mine';
import { ringDelta } from '../../logic/terrain';
import type { Ring } from './ring';

/** How near the camp counts as in it: tiles either side of the pod, and rows above its floor (the cave's height). */
const REACH = { cols: 6, rows: 5 } as const;
/** Line-boil frames a second. */
const BOIL_MS = 160;
/** The failing pod's glow flickers on this period, ms; the woken Aster speaks (its crown lit) for the first part of each. */
const FLICKER_MS = 2300;
const SPEAK_MS = 5200;
const SPEAKING = 0.35;
/** The Aster stands this far east of its pod once it's up, px. */
const STAND_OFF = 52;
/** Where the crew back from Brine stand round the cave, px from the pod, and which way each faces (true: west). */
const CREW = [{ dx: -64, west: false }, { dx: -118, west: false }, { dx: 108, west: true }] as const;

/**
 * A lost crew's camp in the world (Mycel's Aster camp, at the end of their
 * trail): their things along the cave floor, the sleep pod in the middle,
 * its glow failing until it's charged, then open, with the last of the
 * crew standing beside it, its crown flashing now and then as it talks;
 * and once the others are home from Brine, all four of them.
 */
export class CampSite {
  /** The pod's middle, px along the ground. */
  readonly x: number;
  private readonly floor: number;
  private readonly camp: Phaser.GameObjects.Image;
  private readonly pod: Phaser.GameObjects.Image;
  private readonly aster: Phaser.GameObjects.Image;
  private readonly crew: Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, private readonly at: { readonly col: number; readonly row: number }, private readonly tile: number) {
    bakeAsterCamp(scene);
    this.x = (at.col + 0.5) * tile;
    this.floor = (at.row + 1) * tile;
    const C = ASTER_CAMP;
    const P = SLEEP_POD;
    const A = ASTER_PERSON;
    this.camp = scene.add.image(this.x, this.floor, TEX.asterCamp(0)).setOrigin(C.ox / C.w, C.oy / C.h).setScale(1 / ART_RES).setDepth(1.75);
    this.pod = scene.add.image(this.x, this.floor, TEX.asterPod('failing', 0)).setOrigin(P.ox / P.w, P.oy / P.h).setScale(1 / ART_RES).setDepth(1.8);
    this.aster = scene.add.image(this.x + STAND_OFF, this.floor, TEX.asterPerson('stand', 0)).setOrigin(A.ox / A.w, A.oy / A.h).setScale(1 / ART_RES).setDepth(2.05).setVisible(false);
    this.crew = CREW.map((c) => scene.add.image(this.x + c.dx, this.floor, TEX.asterPerson('stand', 0)).setOrigin(A.ox / A.w, A.oy / A.h).setScale(1 / ART_RES).setDepth(2.05).setFlipX(c.west).setVisible(false));
  }

  /** Where the beacon points: the pod. */
  get point(): { x: number; y: number } {
    return { x: this.x, y: (this.at.row + 0.5) * this.tile };
  }

  /** Whether the prospector is in the camp: beside the pod, in its cave. */
  holds(mine: Mine): boolean {
    const p = mine.player;
    const T = this.tile;
    const across = Math.abs(ringDelta(mine.terrain, p.x + p.w / 2, this.x, T)) / T;
    const feet = p.y + p.h;
    return across <= REACH.cols && feet <= this.floor + 4 && feet >= this.floor - REACH.rows * T;
  }

  /** `woken`: the sleeper is up; `together`: its crew are home from Brine too. */
  update(ring: Ring, now: number, woken: boolean, together = false): void {
    const f = Math.floor(now / BOIL_MS) % BOIL;
    const x = ring.near(this.x);
    this.camp.setTexture(TEX.asterCamp(f)).setX(x);
    if (!woken) {
      // A weak glow that dips and catches, like a cell nearly flat.
      const t = (now % FLICKER_MS) / FLICKER_MS;
      this.pod.setTexture(TEX.asterPod('failing', f)).setX(x).setAlpha(t > 0.82 && t < 0.88 ? 0.86 : 1);
      this.aster.setVisible(false);
      for (const c of this.crew) c.setVisible(false);
      return;
    }
    this.pod.setTexture(TEX.asterPod('open', f)).setX(x).setAlpha(1);
    const speaking = (now % SPEAK_MS) / SPEAK_MS < SPEAKING;
    this.aster.setVisible(true).setTexture(TEX.asterPerson(speaking ? 'speak' : 'stand', f)).setX(x + STAND_OFF);
    // Home again, they talk among themselves: each crown flashes in its turn.
    this.crew.forEach((c, i) => {
      const turn = ((now + (i + 1) * SPEAK_MS * 0.25) % SPEAK_MS) / SPEAK_MS < SPEAKING;
      c.setVisible(together).setTexture(TEX.asterPerson(turn ? 'speak' : 'stand', f)).setX(x + CREW[i]!.dx);
    });
  }
}

