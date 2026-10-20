import type { APIRoute } from 'astro';
import { authorizationServerMetadata } from '../../lib/oauth';

export const prerender = false;

/** Where to register, authorize and get tokens (RFC 8414). */
export const GET: APIRoute = ({ url }) => new Response(JSON.stringify(authorizationServerMetadata(url.origin)), {
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
});
