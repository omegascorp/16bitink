import { ART_RES, BLUE } from '../../art/palette';
import { PROSPECTOR_RES, TEX } from '../../art/textures';
import { PLANETS, slotOf } from '../../level/levels';
import { blueprintId, canBuild, recipeOf, type BuildCheck } from '../../logic/blueprints';
import { hasOnHand, onHand, printModule, printPart } from '../../logic/economy';
import { PIECES, prospectorLook, type Piece } from '../../logic/gear';
import { countOf, holdEntries, type Hold } from '../../logic/hold';
import { markGain, markStat } from '../../logic/marks';
import { ORES } from '../../logic/ore';
import { canUpgrade, capOf, landerLookOf, maxLevel, MODULE_KEYS, MODULES, nextRecipe, type ModuleKey } from '../../logic/ship';
import { inkButton, inkText, noteText, PENCIL } from '../ui';
import { section, SOFT_INK, type ShipPage } from './panel';

const PIECE_NAMES: Readonly<Record<Piece, string>> = { drill: 'Drill', cell: 'Cell', pack: 'Pack', suit: 'Suit', helmet: 'Helmet', jetpack: 'Jetpack' };
/** The print button's label when it can't print yet. */
const BUILD_WHY: Readonly<Record<BuildCheck, string>> = { ok: 'Print', built: 'built', notFound: 'no blueprint', materials: 'needs ore', order: 'locked' };
const FIG_H = 170;

/** Where each blueprint is found, from the built levels: a mission's reward or a vault. */
function blueprintSources(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const planet of PLANETS) {
    for (const l of planet.levels) {
      if (l.mission.blueprint) out.set(l.mission.blueprint, `reward for ${l.name} (${planet.name} ${slotOf(l.id)})`);
      for (const it of l.items) if (it.blueprint) out.set(it.blueprint, `in a vault on ${l.name} (${planet.name} ${slotOf(l.id)})`);
    }
  }
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
  scene.add.image(x + w / 2, y + 56 + FIG_H / 2, TEX.prospector('idle', prospectorLook(p.gear), 0)).setScale(3.2 / PROSPECTOR_RES);
  let ry = y + 56 + FIG_H;
  for (const piece of PIECES) ry += pieceRow(page, piece, x, ry, w);
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Printer: gear', 11);
  return h;
}

/** One gear piece: its mark and what it does, then its next blueprint (pencil until found) and the print button. Returns the row's height. */
function pieceRow(page: ShipPage, piece: Piece, x: number, ry: number, w: number): number {
  const { scene, profile: p } = page;
  const mk = p.gear[piece];
  inkText(scene, x + 16, ry + 14, `${PIECE_NAMES[piece]} · Mk ${mk}`, 24).setOrigin(0, 0.5);
  inkText(scene, x + w - 16, ry + 14, markStat(piece, mk), 20, SOFT_INK).setOrigin(1, 0.5);
  const r = recipeOf(blueprintId(piece, mk + 1));
  const note = (text: string): number => noteText(scene, x + 16, ry + 30, text, 19, w - 32, PENCIL).height + 42;
  if (!r) return note('the best there is on this planet');
  const why = canBuild(r, p.found, p.gear, hasOnHand(p));
  if (why === 'notFound') return note(`Mk ${r.mk} blueprint not found: ${SOURCES.get(r.id) ?? 'on a later landing'}`);
  const gain = noteText(scene, x + 16, ry + 30, `Mk ${r.mk}: ${markGain(piece, r.mk)}`, 19, w - 150, BLUE);
  const recipe = noteText(scene, x + 16, gain.y + gain.height + 2, recipeLine(r.materials, onHand(p)), 18, w - 150, why === 'ok' ? BLUE : SOFT_INK);
  inkButton(scene, x + w - 70, ry + 58, BUILD_WHY[why], () => {
    const out = printPart(page.profile, r.id);
    if (out.ok) page.commit(out.profile, { news: `Printed: ${PIECE_NAMES[piece]} Mk ${r.mk}!` });
  }, { width: 116, height: 40, size: 20, disabled: why !== 'ok' });
  return Math.max(recipe.y + recipe.height, ry + 80) - ry + 12;
}

/** The printer's lander sheet: the ship as it is, then each module. Returns the height. */
export function landerPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  scene.add.image(x + w / 2, y + 56 + FIG_H, TEX.lander(landerLookOf(p.ship), 0)).setOrigin(0.5, 1).setScale(1.1 / ART_RES);
  let ry = y + 56 + FIG_H;
  for (const k of MODULE_KEYS) ry += moduleRow(page, k, x, ry, w);
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Printer: lander', 23);
  return h;
}

/** One module: its level and what it gives, the next level and its materials, the print button. Returns the row's height. */
function moduleRow(page: ShipPage, k: ModuleKey, x: number, ry: number, w: number): number {
  const { scene, profile: p } = page;
  const m = MODULES[k];
  const lvl = p.ship[k];
  inkText(scene, x + 16, ry + 14, `${m.name} · ${lvl}/${maxLevel(k)}`, 24).setOrigin(0, 0.5);
  const now = noteText(scene, x + 16, ry + 28, m.gives[lvl]!, 19, w - 150, SOFT_INK);
  const recipe = nextRecipe(p.ship, k);
  const why = canUpgrade(p.ship, k, hasOnHand(p));
  const below = now.y + now.height + 2;
  if (recipe === null) {
    const t = noteText(scene, x + 16, below, 'fully fitted', 18, w - 150, PENCIL);
    return t.y + t.height - ry + 12;
  }
  const next = noteText(scene, x + 16, below, `next: ${m.gives[lvl + 1]}${why === 'hull' ? ' · refit the hull first' : ''}`, 18, w - 150, why === 'ok' ? BLUE : PENCIL);
  const needs = noteText(scene, x + 16, next.y + next.height + 1, recipeLine(recipe, onHand(p)), 17, w - 150, why === 'ok' ? BLUE : SOFT_INK);
  const label = why === 'ok' ? 'Print' : why === 'hull' ? `hull ${capOf(p.ship, k) + 1}` : 'needs ore';
  inkButton(scene, x + w - 70, ry + 44, label, () => {
    const out = printModule(page.profile, k);
    if (out.ok) page.commit(out.profile, { news: `Printed: ${m.name}!` });
  }, { width: 116, height: 40, size: 20, disabled: why !== 'ok' });
  return Math.max(needs.y + needs.height, ry + 68) - ry + 12;
}
