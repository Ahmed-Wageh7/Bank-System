import mongoose from "mongoose";
import { config } from "../config.js";
import { hashPin, User } from "./Model/user.model.js";

export async function connectToDatabase() {
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName,
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`Connected to MongoDB database: ${config.mongoDbName}`);
}

export async function initUserSchemaFields() {
  await User.updateMany(
    { isDeleted: { $exists: false } },
    { $set: { isDeleted: false } },
  );

  const usersWithPlainPins = await User.find({
    pin: { $not: /^[a-f0-9]{64}$/i },
  }).select("+pin");

  for (const user of usersWithPlainPins) {
    user.pin = hashPin(user.pin);
    await user.save();
  }
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}
