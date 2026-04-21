import express from "express";
import mongoose from "mongoose";
import { config, validateConfig } from "./config.js";
import {
  connectToDatabase,
  disconnectFromDatabase,
  initUserSchemaFields,
} from "./database/connection.js";
import router from "./module/bank/bank.controller.js";

export async function bootstrap() {
  validateConfig();

  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.get("/health", (_req, res) => {
    const isMongoReady = mongoose.connection.readyState === 1;

    res.status(isMongoReady ? 200 : 503).json({
      status: isMongoReady ? "ok" : "degraded",
      database: isMongoReady ? "connected" : "disconnected",
      environment: config.nodeEnv,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/users", router);

  app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
  });

  app.use((error, _req, res, _next) => {
    console.error("Unhandled application error:", error);
    res.status(500).json({ message: "Internal server error" });
  });

  await connectToDatabase();
  await initUserSchemaFields();

  const server = app.listen(config.port, () => {
    console.log(`Express server is running on port ${config.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Closing server gracefully...`);
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
