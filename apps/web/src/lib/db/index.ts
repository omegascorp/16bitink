import { requireEnv } from '../env';
import { connectDb } from './connection';

/** Connects (once) to the purchases database named by MONGODB_URI. */
export async function db(): Promise<void> {
  await connectDb(requireEnv('MONGODB_URI'));
}
