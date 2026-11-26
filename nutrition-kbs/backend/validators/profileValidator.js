import { body } from "express-validator";
import {
  GENDERS,
  ACTIVITY_LEVELS,
  DIETARY_PREFERENCES,
  HEALTH_GOALS,
  ALLERGENS,
  INDIAN_STATES,
} from "../utils/constants.js";

export const profileRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be 2-60 characters"),
  body("age")
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage("Age must be a whole number between 18 and 100")
    .toInt(),
  body("gender").optional().isIn(GENDERS).withMessage("Invalid gender"),
  body("heightCm")
    .optional()
    .isFloat({ min: 100, max: 250 })
    .withMessage("Height must be between 100 and 250 cm")
    .toFloat(),
  body("weightKg")
    .optional()
    .isFloat({ min: 25, max: 300 })
    .withMessage("Weight must be between 25 and 300 kg")
    .toFloat(),
  body("activityLevel")
    .optional()
    .isIn(ACTIVITY_LEVELS)
    .withMessage("Invalid activity level"),
  body("dietaryPreference")
    .optional()
    .isIn(DIETARY_PREFERENCES)
    .withMessage("Invalid dietary preference"),
  body("healthGoal")
    .optional()
    .isIn(HEALTH_GOALS)
    .withMessage("Invalid health goal"),
  body("state").optional().isIn(INDIAN_STATES).withMessage("Invalid state"),

  body("nutritionTargets").optional().isObject().withMessage("Nutrition targets must be an object"),
  body("nutritionTargets.calories").optional().isFloat({ min: 500, max: 10000 }).withMessage("Calorie target must be 500-10000").toFloat(),
  body("nutritionTargets.protein").optional().isFloat({ min: 1, max: 500 }).withMessage("Protein target must be 1-500 g").toFloat(),
  body("nutritionTargets.carbs").optional().isFloat({ min: 1, max: 1000 }).withMessage("Carbohydrate target must be 1-1000 g").toFloat(),
  body("nutritionTargets.fat").optional().isFloat({ min: 1, max: 500 }).withMessage("Fat target must be 1-500 g").toFloat(),
  body("nutritionTargets.fiber").optional().isFloat({ min: 1, max: 150 }).withMessage("Fibre target must be 1-150 g").toFloat(),

  body("allergies")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Allergies must be a list"),
  body("allergies.*").isIn(ALLERGENS).withMessage("Unknown allergen"),

  body("restrictions")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Restrictions must be a list"),
  body("restrictions.*")
    .isString()
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage("Each restriction must be 1-40 characters"),

  body("preferredRegionalFoods")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Regional foods must be a list"),
  body("preferredRegionalFoods.*")
    .isString()
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage("Each regional food must be 1-40 characters"),
];

export const deleteAccountRules = [
  body("password").notEmpty().withMessage("Enter your password to confirm"),
];
