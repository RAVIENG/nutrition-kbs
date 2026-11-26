import assert from "node:assert/strict";
import test from "node:test";
import { validationResult } from "express-validator";

import DailyNutritionLog from "../models/DailyNutritionLog.js";
import FoodItem from "../models/FoodItem.js";
import UserProfile from "../models/UserProfile.js";
import {
  addNutritionEntries,
  deleteNutritionEntry,
  editNutritionEntry,
  getDailyNutritionLog,
  getNutritionHistory,
  scaleTrackedNutrients,
  summarizeTrackedNutrients,
  totalTrackedNutrients,
  validateDateKey,
} from "../services/dailyNutritionService.js";
import { getNutritionTargets } from "../services/nutritionTargetsService.js";
import { getFoodTalesDishNutrition } from "../services/foodTalesService.js";
import { protect } from "../middleware/authMiddleware.js";
import { addEntriesRules } from "../validators/trackingValidator.js";
import { chatRules } from "../validators/chatValidator.js";
import { buildConversationInput } from "../services/geminiService.js";
import { summarizeNutritionHistory } from "../../frontend/src/utils/nutritionHistory.js";
import {
  dateKeyInTimeZone,
  getDashboardNutrientCard,
} from "../../frontend/src/utils/dashboardNutrition.js";

const validateBody = async (rules, body) => {
  const req = { body, params: {}, query: {} };
  await Promise.all(rules.map((rule) => rule.run(req)));
  return validationResult(req);
};

test("food nutrition scales correctly from per-100g and per-serving bases", () => {
  const nutrients = {
    calories: 150,
    protein: 10,
    carbs: 20,
    fat: 5,
    fiber: null,
  };
  assert.deepEqual(scaleTrackedNutrients(nutrients, 200, "per_100g"), {
    calories: 300,
    protein: 20,
    carbs: 40,
    fat: 10,
    fiber: null,
    iron: null,
    calcium: null,
    vitaminC: null,
    vitaminB12: null,
    vitaminD: null,
  });
  assert.equal(scaleTrackedNutrients(nutrients, 2, "per_serving").calories, 300);
});

test("daily and meal nutrient totals add known values and preserve unknown values", () => {
  const totals = totalTrackedNutrients([
    { nutrients: { calories: 300, protein: 20, fiber: null } },
    { nutrients: { calories: 100, protein: 5, fiber: 2 } },
  ]);
  assert.equal(totals.calories, 400);
  assert.equal(totals.protein, 25);
  assert.equal(totals.fiber, 2);
  assert.equal(totalTrackedNutrients([]).calories, 0);
});

test("26 November diary totals include available foods and mark missing FoodTales values partial", () => {
  const breakfast = [
    [138, 3, 20.4, 4.8, 1.8], [78, 0.45, 20.7, 0.3, 3.6],
    [122.5, 2.75, 27, 0.5, 3.25], [165, 10, 20, 5, 3.5],
    [184, 7.6, 26, 5.6, 3], [61.1, 1.17, 15.34, 0.13, 3.12],
    [200, 4.8, 28.8, 7.2, 3.2], [68, 6, 10, 0.4, 2.5],
    [89, 1.1, 22.8, 0.3, 2.6],
  ].map(([calories, protein, carbs, fat, fiber]) => ({ mealType: "breakfast", nutrients: { calories, protein, carbs, fat, fiber } }));
  const lunch = [
    { calories: 177, protein: 13.5, carbs: 12, fat: 8.25, fiber: 6 },
    { calories: 123, protein: 2.43, carbs: 25.8, fat: 1.11, fiber: 1 },
  ].map((nutrients) => ({ mealType: "lunch", nutrients }));
  const dinner = [{ mealType: "dinner", nutrients: Object.fromEntries(
    ["calories", "protein", "carbs", "fat", "fiber"].map((key) => [key, null]),
  ) }];

  const result = summarizeTrackedNutrients([...breakfast, ...lunch, ...dinner]);
  assert.deepEqual(
    Object.fromEntries(["calories", "protein", "carbs", "fat", "fiber"].map((key) => [key, result.totals[key]])),
    { calories: 1405.6, protein: 52.8, carbs: 228.84, fat: 33.59, fiber: 33.57 },
  );
  for (const key of ["calories", "protein", "carbs", "fat", "fiber"]) {
    assert.deepEqual(result.coverage[key], { availableEntries: 11, missingEntries: 1, status: "partial" });
  }

  const unavailable = summarizeTrackedNutrients(dinner);
  assert.equal(unavailable.totals.calories, null);
  assert.equal(unavailable.coverage.calories.status, "unavailable");
});

test("weekly and monthly history average recorded calories, count logged days, and identify partial days", () => {
  const summary = summarizeNutritionHistory([
    { entryCount: 0, totals: { calories: 0 }, coverage: { calories: { status: "empty" } } },
    { entryCount: 12, totals: { calories: 1405.6 }, coverage: { calories: { status: "partial" } } },
    { entryCount: 2, totals: { calories: 2000 }, coverage: { calories: { status: "complete" } } },
    { entryCount: 1, totals: { calories: null }, coverage: { calories: { status: "unavailable" } } },
  ]);
  assert.deepEqual(summary, {
    loggedDays: 3,
    calorieDataDays: 2,
    averageRecordedCalories: 1703,
    partialCalorieDays: 1,
    unavailableCalorieDays: 1,
  });
});

