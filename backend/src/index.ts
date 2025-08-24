// Load env first
import "dotenv/config";
import http from "node:http";
import mongoose from "mongoose";

import app from "./app";       // default export from app.ts
import connectDB from "./db";  // your src/db/index.ts (default export)

const PORT = Number(process.env.PORT) || 8000;
let server: http.Server;

(async () => {
  try {
    await connectDB();
    console.log("MongoDB connected!");

    server = app.listen(PORT, () => {
      console.log(`Server is running at :${PORT}`);
    });

    server.on("error", (error) => console.error("Server Error:", error));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();

// graceful shutdown
const shutdown = (signal: string) => async () => {
  try {
    console.log(`\n${signal} received. Closing HTTP server...`);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown("SIGINT"));
process.on("SIGTERM", shutdown("SIGTERM"));
