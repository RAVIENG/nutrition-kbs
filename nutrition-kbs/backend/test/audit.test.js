import assert from "node:assert/strict";
import test from "node:test";
import { validationResult } from "express-validator";

import { environmentErrors, validateEnvironment } from "../config/validateEnv.js";
import { forgotPassword } from "../controllers/authController.js";
import { calculateBMI } from "../services/bmiService.js";
import { calculateCalories } from "../services/calorieService.js";
import { registerRules, loginRules } from "../validators/authValidator.js";
import { chatRules } from "../validators/chatValidator.js";
import FoodItem from "../models/FoodItem.js";
import FoodPrice from "../models/FoodPrice.js";
import Recommendation from "../models/Recommendation.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";

const validateRules = async (rules, body) => {
  const req = { body, params: {}, query: {} };
  await Promise.all(rules.map((rule) => rule.run(req)));
  return validationResult(req);
};

test("startup environment checks accept valid local and secure Render settings", () => {
  const local = {
    MONGO_URI: "mongodb://127.0.0.1:27017/nutrition-kbs",
    JWT_SECRET: "a".repeat(48),
    CLIENT_URL: "http://localhost:5173",
    PORT: "5000",
    NODE_ENV: "development",
    COOKIE_SECURE: "false",
  };
  assert.deepEqual(environmentErrors(local), []);
  assert.doesNotThrow(() => validateEnvironment(local));

  const deployed = {
    ...local,
    MONGO_URI: "mongodb+srv://user:password@example.mongodb.net/nutrition",
    CLIENT_URL: "https://nutriguide.example",
    NODE_ENV: "production",
    COOKIE_SECURE: "true",
    PORT: "10000",
  };
  assert.deepEqual(environmentErrors(deployed), []);
});

test("startup environment checks reject weak secrets and insecure deployment cookies", () => {
  const errors = environmentErrors({
    MONGO_URI: "not-a-mongodb-uri",
    JWT_SECRET: "short",
    CLIENT_URL: "http://frontend.example/path",
    NODE_ENV: "production",
    COOKIE_SECURE: "false",
    PORT: "70000",
  });
  assert.equal(errors.length, 6);
  assert.ok(errors.some((error) => error.includes("JWT_SECRET")));
  assert.ok(errors.some((error) => error.includes("COOKIE_SECURE")));
});

test("authentication validators reject malformed registration and login input", async () => {
  const invalidRegister = await validateRules(registerRules, {
    name: "A",
    email: "bad-email",
    password: "short",
    confirmPassword: "different",
  });
  assert.equal(invalidRegister.isEmpty(), false);

  const validRegister = await validateRules(registerRules, {
    name: "Test User",
    email: "TEST@example.com",
    password: "strongpass1",
    confirmPassword: "strongpass1",
  });
  assert.equal(validRegister.isEmpty(), true);

  const invalidLogin = await validateRules(loginRules, { email: "bad", password: "" });
  assert.equal(invalidLogin.isEmpty(), false);
});

test("chat history clips long assistant replies so follow-up turns remain valid", async () => {
  const req = {
    body: {
      message: "Give me five more options.",
      history: [
        { role: "assistant", text: `First part. ${"More meal suggestions. ".repeat(60)}` },
        { role: "user", text: "Give me five more options." },
      ],
    },
    params: {},
    query: {},
  };
  await Promise.all(chatRules.map((rule) => rule.run(req)));

  assert.equal(validationResult(req).isEmpty(), true);
  assert.equal(req.body.history[0].text.length, 800);
  assert.equal(req.body.history[1].text, "Give me five more options.");
});

test("BMI and calorie calculators validate input and return stable result shapes", () => {
  const bmi = calculateBMI(170, 70);
  assert.equal(bmi.bmi, 24.2);
  assert.equal(bmi.whoCategory.key, "normal");
  assert.ok(bmi.healthyWeightRangeKg.min < bmi.healthyWeightRangeKg.max);
  assert.throws(() => calculateBMI(80, 70), { statusCode: 400 });

  const calories = calculateCalories({
    age: 30,
    gender: "female",
    heightCm: 165,
    weightKg: 60,
    activityLevel: "moderately_active",
  });
  assert.equal(calories.formula, "Mifflin-St Jeor equation");
  assert.equal(calories.activityMultiplier, 1.55);
  assert.ok(calories.estimatedDailyCalories > calories.bmr);
});

test("Mongo model relationships and uniqueness are defined without changing schemas", () => {
  assert.equal(UserProfile.schema.path("user").options.ref, "User");
  assert.equal(UserProfile.schema.path("user").options.unique, true);
  assert.equal(FoodPrice.schema.path("food").options.ref, "FoodItem");
  assert.ok(FoodPrice.schema.indexes().some(([fields, options]) =>
    fields.food === 1 && fields.region === 1 && options.unique,
  ));
  assert.equal(Recommendation.schema.path("user").options.ref, "User");
  assert.equal(User.schema.path("password").options.select, false);
  assert.equal(FoodItem.schema.path("name").options.unique, true);
});

test("password reset never creates or logs a token in production", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRender = process.env.RENDER;
  process.env.NODE_ENV = "production";
  delete process.env.RENDER;

  try {
    let resetError;
    await forgotPassword({ body: { email: "person@example.test" } }, {}, (error) => {
      resetError = error;
    });
    assert.equal(resetError?.statusCode, 503);
    assert.match(resetError?.message ?? "", /delivery is not configured/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousRender === undefined) delete process.env.RENDER;
    else process.env.RENDER = previousRender;
  }
});
