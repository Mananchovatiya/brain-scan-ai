import mongoose from "mongoose";

let connectionPromise;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  connectionPromise = mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || "brainscan_conversion",
    serverSelectionTimeoutMS: 10000,
  }).then(() => mongoose.connection).catch((error) => {
    connectionPromise = undefined;
    throw error;
  });

  return connectionPromise;
}

export async function disconnectDatabase() {
  connectionPromise = undefined;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
