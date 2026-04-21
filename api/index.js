import { getApp } from "../src/app.controller.js";

const appPromise = getApp();

export default async function handler(req, res) {
  const app = await appPromise;
  return app(req, res, (error) => {
    if (error) {
      console.error("Unhandled Vercel function error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });
}
