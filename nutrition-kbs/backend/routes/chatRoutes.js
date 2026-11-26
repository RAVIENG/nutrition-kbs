import express from "express";
import rateLimit from "express-rate-limit";
import { createRateLimitHandler } from "../utils/apiRateLimit.js";

import { protect } from "../middleware/authMiddleware.js";
import { sendMessage } from "../controllers/chatController.js";
import validate from "../validators/validate.js";
import { chatRules } from "../validators/chatValidator.js";

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  handler: createRateLimitHandler("nutrition-chat"),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Chat limit reached. Please try again in a few minutes.",
  },
});

router.use(protect);
router.post("/", chatLimiter, chatRules, validate, sendMessage);

export default router;
