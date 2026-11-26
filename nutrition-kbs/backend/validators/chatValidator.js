import { body } from "express-validator";

export const chatRules = [
  body("message")
    .isString()
    .withMessage("Enter a nutrition question.")
    .bail()
    .trim()
    .isLength({ min: 1, max: 1500 })
    .withMessage("Your message must be 1 to 1500 characters."),
  body("history")
    .optional()
    .isArray({ max: 8 })
    .withMessage("Conversation context can include up to 8 messages."),
  body("history.*.role")
    .if(body("history").exists())
    .isIn(["user", "assistant"])
    .withMessage("Conversation roles must be user or assistant."),
  body("history.*.text")
    .if(body("history").exists())
    .isString()
    .withMessage("Conversation messages must be text.")
    .bail()
    .trim()
    // Model replies may exceed the per-message history cap. Keep the most
    // recent context so a valid next user turn is not rejected.
    .customSanitizer((value) => (value.length > 800 ? value.slice(-800) : value))
    .isLength({ min: 1, max: 800 })
    .withMessage("Each conversation message must be 1 to 800 characters."),
  body("trackingDate")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value) => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value)
    .withMessage("Nutrition log date must be a valid YYYY-MM-DD date."),
];
