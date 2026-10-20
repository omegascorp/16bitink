/**
 * CSRF defence: Astro's own origin check (security.checkOrigin), done here
 * instead so a few endpoints can opt out. A POST, PUT, PATCH or DELETE from
 * another origin is refused when it could be a cross-site form (a form-like
 * content type, or none at all).
 *
 * The exempt endpoints are called by programs from their servers (Claude
 * swapping an OAuth code, registering itself, calling the MCP server), never
 * with cookies: they're authenticated by PKCE or a bearer token, so a
 * cross-site form can't act as anyone there.
 */

const FORM_CONTENT_TYPES = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS: ReadonlySet<string> = new Set(['/oauth/token', '/oauth/register', '/mcp']);

export function isForbiddenCrossOrigin(request: Request, url: URL): boolean {
  if (SAFE_METHODS.has(request.method) || EXEMPT_PATHS.has(url.pathname)) return false;
  if (request.headers.get('origin') === url.origin) return false;
  const type = request.headers.get('content-type');
  if (type === null) return true;
  const lower = type.toLowerCase();
  return FORM_CONTENT_TYPES.some((t) => lower.includes(t));
}
