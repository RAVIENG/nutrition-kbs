import { body } from "express-validator";

const passwordRule = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters")
  .matches(/[A-Za-z]/)
  .withMessage("Password must contain a letter")
  .matches(/[0-9]/)
  .withMessage("Password must contain a number");

const confirmRule = body("confirmPassword")
  .custom((value, { req }) => value === req.body.password)
  .withMessage("Passwords do not match");

export const registerRules = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be 2-60 characters"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email")
    .normalizeEmail(),
  passwordRule,
  confirmRule,
];

export const loginRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email")
    .normalizeEmail(),
];

export const resetRules = [passwordRule, confirmRule];
