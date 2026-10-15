/** The part of geoip-country we use (the package ships no types). */
declare module 'geoip-country' {
  export function lookup(ip: string): { readonly country?: string } | null;
}
