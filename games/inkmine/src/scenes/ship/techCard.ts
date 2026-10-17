import { techTexture } from '../../art/textures';
import { blueprintId, canBuild, recipeOf, type BuildCheck } from '../../logic/blueprints';
import { hasOnHand, onHand, printerWorks, printModule, printPart } from '../../logic/economy';
import { markGain, markStat } from '../../logic/marks';
import { canRepair, needsLine, REPAIRS, repair, type RepairCheck } from '../../logic/repairs';
import { canUpgrade, capOf, maxLevel, MODULES, nextRecipe } from '../../logic/ship';
import { canFix, fix, STARSHIP, type FixCheck, type StarshipId } from '../../logic/starship';
import { hasBeat } from '../../logic/story';
import type { Tech } from '../../logic/tech';
import { canPrintTool, printTool, TOOL_KINDS, type ToolCheck } from '../../logic/tools';
import { plaque } from '../kit/plaque';
import { aside, FADED, INK_TEXT, label, MADDER, prose, SEPIA, VERDIGRIS } from '../kit/type';
import { divider, PAD, section, SECTION_BODY, type ShipPage } from './panel';
import { variantOf } from './techGrid';
import { PIECE_NAMES, recipeLine, SOURCES, techName } from './techText';

/** The picture's size, and the gap beside it. */
const PIC = 104;
/** `wide` fits "At the lander", the label far from it. */
const BTN = { w: 150, wide: 210, h: 44 } as const;
/** The print button's label when it can't print yet. */
const BUILD_WHY: Readonly<Record<BuildCheck | 'offline', string>> = { ok: 'Print', built: 'Built', notFound: 'No blueprint', materials: 'Needs ore', order: 'Locked', offline: 'Offline' };
/** The repair button's label when it can't repair yet. */
const REPAIR_WHY: Readonly<Record<RepairCheck, string>> = { ok: 'Repair', done: 'Repaired', order: 'Later', materials: 'Needs ore', given: "Can't print" };

/** What the card says: the line beside the picture, then the text under it, and the button (if any). */
interface CardText {
  /** "Mk 1", "level 2 of 3", "broken". */
  readonly status: string;
  readonly statusColor: string;
  /** What it does now. */
  readonly now: string;
  /** The next step: what it gives (or why not), in italic. */
  readonly next?: { readonly text: string; readonly color: string };
  /** Materials against what's on hand. */
  readonly recipe?: { readonly text: string; readonly ok: boolean };
  readonly button?: { readonly label: string; readonly ok: boolean; readonly press: () => void };
}

function gearText(page: ShipPage, t: Extract<Tech, { kind: 'gear' }>): CardText {
  const p = page.profile;
  const mk = p.gear[t.piece];
  const base = { status: `Mk ${mk}`, statusColor: INK_TEXT, now: markStat(t.piece, mk) };
  const r = recipeOf(blueprintId(t.piece, mk + 1));
  if (!r) return { ...base, next: { text: 'The best there is on this planet.', color: FADED } };
  const check = canBuild(r, p.found, p.gear, hasOnHand(p));
  // An offline printer only matters once there's something it could print: a missing blueprint still says so.
  const why = !printerWorks(p) && (check === 'ok' || check === 'materials') ? 'offline' : check;
  if (why === 'notFound') return { ...base, next: { text: `No Mk ${r.mk} blueprint yet: ${SOURCES.get(r.id) ?? 'none on this planet'}.`, color: FADED } };
  return {
    ...base,
    next: { text: `Mk ${r.mk}: ${markGain(t.piece, r.mk)}${why === 'offline' ? ' · repair the printer first' : ''}`, color: why === 'ok' ? INK_TEXT : SEPIA },
    recipe: { text: recipeLine(r.materials, onHand(p)), ok: why === 'ok' },
    button: {
      label: BUILD_WHY[why], ok: why === 'ok', press: () => {
        const out = printPart(page.profile, r.id);
        if (out.ok) page.commit(out.profile, { news: `Printed: ${PIECE_NAMES[t.piece]} Mk ${r.mk}!` });
      },
    },
  };
}

