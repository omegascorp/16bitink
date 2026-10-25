import { version as inkcrab } from '@16bitink/inkcrab/package.json';
import { version as inkfish } from '@16bitink/inkfish/package.json';
import { version as inkgecko } from '@16bitink/inkgecko/package.json';
import { version as inkmine } from '@16bitink/inkmine/package.json';
import { version as inksnake } from '@16bitink/inksnake/package.json';

/**
 * slug -> the game's release, read from its package.json at build time, so the
 * play page can show it before the game downloads. Bump a game's version in
 * its package.json; the game shows and reports the same one (GameModule.version).
 */
export const GAME_VERSIONS: Readonly<Record<string, string>> = { inkfish, inkcrab, inkmine, inkgecko, inksnake };
