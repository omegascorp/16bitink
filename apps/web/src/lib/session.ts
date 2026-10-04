import { readToken, signToken } from './token';
import { isUserId, type UserId } from './userId';

/**
 * Who is signed in, as an HMAC-signed httpOnly cookie. It also carries the
 * games their purchases unlocked when they signed in, so playing needs no
 * Stripe lookup. Signing in again refreshes that list (and drops refunds).
 */
export interface UserSession {
  /** 2: keyed by our user id. Older (Google-id) cookies no longer verify, so those players sign in again. */
  readonly v: 2;
  /** The signed-in user (`users` collection id). */
  readonly userId: UserId;
  readonly email: string;
  readonly name: string;
  /** Games owned at sign-in, found by email in Stripe. */
  readonly games: readonly string[];
  /** unix seconds */
  readonly iat: number;
  readonly exp: number;
}

/** Between leaving for Google and coming back: proves the callback is the one we started. */
export interface SignInFlow {
  readonly v: 1;
  readonly state: string;
  readonly nonce: string;
  /** PKCE code verifier */
  readonly verifier: string;
  /** Path to return to afterwards */
  readonly ret: string;
  readonly exp: number;
}

export const SESSION_COOKIE = 'ink_user';
export const FLOW_COOKIE = 'ink_signin';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
/** Time allowed on Google's account picker. */
export const FLOW_MAX_AGE = 60 * 10;

const SESSION = 'session';
const FLOW = 'signin';

const isStr = (v: unknown): v is string => typeof v === 'string';

function isSession(v: unknown): v is UserSession {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return c.v === 2 && isUserId(c.userId) && isStr(c.email) && isStr(c.name) &&
    Array.isArray(c.games) && c.games.every(isStr) && typeof c.iat === 'number' && typeof c.exp === 'number';
}

function isFlow(v: unknown): v is SignInFlow {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return c.v === 1 && isStr(c.state) && isStr(c.nonce) && isStr(c.verifier) && isStr(c.ret) && typeof c.exp === 'number';
}

export const signSession = (s: UserSession, secret: string): Promise<string> => signToken(s, secret, SESSION);

export async function verifySession(token: string | undefined, secret: string, nowSec: number): Promise<UserSession | null> {
  const s = await readToken(token, secret, SESSION);
  return isSession(s) && s.exp > nowSec ? s : null;
}

export const signFlow = (f: SignInFlow, secret: string): Promise<string> => signToken(f, secret, FLOW);

export async function verifyFlow(token: string | undefined, secret: string, nowSec: number): Promise<SignInFlow | null> {
  const f = await readToken(token, secret, FLOW);
  return isFlow(f) && f.exp > nowSec ? f : null;
}