test("dashboard date uses Asia/Kolkata across midnight", () => {
  assert.equal(dateKeyInTimeZone(new Date("2026-11-25T18:29:59.000Z")), "2026-11-25");
  assert.equal(dateKeyInTimeZone(new Date("2026-11-25T18:30:00.000Z")), "2026-11-26");
});

test("dashboard cards show complete, empty, partial, and unavailable logged nutrient states", () => {
  const complete = getDashboardNutrientCard({
    entries: [{}, {}, {}, {}],
    totals: { protein: 52.8, fiber: 33.57 },
    coverage: {
      protein: { status: "complete" },
      fiber: { status: "complete" },
    },
  }, "protein");
  assert.deepEqual(complete, { value: "52.8 g", hint: "From all logged meals today." });

  const empty = getDashboardNutrientCard({
    entries: [], totals: { fiber: 0 }, coverage: { fiber: { status: "empty" } },
  }, "fiber");
  assert.deepEqual(empty, { value: "0 g", hint: "No food logged today." });

  const partial = getDashboardNutrientCard({
    entries: Array(12).fill({}),
    totals: { protein: 52.8 },
    coverage: { protein: { status: "partial", availableEntries: 11, missingEntries: 1 } },
  }, "protein");
  assert.deepEqual(partial, {
    value: "Partial",
    hint: "52.8 g reported from 11 of 12 foods; 1 food lacks protein data.",
  });

  const unavailable = getDashboardNutrientCard({
    entries: [{}], totals: { fiber: null },
    coverage: { fiber: { status: "unavailable", availableEntries: 0, missingEntries: 1 } },
  }, "fiber");
  assert.deepEqual(unavailable, {
    value: "Unavailable",
    hint: "No reliable fibre total is available for today's food log.",
  });
});

test("date validation accepts calendar dates and rejects malformed or impossible dates", () => {
  assert.equal(validateDateKey("2026-11-26"), "2026-11-26");
  assert.throws(() => validateDateKey("2026-02-30"), { statusCode: 400 });
  assert.throws(() => validateDateKey("26-11-2026"), { statusCode: 400 });
});

test("entry validation rejects quantities below the persisted minimum", async () => {
  const base = {
    date: "2026-11-26",
    entries: [{
      requestId: "entry_12345678",
      mealType: "lunch",
      quantity: 0.05,
      sourceType: "food_database",
      foodId: "507f1f77bcf86cd799439011",
    }],
  };
  assert.equal((await validateBody(addEntriesRules, base)).isEmpty(), false);
  assert.equal((await validateBody(addEntriesRules, {
    ...base,
    entries: [{ ...base.entries[0], quantity: 0.1 }],
  })).isEmpty(), true);
});

test("nutrition targets use documented profile estimates and retain user overrides", () => {
  const targets = getNutritionTargets({
    age: 30,
    gender: "female",
    heightCm: 165,
    weightKg: 60,
    activityLevel: "moderately_active",
    nutritionTargets: { calories: 2100, carbs: 250 },
  });
  assert.equal(targets.calories.value, 2100);
  assert.equal(targets.calories.isEstimate, false);
  assert.equal(targets.protein.value, 49.8);
  assert.equal(targets.protein.isEstimate, true);
  assert.equal(targets.carbs.value, 250);
  assert.equal(targets.fat.value, null);
  assert.equal(targets.fiber.value, 25);
});

test("nutrition log model preserves source snapshots and uniquely scopes each user-day", () => {
  assert.equal(DailyNutritionLog.schema.path("user").options.ref, "User");
  assert.ok(DailyNutritionLog.schema.indexes().some(([fields, options]) =>
    fields.user === 1 && fields.dateKey === 1 && options.unique,
  ));
  assert.equal(DailyNutritionLog.schema.path("entries").schema.path("foodSnapshot.nutrientsPerBasis").options.required, true);
});

test("nutrition endpoints reject requests without an authenticated session", async () => {
  let authError;
  await protect({ cookies: {} }, {}, (error) => { authError = error; });
  assert.equal(authError?.statusCode, 401);
});

