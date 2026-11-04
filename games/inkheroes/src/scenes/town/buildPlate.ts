import type Phaser from 'phaser';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';
import { tilesOf } from '../../logic/map';
import { describeAmount, shortfall, type Amount, type Purse } from '../../logic/resources';
import { creature } from '../../logic/creatures';
import type { Town } from '../../logic/town';
import { drawFrame } from '../battle/pixelFrames';
import type { Pixels } from '../battle/pixelScenery';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel } from '../battle/pixelUi';
import { GoldHalo } from './goldHalo';

/** The plate: its picture, the button beside the words (under them on a narrow screen), and how far it keeps from the screen's edges. */
export const PLATE = { w: 384, pad: 5, gutter: 6, pic: { w: 76, h: 56 }, btn: { w: 116, h: 48 }, narrowBelow: 330 } as const;
const FILL = [34, 24, 17, 246] as const;
const LINE = 15;
/** How many resources a price names before the rest are counted: a button has room for two, the building's card has them all. */
const NAMED = 2;

/** A price short enough for a button: "2000 gold, 5 ore", or "3000 gold +6 more". */
function briefAmount(a: Amount): string {
  const n = Object.keys(a).length;
  return n <= NAMED ? describeAmount(a) : `${describeAmount({ gold: a.gold })} +${n - 1} more`;
}

/** What the button says: Build and its price, or what stands in the way today. */
export function buildButton(town: Town, id: BuildingId, purse: Purse): { label: string; note: string; ready: boolean } {
  const cost = BUILDINGS[id].cost;
  const short = shortfall(purse, cost);
  if (town.builtToday) return { label: 'Tomorrow', note: 'One building a day', ready: false };
  if (Object.keys(short).length) return { label: 'Saving up', note: `Needs ${briefAmount(short)}`, ready: false };
  return { label: 'Build', note: briefAmount(cost) || 'Free', ready: true };
}

/** What a building does, in one short line. */
function shortSays(id: BuildingId): string {
  const def = BUILDINGS[id];
  if (def.dwelling) return `Hires ${creature(def.dwelling).plural}`;
  return def.travel ? `Heroes ride ${tilesOf(def.travel)} tiles further` : def.says;
}

export interface PlateOpts {
  readonly town: Town;
  readonly id: BuildingId;
  readonly purse: Purse;
  /** The building's picture, PLATE.pic in size. */
  readonly picture: Pixels;
  readonly area: { readonly w: number };
  readonly depth: number;
  readonly onBuild: () => void;
  /** The plate itself was tapped: more about the building. */
  readonly onInfo: () => void;
}

/**
 * The one suggestion, always in sight at the top of the town: what to
 * build next, what it does, and one tap to build it, for players who'd
 * rather not choose. Its gold ring breathes while it can go up today.
 */
export class BuildPlate {
  private readonly owned: { destroy(): void }[] = [];

  constructor(scene: Phaser.Scene, opts: PlateOpts) {
    const { id, area, depth } = opts;
    const w = Math.min(PLATE.w, area.w - PLATE.gutter * 2);
    const narrow = w < PLATE.narrowBelow;
    const x = Math.floor((area.w - w) / 2);
    const y = PLATE.gutter;
    const btn = buildButton(opts.town, id, opts.purse);
    const textX = x + PLATE.pad + PLATE.pic.w + 7;
    const textW = x + w - PLATE.pad - (narrow ? 0 : PLATE.btn.w + 6) - textX;
    const line = { wrap: textW, align: 'left', anchor: { x: 0, y: 0 } } as const;
    const head = new TextLabel(scene, { ...line, ink: INK.dim }).setText('Build next');
    const name = new TextLabel(scene, { ...line, kind: 'title' }).setText(BUILDINGS[id].name);
    const what = new TextLabel(scene, line).setText(shortSays(id));
    const body = Math.max(PLATE.pic.h, LINE + name.height + 2 + what.height);
    const btnW = narrow ? w - PLATE.pad * 2 : PLATE.btn.w;
    const button = new PixelButton(scene, { w: btnW, h: PLATE.btn.h, label: btn.label, note: btn.note, primary: btn.ready, rim: btn.ready ? 'gold' : 'bronze', onClick: opts.onBuild });
    button.setEnabled(btn.ready);
    const h = PLATE.pad * 2 + (narrow ? body + PLATE.pad + PLATE.btn.h : Math.max(body, PLATE.btn.h));
    const frame = new PixelFrame(scene, w, h, { rim: btn.ready ? 'gold' : 'bronze', thick: 2, fill: FILL }).setPosition(x, y);
    frame.img.setInteractive({ useHandCursor: true }).on('pointerup', opts.onInfo);
    const picture = new PixelImage(scene, opts.picture).setPosition(x + PLATE.pad, y + PLATE.pad);
    const rim = new PixelImage(scene, drawFrame(PLATE.pic.w, PLATE.pic.h, { rim: 'dim', fill: null })).setPosition(x + PLATE.pad, y + PLATE.pad);
    head.setPosition(textX, y + PLATE.pad);
    name.setPosition(textX, y + PLATE.pad + LINE);
    what.setPosition(textX, y + PLATE.pad + LINE + name.height + 2);
    if (narrow) button.setPosition(x + PLATE.pad, y + h - PLATE.pad - PLATE.btn.h);
    else button.setPosition(x + w - PLATE.pad - PLATE.btn.w, y + Math.floor((h - PLATE.btn.h) / 2));
    // The frame under all that stands on it.
    frame.img.setDepth(depth);
    const parts: { setDepth(d: number): unknown }[] = [picture.img, rim.img, head.img, name.img, what.img, button.root];
    for (const p of parts) p.setDepth(depth + 1);
    this.owned.push(frame, picture, rim, head, name, what, button);
    if (btn.ready) {
      const halo = new GoldHalo(scene, w, h).setPosition(x, y);
      halo.img.setDepth(depth);
      this.owned.push(halo);
    }
  }

  destroy(): void {
    for (const o of this.owned) o.destroy();
  }
}
