import { ART_RES, BLUE } from '../../art/palette';
import { TEX } from '../../art/textures';
import { onHand } from '../../logic/economy';
import { canRepair, needsLine, REPAIR_IDS, REPAIRS, repair, wreckOf, type RepairCheck, type RepairId } from '../../logic/repairs';
import { landerLookOf } from '../../logic/ship';
import { inkButton, inkText, noteText, PENCIL } from '../ui';
import { section, SOFT_INK, type ShipPage } from './panel';

const FIG_H = 170;
/** The repair button's label when it can't repair yet. */
const WHY: Readonly<Record<RepairCheck, string>> = { ok: 'Repair', done: 'repaired', order: 'later', materials: 'needs ore', given: "can't print" };

/**
 * The damage report, No Man's Sky style: the lander as broken as it still
 * is, then each system the crash broke, what's wrong with it, the ore it
 * takes ticked off against what's on hand, and the button to repair it.
 * Mended ones say what they opened. Returns the height.
 */
export function repairPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  scene.add.image(x + w / 2, y + 56 + FIG_H, TEX.lander(landerLookOf(p.ship), 0, wreckOf(p))).setOrigin(0.5, 1).setScale(1.1 / ART_RES);
  let ry = y + 56 + FIG_H + 8;
  for (const id of REPAIR_IDS) ry += repairRow(page, id, x, ry, w);
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Repairs', 53);
  return h;
}

function repairRow(page: ShipPage, id: RepairId, x: number, ry: number, w: number): number {
  const { scene, profile: p } = page;
  const r = REPAIRS[id];
  const why = canRepair(p, id);
  const done = why === 'done';
  inkText(scene, x + 16, ry + 14, r.name, 24).setOrigin(0, 0.5).setAlpha(done ? 0.6 : 1);
  inkText(scene, x + w - 16, ry + 14, done ? 'repaired ✓' : 'broken', 20, done ? BLUE : SOFT_INK).setOrigin(1, 0.5);
  if (done) {
    const t = noteText(scene, x + 16, ry + 30, r.opens, 18, w - 32, PENCIL);
    return t.y + t.height - ry + 12;
  }
  const said = noteText(scene, x + 16, ry + 30, r.broken, 19, w - 150, SOFT_INK);
  let bottom = said.y + said.height;
  if (r.needs) {
    const needs = noteText(scene, x + 16, bottom + 2, needsLine(r.needs, onHand(p)), 18, w - 150, why === 'ok' ? BLUE : SOFT_INK);
    bottom = needs.y + needs.height;
  }
  if (why === 'order') {
    const first = r.after.filter((a) => !p.repaired.includes(a)).map((a) => REPAIRS[a].name.toLowerCase()).join(' and the ');
    const t = noteText(scene, x + 16, bottom + 2, `after the ${first}`, 17, w - 150, PENCIL);
    bottom = t.y + t.height;
  }
  inkButton(scene, x + w - 70, ry + 52, WHY[why], () => {
    const out = repair(page.profile, id);
    if (out.ok) page.commit(out.profile, { news: `${r.name} repaired!` });
  }, { width: 116, height: 40, size: 20, disabled: why !== 'ok' });
  return Math.max(bottom, ry + 76) - ry + 12;
}
