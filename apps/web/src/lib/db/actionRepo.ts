import type { EventName } from '../analytics';
import { AnalyticsEvent } from './eventModel';
import type { Range } from './eventRepo';

/** The steps toward a purchase, plus installs: everything a player does about buying or keeping a game. */
export const ACTIONS = ['offer_view', 'buy_click', 'signin_click', 'checkout_open', 'checkout_fail', 'app_install'] as const satisfies readonly EventName[];
export type Action = (typeof ACTIONS)[number];

/** How often one step happened, for one game, place, sign-in state and product. */
export interface ActionRow {
  readonly event: Action;
  readonly game: string | null;
  /** Where the offer was shown, or the buy or sign-in tapped. */
  readonly where: string | null;
  /** On buy taps: whether the player was signed in. */
  readonly signedIn: boolean | null;
  /** On buy taps and checkouts: true for the All Games Pass (`game` is where it was offered), null for the game itself. */
  readonly pass: true | null;
  /** On checkout failures: what the player was told. */
  readonly error: string | null;
  readonly times: number;
  readonly visitors: number;
}

const inRange = (r: Range): Record<string, unknown> => ({ ts: { $gte: r.from, $lt: r.to } });

/** Every step toward a purchase in `range`, counted by event, game, place, sign-in, product and error; sorted by those. */
export async function actionStats(range: Range): Promise<ActionRow[]> {
  return AnalyticsEvent.aggregate<ActionRow>([
    { $match: { ...inRange(range), 'meta.event': { $in: ACTIONS } } },
    {
      $group: {
        _id: { event: '$meta.event', game: '$meta.game', where: '$where', signedIn: '$signedIn', pass: '$pass', error: '$error', visitor: '$visitor' },
        times: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { event: '$_id.event', game: '$_id.game', where: '$_id.where', signedIn: '$_id.signedIn', pass: '$_id.pass', error: '$_id.error' },
        times: { $sum: '$times' }, visitors: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0, event: '$_id.event', game: { $ifNull: ['$_id.game', null] }, where: { $ifNull: ['$_id.where', null] },
        signedIn: { $ifNull: ['$_id.signedIn', null] }, pass: { $ifNull: ['$_id.pass', null] }, error: { $ifNull: ['$_id.error', null] }, times: 1, visitors: 1,
      },
    },
    { $sort: { event: 1, game: 1, where: 1, signedIn: 1, pass: 1, error: 1 } },
  ]).exec();
}

/** Visitors who opened the site from their home screen, as the installed app, in `range`. */
export async function appVisitors(range: Range): Promise<number> {
  const [row] = await AnalyticsEvent.aggregate<{ n: number }>([
    { $match: { ...inRange(range), 'meta.event': 'pageview', app: true } },
    { $group: { _id: '$visitor' } },
    { $count: 'n' },
  ]).exec();
  return row?.n ?? 0;
}
