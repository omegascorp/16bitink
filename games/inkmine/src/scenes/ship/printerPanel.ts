import { PROSPECTOR_RES, TEX } from '../../art/textures';
import { PLANETS } from '../../level/planets';
import { blueprintId, canBuild, recipeOf, type BuildCheck } from '../../logic/blueprints';
import { hasOnHand, onHand, printerWorks, printModule, printPart } from '../../logic/economy';
import { PIECES, prospectorLook, type Piece } from '../../logic/gear';
import { countOf, holdEntries, type Hold } from '../../logic/hold';
import { markGain, markStat } from '../../logic/marks';
import { ORES } from '../../logic/ore';
import { canUpgrade, capOf, maxLevel, MODULE_KEYS, MODULES, nextRecipe, type ModuleKey } from '../../logic/ship';
import { plaque } from '../kit/plaque';
import { aside, FADED, INK_TEXT, label, prose, SEPIA, VERDIGRIS } from '../kit/type';
import { divider, PAD, section, SECTION_BODY, type ShipPage } from './panel';

const PIECE_NAMES: Readonly<Record<Piece, string>> = { drill: 'Drill', cell: 'Cell', pack: 'Pack', suit: 'Suit', helmet: 'Helmet', jetpack: 'Jetpack' };
/** The print button's label when it can't print yet. */
const BUILD_WHY: Readonly<Record<BuildCheck | 'offline', string>> = { ok: 'Print', built: 'Built', notFound: 'No blueprint', materials: 'Needs ore', order: 'Locked', offline: 'Offline' };
const FIG_H = 170;
/** The button's width, and the room it leaves the text. */
const BTN = { w: 120, h: 40, room: 150 } as const;

/** The print button, at a row's right. */
function printButton(page: ShipPage, x: number, y: number, w: number, why: string, ok: boolean, onClick: () => void): void {
  plaque(page.scene, x + w - PAD - BTN.w / 2, y, why, onClick, { width: BTN.w, height: BTN.h, size: 15, kind: ok ? 'primary' : 'off' });
}

/** Where each blueprint is found: which planet's world it lies somewhere in. */
function blueprintSources(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const planet of PLANETS) for (const it of planet.world.items) if (it.blueprint) out.set(it.blueprint, `it's somewhere on ${planet.name}`);
  return out;
}
const SOURCES = blueprintSources();

/** A recipe with what's on hand ticked off: "graphite 3/4 · native copper 6/6 ✓". */
function recipeLine(need: Hold, have: Hold): string {
  return holdEntries(need).map(([ore, n]) => {
    const got = Math.min(countOf(have, ore), n);
    return `${ORES[ore].name} ${got}/${n}${got >= n ? ' ✓' : ''}`;
  }).join(' · ');
}

/** The printer's gear sheet: the prospector as they are, then each piece's mark and its next blueprint. Returns the height. */
export function gearPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  scene.add.image(x + w / 2, y + SECTION_BODY + FIG_H / 2, TEX.prospector('idle', prospectorLook(p.gear), 0)).setScale(3.2 / PROSPECTOR_RES);
  let ry = y + SECTION_BODY + FIG_H;
  ry += offline(page, x, ry, w);
  PIECES.forEach((piece, i) => {
    if (i > 0) divider(scene, x, ry, w);
    ry += pieceRow(page, piece, x, ry + 10, w) + 10;
  });
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Printer: gear', 11);
  return h;
}

