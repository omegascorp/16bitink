import type Phaser from 'phaser';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';
import { tilesOf } from '../../logic/map';
import { briefAmount, shortfall, type Purse } from '../../logic/resources';
import { creature } from '../../logic/creatures';
import { buildingIn, type Town } from '../../logic/town';
import { drawFrame } from '../battle/pixelFrames';
import type { Pixels } from '../battle/pixelScenery';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel } from '../battle/pixelUi';
import { GoldHalo } from './goldHalo';

/** The plate: its picture, the button beside the words (under them on a narrow screen), and how far it keeps from the screen's edges. */
export const PLATE = { w: 384, pad: 5, gutter: 6, pic: { w: 76, h: 56 }, btn: { w: 116, h: 48 }, narrowBelow: 330 } as const;
/** The slim plate on a phone: no picture or blurb, just the name and the button, as wide as this at most. */
export const SLIM_PLATE = { w: 300, btnH: 34 } as const;
const FILL = [34, 24, 17, 246] as const;
const LINE = 15;
/** What the button says: Build and its price, or what stands in the way today. */
export function buildButton(town: Town, id: BuildingId, purse: Purse): { label: string; note: string; ready: boolean } {
  const cost = BUILDINGS[id].cost;
  const short = shortfall(purse, cost);
  if (town.builtToday) return { label: 'Tomorrow', note: 'One building a day', ready: false };
  if (Object.keys(short).length) return { label: 'Still needs', note: briefAmount(short), ready: false };
  return { label: 'Build', note: briefAmount(cost) || 'Free', ready: true };
}

/** What a building does, in one short line (in the town's people's words). */
function shortSays(town: Town, id: BuildingId): string {
  const def = buildingIn(town, id);
  if (def.dwelling) return `Hires ${creature(def.dwelling).plural}`;
  return def.travel ? `Heroes ride ${tilesOf(def.travel)} tiles further` : def.says;
}

export interface PlateOpts {
  readonly town: Town;
  readonly id: BuildingId;
  readonly purse: Purse;
  /** The building's picture, PLATE.pic in size. */
  readonly picture: Pixels;
  /** Where the plate centres: `w` across from `x` (0), its top at `y` (the gutter). */
  readonly area: { readonly w: number; readonly x?: number; readonly y?: number };
  /** On a phone: the slim plate, the name and the button only (the picture and what it does are a tap away, on its card). */
  readonly slim?: boolean;
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
  /** The plate's bottom edge on screen. */
  readonly bottom: number;

  constructor(scene: Phaser.Scene, opts: PlateOpts) {
    this.bottom = opts.slim ? this.slim(scene, opts) : this.full(scene, opts);
  }

  /** The full plate: the picture, the name, what it does and the button. Returns its bottom. */
  private full(scene: Phaser.Scene, opts: PlateOpts): number {
    const { id, area, depth } = opts;
    const w = Math.min(PLATE.w, area.w - PLATE.gutter * 2);
    const narrow = w < PLATE.narrowBelow;
    const x = (area.x ?? 0) + Math.floor((area.w - w) / 2);
    const y = area.y ?? PLATE.gutter;
    const btn = buildButton(opts.town, id, opts.purse);
    const textX = x + PLATE.pad + PLATE.pic.w + 7;
    const textW = x + w - PLATE.pad - (narrow ? 0 : PLATE.btn.w + 6) - textX;
    const line = { wrap: textW, align: 'left', anchor: { x: 0, y: 0 } } as const;
    const head = new TextLabel(scene, { ...line, ink: INK.dim }).setText('Build next');
    const name = new TextLabel(scene, { ...line, kind: 'title' }).setText(buildingIn(opts.town, id).name);
    const what = new TextLabel(scene, line).setText(shortSays(opts.town, id));
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
    this.halo(scene, btn.ready, { x, y, w, h }, depth);
    return y + h;
  }

  /** The slim plate: "Build next" over the name, the button beside them. Returns its bottom. */
  private slim(scene: Phaser.Scene, opts: PlateOpts): number {
    const { id, area, depth } = opts;
    const w = Math.min(SLIM_PLATE.w, area.w);
    const x = (area.x ?? 0) + Math.floor((area.w - w) / 2);
    const y = area.y ?? PLATE.gutter;
    const btn = buildButton(opts.town, id, opts.purse);
    const textX = x + PLATE.pad + 2;
    const line = { wrap: w - PLATE.pad * 2 - PLATE.btn.w - 8, align: 'left', anchor: { x: 0, y: 0 } } as const;
    const head = new TextLabel(scene, { ...line, ink: INK.dim }).setText('Build next');
    const name = new TextLabel(scene, { ...line, kind: 'title' }).setText(buildingIn(opts.town, id).name);
    const button = new PixelButton(scene, { w: PLATE.btn.w, h: SLIM_PLATE.btnH, label: btn.label, note: btn.note, primary: btn.ready, rim: btn.ready ? 'gold' : 'bronze', onClick: opts.onBuild });
    button.setEnabled(btn.ready);
    const h = PLATE.pad * 2 + Math.max(LINE + name.height, SLIM_PLATE.btnH);
    const frame = new PixelFrame(scene, w, h, { rim: btn.ready ? 'gold' : 'bronze', thick: 2, fill: FILL }).setPosition(x, y);
    frame.img.setInteractive({ useHandCursor: true }).on('pointerup', opts.onInfo);
    const textY = y + Math.floor((h - LINE - name.height) / 2);
    head.setPosition(textX, textY);
    name.setPosition(textX, textY + LINE);
    button.setPosition(x + w - PLATE.pad - PLATE.btn.w, y + Math.floor((h - SLIM_PLATE.btnH) / 2));
    frame.img.setDepth(depth);
    for (const p of [head.img, name.img, button.root]) p.setDepth(depth + 1);
    this.owned.push(frame, head, name, button);
    this.halo(scene, btn.ready, { x, y, w, h }, depth);
    return y + h;
  }

  /** The gold ring that breathes round the plate while it can go up today. */
  private halo(scene: Phaser.Scene, ready: boolean, box: { x: number; y: number; w: number; h: number }, depth: number): void {
    if (!ready) return;
    const halo = new GoldHalo(scene, box.w, box.h).setPosition(box.x, box.y);
    halo.img.setDepth(depth);
    this.owned.push(halo);
  }

  destroy(): void {
    for (const o of this.owned) o.destroy();
  }
}
