import { env as cfEnv } from 'cloudflare:workers';

/** Typed access to secrets with a clear failure instead of `undefined` deep in a handler. */
export function requireEnv(name: string): string {
  const value = (cfEnv as unknown as Record<string, unknown>)[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = (cfEnv as unknown as Record<string, unknown>)[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
