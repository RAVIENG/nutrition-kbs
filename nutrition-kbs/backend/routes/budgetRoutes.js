import express from "express";
import rateLimit from "express-rate-limit";
import { createRateLimitHandler } from "../utils/apiRateLimit.js";

import { protect } from "../middleware/authMiddleware.js";
import { createBudgetPlan } from "../controllers/budgetController.js";
import validate from "../validators/validate.js";
import { budgetPlanRules } from "../validators/budgetValidator.js";

const router = express.Router();

const planLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  handler: createRateLimitHandler("budget-plan"),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "You have generated several plans recently. Please try again later.",
  },
});

router.use(protect);
router.post("/plan", planLimiter, budgetPlanRules, validate, createBudgetPlan);

export default router;
