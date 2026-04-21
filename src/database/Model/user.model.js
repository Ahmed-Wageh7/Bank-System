import mongoose from "mongoose";
import crypto from "crypto";

function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["deposit", "withdraw", "transfer", "receive"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    to: {
      type: String,
    },
    from: {
      type: String,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    cardNumber: {
      type: String,
      required: true,
      immutable: true,
    },
    pin: {
      type: String,
      required: true,
      select: false,
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    transactions: {
      type: [transactionSchema],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ cardNumber: 1 }, { unique: true });
userSchema.index({ isDeleted: 1 });

userSchema.pre("save", function hashUserPin(next) {
  if (this.isModified("pin")) {
    this.pin = hashPin(String(this.pin));
  }

  next();
});

userSchema.methods.comparePin = function comparePin(pin) {
  return this.pin === hashPin(String(pin));
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.pin;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export { hashPin };
