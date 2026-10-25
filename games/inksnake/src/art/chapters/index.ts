import type { Place } from '../../level/types';
import type { SnakeId } from '../../logic/species';
import type { PlaceArt } from '../places/types';
import type { SnakeArt, SpriteArt } from '../types';
import { BARRENS_ART } from './barrens';
import { DUNES_ART } from './dunes';
import { FLOODED_ART } from './flooded';
import { HEATH_ART } from './heath';
import { JUNGLE_ART } from './jungle';
import { MOUNTAINS_ART } from './mountains';
import { RAINFOREST_ART } from './rainforest';
import { REEF_ART } from './reef';
import { SAVANNA_ART } from './savanna';
import type { ChapterArt, PosePicker } from './types';

export type { ChapterArt, ChapterView, PosePicker, PoseSubject } from './types';

/** Each chapter's art after the farm's, by place, with the snake it belongs to. */
const CHAPTERS: readonly { readonly place: Place; readonly snake: SnakeId; readonly art: ChapterArt }[] = [
  { place: 'barrens', snake: 'hognose', art: BARRENS_ART },
  { place: 'dunes', snake: 'sidewinder', art: DUNES_ART },
  { place: 'savanna', snake: 'eggeater', art: SAVANNA_ART },
  { place: 'rainforest', snake: 'flying', art: RAINFOREST_ART },
  { place: 'reef', snake: 'krait', art: REEF_ART },
  { place: 'mountains', snake: 'spidertail', art: MOUNTAINS_ART },
  { place: 'heath', snake: 'adder', art: HEATH_ART },
  { place: 'jungle', snake: 'cobra', art: JUNGLE_ART },
  { place: 'flooded', snake: 'anaconda', art: FLOODED_ART },
];

export const CHAPTER_CRITTERS: Readonly<Record<string, SpriteArt>> = Object.assign({}, ...CHAPTERS.map((c) => c.art.critters ?? {}));
export const CHAPTER_POSES: Readonly<Record<string, PosePicker>> = Object.assign({}, ...CHAPTERS.map((c) => c.art.poseOf ?? {}));
export const CHAPTER_PLACES_ART: Partial<Record<Place, PlaceArt>> = Object.fromEntries(CHAPTERS.filter((c) => c.art.place).map((c) => [c.place, c.art.place!]));
export const CHAPTER_SNAKES_ART: Partial<Record<SnakeId, SnakeArt>> = Object.fromEntries(CHAPTERS.filter((c) => c.art.snake).map((c) => [c.snake, c.art.snake!]));
export const CHAPTER_VIEWS: Partial<Record<Place, NonNullable<ChapterArt['view']>>> = Object.fromEntries(CHAPTERS.filter((c) => c.art.view).map((c) => [c.place, c.art.view!]));
export const RIVAL_ART: Readonly<Record<string, SnakeArt>> = Object.assign({}, ...CHAPTERS.map((c) => c.art.rivals ?? {}));
