/**
 * When this build was made (ms since 1970), defined as __SITE_BUILD__ by
 * astro.config.mjs. The page and the server are bundled in the same build, so
 * a splash screen can ask /api/build whether a deploy has replaced its page.
 */
declare const __SITE_BUILD__: number | undefined;

export const SITE_BUILD: number = typeof __SITE_BUILD__ === 'number' ? __SITE_BUILD__ : 0;
