/** Shorter secrets could be guessed, and a guessed secret lets anyone forge ownership cookies. */
export const MIN_SECRET_LENGTH = 32;

export function assertStrongSecret(name: string, value: string): string {
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters (try \`openssl rand -base64 48\`)`);
  }
  return value;
}
