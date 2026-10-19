import type { APIRoute } from 'astro';
import { sitemapXml } from '../lib/seo';

// Built with the site, so it lists the catalog of that deploy.
export const GET: APIRoute = ({ site }) =>
  new Response(sitemapXml(site ?? new URL('https://16bit.ink')), { headers: { 'content-type': 'application/xml; charset=utf-8' } });
