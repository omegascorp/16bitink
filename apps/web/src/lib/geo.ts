interface GeoIp {
  lookup(ip: string): { readonly country?: string } | null;
}

let loading: Promise<GeoIp> | null = null;

/** The country database (GeoLite2, a few MB) loads on first use, not at server start. */
function geoIp(): Promise<GeoIp> {
  loading ??= import('geoip-country').then((m) => (m.default ?? m) as GeoIp).catch((err: unknown) => {
    loading = null;
    throw err;
  });
  return loading;
}

/**
 * The ISO country code for an IP, or null when unknown (local addresses,
 * or the lookup failed: analytics never fails a request over it). The IP
 * is looked up locally and then forgotten; it never leaves this server.
 */
export async function countryOf(ip: string): Promise<string | null> {
  try {
    const country = (await geoIp()).lookup(ip)?.country;
    return typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : null;
  } catch (err) {
    console.warn('[analytics] country lookup failed', err);
    return null;
  }
}
