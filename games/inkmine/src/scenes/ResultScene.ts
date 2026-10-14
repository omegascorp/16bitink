import Phaser from 'phaser';
import { ITEM_FRAME } from '../art/itemArt';
import { BLUE, PAPER, RED } from '../art/palette';
import { bakePickups, TEX } from '../art/textures';
import { levelById, nextLevel, planetOf, slotOf } from '../level/levels';
import { recipeOf } from '../logic/blueprints';
import type { Payout } from '../logic/economy';
import { holdEntries, holdSize, type Hold } from '../logic/hold';
import { contractText } from '../logic/mission';
import { ORES } from '../logic/ore';
import { relayoutOnResize, screenScene, viewSize } from './hidpi';
import { drawBlots, inkButton, inkText, noteCard, noteText, PENCIL } from './ui';

export interface ResultData {
  readonly levelId: string;
  readonly payout: Payout;
}

const CARD_W = 640;
const SOFT_INK = '#4a463e';

export const holdText = (h: Hold): string => holdEntries(h).map(([ore, n]) => `${n} ${ORES[ore].name}`).join(', ');

/**
 * After a landing: what came up and where it went (to the guild, sold, kept
 * in the hold for gear), the fee, each contract, any blueprint found, and the
 * blots. Then on to the ship, or land again.
 */
export class ResultScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.leaving = false;
    screenScene(this, true);
    relayoutOnResize(this, data);
    this.cameras.main.setBackgroundColor(PAPER);
    const def = levelById(data.levelId)!;
    const planet = planetOf(def.id);
    bakePickups(this, planet.style.stone);
    const p = data.payout;
    const { width, height } = viewSize(this);
    const won = p.ending === 'won';
    const title = won ? 'Mission complete!' : p.ending === 'left' ? 'Lifted off early' : 'Your suit gave out';
    inkText(this, width / 2, 46, title, 56, won ? BLUE : RED);
    inkText(this, width / 2, 92, `${planet.name} ${slotOf(def.id)} · ${def.name}`, 26, SOFT_INK);

    const left = -CARD_W / 2 + 34;
    const tw = CARD_W - 68;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 0;
    const line = (text: string, size = 22, color = BLUE): void => {
      const t = noteText(this, left, y, text, size, tw, color);
      parts.push(t);
      y += t.height + 4;
    };
    if (won) {
      const g = this.add.graphics();
      drawBlots(g, 0, y + 16, p.blots, 13);
      parts.push(g);
      y += 44;
    }
    line(holdSize(p.banked) ? `Banked: ${holdText(p.banked)}` : 'Nothing banked this time.');
    if (holdSize(p.taken)) line(`To the guild and clients: ${holdText(p.taken)}`, 20, SOFT_INK);
    if (holdSize(p.sold)) line(`Sold: ${holdText(p.sold)} · ${p.soldFor} cr`);
    if (holdSize(p.kept)) line(`In the hold, for gear: ${holdText(p.kept)}`, 20, SOFT_INK);
    if (won) line(`Mission fee · ${p.fee} cr`);
    for (const c of p.contracts) {
      const mark = c.met ? '☑' : '☐';
      const pay = c.paid ? `${c.contract.pay} cr` : c.paidBefore ? 'paid before' : won ? 'not met' : '';
      line(`${mark} ${contractText(c.contract)}${pay ? ` · ${pay}` : ''}`, 20, c.paid ? BLUE : PENCIL);
    }
    y += 4;
    for (const id of p.blueprints) {
      const r = recipeOf(id);
      if (!r) continue;
      const img = this.add.image(left + 24, y + 22, TEX.item('blueprint', 0)).setScale(56 / ITEM_FRAME / 3);
      parts.push(img);
      const needs = holdText(r.materials);
      const t = noteText(this, left + 60, y, `New blueprint: ${r.piece} Mk ${r.mk}! Build it on the ship with ${needs} and ${r.fee} cr.`, 22, tw - 60, BLUE);
      parts.push(t);
      y += Math.max(48, t.height + 6);
    }
    y += 6;
    line(`+${p.credits} credits · you have ${p.profile.credits}`, 26);
    const h = y + 150;
    // Lay the parts out from the card's top.
    for (const part of parts) (part as unknown as { y: number }).y += -h / 2 + 40;
    const next = won ? (nextLevel(def.id) ?? def) : def;
    parts.push(inkButton(this, -130, h / 2 - 50, 'Land again', this.go('Game', { levelId: def.id }), { width: 200, height: 50, size: 26 }));
    parts.push(inkButton(this, 130, h / 2 - 50, 'To the ship ▸', this.go('Ship', { levelId: next.id }), { width: 220, height: 50, size: 26 }));
    const cardY = 126 + h / 2;
    noteCard(this, width / 2, cardY, CARD_W, h, parts, 91);
    this.input.keyboard?.once('keydown-ENTER', this.go('Ship', { levelId: next.id }));
  }

  private go(key: string, payload: object): () => void {
    return () => {
      if (this.leaving) return;
      this.leaving = true;
      this.scene.start(key, payload);
    };
  }
}
