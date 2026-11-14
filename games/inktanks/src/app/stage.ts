import Phaser from 'phaser';
import { ChapterMapScene, MAP_KEY, type MapHooks } from '../scenes/map/ChapterMapScene';
import type { MissionScene } from '../scenes/mission/MissionScene';

/**
 * The game's one Phaser instance: the chapter map's land, or a mission.
 * Pixel art at density C: the native view stays about 540 px tall (2 device
 * px per art px on a 1080p screen), as dev/boot.ts, and follows the parent's
 * size. The DOM screens and HUD sit over it.
 */
export const NATIVE_HEIGHT = 540;

export function stageSize(cssW: number, cssH: number, dpr: number): { width: number; height: number; zoom: number } {
  const scale = Math.max(1, Math.round((cssH * dpr) / NATIVE_HEIGHT));
  return { width: Math.ceil((cssW * dpr) / scale), height: Math.ceil((cssH * dpr) / scale), zoom: scale / dpr };
}

export class Stage {
  readonly game: Phaser.Game;
  readonly map: ChapterMapScene;
  private readonly resizer: ResizeObserver;
  private mission: MissionScene | null = null;
  private serial = 0;

  constructor(private readonly parent: HTMLElement, hooks: MapHooks) {
    const s = this.size();
    this.map = new ChapterMapScene(hooks);
    this.game = new Phaser.Game({
      type: Phaser.WEBGL, parent, width: s.width, height: s.height, backgroundColor: '#1b1a16', pixelArt: true, roundPixels: true, antialias: false,
      scale: { mode: Phaser.Scale.NONE, zoom: s.zoom },
      // The texture units WebGL promises everywhere, as the other games.
      render: { maxTextures: 8, powerPreference: 'high-performance' },
      input: { activePointers: 3 }, audio: { noAudio: true }, banner: false, scene: [this.map],
    });
    this.resizer = new ResizeObserver(() => this.fit());
    this.resizer.observe(parent);
  }

  private size(): { width: number; height: number; zoom: number } {
    return stageSize(this.parent.clientWidth || innerWidth, this.parent.clientHeight || innerHeight, devicePixelRatio || 1);
  }

  private fit(): void {
    const s = this.size();
    if (s.width !== this.game.scale.width || s.height !== this.game.scale.height) this.game.scale.resize(s.width, s.height);
    if (Math.abs(this.game.scale.zoom - s.zoom) > 1e-6) this.game.scale.setZoom(s.zoom);
  }

  /** Runs a mission scene in place of the map. */
  startMission(make: (key: string) => MissionScene): MissionScene {
    this.endMission();
    const scene = make(`Mission${++this.serial}`);
    this.game.scene.sleep(MAP_KEY);
    this.game.scene.add(scene.sys.settings.key, scene, true);
    this.mission = scene;
    return scene;
  }

  /** Drops the mission (if any) and shows the map again. */
  endMission(): void {
    if (this.mission) {
      this.game.scene.remove(this.mission.sys.settings.key);
      this.mission = null;
    }
    this.game.scene.wake(MAP_KEY);
  }

  destroy(): void {
    this.resizer.disconnect();
    this.game.destroy(true);
  }
}
