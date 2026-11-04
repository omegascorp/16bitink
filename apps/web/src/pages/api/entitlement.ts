import type { APIRoute } from 'astro';
import { findGame } from '../../data/games';
import { fail, json } from '../../lib/http';
import { findRole } from '../../lib/db/userRepo';
import { devCheatsAllowed, devUnlockAllowed } from '../../lib/devUnlock';
import { optionalEnv } from '../../lib/env';
import { currentUser, ownership } from '../../lib/owner';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const slug = url.searchParams.get('game') ?? '';
  if (!findGame(slug)) return fail(404, 'Unknown game');
  try {
    const claims = await ownership(cookies, slug, url);
    const allLevelsOpen = devUnlockAllowed(optionalEnv('DEV_ALL_LEVELS'), url.hostname);
    // Only asks who this is when the switch is on, so the live site never pays for it.
    const user = allLevelsOpen ? await currentUser(cookies) : null;
    const cheats = devCheatsAllowed(optionalEnv('DEV_ALL_LEVELS'), url.hostname, user ? await findRole(user.userId) : null);
    return json({ success: true, data: { unlocked: claims !== null, allLevelsOpen, cheats } });
  } catch (err) {
    console.error('[entitlement] check failed', err);
    return fail(500, 'Could not check ownership');
  }
};
