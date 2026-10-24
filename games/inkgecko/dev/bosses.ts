import { BOSS_ART } from '../src/art/bosses';
import { makeDraw } from '../src/art/kit';
import { BOIL } from '../src/art/palette';
import { makeCanvas } from '../src/art/pen';
import { BOSS_KINDS, type BossKind } from '../src/level/types';

// Dev-only sheet of the bosses: every pose, every boil frame, over grounds like the places they live in.
// ?only=mole shows one boss; ?scale=3 draws them bigger; ?tint=#5f8f4e tints chameleon skins.
const sheet = document.getElementById('sheet')!;
const params = new URLSearchParams(location.search);
const only = params.get('only') as BossKind | null;
const scale = Number(params.get('scale') ?? 2);
const tint = params.get('tint') ?? '#6fae4a';
/** Grounds to paint each pose over: paper, grass, stone, and night. */
const GROUNDS = ['#f5f0e1', '#9cbf72', '#c9c0ad', '#1a2240'];

for (const kind of BOSS_KINDS) {
  if (only && only !== kind) continue;
  const art = BOSS_ART[kind];
  sheet.append(Object.assign(document.createElement('h2'), { textContent: `${kind} — frame ${art.frame}, res ${art.res}` }));
  for (const ground of GROUNDS) {
    const row = document.createElement('div');
    row.className = 'row';
    sheet.append(row);
    for (const pose of art.poses) {
      for (let f = 0; f < BOIL; f++) {
        const px = art.frame * art.res;
        const { canvas, ctx } = makeCanvas(px, px);
        ctx.fillStyle = ground;
        ctx.fillRect(0, 0, px, px);
        ctx.save();
        ctx.scale(art.res, art.res);
        ctx.translate(art.frame / 2, art.frame / 2);
        art.draw(makeDraw(ctx, 900 + f, f, 0), pose);
        ctx.restore();
        // A skin is a light wash the game tints (the chameleon's): show it tinted as it will be.
        if (pose.endsWith('-skin')) {
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = tint;
          ctx.fillRect(0, 0, px, px);
          ctx.globalCompositeOperation = 'source-over';
        }
        canvas.style.width = `${(art.frame * scale)}px`;
        const fig = document.createElement('figure');
        fig.append(canvas, Object.assign(document.createElement('figcaption'), { textContent: `${pose} · ${f}` }));
        row.append(fig);
      }
    }
  }
}
