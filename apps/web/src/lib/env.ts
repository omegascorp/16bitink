import { assertStrongSecret } from './secret';
import { env as cfEnv } from 'cloudflare:workers';

/** Typed access to secrets with a clear failure instead of `undefined` deep in a handler. */
export function requireEnv(name: string): string {
  const value = (cfEnv as unknown as Record<string, unknown>)[name];
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
  const value = (cfEnv as unknown as Record<string, unknown>)[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
