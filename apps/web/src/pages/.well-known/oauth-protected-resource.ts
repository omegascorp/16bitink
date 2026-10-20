import type { APIRoute } from 'astro';
import { protectedResourceMetadata } from '../../lib/oauth';

export const prerender = false;

/** How to get a token for /mcp (RFC 9728). */
export const GET: APIRoute = ({ url }) => new Response(JSON.stringify(protectedResourceMetadata(url.origin)), {
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
});
