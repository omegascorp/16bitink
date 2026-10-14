import Phaser from 'phaser';
import { BLUE, BLUE_HEX, PAPER, RED, RED_HEX } from '../art/palette';
import { getProfile } from '../host';
import { levelOrder, PLANETS } from '../level/levels';
import { isOpen, type Profile } from '../logic/economy';
import { relayoutOnResize, screenScene, viewSize } from './hidpi';
import { drawBlots, inkButton, inkText, PENCIL, PENCIL_HEX } from './ui';

const SOFT_INK = '#4a463e';
const RING = 30;

type SiteState = 'won' | 'open' | 'locked' | 'draft';

/**
 * The landing sites of a planet, joined by a dotted flight path: a plain
 * stand-in for the star chart (build order step 7). Played sites are inked
 * with their blots, the next one ringed in red, later ones and the unbuilt
 * ones in pencil.
 */
export class ChartScene extends Phaser.Scene {
  constructor() {
    super('Chart');
  }

  create(): void {
    screenScene(this, true);
    relayoutOnResize(this, {});
    this.cameras.main.setBackgroundColor(PAPER);
    const profile = getProfile(this);
    const planet = PLANETS[0]!;
    const { width, height } = viewSize(this);
    inkText(this, width / 2, 54, `Planet ${planet.number} · ${planet.name}`, 54);
    inkText(this, width / 2, 100, planet.blurb, 24, SOFT_INK);
    inkText(this, width - 20, 30, `${profile.credits} credits`, 26).setOrigin(1, 0.5);

    const sites: { name: string; id?: string; state: SiteState }[] = [
      ...planet.levels.map((l) => ({ name: l.name, id: l.id, state: siteState(profile, l.id) })),
      ...planet.drafts.map((name) => ({ name, state: 'draft' as const })),
    ];
    const cols = width >= 900 ? 5 : 2;
    const rows = Math.ceil(sites.length / cols);
    const top = 190;
    const rowH = Phaser.Math.Clamp((height - top - 120) / rows, RING * 2 + 64, 170);
    const colW = (width - 80) / cols;
    const at = (i: number): { x: number; y: number } => {
      const r = Math.floor(i / cols);
      // The path snakes: left to right, then right to left.
      const c = r % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      return { x: 40 + colW * (c + 0.5), y: top + rowH * r + (c % 2) * 18 };
    };
    const path = this.add.graphics();
    path.lineStyle(2, BLUE_HEX, 0.5);
    for (let i = 1; i < sites.length; i++) {
      const a = at(i - 1);
      const b = at(i);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.floor(len / 12);
      // Dots between the rings, not through them.
      const clear = (RING + 8) / len;
      for (let k = 1; k < n; k += 2) if (k / n > clear && k / n < 1 - clear) path.fillStyle(sites[i]!.state === 'draft' ? PENCIL_HEX : BLUE_HEX, 0.6).fillCircle(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n, 1.6);
    }
    sites.forEach((site, i) => this.site(at(i), i + 1, site, profile));
    const next = planet.levels.find((l) => siteState(profile, l.id) === 'open') ?? planet.levels.at(-1)!;
    inkButton(this, width / 2, height - 50, 'The ship ▸', () => this.scene.start('Ship', { levelId: next.id }), { width: 220, height: 52 });
  }

  private site(p: { x: number; y: number }, n: number, site: { name: string; id?: string; state: SiteState }, profile: Profile): void {
    const g = this.add.graphics();
    const ink = site.state === 'open' ? RED_HEX : site.state === 'won' ? BLUE_HEX : PENCIL_HEX;
    if (site.state === 'won') g.fillStyle(BLUE_HEX, 0.12).fillCircle(p.x, p.y, RING);
    g.lineStyle(site.state === 'open' ? 3 : 2, ink, 1).strokeCircle(p.x, p.y, RING);
    if (site.state === 'open') g.lineStyle(1.2, RED_HEX, 0.6).strokeCircle(p.x, p.y, RING + 6);
    const color = site.state === 'open' ? RED : site.state === 'won' ? BLUE : PENCIL;
    inkText(this, p.x, p.y, `${n}`, 30, color);
    inkText(this, p.x, p.y + RING + 18, site.name, 22, color);
    if (site.state === 'won' && site.id) drawBlots(g, p.x, p.y + RING + 46, profile.levels[site.id]?.blots ?? 0, 7);
    if (site.state === 'draft') inkText(this, p.x, p.y + RING + 42, 'uncharted', 18, PENCIL);
    if (!site.id || site.state === 'locked' || site.state === 'draft') return;
    const hit = this.add.zone(p.x, p.y + 20, RING * 3.4, RING * 3).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => this.scene.start('Ship', { levelId: site.id }));
  }
}

function siteState(p: Profile, id: string): SiteState {
  if (p.levels[id]?.won) return 'won';
  return isOpen(p, levelOrder(), id) ? 'open' : 'locked';
}
