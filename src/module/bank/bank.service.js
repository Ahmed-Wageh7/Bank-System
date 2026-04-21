import { User } from "../../database/Model/user.model.js";
import mongoose from "mongoose";

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function normalizeAmount(amount) {
  const parsedAmount = Number(amount);
  return Number.isFinite(parsedAmount) ? parsedAmount : NaN;
}

function validatePositiveAmount(amount) {
  return Number.isFinite(amount) && amount > 0;
}

async function createCardNumber() {
  let cardNumber = "";

  do {
    cardNumber = "";

    for (let i = 0; i < 16; i++) {
      cardNumber += Math.floor(Math.random() * 10);
    }
  } while (await User.findOne({ cardNumber }));

  return cardNumber;
}

export const createUser = async (req, res) => {
  try {
    const { name, pin, initialBalance } = req.body;
    const balance = normalizeAmount(initialBalance);

    if (!name || !pin || initialBalance == null) {
      return sendError(res, 400, "name, pin and initialBalance are required");
    }

    if (String(pin).length < 4 || String(pin).length > 6) {
      return sendError(res, 400, "pin must be between 4 and 6 digits");
    }

    if (!validatePositiveAmount(balance) && balance !== 0) {
      return sendError(res, 400, "initialBalance must be a valid number");
    }

    const user = await User.create({
      name: String(name).trim(),
      pin: String(pin),
      cardNumber: await createCardNumber(),
      balance,
      isDeleted: false,
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find({ isDeleted: false }).populate(
      "transactions.toUser transactions.fromUser",
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserByCard = async (req, res) => {
  try {
    const user = await User.findOne({
      cardNumber: req.params.cardNumber,
      isDeleted: false,
    }).populate("transactions.toUser transactions.fromUser");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { cardNumber, pin } = req.body;

    if (!cardNumber || !pin) {
      return sendError(res, 400, "cardNumber and pin are required");
    }

    const user = await User.findOne({
      cardNumber: String(cardNumber),
      isDeleted: false,
    })
      .select("+pin")
      .populate("transactions.toUser transactions.fromUser");

    if (!user || !user.comparePin(pin)) {
      return sendError(res, 401, "Invalid card number or pin");
    }

    res.json({
      message: "Login successful",
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deposit = async (req, res) => {
  try {
    const { cardNumber, pin, amount } = req.body;
    const parsedAmount = normalizeAmount(amount);

    if (!validatePositiveAmount(parsedAmount)) {
      return sendError(res, 400, "amount must be greater than 0");
    }

    const user = await User.findOne({ cardNumber, isDeleted: false }).select("+pin");

    if (!user || !user.comparePin(pin)) {
      return sendError(res, 404, "User not found or pin is incorrect");
    }

    user.balance += parsedAmount;
    user.transactions.push({ type: "deposit", amount: parsedAmount });

    await user.save();

    res.json({ message: "Deposit successful", balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const withdraw = async (req, res) => {
  try {
    const { cardNumber, pin, amount } = req.body;
    const parsedAmount = normalizeAmount(amount);

    if (!validatePositiveAmount(parsedAmount)) {
      return sendError(res, 400, "amount must be greater than 0");
    }

    const user = await User.findOne({ cardNumber, isDeleted: false }).select("+pin");

    if (!user || !user.comparePin(pin)) {
      return sendError(res, 404, "User not found or pin is incorrect");
    }

    if (user.balance < parsedAmount) {
      return sendError(res, 400, "Insufficient balance");
    }

    user.balance -= parsedAmount;
    user.transactions.push({ type: "withdraw", amount: parsedAmount });

    await user.save();

    res.json({ message: "Withdraw successful", balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const transfer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { fromCardNumber, fromPin, toCardNumber, amount } = req.body;
    const parsedAmount = normalizeAmount(amount);

    if (!validatePositiveAmount(parsedAmount)) {
      return sendError(res, 400, "amount must be greater than 0");
    }

    if (fromCardNumber === toCardNumber) {
      return sendError(res, 400, "Cannot transfer to the same card");
    }

    await session.withTransaction(async () => {
      const sender = await User.findOne({
        cardNumber: fromCardNumber,
        isDeleted: false,
      })
        .select("+pin")
        .session(session);
      const receiver = await User.findOne({
        cardNumber: toCardNumber,
        isDeleted: false,
      }).session(session);

      if (!sender || !sender.comparePin(fromPin)) {
        throw new Error("Sender not found or pin is incorrect");
      }

      if (!receiver) {
        throw new Error("Receiver not found");
      }

      if (sender.balance < parsedAmount) {
        throw new Error("Insufficient balance");
      }

      sender.balance -= parsedAmount;
      receiver.balance += parsedAmount;

      sender.transactions.push({
        type: "transfer",
        amount: parsedAmount,
        to: toCardNumber,
        toUser: receiver._id,
      });

      receiver.transactions.push({
        type: "receive",
        amount: parsedAmount,
        from: fromCardNumber,
        fromUser: sender._id,
      });

      await sender.save({ session });
      await receiver.save({ session });

      res.json({ message: "Transfer successful", balance: sender.balance });
    });
  } catch (error) {
    const status = error.message === "Receiver not found" ? 404 : 400;
    res.status(status).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

export const disableUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { cardNumber: req.params.cardNumber, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );

    if (!user) {
      return sendError(res, 404, "User already disabled or not found");
    }

    res.json({ message: "User disabled successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { cardNumber: req.params.cardNumber, isDeleted: true },
      { isDeleted: false },
      { new: true },
    ).populate("transactions.toUser transactions.fromUser");

    if (!user) {
      return sendError(res, 404, "User already restored or not found");
    }

    res.json({ message: "User restored successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