function moduleText(page: ShipPage, t: Extract<Tech, { kind: 'module' }>): CardText {
  const p = page.profile;
  const m = MODULES[t.key];
  const lvl = p.ship[t.key];
  const base = { status: lvl > 0 ? `level ${lvl} of ${maxLevel(t.key)}` : 'not built', statusColor: lvl > 0 ? INK_TEXT : FADED, now: `${m.about}. Now: ${m.gives[lvl]}.` };
  const recipe = nextRecipe(p.ship, t.key);
  if (recipe === null) return { ...base, next: { text: 'Fully fitted.', color: VERDIGRIS } };
  const why = printerWorks(p) ? canUpgrade(p.ship, t.key, hasOnHand(p)) : 'offline';
  const label = why === 'ok' ? 'Print' : why === 'hull' ? `Hull ${capOf(p.ship, t.key) + 1}` : why === 'offline' ? 'Offline' : 'Needs ore';
  const after = why === 'hull' ? ' · refit the hull first' : why === 'offline' ? ' · repair the printer first' : '';
  return {
    ...base,
    next: { text: `Next: ${m.gives[lvl + 1]}${after}`, color: why === 'ok' ? INK_TEXT : SEPIA },
    recipe: { text: recipeLine(recipe, onHand(p)), ok: why === 'ok' },
    button: {
      label, ok: why === 'ok', press: () => {
        const out = printModule(page.profile, t.key);
        if (out.ok) page.commit(out.profile, { news: `Printed: ${m.name}!` });
      },
    },
  };
}

/** The print button's label for a tool. */
const TOOL_WHY: Readonly<Record<ToolCheck, string>> = { ok: 'Print', have: 'Printed', nothing: 'Not yet', offline: 'Offline', materials: 'Needs ore' };

function toolText(page: ShipPage, t: Extract<Tech, { kind: 'tool' }>): CardText {
  const p = page.profile;
  const k = TOOL_KINDS[t.id];
  const why = canPrintTool(p, t.id);
  if (why === 'have') return { status: 'printed', statusColor: VERDIGRIS, now: `${k.about}.` };
  return {
    status: 'not printed', statusColor: FADED, now: `${k.about}.`,
    next: why === 'nothing' ? { text: 'Nothing to listen for yet.', color: FADED } : why === 'offline' ? { text: 'Repair the printer first.', color: SEPIA } : undefined,
    recipe: why === 'nothing' ? undefined : { text: recipeLine(k.recipe, onHand(p)), ok: why === 'ok' },
    button: {
      label: TOOL_WHY[why], ok: why === 'ok', press: () => {
        const out = printTool(page.profile, t.id);
        if (out.ok) page.commit(out.profile, { news: `Printed: the ${k.name.toLowerCase()}!` });
      },
    },
  };
}

function repairText(page: ShipPage, t: Extract<Tech, { kind: 'repair' }>): CardText {
  const p = page.profile;
  const r = REPAIRS[t.id];
  const why = canRepair(p, t.id);
  if (why === 'done') return { status: 'mended', statusColor: VERDIGRIS, now: r.opens };
  if (t.id === 'core' && hasBeat(p, 'core') && why === 'ok') {
    return {
      status: 'ready to fit', statusColor: VERDIGRIS, now: "The Lamplighters' core sits in the cargo, wrapped in cloth and still warm.",
      button: { label: 'Fit it', ok: true, press: () => {
        const out = repair(page.profile, t.id);
        if (out.ok) page.commit(out.profile, { news: 'The drive core is in!' });
      } },
    };
  }
  const first = r.after.filter((a) => !p.repaired.includes(a)).map((a) => REPAIRS[a].name.toLowerCase()).join(' and the ');
  return {
    status: 'broken', statusColor: MADDER, now: r.broken,
    next: why === 'order' ? { text: `Repair it after the ${first}.`, color: FADED } : r.fact ? { text: r.fact, color: SEPIA } : undefined,
    recipe: r.needs ? { text: needsLine(r.needs, onHand(p)), ok: why === 'ok' } : undefined,
    button: {
      label: REPAIR_WHY[why], ok: why === 'ok', press: () => {
        const out = repair(page.profile, t.id);
        if (out.ok) page.commit(out.profile, { news: `${r.name} repaired!` });
      },
    },
  };
}

