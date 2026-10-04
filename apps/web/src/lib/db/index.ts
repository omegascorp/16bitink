import { parseAdminEmails } from '../admins';
import { optionalEnv, requireEnv } from '../env';
import { connectDb } from './connection';
import { syncAdminRoles } from './userRepo';

let adminsSynced: Promise<void> | null = null;

/**
 * Brings user roles in line with ADMIN_EMAILS, once per server start (so on
 * every deploy). A failure is logged and retried on the next request.
 */
function syncAdminsOnce(): Promise<void> {
  adminsSynced ??= syncAdminRoles(parseAdminEmails(optionalEnv('ADMIN_EMAILS')))
    .then((changed) => {
      if (changed > 0) console.info(`[admins] updated ${changed} user role(s) from ADMIN_EMAILS`);
    })
    .catch((err: unknown) => {
      adminsSynced = null;
      console.error('[admins] could not sync roles from ADMIN_EMAILS', err);
    });
  return adminsSynced;
}

/** Connects (once) to the database named by MONGODB_URI. */
export async function db(): Promise<void> {
  await connectDb(requireEnv('MONGODB_URI'));
  await syncAdminsOnce();
}
