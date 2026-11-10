import type Phaser from 'phaser';
import type { MapDef } from '../../level/types';
import type { Adventure } from '../../logic/adventure';
import { armyOf, type ArmySlot } from '../../logic/army';
import { SLOT, SLOT_GAP } from '../battle/pixelFrames';
import { INK, PixelButton } from '../battle/pixelUi';
import { ArmyRow } from '../hud/armyRow';
import { PORTAL_ROOM, portalLayout, portalView, type PortalBand, type PortalWay } from './portalData';
import { roomIn, TownRoom } from './townRoom';

export interface PortalActions {
  close(): void;
  /** The picked hero fights the week's band. */
  fight(): void;
  /** The picked hero steps through to town `townId`. */
  step(townId: string): void;
}

/**
 * The Portal as a room, from its second level: this week's band (its
 * companies, how it reads against the hero's army, the experience and the
 * gear it may carry) with Fight, and from the third the other Great Portal
 * towns of ours, each with Step through or why not. At the foot, who goes.
 */
export class PortalRoom extends TownRoom {
  constructor(scene: Phaser.Scene, adv: Adventure, def: MapDef, townId: string, area: { w: number; h: number }, private readonly act: PortalActions, depth: number) {
    const view = portalView(adv, def, townId);
    const l = portalLayout(roomIn(area), view, SLOT);
    super(scene, area, l, { title: view.title }, () => act.close(), depth);
    const { pad, gap, head } = PORTAL_ROOM;
    this.band(view.band, view.quiet, pad, head, l.w - pad * 2, l.band);
    if (view.ways) this.ways(view.ways, pad, head + l.band + gap, l.w - pad * 2, l.ways);
    const footY = l.h - pad - PORTAL_ROOM.foot;
    this.plate(pad, footY, l.w - pad * 2, PORTAL_ROOM.foot);
    this.label(view.who, pad + PORTAL_ROOM.inset, footY + 8, { wrap: l.w - pad * 2 - PORTAL_ROOM.inset * 2, align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
  }

  /** The week's band: its name and Fight, its companies, and the line on its odds and what it gives; else why there is none. */
  private band(band: PortalBand | null, quiet: string, x: number, y: number, w: number, h: number): void {
    const { inset, line, btn } = PORTAL_ROOM;
    this.plate(x, y, w, h);
    const tx = x + inset;
    this.label('This week\'s band', tx, y + inset, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    if (!band) {
      this.label(quiet, tx, y + inset + line + 4, { wrap: w - inset * 2, align: 'left', anchor: { x: 0, y: 0 } });
      return;
    }
    const top = y + inset + line + 4;
    const stacks = band.army.filter((s): s is ArmySlot => !!s);
    const row = new ArmyRow(this.scene, SLOT, stacks.length);
    row.set(armyOf(stacks));
    row.setPosition(tx, top);
    this.root.add(row.root);
    this.owned.push(row);
    this.label(band.name, tx + stacks.length * (SLOT + SLOT_GAP) + 6, top + Math.floor((SLOT - line) / 2), { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.label(band.why ?? band.line, tx, top + SLOT + 4, { wrap: w - inset * 3 - btn.w, align: 'left', anchor: { x: 0, y: 0 }, ink: band.why ? INK.dim : INK.text });
    this.button('Fight', !band.why, () => this.act.fight(), x + w - inset - btn.w, y + h - inset - btn.h);
  }

  /** A row per town to step through to: its name, and Step through or why not. */
  private ways(ways: readonly PortalWay[], x: number, y: number, w: number, h: number): void {
    const { inset, line, way, btn } = PORTAL_ROOM;
    this.plate(x, y, w, h);
    const tx = x + inset;
    this.label('Step through to', tx, y + inset, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    const top = y + inset + line + 4;
    if (!ways.length) {
      this.label('No other town of yours has one yet.', tx, top + 8, { align: 'left', anchor: { x: 0, y: 0 } });
      return;
    }
    const shown = Math.max(1, Math.floor((h - (top - y) - inset) / way));
    ways.slice(0, shown).forEach((to, i) => {
      const ry = top + i * way;
      this.label(to.name, tx, ry + 2, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
      this.label(to.why ?? to.note, tx, ry + 2 + line, { wrap: w - inset * 3 - btn.w, align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
      this.button('Step through', !to.why, () => this.act.step(to.townId), x + w - inset - btn.w, ry + Math.floor((way - btn.h) / 2));
    });
  }

  private button(label: string, enabled: boolean, onClick: () => void, x: number, y: number): void {
    const b = new PixelButton(this.scene, { w: PORTAL_ROOM.btn.w, h: PORTAL_ROOM.btn.h, label, rim: 'gold', primary: true, onClick });
    b.setEnabled(enabled);
    b.setPosition(x, y);
    this.root.add(b.root);
    this.owned.push(b);
  }
}
