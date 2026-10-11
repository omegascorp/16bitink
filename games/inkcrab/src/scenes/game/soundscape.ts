import type Phaser from 'phaser';
import { pitchForSize, type SfxId } from '../../audio/recipes';
import type { SoundBoard } from '../../audio/sound';
import type { Box } from '../../logic/body';
import type { Beach, SimEvent } from '../../logic/sim';
import { tideTurn } from '../../logic/tide';

type Point = { readonly x: number; readonly y: number };

/** The crab rising faster than this (px/s) has jumped (or been thrown), not stepped up a bump. */
const JUMP_VY = -60;

const middle = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** What the beach was doing last frame, so a change (not a state) makes a sound. */
interface Heard {
  readonly onGround: boolean;
  readonly hidden: boolean;
  readonly rising: boolean;
  readonly pouring: boolean;
  readonly gusting: boolean;
  readonly dark: boolean;
  readonly diving: ReadonlySet<number>;
}

/**
 * The level's sound: the sim's events (eating, digging, moving house, being
 * caught…) and the changes that aren't events (a jump, tucking in, a bird
 * starting its stoop, the tide turning in, a squall, a gust, a cloud over the
 * moon), each placed in stereo by where it happened on screen.
 */
export class Soundscape {
  private heard: Heard;
  /** A vent threw the crab this frame: that's its own sound, not a jump. */
  private thrown = false;

  constructor(private readonly sound: SoundBoard | undefined, beach: Beach) {
    this.heard = this.state(beach);
  }

  react(e: SimEvent, beach: Beach, view: Phaser.Geom.Rectangle): void {
    const play = (id: SfxId, at?: Point, pitch?: number): void => this.play(id, view, at, pitch);
    const T = beach.tileSize;
    const tile = (t: readonly [number, number] | undefined): Point | undefined => (t ? { x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T } : undefined);
    const crab = middle(beach.crab.body);
    switch (e.type) {
      case 'ate': return e.wasted > 0 ? play('full', crab) : play('eat', { x: e.x, y: e.y }, pitchForSize(e.points));
      case 'grew': return play('grow');
      case 'tiles':
        if (e.dug) return play('dig', tile(e.tiles[0]));
        if (e.placed) return play('place', tile(e.tiles[0]));
        if (e.poured && !e.washed) return play('pour', tile(e.tiles[0]));
        return;
      case 'swapStart': return play('out', crab);
      case 'swapDone': return play('movein', crab);
      case 'caught': return play('caught', { x: e.x, y: e.y });
      case 'struck': return play('tok', { x: e.x, y: e.y });
      case 'thrown':
        this.thrown = true;
        return play('steam', { x: e.x, y: e.y });
      case 'rapped': return play('knock', { x: e.x, y: e.y });
      case 'traded': return play('trade', { x: e.x, y: e.y });
      case 'joined': return play('join', { x: e.x, y: e.y });
      case 'collected': return play('find', { x: e.x, y: e.y });
      case 'quarry': return play('quarry', { x: e.x, y: e.y });
      case 'won': return play('win');
      case 'lost': return play('lose');
      default: return;
    }
  }

  /** Sounds for what changed since last frame. Call once a frame, after the sim's events. */
  listen(beach: Beach, view: Phaser.Geom.Rectangle): void {
    const now = this.state(beach);
    const was = this.heard;
    const c = beach.crab;
    const crab = middle(c.body);
    if (was.onGround && !now.onGround && c.body.vy < JUMP_VY && !c.climbing && !this.thrown) this.play('jump', view, crab);
    if (now.hidden && !was.hidden && !c.swap) this.play('hide', view, crab);
    for (const b of beach.birds.values()) if (b.phase === 'dive' && !was.diving.has(b.id)) this.play('stoop', view, middle(b));
    if (now.rising && !was.rising) this.play('tide', view);
    if (now.pouring && !was.pouring) this.play('rain', view);
    if (now.gusting && !was.gusting) this.play('gust', view);
    if (now.dark && !was.dark) this.play('dark', view);
    this.heard = now;
    this.thrown = false;
  }

  private state(beach: Beach): Heard {
    const c = beach.crab;
    return {
      onGround: c.body.onGround,
      hidden: c.hidden,
      rising: beach.tide ? tideTurn(beach.tide, beach.elapsed).rising : false,
      pouring: beach.downpour,
      gusting: beach.gusting,
      dark: beach.darkness > 0.5,
      diving: new Set([...beach.birds.values()].filter((b) => b.phase === 'dive').map((b) => b.id)),
    };
  }

  private play(id: SfxId, view: Phaser.Geom.Rectangle, at?: Point, pitch?: number): void {
    this.sound?.play(id, { at, view: at ? view : undefined, pitch });
  }
}
