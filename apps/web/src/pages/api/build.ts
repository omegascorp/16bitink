import type { APIRoute } from 'astro';
import { SITE_BUILD } from '../../lib/build';
import { json } from '../../lib/http';

export const prerender = false;

/** The build this server runs: a waiting splash screen reloads onto a newer one (lib/client/player.ts). */
export const GET: APIRoute = () => json({ success: true, data: { build: SITE_BUILD } });