/** The mend button's label when it can't mend yet. */
const FIX_WHY: Readonly<Record<FixCheck, string>> = { ok: 'Mend', done: 'Working', order: 'Later', materials: 'Needs ore', away: 'Aboard only', never: 'Not here' };

function starshipText(page: ShipPage, t: Extract<Tech, { kind: 'starship' }>): CardText {
  const p = page.profile;
  const s = STARSHIP[t.id];
  const why = canFix(p, t.id);
  if (t.id === 'jump') return { status: 'burnt out', statusColor: MADDER, now: s.broken };
  if (why === 'done') return { status: 'mended', statusColor: VERDIGRIS, now: s.opens };
  const first = s.after.filter((a) => !p.starship.includes(a)).map((a) => STARSHIP[a].name.toLowerCase()).join(' and the ');
  const next = why === 'order' ? `Mend it after the ${first}.` : why === 'away' ? 'Mended aboard the ship only: carry the ore up in the lander.' : s.fact ?? '';
  return {
    status: 'broken', statusColor: MADDER, now: s.broken,
    next: next ? { text: next, color: why === 'order' || why === 'away' ? FADED : SEPIA } : undefined,
    recipe: { text: needsLine(s.needs!, onHand(p)), ok: why === 'ok' },
    button: {
      label: FIX_WHY[why], ok: why === 'ok', press: () => {
        const out = fix(page.profile, t.id as StarshipId);
        if (out.ok) page.commit(out.profile, { news: `${s.name} mended!` });
      },
    },
  };
}

function cardText(page: ShipPage, t: Tech): CardText {
  if (t.kind === 'gear') return gearText(page, t);
  if (t.kind === 'module') return moduleText(page, t);
  if (t.kind === 'tool') return toolText(page, t);
  if (t.kind === 'starship') return starshipText(page, t);
  return repairText(page, t);
}

/**
 * The detail card for the slot in focus, as No Man's Sky shows a piece of
 * technology: its picture big, its name and how it stands, what it does,
 * then the next step (the next mark, the next level, the repair) with its
 * ore ticked off and the button to print or repair it. Returns the height.
 */
export function techCard(page: ShipPage, t: Tech, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  const c = cardText(page, t);
  const top = y + SECTION_BODY;
  const pic = scene.add.image(x + PAD + PIC / 2, top + PIC / 2, techTexture(scene, t, variantOf(p, t)));
  pic.setScale(PIC / pic.width);
  const tx = x + PAD + PIC + 16;
  const tw = w - (tx - x) - PAD;
  label(scene, tx, top + 4, techName(t), 24, INK_TEXT, '600');
  aside(scene, tx, top + 38, c.status, 18, tw, c.statusColor);
  const now = prose(scene, tx, top + 66, c.now, 16, tw, SEPIA);
  let ry = Math.max(top + PIC, now.y + now.height) + 12;
  if (c.next || c.recipe) {
    divider(scene, x, ry, w);
    ry += 12;
  }
  if (c.next) {
    const t2 = aside(scene, x + PAD, ry, c.next.text, 16, w - PAD * 2, c.next.color);
    ry += t2.height + 4;
  }
  if (c.recipe) {
    const t3 = label(scene, x + PAD, ry, c.recipe.text, 16, c.recipe.ok ? VERDIGRIS : SEPIA, '500').setWordWrapWidth(w - PAD * 2);
    ry += t3.height + 4;
  }
  if (c.button) {
    // Printing and repairing take the lander's printer: far from it the card only reads.
    const b = page.remote ? { label: 'At the lander', ok: false, press: () => undefined } : c.button;
    const bw = page.remote || b.label.length > 10 ? BTN.wide : BTN.w;
    plaque(scene, x + w - PAD - bw / 2, ry + 10 + BTN.h / 2, b.label, b.press, { width: bw, height: BTN.h, size: 16, kind: b.ok ? 'primary' : 'off' });
    ry += BTN.h + 14;
  }
  const h = ry - y + 10;
  section(scene, x, y, w, h, t.kind === 'gear' ? 'Gear' : t.kind === 'module' ? 'Module' : t.kind === 'tool' ? 'Tool' : t.kind === 'starship' ? 'Starship' : 'System', 61);
  return h;
}
