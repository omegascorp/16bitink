import type { APIRoute } from 'astro';
import { siteManifest } from '../lib/manifest';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(siteManifest()), { headers: { 'Content-Type': 'application/manifest+json' } });
