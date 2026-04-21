const DEFAULT_PORT = 8000;
const DEFAULT_DB_NAME = "atm_mongo_nti";

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: readNumber(process.env.PORT, DEFAULT_PORT),
  mongoUri: process.env.MONGO_URI,
  mongoDbName: process.env.MONGO_DB_NAME || DEFAULT_DB_NAME,
};

export function validateConfig() {
  if (!config.mongoUri) {
    throw new Error(
      "Missing MONGO_URI. Add it to your .env file before starting the server.",
    );
  }
}
