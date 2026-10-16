import { ART_RES } from '../../art/palette';
import { TEX } from '../../art/textures';
import { onHand } from '../../logic/economy';
import { canRepair, needsLine, REPAIR_IDS, REPAIRS, repair, wreckOf, type RepairCheck, type RepairId } from '../../logic/repairs';
import { landerLookOf } from '../../logic/ship';
import { plaque } from '../kit/plaque';
import { aside, FADED, INK_TEXT, label, MADDER, prose, SEPIA, VERDIGRIS } from '../kit/type';
import { divider, PAD, section, SECTION_BODY, type ShipPage } from './panel';

const FIG_H = 170;
/** The button's width, and the room it leaves the text. */
const BTN = { w: 120, h: 40, room: 150 } as const;
/** The repair button's label when it can't repair yet. */
const WHY: Readonly<Record<RepairCheck, string>> = { ok: 'Repair', done: 'Repaired', order: 'Later', materials: 'Needs ore', given: "Can't print" };

/**
 * The damage report, No Man's Sky style: the lander as broken as it still
 * is, then each system the crash broke, what's wrong with it, the ore it
 * takes ticked off against what's on hand, and the button to repair it.
 * Mended ones say what they opened. Returns the height.
 */
export function repairPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  scene.add.image(x + w / 2, y + SECTION_BODY + FIG_H - 6, TEX.lander(landerLookOf(p.ship), 0, wreckOf(p))).setOrigin(0.5, 1).setScale(1.1 / ART_RES);
  let ry = y + SECTION_BODY + FIG_H + 6;
  REPAIR_IDS.forEach((id, i) => {
    if (i > 0) divider(scene, x, ry, w);
    ry += repairRow(page, id, x, ry + 10, w) + 10;
  });
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Repairs', 53);
  return h;
}

function repairRow(page: ShipPage, id: RepairId, x: number, ry: number, w: number): number {
  const { scene, profile: p } = page;
  const r = REPAIRS[id];
  const why = canRepair(p, id);
  const done = why === 'done';
  label(scene, x + PAD, ry + 12, r.name, 20, done ? SEPIA : INK_TEXT, '600').setOrigin(0, 0.5);
  aside(scene, x + w - PAD, ry + 12, done ? 'mended' : 'broken', 17, 200, done ? VERDIGRIS : MADDER).setOrigin(1, 0.5);
  if (done) {
    const t = prose(scene, x + PAD, ry + 26, r.opens, 16, w - PAD * 2, SEPIA);
    return t.y + t.height - ry;
  }
  const said = prose(scene, x + PAD, ry + 26, r.broken, 16, w - PAD - BTN.room, SEPIA);
  let bottom = said.y + said.height;
  if (r.needs) {
    const needs = label(scene, x + PAD, bottom + 3, needsLine(r.needs, onHand(p)), 15, why === 'ok' ? VERDIGRIS : INK_TEXT, '500').setWordWrapWidth(w - PAD - BTN.room);
    bottom = needs.y + needs.height;
  }
  if (why === 'order') {
    const first = r.after.filter((a) => !p.repaired.includes(a)).map((a) => REPAIRS[a].name.toLowerCase()).join(' and the ');
    const t = aside(scene, x + PAD, bottom + 2, `after the ${first}`, 15, w - PAD - BTN.room, FADED);
    bottom = t.y + t.height;
  }
  plaque(scene, x + w - PAD - BTN.w / 2, ry + 52, WHY[why], () => {
    const out = repair(page.profile, id);
    if (out.ok) page.commit(out.profile, { news: `${r.name} repaired!` });
  }, { width: BTN.w, height: BTN.h, size: 15, kind: why === 'ok' ? 'primary' : 'off' });
  return Math.max(bottom, ry + 74) - ry;
}
