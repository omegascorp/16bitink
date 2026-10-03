import type { APIRoute } from 'astro';
import { findGame } from '../../data/games';
import { fail, json } from '../../lib/http';
import { ownership } from '../../lib/owner';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const slug = url.searchParams.get('game') ?? '';
  if (!findGame(slug)) return fail(404, 'Unknown game');
  try {
    const claims = await ownership(cookies, slug);
    return json({ success: true, data: { unlocked: claims !== null } });
  } catch (err) {
    console.error('[entitlement] check failed', err);
    return fail(500, 'Could not check ownership');
  }
};
