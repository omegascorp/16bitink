const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** The request is addressed to this machine, not the live site. */
export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname);
}

/**
 * Local dev switches (DEV_UNLOCK: every game owned; DEV_ALL_LEVELS: every
 * level open without playing through) need two locks: the flag set to
 * exactly "true" (only ever in a local .env) AND a request addressed to this
 * machine. Either alone is not enough.
 */
export function devUnlockAllowed(flag: string | undefined, hostname: string): boolean {
  return flag === 'true' && isLocalHost(hostname);
}
