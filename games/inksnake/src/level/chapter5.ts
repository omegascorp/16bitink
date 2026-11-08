import type { LevelDef, ZoneDef } from './types';

/**
 * Chapter 5, The Rainforest (full game): the paradise flying snake in the
 * canopy, seen from above. The round tree crowns are its home; the forest
 * floor between them is far below, slow and dangerous. New: gliding from
 * crown to crown (level 3), geckos and tree frogs in the crowns, bats in
 * the air, a tokay gecko for its venom, hornbills, a water monitor on the
 * floor, and the Crested Serpent Eagle. Gaps of floor run 60–130 px, so
 * the crowns are a glide apart. Served to owners only (content/paid.ts):
 * never import it from client code.
 */

/** A tree crown seen from above: `look` says what tree it is (the place paints it). */
const crown = (x: number, y: number, r: number, look = 'crown'): ZoneDef => ({ kind: 'tree', look, shape: 'circle', x, y, r });

/** The boss's canopy: its crowns' middles are the eagle's perches. */
const EAGLE_CROWNS: readonly ZoneDef[] = [
  crown(150, 150, 90, 'fig'), crown(150, 400, 90), crown(380, 270, 100, 'tall'), crown(600, 130, 90), crown(600, 410, 90, 'fig'), crown(820, 260, 100, 'tall'),
];

export const CHAPTER_5: readonly LevelDef[] = [
  {
    id: 'rainforest-1', name: 'Into the Canopy', snake: 'flying', start: { x: 190, y: 270 }, heading: 0, length: 120, target: 330, par: 40,
    prey: [{ kind: 'gecko', count: 5 }],
    zones: [crown(160, 270, 115, 'fig'), crown(330, 160, 100), crown(330, 390, 100), crown(500, 270, 112, 'tall'), crown(670, 160, 100), crown(670, 390, 100, 'fig'), crown(830, 270, 112)],
    teach: ['canopy'],
  },
  {
    id: 'rainforest-2', name: 'Hornbill Calls', snake: 'flying', start: { x: 190, y: 150 }, heading: 0, length: 125, target: 380, par: 50,
    prey: [{ kind: 'gecko', count: 4 }, { kind: 'treefrog', count: 1 }],
    enemies: [{ kind: 'hornbill', from: 4 }],
    zones: [
      crown(150, 150, 100), crown(150, 400, 100, 'fig'), crown(320, 270, 110, 'tall'), crown(500, 150, 105), crown(500, 400, 100),
      crown(680, 270, 110, 'fig'), crown(840, 150, 100), crown(840, 400, 100, 'tall'),
    ],
  },
  {
    id: 'rainforest-3', name: 'Leap of Faith', snake: 'flying', start: { x: 190, y: 270 }, heading: 0, length: 125, target: 360, par: 55,
    prey: [{ kind: 'gecko', count: 4 }, { kind: 'treefrog', count: 1 }],
    zones: [crown(150, 270, 95, 'tall'), crown(390, 140, 85), crown(390, 410, 85, 'fig'), crown(620, 270, 90), crown(840, 140, 85, 'fig'), crown(840, 410, 85)],
    teach: ['glide', 'floor'],
  },
  {
    id: 'rainforest-4', name: 'Something Below', snake: 'flying', start: { x: 190, y: 140 }, heading: 0, length: 130, target: 400, par: 60,
    prey: [{ kind: 'gecko', count: 4 }, { kind: 'treefrog', count: 1 }],
    enemies: [{ kind: 'monitor', from: 5 }],
    zones: [crown(130, 140, 80), crown(130, 410, 85, 'fig'), crown(350, 270, 95, 'tall'), crown(560, 120, 85), crown(580, 420, 85), crown(800, 250, 95, 'fig')],
  },
  {
    id: 'rainforest-5', name: 'Gecko Rush', snake: 'flying', start: { x: 210, y: 150 }, heading: 0, length: 135, target: 420, par: 45,
    prey: [{ kind: 'gecko', count: 7 }, { kind: 'treefrog', count: 2 }],
    goal: { kind: 'rush', seconds: 60 },
    zones: [crown(170, 150, 110, 'fig'), crown(170, 400, 105), crown(420, 270, 120, 'tall'), crown(680, 150, 110), crown(680, 400, 105, 'fig'), crown(880, 270, 90)],
  },
  {
    id: 'rainforest-6', name: 'Dusk Flight', snake: 'flying', start: { x: 180, y: 270 }, heading: 0, length: 130, target: 380, par: 60,
    prey: [{ kind: 'bat', count: 3 }, { kind: 'gecko', count: 3 }],
    goal: { kind: 'feast', food: 'bat', count: 4 },
    zones: [crown(140, 270, 95, 'tall'), crown(360, 130, 90), crown(360, 410, 90, 'fig'), crown(600, 270, 95), crown(820, 130, 90, 'fig'), crown(820, 410, 90)],
    teach: ['bats'],
  },
  {
    id: 'rainforest-7', name: 'One Slip', snake: 'flying', start: { x: 200, y: 140 }, heading: 0, length: 140, target: 420, par: 65,
    prey: [{ kind: 'gecko', count: 4 }, { kind: 'treefrog', count: 1 }],
    enemies: [{ kind: 'hornbill', count: 2, from: 4 }],
    lives: 1,
    zones: [crown(150, 140, 90), crown(150, 400, 90, 'fig'), crown(380, 270, 100, 'tall'), crown(610, 140, 90), crown(610, 400, 90), crown(830, 270, 100, 'fig')],
    teach: ['knot'],
  },
  {
    id: 'rainforest-8', name: 'Tokay Tree', snake: 'flying', start: { x: 190, y: 150 }, heading: 0, length: 140, target: 480, par: 75,
    prey: [{ kind: 'gecko', count: 3 }, { kind: 'treefrog', count: 1 }, { kind: 'tokay', count: 1 }],
    enemies: [{ kind: 'monitor', from: 6 }, { kind: 'hornbill', from: 10 }],
    zones: [crown(140, 150, 90, 'fig'), crown(140, 410, 85), crown(370, 280, 105, 'tall'), crown(600, 130, 90), crown(620, 420, 90, 'fig'), crown(840, 260, 100)],
    teach: ['venom'],
  },
  {
    id: 'rainforest-9', name: 'Night Canopy', snake: 'flying', start: { x: 200, y: 270 }, heading: 0, length: 140, target: 460, par: 75,
    prey: [{ kind: 'gecko', count: 4 }, { kind: 'bat', count: 2 }],
    dark: true,
    zones: [crown(160, 270, 100, 'tall'), crown(380, 140, 90), crown(400, 410, 95, 'fig'), crown(620, 260, 95), crown(840, 130, 90, 'fig'), crown(840, 400, 95)],
    teach: ['nightcanopy'],
  },
  {
    id: 'rainforest-10', name: 'The Serpent Eagle', snake: 'flying', start: { x: 210, y: 150 }, heading: 0, length: 150, target: 460, par: 80,
    prey: [{ kind: 'gecko', count: 3 }],
    goal: { kind: 'boss' },
    boss: { kind: 'serpent-eagle', hp: 3 },
    zones: EAGLE_CROWNS,
    spots: EAGLE_CROWNS.flatMap((z) => (z.shape === 'circle' ? [{ x: z.x, y: z.y }] : [])),
    teach: ['eagleplan'],
  },
];
