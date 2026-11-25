import { body } from "express-validator";
import { MEAL_TYPES } from "../utils/constants.js";

export const generateRules = [
  body("mealType").optional().isIn(MEAL_TYPES).withMessage("Invalid meal type"),

  body("proteinRich")
    .optional()
    .isBoolean()
    .withMessage("proteinRich must be true or false")
    .toBoolean(),

  body("maxPricePerServing")
    .optional()
    .isFloat({ min: 1, max: 5000 })
    .withMessage("Budget must be between 1 and 5000")
    .toFloat(),

  body("limit")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("limit must be between 1 and 20")
    .toInt(),
];
