import type { APIRoute } from 'astro';
import { protectedResourceMetadata } from '../../../lib/oauth';

export const prerender = false;

/** The same, at the path-specific address some clients ask first (RFC 9728 §3.1). */
export const GET: APIRoute = ({ url }) => new Response(JSON.stringify(protectedResourceMetadata(url.origin)), {
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
});
