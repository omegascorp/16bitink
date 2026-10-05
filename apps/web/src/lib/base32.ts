/**
 * Random codes people read aloud and type: Crockford base32, which leaves
 * out I, L, O and U. Reading one back forgives case, spaces, dashes and the
 * letters people mistake for digits (O for 0, I and L for 1).
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

/** `length` random symbols. `random` returns n random bytes. */
export function randomCode(length: number, random: (n: number) => Uint8Array = randomBytes): string {
  // 32 symbols: the low 5 bits of a byte pick one without bias.
  return [...random(length)].map((b) => ALPHABET[b & 31]).join('');
}

/** What someone typed, upper-cased, without spaces or dashes, look-alike letters read as digits. Not yet checked. */
export const canonicalCode = (input: string): string =>
  input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');

/** Whether `code` is exactly `length` symbols of the alphabet. */
export const isCode = (code: string, length: number): boolean =>
  code.length === length && [...code].every((c) => ALPHABET.includes(c));

/** A code as shown to people: dashes between groups of four. */
export const groupCode = (code: string): string => code.match(/.{1,4}/g)?.join('-') ?? code;
