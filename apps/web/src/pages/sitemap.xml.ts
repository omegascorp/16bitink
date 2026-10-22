import type { APIRoute } from 'astro';
import { sitemapXml } from '../lib/seo';

// Rendered per request, so a game dated ahead is listed from its release day without a deploy.
export const prerender = false;

export const GET: APIRoute = ({ site }) =>
  new Response(sitemapXml(site ?? new URL('https://16bit.ink')), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
