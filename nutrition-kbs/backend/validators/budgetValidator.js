import { body } from "express-validator";
import { DIETARY_PREFERENCES } from "../utils/constants.js";

export const budgetPlanRules = [
  body("dailyBudget")
    .isFloat({ min: 50, max: 5000 })
    .withMessage("Daily budget must be between ₹50 and ₹5000.")
    .toFloat(),
  body("dietaryPreference")
    .optional()
    .isIn(DIETARY_PREFERENCES)
    .withMessage("Choose a valid dietary preference."),
  body("mealsPerDay")
    .isInt({ min: 3, max: 4 })
    .withMessage("Choose 3 or 4 meals per day.")
    .toInt(),
  body("foodPreferences")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Enter up to 10 food preferences."),
  body("foodPreferences.*")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage("Each food preference must be 1 to 40 characters."),
  body("restrictions")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Enter up to 10 restrictions."),
  body("restrictions.*")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage("Each restriction must be 1 to 40 characters."),
];
