import mongoose from 'mongoose';

let connecting: Promise<typeof mongoose> | null = null;

/**
 * Opens the one MongoDB connection this server shares between requests, or
 * returns it when already open. A failed attempt is forgotten so the next
 * request tries again rather than failing forever.
 */
export function connectDb(uri: string): Promise<typeof mongoose> {
  connecting ??= mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 })
    .catch((err: unknown) => {
      connecting = null;
      throw err;
    });
  return connecting;
}

export async function disconnectDb(): Promise<void> {
  connecting = null;
  await mongoose.disconnect();
}
