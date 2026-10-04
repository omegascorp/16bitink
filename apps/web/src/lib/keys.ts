/**
 * Activation keys: single-use codes an admin hands out (to reviewers and
 * creators) that unlock a game for free. Pure rules only; storage is in
 * db/keyRepo.ts.
 *
 * A key is 16 Crockford base32 characters (80 random bits), shown in groups
 * of four. Reading it back forgives case, spaces, dashes and the letters
 * people mistake for digits (O for 0, I and L for 1).
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 16;
const GROUP = 4;
const KEY = /^[0-9A-HJKMNP-TV-Z]{16}$/;

/** At most this many keys per admin request. */
export const MAX_KEYS_PER_BATCH = 50;

const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

/** A new random key, stored form (no dashes). `random` returns n random bytes. */
export function generateKey(random: (n: number) => Uint8Array = randomBytes): string {
  // 32 symbols: the low 5 bits of a byte pick one without bias.
  return [...random(LENGTH)].map((b) => ALPHABET[b & 31]).join('');
}

/** The stored form of a key as someone typed or pasted it, or null when it can't be one. */
export function normalizeKey(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 64) return null;
  const code = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return KEY.test(code) ? code : null;
}

/** A stored key as shown to people: ABCD-EFGH-JKMN-PQRS. */
export const formatKey = (code: string): string => code.match(new RegExp(`.{1,${GROUP}}`, 'g'))?.join('-') ?? code;

/** The page that redeems this key, for sharing as a link. */
export const redeemUrl = (origin: string, code: string): string => `${origin}/redeem?key=${formatKey(code)}`;
