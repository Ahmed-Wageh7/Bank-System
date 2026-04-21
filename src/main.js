import { bootstrap } from "./app.controller.js";

bootstrap().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
