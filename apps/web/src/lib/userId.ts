/** A user's id: their MongoDB ObjectId as 24 lower-case hex digits. */
export type UserId = string;

const USER_ID = /^[a-f0-9]{24}$/;

/** Whether an untrusted value (e.g. Stripe's client_reference_id) is a user id. */
export const isUserId = (v: unknown): v is UserId => typeof v === 'string' && USER_ID.test(v);
