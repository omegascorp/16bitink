import type { SnakeArt } from '../types';
import { anacondaArt } from './floodedSnake';
import { BIG_ANACONDA_TONE } from './floodedSnakePaint';

/**
 * The Flooded Forest's rival snakes, drawn like the player's: the bigger
 * anaconda, an older female, painted with the same brushwork in her own
 * paler, duller tones (greyer olive, faded spots, less glossy skin) and
 * marked differently, so she's told apart from the player at a glance.
 */
export const FLOODED_RIVALS: Readonly<Record<string, SnakeArt>> = { 'big-anaconda': anacondaArt(BIG_ANACONDA_TONE) };
