import express from "express";
import { login, register, changePassword, forgotPassword, resetPassword } from "../controllers/user.controller.js";
import { verifyAuthentication } from "../middlewares/auth.middleware.js";

const router = express.Router();


router.post("/register", register);
router.post("/login", login);
router.post("/change-password", verifyAuthentication, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
