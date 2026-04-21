import { Router } from "express";
import * as service from "./bank.service.js";

const router = Router();

router.post("/", service.createUser);
router.post("/login", service.login);
router.get("/", service.getAllUsers);
router.get("/:cardNumber", service.getUserByCard);
router.patch("/:cardNumber/disable", service.disableUser);
router.patch("/:cardNumber/restore", service.restoreUser);
router.patch("/deposit", service.deposit);
router.patch("/withdraw", service.withdraw);
router.patch("/transfer", service.transfer);

export default router;
