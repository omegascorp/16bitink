/**
 * Activation keys made by automation (creator outreach) rather than by an
 * admin in /admin/keys: small keys only, each saying who it is for, and a
 * daily cap, so a runaway agent can only hand out a few free unlocks a day.
 * Pure rules only.
 */

import { z } from 'zod';

/** One creator, maybe a co-host or editor: never a giveaway. */
export const API_MAX_KEY_USES = 5;

/** Keys the API may make in any 24 hours. */
export const API_KEYS_PER_DAY = 30;

const IssueRequest = z.object({
  game: z.string().regex(/^[a-z0-9-]{1,40}$/),
  uses: z.number().int().min(1).max(API_MAX_KEY_USES).default(1),
  note: z.string().trim().min(1).max(80),
});

export type IssueRequest = z.infer<typeof IssueRequest>;

/** A valid request body, or null. The note (who the key is for) is required. */
export function parseIssueRequest(body: unknown): IssueRequest | null {
  const parsed = IssueRequest.safeParse(body);
  return parsed.success ? parsed.data : null;
}
