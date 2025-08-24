import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;     
const DB_NAME = process.env.DB_NAME || "campus_relay";

let connected = false;

const connectDB = async () => {
  if (connected) return;

  if (!MONGODB_URI) {
    console.error("MONGODB_URI missing in .env");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    connected = conn.connection.readyState === 1;

    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => console.log("MongoDB disconnected"));
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed on SIGINT");
  process.exit(0);
});

export default connectDB;
