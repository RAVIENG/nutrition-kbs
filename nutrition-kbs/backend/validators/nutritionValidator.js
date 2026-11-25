import { body } from "express-validator";
import { GENDERS, ACTIVITY_LEVELS } from "../utils/constants.js";

// All fields are optional: anything missing is taken from the saved profile
export const bmiRules = [
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
];

export const calorieRules = [
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
];
