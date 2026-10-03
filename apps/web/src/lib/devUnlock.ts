const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** The request is addressed to this machine, not the live site. */
export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname);
}

/**
 * The dev unlock treats every game as owned without paying, so it needs two locks:
 * an explicit DEV_UNLOCK=true (only ever set in .dev.vars) AND a request
 * that is addressed to this machine. Either alone is not enough.
 */
export function devUnlockAllowed(flag: string | undefined, hostname: string): boolean {
  return flag === 'true' && isLocalHost(hostname);
}
