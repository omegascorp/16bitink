import type { APIRoute } from 'astro';
import { currentAdmin } from '../../../lib/adminAuth';
import { listSubscribers } from '../../../lib/db/subscriberRepo';
import { fail } from '../../../lib/http';
import { subscribersCsv } from '../../../lib/subscribe';

export const prerender = false;

/** The Sunday email list as CSV, for importing into an email tool. Admins only. */
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const admin = await currentAdmin(cookies);
    // Not found rather than forbidden: the admin area doesn't advertise itself.
    if (!admin) return fail(404, 'Not found');
    const rows = await listSubscribers();
    console.info(`[admin] ${admin.email} exported ${rows.length} subscriber(s)`);
    return new Response(subscribersCsv(rows, url.origin), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="16bitink-sunday-${new Date().toISOString().slice(0, 10)}.csv"`,
        'cache-control': 'private, no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  } catch (err) {
    console.error('[admin] subscriber export failed', err);
    return fail(500, 'Could not export the list.');
  }
};
