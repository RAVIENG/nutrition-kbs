import express from "express";
import rateLimit from "express-rate-limit";
import { createRateLimitHandler } from "../utils/apiRateLimit.js";
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  registerRules,
  loginRules,
  forgotRules,
  resetRules,
} from "../validators/authValidator.js";
import validate from "../validators/validate.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  handler: createRateLimitHandler("auth"),
  message: {
    success: false,
    message: "Too many attempts, try again in 15 minutes",
  },
});

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post(
  "/forgot-password",
  authLimiter,
  forgotRules,
  validate,
  forgotPassword,
);
router.post(
  "/reset-password/:token",
  authLimiter,
  resetRules,
  validate,
  resetPassword,
);

export default router;
