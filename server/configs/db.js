import mongoose from "mongoose";

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not configured");
    }

    connectionPromise = mongoose
      .connect(mongoUri)
      .then(() => {
        console.log("Database connected");
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
};

export default connectDB;
