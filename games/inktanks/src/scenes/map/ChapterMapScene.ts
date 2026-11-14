import Phaser from 'phaser';
import { chapter1Land, SPOT_BOX } from '../../content/ch1/chapterLand';
import type { StructRt } from '../../logic/match/types';
import { GroundStream } from '../../render/ground';
import { StructLayer } from '../../render/structView';
import { preloadMission } from '../mission/MissionScene';

/**
 * The chapter map's painted land, behind the DOM level spots (src/ui/mapScreen.ts).
 * Its preload is also the game's boot: it loads every texture a mission
 * draws with, so missions start without a load. The camera shows SPOT_BOX,
 * zooming out only when the view is smaller than it.
 */
export const MAP_KEY = 'ChapterMap';
const CENTRE = { x: SPOT_BOX.x + SPOT_BOX.w / 2, y: SPOT_BOX.y + SPOT_BOX.h / 2 - 10 };

export interface MapHooks {
  readonly onProgress: (fraction: number) => void;
  readonly onReady: () => void;
  readonly onLoadError: (what: string) => void;
}

export class ChapterMapScene extends Phaser.Scene {
  private ground: GroundStream | null = null;
  private structs: StructLayer | null = null;

  constructor(private readonly hooks: MapHooks) {
    super(MAP_KEY);
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (f: number) => this.hooks.onProgress(f));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => this.hooks.onLoadError(file.key));
    preloadMission(this);
  }

  create(): void {
    const land = chapter1Land();
    const structs: StructRt[] = land.structures.map((def) => ({ def, hp: def.hp, state: 2 as const }));
    this.ground = new GroundStream(this, land);
    this.structs = new StructLayer(this, structs);
    this.cameras.main.setBounds(0, 0, land.width, land.height).setRoundPixels(true);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.frame, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.frame, this));
    this.frame();
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => this.hooks.onReady());
  }

  /** Fits the spots' box: whole native pixels when it fits, zoomed out when the view is smaller. */
  private frame(): void {
    const cam = this.cameras.main;
    const zoom = Math.min(1, this.scale.width / SPOT_BOX.w, this.scale.height / (SPOT_BOX.h + 170));
    cam.setSize(this.scale.width, this.scale.height).setZoom(zoom);
    cam.centerOn(CENTRE.x, CENTRE.y);
    this.paint();
  }

  private paint(): void {
    const view = this.cameras.main.worldView;
    this.ground?.update(view);
    this.structs?.update(view, null);
  }

  update(): void {
    this.paint();
  }

  /** A world point in CSS px relative to the canvas (for the DOM spots). */
  toScreen(x: number, y: number): { x: number; y: number } {
    const r = this.game.canvas.getBoundingClientRect();
    // Worked out here rather than read from worldView, which only updates at the next render.
    const zoom = this.cameras.main.zoom;
    const w = this.scale.width / zoom;
    const h = this.scale.height / zoom;
    return { x: ((x - (CENTRE.x - w / 2)) / w) * r.width, y: ((y - (CENTRE.y - h / 2)) / h) * r.height };
  }
}
