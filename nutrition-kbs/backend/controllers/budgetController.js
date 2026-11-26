import asyncHandler from "../utils/asyncHandler.js";
import { generateBudgetPlan } from "../services/budgetPlannerService.js";

export const createBudgetPlan = asyncHandler(async (req, res) => {
  const plan = await generateBudgetPlan(req.user, req.body);
  res.json({ success: true, plan });
});
