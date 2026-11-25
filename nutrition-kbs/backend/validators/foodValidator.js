import { body, query } from "express-validator";
import {
  FOOD_CATEGORIES,
  MEAL_TYPES,
  FOOD_GROUPS,
  FOOD_REGIONS,
  DIETARY_PREFERENCES,
  ALLERGENS,
} from "../utils/constants.js";

// Filters on GET /api/foods (values are parsed in the controller)
export const listFoodRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive whole number"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("category")
    .optional()
    .isIn(FOOD_CATEGORIES)
    .withMessage("Invalid category"),
  query("mealType")
    .optional()
    .isIn(MEAL_TYPES)
    .withMessage("Invalid meal type"),
  query("diet")
    .optional()
    .isIn(DIETARY_PREFERENCES)
    .withMessage("Invalid diet"),
  query("region").optional().isIn(FOOD_REGIONS).withMessage("Invalid region"),
  query("q")
    .optional()
    .isString()
    .isLength({ max: 60 })
    .withMessage("Search text is too long"),
  query("allergens")
    .optional()
    .custom(
      (value) =>
        typeof value === "string" &&
        value.split(",").every((a) => ALLERGENS.includes(a.trim())),
    )
    .withMessage("Invalid allergen list"),
];

// Body for POST and PUT (admin). PUT sends the complete food, same as POST.
export const foodRules = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Name must be 2-80 characters"),
  body("category").isIn(FOOD_CATEGORIES).withMessage("Invalid category"),
  body("mealTypes")
    .isArray({ min: 1 })
    .withMessage("Choose at least one meal type"),
  body("mealTypes.*").isIn(MEAL_TYPES).withMessage("Invalid meal type"),
  body("foodGroup").isIn(FOOD_GROUPS).withMessage("Invalid food group"),
  body("dietType").isIn(DIETARY_PREFERENCES).withMessage("Invalid diet type"),
  body("allergens")
    .optional()
    .isArray()
    .withMessage("Allergens must be a list"),
  body("allergens.*").isIn(ALLERGENS).withMessage("Unknown allergen"),
  body("serving.description")
    .trim()
    .notEmpty()
    .withMessage("Serving description is required"),
  body("serving.grams")
    .isFloat({ min: 1, max: 2000 })
    .withMessage("Serving grams must be 1-2000"),
  body("region").optional().isIn(FOOD_REGIONS).withMessage("Invalid region"),
  body("source").optional().isString().isLength({ max: 200 }),
  body("verified").optional().isBoolean(),
  body("price")
    .optional()
    .isFloat({ min: 0, max: 5000 })
    .withMessage("Price must be between 0 and 5000")
    .toFloat(),
  ...["calories", "protein", "carbs", "fat", "fiber"].map((f) =>
    body(`per100g.${f}`)
      .isFloat({ min: 0, max: 1000 })
      .withMessage(`${f} per 100 g is required (0-1000)`),
  ),
  ...["iron", "calcium", "vitaminC", "vitaminB12", "vitaminD"].map((f) =>
    body(`per100g.${f}`)
      .optional()
      .isFloat({ min: 0 })
      .withMessage(`${f} must be 0 or more`),
  ),
];
