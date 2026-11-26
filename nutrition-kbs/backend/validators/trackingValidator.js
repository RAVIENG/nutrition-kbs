import { body, param, query } from "express-validator";

const dateRule = (validator) =>
  validator
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Date must use YYYY-MM-DD format.");

export const dayQueryRules = [dateRule(query("date"))];

export const historyQueryRules = [
  dateRule(query("date")),
  query("period").isIn(["week", "month"]).withMessage("Period must be week or month."),
];

export const foodSearchRules = [
  query("q").isString().trim().isLength({ min: 2, max: 80 }).withMessage("Food search must be 2-80 characters."),
];

export const addEntriesRules = [
  dateRule(body("date")),
  body("entries").isArray({ min: 1, max: 20 }).withMessage("Add between 1 and 20 foods per request."),
  body("entries.*.requestId").isString().matches(/^[A-Za-z0-9_-]{8,80}$/).withMessage("Each entry needs a valid request ID."),
  body("entries.*.mealType").isIn(["breakfast", "lunch", "snack", "dinner"]).withMessage("Choose a valid meal."),
  body("entries.*.sourceType").isIn(["food_database", "foodtales"]).withMessage("Choose a valid food source."),
  body("entries.*.quantity").isFloat({ min: 0.1, max: 100000 }).withMessage("Quantity must be at least 0.1 and no more than 100000.").toFloat(),
];

export const editEntryRules = [
  param("entryId").isMongoId().withMessage("Invalid nutrition entry."),
  dateRule(body("date")),
  body("mealType").optional().isIn(["breakfast", "lunch", "snack", "dinner"]).withMessage("Choose a valid meal."),
  body("quantity").optional().isFloat({ min: 0.1, max: 100000 }).withMessage("Quantity must be at least 0.1 and no more than 100000.").toFloat(),
  body().custom((_, { req }) => {
    if (req.body.mealType === undefined && req.body.quantity === undefined) {
      throw new Error("Provide a meal or quantity update.");
    }
    return true;
  }),
];

export const deleteEntryRules = [
  param("entryId").isMongoId().withMessage("Invalid nutrition entry."),
  dateRule(query("date")),
];
