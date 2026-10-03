/**
 * Server-side registry of paid content, served by /api/content/[game]
 * only to verified owners. SERVER-ONLY: never import from client code.
 *
 * Keep entries small (level data, config). Heavy paid assets belong in
 * R2 behind short-lived signed URLs, not in the Worker bundle.
 */
import { INKFISH_FULL_CHAPTERS } from '@16bitink/inkfish/content';

export const PAID_CONTENT: Readonly<Record<string, unknown>> = {
  inkfish: INKFISH_FULL_CHAPTERS,
};
