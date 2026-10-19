import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/seo';

export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(site ?? new URL('https://16bit.ink')), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
