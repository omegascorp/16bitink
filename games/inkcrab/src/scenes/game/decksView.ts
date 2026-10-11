import Phaser from 'phaser';
import { DECK_HEADROOM, DECK_OVERHANG, drawDeck } from '../../art/decks';
import { ART_RES } from '../../art/palette';
import type { Deck } from '../../logic/decks';
import { groundRow, type Terrain } from '../../logic/terrain';

/** Just over the sand, behind food, creatures and the crab: what's on a deck or under it shows in front. */
const DEPTH = 1.2;
/** Tiles drawn below the sand under a deck, so posts still reach it when a hole is dug beside them. */
const FOOTING = 4;

let views = 0;

interface Drawn {
  readonly deck: Deck;
  readonly texture: Phaser.Textures.CanvasTexture;
  /** The sand rows under it when it was last drawn. */
  rows: string;
}

/**
 * The boats and stilt houses: each drawn standing over the sand under it,
 * and drawn again whenever that sand changes, so posts and trestles always
 * reach down to it.
 */
export class DecksView {
  private readonly keys: string[] = [];
  private readonly drawn: Drawn[] = [];
  private readonly prefix = `deck${++views}`;

  constructor(scene: Phaser.Scene, private readonly terrain: Terrain, decks: readonly Deck[], private readonly tile: number) {
    decks.forEach((deck, i) => {
      const key = `${this.prefix}-${i}`;
      const deepest = Math.max(...this.columns(deck).map((x) => groundRow(terrain, x)));
      const tall = DECK_HEADROOM + (deepest - deck.row) + FOOTING;
      const texture = scene.textures.createCanvas(key, Math.ceil((deck.width + DECK_OVERHANG * 2) * tile * ART_RES), Math.ceil(tall * tile * ART_RES));
      if (!texture) return;
      this.keys.push(key);
      scene.add.image((deck.col - DECK_OVERHANG) * tile, (deck.row - DECK_HEADROOM) * tile, key).setOrigin(0, 0).setScale(1 / ART_RES).setDepth(DEPTH);
      this.drawn.push({ deck, texture, rows: '' });
    });
    this.update();
  }

  /** Redraws any deck whose sand has changed since it was last drawn. */
  update(): void {
    for (const d of this.drawn) this.redraw(d);
  }

  /** The columns a deck's drawing spans, overhang included, kept on the beach. */
  private columns(deck: Deck): number[] {
    const first = Math.floor(deck.col - DECK_OVERHANG);
    const last = Math.ceil(deck.col + deck.width + DECK_OVERHANG);
    return Array.from({ length: last - first + 1 }, (_, k) => Math.max(0, Math.min(this.terrain.width - 1, first + k)));
  }

  private redraw(d: Drawn): void {
    const { deck } = d;
    const T = this.tile;
    const rows = new Map(this.columns(deck).map((x) => [x, groundRow(this.terrain, x)]));
    const sig = [...rows.values()].join(',');
    if (sig === d.rows) return;
    d.rows = sig;
    const left = deck.col - DECK_OVERHANG;
    const top = deck.row - DECK_HEADROOM;
    const at = (x: number): number => rows.get(Math.max(0, Math.min(this.terrain.width - 1, x))) ?? this.terrain.height;
    // The sand line (canvas px) under canvas x, eased between column middles so a dug step reads as a slope.
    const ground = (x: number): number => {
      const c = left + x / T - 0.5;
      const k = Math.floor(c);
      const f = c - k;
      return (at(k) * (1 - f) + at(k + 1) * f - top) * T;
    };
    const ctx = d.texture.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, d.texture.width, d.texture.height);
    ctx.scale(ART_RES, ART_RES);
    drawDeck(ctx, deck.kind, deck.width, T, DECK_HEADROOM * T, ground, deck.col * 37 + deck.width);
    d.texture.refresh();
  }

  /** Frees the deck textures (the texture manager is shared by every scene). */
  destroy(scene: Phaser.Scene): void {
    for (const key of this.keys) scene.textures.remove(key);
    this.keys.length = 0;
  }
}
