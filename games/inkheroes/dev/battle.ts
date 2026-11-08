import { runInSlices } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { BACKDROP } from '../src/art/palette';
import { poseJobs } from '../src/art/textures';
import { SoundBoard } from '../src/audio/sound';
import { REG } from '../src/host';
import { ASHFORD } from '../src/level/borderMarch';
import { startAdventure } from '../src/logic/adventure';
import { armyOf } from '../src/logic/army';
import { creature, CREATURE_IDS, MACHINES, type CreatureId } from '../src/logic/creatures';
import { toBattleHero } from '../src/logic/hero';
import { fortification } from '../src/logic/siege';
import { SPELL_IDS } from '../src/logic/spells';
import type { Pose } from '../src/art/pixel/manifest';
import { BattleScene, type SandboxBattle } from '../src/scenes/BattleScene';
import { CardScene } from '../src/scenes/CardScene';
import { DPR } from '../src/scenes/hidpi';
import { uiTextureJobs } from '../src/scenes/uiPaint';

// Dev-only battle sandbox: boots straight into a pixel battle for art review (not part of the package).
//   /battle.html?a=spearman:20,bowman:12,griffin:8,swordsman:3&b=wolf:12,wolf:9&terrain=grass&obstacles=1
//   &anim=idle|walk|attack   every unit (and hero) loops that pose
//   &hero=0                  no heroes          &feet=1   a magenta dot on each occupied hex centre
//   &siege=fort|citadel|castle   walls round b; &machine=catapult2 gives a that war machine; &towers=bowman:8,bowman2:4 mans them; &me=1 plays the defender
//   &play=1                  run turns (the AI plays b; &auto=1 plays a too)   &seed=7
//   Units go by id or by the name shown, run together: ?a=levy:20,nubian3:10,mummy:4&b=hoplite:20,slinger:12 stages Egypt against Greece.
//   &hero=kemet              both heroes are Egypt's priestess: the Sacred Rites, mana and Ankhs to spare
// Sets window.__ready once the field is drawn (for dev/snap.mjs).
await Promise.all(['700 32px Cinzel', '32px "EB Garamond"', '600 32px "EB Garamond"'].map((f) => document.fonts.load(f))).catch(() => undefined);
const q = new URLSearchParams(location.search);
const flag = (k: string, d: boolean): boolean => (q.has(k) ? q.get(k) !== '0' : d);

/** A unit by its id, or by the name the game shows run together ('hoplite', 'nilelevy'). */
const squash = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function creatureNamed(word: string): CreatureId {
  const id = CREATURE_IDS.find((c) => c === word) ?? CREATURE_IDS.find((c) => squash(creature(c).name) === squash(word) || squash(creature(c).plural) === squash(word));
  if (!id) throw new Error(`unknown creature ${word}`);
  return id;
}

function army(spec: string | null, fallback: string): ReturnType<typeof armyOf> {
  const slots = (spec ?? fallback).split(',').filter(Boolean).map((part) => {
    const [id, n] = part.split(':');
    return { creature: creatureNamed(id ?? ''), count: Math.max(1, Number(n) || 1) };
  });
  return armyOf(slots.slice(0, 7));
}

const anim = q.get('anim');
const startHero = toBattleHero(startAdventure(ASHFORD).hero);
// ?spells=all gives the hero every spell and mana to spare (to review the spellbook); ?hero=kemet, Egypt's priestess with the Rites.
const priestess = { ...startHero, name: 'Neferet', power: 2, spells: ['curse', 'ward', 'rebirth', 'cure'] as const, mana: 60, ankhs: 3 };
const hero = q.get('hero') === 'kemet' ? priestess : q.get('spells') === 'all' ? { ...startHero, spells: [...SPELL_IDS], mana: 40, ankhs: 3 } : startHero;
const heroes = flag('hero', true);
const walls = q.get('siege');
const fort = walls ? fortification(['fort', ...(walls === 'fort' ? [] : ['citadel']), ...(walls === 'castle' ? ['castle'] : [])]) : null;
const sandbox: SandboxBattle = {
  attacker: { hero, army: army(q.get('a'), 'spearman:20,bowman:12,griffin:8,swordsman:3'), machine: MACHINES.find((m) => m === q.get('machine')) },
  defender: { hero: heroes ? hero : null, army: army(q.get('b'), 'wolf:12,wolf:9'), towers: q.get('towers') ? army(q.get('towers'), '') : undefined },
  siege: fort ? { fort, me: q.get('me') === '1' ? 1 : 0 } : undefined,
  seed: Number(q.get('seed') ?? 7) >>> 0,
  terrain: q.get('terrain') ?? 'grass',
  heroes: [heroes, heroes],
  obstacles: flag('obstacles', true),
  play: flag('play', false),
  auto: flag('auto', false),
  view: { pose: anim === 'idle' || anim === 'walk' || anim === 'attack' ? (anim as Pose) : undefined, feet: flag('feet', false), heroId: q.get('hero') === 'kemet' ? 'neferet' : undefined },
  onReady: () => requestAnimationFrame(() => requestAnimationFrame(() => ((window as unknown as { __ready: boolean }).__ready = true))),
};

/** Paints the HUD's textures and the turn order's portraits (the game's boot does this), then opens the battle. */
class SandboxBoot extends Phaser.Scene {
  constructor() {
    super('SandboxBoot');
  }

  create(): void {
    const ids = [...new Set([...sandbox.attacker.army, ...sandbox.defender.army].flatMap((s) => (s ? [s.creature] : [])))];
    void runInSlices([...uiTextureJobs(this), ...poseJobs(this, ids, ['idle'])]).then(() => this.scene.start('Battle', { monsterId: 'sandbox', sandbox }));
  }
}

const parent = document.getElementById('game')!;
const size = (): { w: number; h: number } => ({ w: Math.round((parent.clientWidth || innerWidth) * DPR), h: Math.round((parent.clientHeight || innerHeight) * DPR) });
const { w, h } = size();
// The game's own config (src/index.ts), with only the scenes a battle needs.
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent,
  backgroundColor: BACKDROP,
  scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / DPR },
  render: { antialias: true, antialiasGL: false, roundPixels: false, mipmapFilter: 'LINEAR_MIPMAP_LINEAR', powerPreference: 'high-performance', maxTextures: 8 },
  input: { activePointers: 3 },
  audio: { noAudio: true },
  scene: [SandboxBoot, BattleScene, CardScene],
});
const storage = window.localStorage;
game.registry.set(REG.host, { unlocked: true, storage, loadContent: async () => null, onBuy: () => undefined, onSignIn: () => undefined, price: '$4.99', onExit: () => undefined });
game.registry.set(REG.sound, new SoundBoard(storage));
new ResizeObserver(() => {
  const next = size();
  if (next.w !== game.scale.width || next.h !== game.scale.height) game.scale.resize(next.w, next.h);
}).observe(parent);
(window as unknown as { __game: unknown }).__game = game;