test("FoodTales nutrition uses the provider basis and leaves missing nutrients unknown", async () => {
  const previousKey = process.env.FOODTALES_API_KEY;
  const previousFetch = globalThis.fetch;
  let request;
  process.env.FOODTALES_API_KEY = "test-foodtales-key";
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options };
    return new Response(JSON.stringify({
      dish: {
        sku: "dish-01",
        name: "Test idli",
        nutrition: { basis: "per_serving", calories_kcal: 110, protein_g: 4, carbs_g: 22, fat_g: 1, fiber_g: "" },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const food = await getFoodTalesDishNutrition("dish-01");
    assert.equal(food.nutritionBasis, "per_serving");
    assert.equal(food.nutrientsPerBasis.calories, 110);
    assert.equal(food.nutrientsPerBasis.protein, 4);
    assert.equal(food.nutrientsPerBasis.fiber, null);
    assert.equal(request.options.headers["X-Api-Key"], "test-foodtales-key");
    assert.equal(request.url.includes("test-foodtales-key"), false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.FOODTALES_API_KEY;
    else process.env.FOODTALES_API_KEY = previousKey;
  }
});

test("chat can include recorded nutrition only when provided for a relevant question", () => {
  const log = { date: "2026-11-26", totals: { calories: 800 }, foods: [{ name: "Dal" }] };
  const prompt = buildConversationInput({
    message: "How much protein have I eaten today?",
    history: [],
    profile: null,
    dailyLog: log,
  });
  assert.match(prompt, /food log for the selected date/);
  assert.match(prompt, /\"calories\":800/);
  assert.doesNotMatch(buildConversationInput({
    message: "What is protein?", history: [], profile: null,
  }), /food log for the selected date/);
});

test("chat only accepts a real selected-day nutrition date", async () => {
  const invalid = await validateBody(chatRules, { message: "How much did I eat?", trackingDate: "2026-02-30" });
  const valid = await validateBody(chatRules, { message: "How much did I eat?", trackingDate: "2026-02-28" });
  assert.equal(invalid.isEmpty(), false);
  assert.equal(valid.isEmpty(), true);
});

test("daily log service adds, de-duplicates, edits, scopes, summarizes, and deletes entries", async () => {
  const original = {
    findOne: DailyNutritionLog.findOne,
    find: DailyNutritionLog.find,
    create: DailyNutritionLog.create,
    foodFind: FoodItem.find,
    profileFindOne: UserProfile.findOne,
  };
  const userId = "507f1f77bcf86cd799439021";
  const otherUserId = "507f1f77bcf86cd799439022";
  const foodId = "507f1f77bcf86cd799439023";
  let stored;

  FoodItem.find = () => ({
    lean: async () => [{
      _id: foodId,
      name: "Test dal",
      region: "Pan-India",
      source: "Test composition record",
      verified: true,
      per100g: { calories: 150, protein: 10, carbs: 20, fat: 5, fiber: null },
    }],
  });
  DailyNutritionLog.findOne = (query) => {
    const match = stored && String(stored.user) === String(query.user) && stored.dateKey === query.dateKey
      ? stored
      : null;
    return {
      then: (resolve, reject) => Promise.resolve(match).then(resolve, reject),
      lean: async () => match?.toObject() ?? null,
    };
  };
  DailyNutritionLog.find = (query) => ({
    lean: async () => stored && String(stored.user) === String(query.user) ? [stored.toObject()] : [],
  });
  DailyNutritionLog.create = async (input) => {
    stored = new DailyNutritionLog({ user: userId, ...input });
    stored.save = async function save() { return this; };
    return stored;
  };
  UserProfile.findOne = () => ({ lean: async () => null });

  try {
    const input = {
      date: "2026-11-26",
      entries: [{
        requestId: "request_12345678",
        mealType: "lunch",
        quantity: 200,
        sourceType: "food_database",
        foodId,
      }],
    };
    await addNutritionEntries(userId, input);
    await addNutritionEntries(userId, input);
    let day = await getDailyNutritionLog(userId, input.date);
    assert.equal(day.entries.length, 1);
    assert.equal(day.meals.lunch.totals.calories, 300);
    assert.equal(day.totals.protein, 20);
    assert.equal(day.totals.fiber, null);

    const entryId = String(stored.entries[0]._id);
    await assert.rejects(editNutritionEntry(otherUserId, entryId, { date: input.date, quantity: 100 }), { statusCode: 404 });
    await editNutritionEntry(userId, entryId, { date: input.date, quantity: 100, mealType: "snack" });
    day = await getDailyNutritionLog(userId, input.date);
    assert.equal(day.meals.snack.totals.calories, 150);
    assert.equal(day.meals.lunch.totals.calories, 0);

    const history = await getNutritionHistory(userId, input.date, "week");
    assert.equal(history.days.find((item) => item.date === input.date).totals.calories, 150);
    assert.equal(history.days.find((item) => item.date === input.date).entryCount, 1);
    const monthlyHistory = await getNutritionHistory(userId, input.date, "month");
    assert.equal(monthlyHistory.days.length, 30);
    assert.equal(monthlyHistory.days.find((item) => item.date === input.date).totals.calories, 150);
    await deleteNutritionEntry(userId, entryId, input.date);
    day = await getDailyNutritionLog(userId, input.date);
    assert.equal(day.entries.length, 0);
    assert.equal(day.totals.calories, 0);
  } finally {
    DailyNutritionLog.findOne = original.findOne;
    DailyNutritionLog.find = original.find;
    DailyNutritionLog.create = original.create;
    FoodItem.find = original.foodFind;
    UserProfile.findOne = original.profileFindOne;
  }
});
