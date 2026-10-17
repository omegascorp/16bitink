import type Phaser from 'phaser';
import { bakeBrine, BRINE_TEX } from '../../art/brineTextures';
import type { CardPicture } from '../kit/storyCard';

/** The Brine cards' pictures: the Tidesingers, the crew's air bell, the craft as it stands, and what's drawn in the sand and on the craft's wall. */
export function brinePictures(scene: Phaser.Scene): Readonly<Record<'singer' | 'bell' | 'copper' | 'tubeDrill' | 'sinking' | 'craftSunk' | 'craftRaised' | 'craftMended', CardPicture>> {
  bakeBrine(scene);
  return {
    singer: { key: BRINE_TEX.tidesinger('sing', 0), h: 100 },
    bell: { key: BRINE_TEX.airBell(3, 0), h: 100 },
    copper: { key: BRINE_TEX.copperSandPicture, h: 96 },
    tubeDrill: { key: BRINE_TEX.tubeDrillPicture, h: 96 },
    sinking: { key: BRINE_TEX.craftSinkingPicture, h: 96 },
    craftSunk: { key: BRINE_TEX.asterCraft('sunk', 0), h: 100 },
    craftRaised: { key: BRINE_TEX.asterCraft('raised', 0), h: 100 },
    craftMended: { key: BRINE_TEX.asterCraft('mended', 0), h: 100 },
  };
}