/** One gear piece: its mark and what it does, then its next blueprint (pencil until found) and the print button. Returns the row's height. */
function pieceRow(page: ShipPage, piece: Piece, x: number, ry: number, w: number): number {
  const { scene, profile: p } = page;
  const mk = p.gear[piece];
  label(scene, x + PAD, ry + 12, `${PIECE_NAMES[piece]}`, 20, INK_TEXT, '600').setOrigin(0, 0.5);
  label(scene, x + PAD + 92, ry + 12, `Mk ${mk}`, 16, SEPIA, '500').setOrigin(0, 0.5);
  aside(scene, x + w - PAD, ry + 12, markStat(piece, mk), 16, 300, SEPIA).setOrigin(1, 0.5);
  const r = recipeOf(blueprintId(piece, mk + 1));
  const note = (text: string): number => aside(scene, x + PAD, ry + 26, text, 15, w - PAD * 2, FADED).height + 30;
  if (!r) return note('the best there is on this planet');
  const check = canBuild(r, p.found, p.gear, hasOnHand(p));
  // An offline printer only matters once there's something it could print: a missing blueprint still says so.
  const why = !printerWorks(p) && (check === 'ok' || check === 'materials') ? 'offline' : check;
  if (why === 'notFound') return note(`Mk ${r.mk} blueprint not found: ${SOURCES.get(r.id) ?? 'not on this planet'}`);
  const gain = prose(scene, x + PAD, ry + 26, `Mk ${r.mk}: ${markGain(piece, r.mk)}`, 16, w - PAD - BTN.room, INK_TEXT);
  const recipe = label(scene, x + PAD, gain.y + gain.height + 2, recipeLine(r.materials, onHand(p)), 15, why === 'ok' ? VERDIGRIS : SEPIA, '500').setWordWrapWidth(w - PAD - BTN.room);
  printButton(page, x, ry + 50, w, BUILD_WHY[why], why === 'ok', () => {
    const out = printPart(page.profile, r.id);
    if (out.ok) page.commit(out.profile, { news: `Printed: ${PIECE_NAMES[piece]} Mk ${r.mk}!` });
  });
  return Math.max(recipe.y + recipe.height, ry + 72) - ry;
}

/** A note under a printer sheet's heading while the crash has it out of action. Returns its height (none once it works). */
function offline(page: ShipPage, x: number, ry: number, w: number): number {
  if (printerWorks(page.profile)) return 0;
  const t = aside(page.scene, x + PAD, ry + 2, 'The printer is offline: repair it first (see Repairs).', 16, w - PAD * 2, SEPIA);
  return t.height + 12;
}

/** The printer's lander sheet: each module (the lander itself is drawn over the repairs). Returns the height. */
export function landerPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene } = page;
  let ry = y + SECTION_BODY;
  ry += offline(page, x, ry, w);
  MODULE_KEYS.forEach((k, i) => {
    if (i > 0) divider(scene, x, ry, w);
    ry += moduleRow(page, k, x, ry + 10, w) + 10;
  });
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Printer: lander', 23);
  return h;
}

/** One module: its level and what it gives, the next level and its materials, the print button. Returns the row's height. */
function moduleRow(page: ShipPage, k: ModuleKey, x: number, ry: number, w: number): number {
  const { scene, profile: p } = page;
  const m = MODULES[k];
  const lvl = p.ship[k];
  label(scene, x + PAD, ry + 12, m.name, 20, INK_TEXT, '600').setOrigin(0, 0.5);
  aside(scene, x + w - PAD, ry + 12, `level ${lvl} of ${maxLevel(k)}`, 16, 200, SEPIA).setOrigin(1, 0.5);
  const now = prose(scene, x + PAD, ry + 26, m.gives[lvl]!, 16, w - PAD - BTN.room, SEPIA);
  const recipe = nextRecipe(p.ship, k);
  const why = printerWorks(p) ? canUpgrade(p.ship, k, hasOnHand(p)) : 'offline';
  const below = now.y + now.height + 2;
  if (recipe === null) {
    const t = aside(scene, x + PAD, below, 'fully fitted', 15, w - PAD - BTN.room, VERDIGRIS);
    return t.y + t.height - ry;
  }
  const next = aside(scene, x + PAD, below, `next: ${m.gives[lvl + 1]}${why === 'hull' ? ' · refit the hull first' : ''}`, 15, w - PAD - BTN.room, why === 'ok' ? INK_TEXT : FADED);
  const needs = label(scene, x + PAD, next.y + next.height + 1, recipeLine(recipe, onHand(p)), 15, why === 'ok' ? VERDIGRIS : SEPIA, '500').setWordWrapWidth(w - PAD - BTN.room);
  const why2 = why === 'ok' ? 'Print' : why === 'hull' ? `Hull ${capOf(p.ship, k) + 1}` : why === 'offline' ? 'Offline' : 'Needs ore';
  printButton(page, x, ry + 44, w, why2, why === 'ok', () => {
    const out = printModule(page.profile, k);
    if (out.ok) page.commit(out.profile, { news: `Printed: ${m.name}!` });
  });
  return Math.max(needs.y + needs.height, ry + 66) - ry;
}
