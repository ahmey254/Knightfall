import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined. Add it to your .env file.');
}

// Cache the connection across hot reloads in dev — Next.js re-imports modules
// on every request in dev, which would otherwise create dozens of connections.
type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalCache = global as unknown as { mongoose?: MongooseCache };
const cached: MongooseCache = globalCache.mongoose ?? { conn: null, promise: null };
globalCache.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI as string, {
        bufferCommands: false,
        maxPoolSize: 10,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
