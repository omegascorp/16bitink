/**
 * Server-side registry of paid content, served by /api/content/[game]
 * only to verified owners. SERVER-ONLY: never import from client code.
 *
 * Keep entries small (level data, config). Heavy paid assets belong in
 * R2 behind short-lived signed URLs, not in the Worker bundle.
 */
import { INKCRAB_PAID_BEACHES } from '@16bitink/inkcrab/content';
import { INKFISH_FULL_CHAPTERS } from '@16bitink/inkfish/content';
import { INKGECKO_PAID_CHAPTERS } from '@16bitink/inkgecko/content';
import { INKHEROES_PAID_MAPS } from '@16bitink/inkheroes/content';
import { INKTANKS_PAID_LEVELS } from '@16bitink/inktanks/content';
import { INKPIN_PAID_CHAPTERS } from '@16bitink/inkpin/content';
import { INKMINE_PAID_PLANETS } from '@16bitink/inkmine/content';
import { INKSNAKE_PAID_CHAPTERS } from '@16bitink/inksnake/content';

export const PAID_CONTENT: Readonly<Record<string, unknown>> = {
  inkfish: INKFISH_FULL_CHAPTERS,
  inkcrab: INKCRAB_PAID_BEACHES,
  inkmine: INKMINE_PAID_PLANETS,
  inkgecko: INKGECKO_PAID_CHAPTERS,
  inksnake: INKSNAKE_PAID_CHAPTERS,
  inkpin: INKPIN_PAID_CHAPTERS,
  inkheroes: INKHEROES_PAID_MAPS,
  inktanks: INKTANKS_PAID_LEVELS,
};
