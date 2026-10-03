import { getSecret } from 'astro:env/server';
import { assertStrongSecret } from './secret';

/**
 * Server environment: `apps/web/.env` locally, the App Platform app's
 * environment variables in production. Typed access with a clear failure
 * instead of `undefined` deep in a handler.
 */
export function requireEnv(name: string): string {
  const value = getSecret(name);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

/** A signing secret: required, and long enough that it can't be guessed. */
export function requireSecret(name: string): string {
  return assertStrongSecret(name, requireEnv(name));
}

export function optionalEnv(name: string): string | undefined {
  const value = getSecret(name);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
