import { TEX } from '../../art/textures';
import { fuelsAt } from '../../logic/worlds';
import { onHand } from '../../logic/economy';
import { countOf } from '../../logic/hold';
import { isLocked, type SlotRef, type Stack } from '../../logic/inventory';
import { oreNeeds, type OreNeed } from '../../logic/needs';
import { ORES } from '../../logic/ore';
import { keptOres } from '../../logic/story';
import { FEED } from '../../logic/suit';
import { aside, FADED, INK_TEXT, label, prose, SEPIA } from '../kit/type';
import { divider, PAD, section, SECTION_BODY, type ShipPage } from './panel';
import { techName } from './techText';

/** The picture's size, as on the technology card. */
const PIC = 104;
/** Keeps one need ("Cell Mk 1 6 ✓") on one line when the list wraps. */
const NBSP = '\u00a0';
/** What each fuel feeds, by gauge. */
const GAUGE_NAMES = { cell: "the drill's cell", air: 'life support' } as const;

/** "Radio", "Cell Mk 1", "the Lamplighters' trade". */
function needName(need: OreNeed): string {
  if (need.kind === 'trade') return "the Lamplighters' trade";
  return need.mk ? `${techName(need.tech)} Mk ${need.mk}` : techName(need.tech);
}

/** Where the stack sits, and whether it stays in the bag at the lander. */
function whereLine(page: ShipPage, at: SlotRef, s: Stack): string {
  const p = page.profile;
  if (at.bag === 1) return 'in the cargo';
  if (at.bag === 2) return p.docked ? "in the starship's hold" : "in the starship's hold, up in orbit";
  if (keptOres(p).includes(s.ore)) return `in the suit bag · kept for ${p.at === 'mycel' ? "the Aster's pod" : 'the Lamplighters'}`;
  return isLocked(p.suit, at.slot) ? 'in the suit bag · locked' : 'in the suit bag';
}

/**
 * The card for a picked-up stack, in the technology card's place: the ore
 * drawn big, its name, how many are in the stack and on hand, what it is
 * (real facts), what it fuels here, and what it's still needed for, each
 * ticked once enough is on hand. Returns the height.
 */
export function stackCard(page: ShipPage, at: SlotRef, s: Stack, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  const ore = ORES[s.ore];
  const total = countOf(onHand(p), s.ore);
  const top = y + SECTION_BODY;
  const pic = scene.add.image(x + PAD + PIC / 2, top + PIC / 2, TEX.piece(s.ore));
  pic.setScale((PIC * 0.85) / pic.width);
  const tx = x + PAD + PIC + 16;
  const tw = w - (tx - x) - PAD;
  label(scene, tx, top + 4, ore.name[0]!.toUpperCase() + ore.name.slice(1), 24, INK_TEXT, '600');
  const status = aside(scene, tx, top + 38, `${s.n} in this stack · ${total} on hand · ${whereLine(page, at, s)}`, 16, tw, INK_TEXT);
  // The status can wrap (a kept stack says why), so what it is starts under it.
  const about = prose(scene, tx, Math.max(top + 66, status.y + status.height + 8), ore.about, 16, tw, SEPIA);
  let ry = Math.max(top + PIC, about.y + about.height) + 12;
  divider(scene, x, ry, w);
  ry += 12;
  const fuels = Object.entries(fuelsAt(page.profile.at)).filter(([, ores]) => ores.includes(s.ore)) as [keyof typeof GAUGE_NAMES, readonly string[]][];
  for (const [gauge] of fuels) {
    const t = aside(scene, x + PAD, ry, `Fuel: one piece puts ${FEED[gauge]} in ${GAUGE_NAMES[gauge]}.`, 16, w - PAD * 2, INK_TEXT);
    ry += t.height + 4;
  }
  const needs = oreNeeds(p, s.ore);
  const line = needs.length
    ? `Needed for: ${needs.map((n) => `${needName(n)} ${n.n}${total >= n.n ? ' ✓' : ''}`.replace(/ /g, NBSP)).join(' · ')}`
    : fuels.length ? 'Nothing to print needs it.' : 'Nothing needs it yet.';
  const t = label(scene, x + PAD, ry, line, 16, needs.length ? SEPIA : FADED, '500').setWordWrapWidth(w - PAD * 2);
  ry += t.height + 4;
  const h = ry - y + 10;
  section(scene, x, y, w, h, 'Cargo', 62);
  return h;
}
