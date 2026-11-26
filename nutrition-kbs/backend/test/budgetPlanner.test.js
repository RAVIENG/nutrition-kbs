import assert from "node:assert/strict";
import test from "node:test";
import { validationResult } from "express-validator";

import { protect } from "../middleware/authMiddleware.js";
import {
  buildRuleBasedSelections,
  calculateMealTotals,
  findProteinSuggestions,
  generateBudgetPlan,
  validateAiSelections,
} from "../services/budgetPlannerService.js";
import { budgetPlanRules } from "../validators/budgetValidator.js";
import seedFoods from "../seeders/data/foods.js";
import { allowedDietTypes } from "../utils/diet.js";
import { scaleNutrients } from "../services/foodService.js";

const food = ({
  id,
  name,
  group,
  price,
  meals = ["breakfast", "lunch", "snack", "dinner"],
  diet = "vegetarian",
  allergens = [],
  calories = 100,
  protein = 5,
  carbs = 15,
  fat = 2,
}) => ({
  id,
  name,
  category: "regional",
  mealTypes: meals,
  foodGroup: group,
  dietType: diet,
  allergens,
  serving: { description: "1 bowl", grams: 100 },
  perServing: { calories, protein, carbs, fat },
  price: { perServing: price, currency: "INR", isEstimate: true },
  source: "Test food composition record",
  verified: true,
});

const foods = [
  food({ id: "roti", name: "Roti", group: "cereal", price: 8, calories: 120, protein: 4 }),
  food({ id: "rice", name: "Rice", group: "cereal", price: 7, calories: 130, protein: 2 }),
  food({ id: "dal", name: "Dal", group: "pulse", price: 8, calories: 110, protein: 8 }),
  food({ id: "veg", name: "Vegetable curry", group: "vegetable", price: 6, calories: 70, protein: 2 }),
  food({ id: "banana", name: "Banana", group: "fruit", price: 4, meals: ["breakfast", "snack"], calories: 90, protein: 1 }),
  food({ id: "egg", name: "Boiled egg", group: "egg", price: 7, diet: "eggetarian", meals: ["breakfast", "lunch", "snack", "dinner"], protein: 6 }),
  food({ id: "peanut", name: "Peanut chikki", group: "nuts_seeds", price: 3, allergens: ["peanuts"], meals: ["snack"] }),
];

const runBudgetValidation = async (body) => {
  const req = { body, params: {}, query: {}, headers: {}, cookies: {} };
  await Promise.all(budgetPlanRules.map((rule) => rule.run(req)));
  return validationResult(req);
};

test("budget endpoint input rules reject out-of-range budget and meal counts", async () => {
  const invalid = await runBudgetValidation({
    dailyBudget: 10,
    dietaryPreference: "omnivore",
    mealsPerDay: 6,
  });
  assert.equal(invalid.isEmpty(), false);

  const valid = await runBudgetValidation({
    dailyBudget: 200,
    dietaryPreference: "vegetarian",
    mealsPerDay: 4,
    foodPreferences: ["rice"],
    restrictions: [],
  });
  assert.equal(valid.isEmpty(), true);
});

test("AI response validation accepts only catalog food and permitted portions", () => {
  const proposed = {
    meals: [
      { slot: "breakfast", items: [{ foodId: "roti", servings: 1 }, { foodId: "dal", servings: 0.5 }] },
      { slot: "lunch", items: [{ foodId: "rice", servings: 1 }, { foodId: "dal", servings: 1 }] },
      { slot: "snack", items: [{ foodId: "banana", servings: 1 }] },
      { slot: "dinner", items: [{ foodId: "roti", servings: 0.75 }, { foodId: "dal", servings: 0.75 }] },
    ],
  };
  assert.ok(
    validateAiSelections({
      response: proposed,
      foods,
      dailyBudget: 100,
      mealsPerDay: 4,
    }),
  );

  const inventedFood = structuredClone(proposed);
  inventedFood.meals[0].items[0].foodId = "invented";
  assert.deepEqual(
    validateAiSelections({ response: inventedFood, foods, dailyBudget: 100, mealsPerDay: 4 }),
    null,
  );
  assert.equal(
    validateAiSelections({ response: proposed, foods, dailyBudget: 10, mealsPerDay: 4 }),
    null,
  );
});

test("budget Gemini request constrains output to valid slots and serving sizes", async () => {
  let capturedRequest;
  const plan = await generateBudgetPlan(
    { _id: "user-test" },
    {
      dailyBudget: 60,
      dietaryPreference: "vegetarian",
      mealsPerDay: 4,
      foodPreferences: [],
      restrictions: [],
    },
    {
      profileOverride: { allergies: [], restrictions: [], preferredRegionalFoods: [] },
      foodsOverride: foods,
      geminiRequest: async (request) => {
        capturedRequest = request;
        return {
          output_text: JSON.stringify({
            meals: [
              { slot: "breakfast", items: [{ foodId: "roti", servings: 1 }, { foodId: "dal", servings: 0.5 }] },
              { slot: "lunch", items: [{ foodId: "rice", servings: 1 }, { foodId: "dal", servings: 1 }] },
              { slot: "snack", items: [{ foodId: "banana", servings: 1 }] },
              { slot: "dinner", items: [{ foodId: "roti", servings: 0.75 }, { foodId: "dal", servings: 0.75 }] },
            ],
          }),
        };
      },
    },
  );

  assert.equal(plan.generationMode, "gemini");
  assert.deepEqual(
    capturedRequest.responseFormat.schema.properties.meals.items.properties.items.items.properties.servings.enum,
    [1, 0.75, 0.5],
  );
});

test("budget planner retries a Gemini selection that fails validation", async () => {
  let calls = 0;
  let retryPrompt = "";
  const validPlan = {
    meals: [
      { slot: "breakfast", items: [{ foodId: "roti", servings: 1 }, { foodId: "dal", servings: 0.5 }] },
      { slot: "lunch", items: [{ foodId: "rice", servings: 1 }, { foodId: "dal", servings: 1 }] },
      { slot: "snack", items: [{ foodId: "banana", servings: 1 }] },
      { slot: "dinner", items: [{ foodId: "roti", servings: 0.75 }, { foodId: "dal", servings: 0.75 }] },
    ],
  };
  const plan = await generateBudgetPlan(
    { _id: "user-test" },
    {
      dailyBudget: 60,
      dietaryPreference: "vegetarian",
      mealsPerDay: 4,
      foodPreferences: [],
      restrictions: [],
    },
    {
      profileOverride: { allergies: [], restrictions: [], preferredRegionalFoods: [] },
      foodsOverride: foods,
      geminiRequest: async ({ input }) => {
        calls += 1;
        if (calls === 1) {
          return {
            output_text: JSON.stringify({
              ...validPlan,
              meals: validPlan.meals.map((meal) =>
                meal.slot === "breakfast"
                  ? { ...meal, items: [{ foodId: "roti", servings: 1 }, { foodId: "banana", servings: 1 }] }
                  : meal,
              ),
            }),
          };
        }
        retryPrompt = input;
        return { output_text: JSON.stringify(validPlan) };
      },
    },
  );

  assert.equal(calls, 2);
  assert.match(retryPrompt, /previous selection did not satisfy/);
  assert.equal(plan.generationMode, "gemini");
  assert.equal(plan.aiNotice, "");
});

test("budget planner repairs an invalid Gemini meal before falling back", async () => {
  const invalidPlan = {
    meals: [
      { slot: "breakfast", items: [{ foodId: "roti", servings: 1 }, { foodId: "banana", servings: 1 }] },
      { slot: "lunch", items: [{ foodId: "rice", servings: 1 }, { foodId: "dal", servings: 1 }] },
      { slot: "snack", items: [{ foodId: "banana", servings: 1 }] },
      { slot: "dinner", items: [{ foodId: "roti", servings: 0.75 }, { foodId: "dal", servings: 0.75 }] },
    ],
  };
  const plan = await generateBudgetPlan(
    { _id: "user-test" },
    {
      dailyBudget: 60,
      dietaryPreference: "vegetarian",
      mealsPerDay: 4,
      foodPreferences: [],
      restrictions: [],
    },
    {
      profileOverride: { allergies: [], restrictions: [], preferredRegionalFoods: [] },
      foodsOverride: foods,
      geminiRequest: async () => ({ output_text: JSON.stringify(invalidPlan) }),
    },
  );

  assert.equal(plan.generationMode, "gemini_adjusted");
  assert.match(plan.aiNotice, /adjusted to meet/);
  assert.ok(plan.budget.estimatedCost <= 60);
  const breakfast = plan.meals.find((meal) => meal.slot === "breakfast");
  assert.ok(breakfast.items.some((item) => item.foodGroup === "pulse"));
});

test("plan fallback applies profile allergies, recalculates nutrition, and stays within budget", async () => {
  const plan = await generateBudgetPlan(
    { _id: "user-test" },
    {
      dailyBudget: 60,
      dietaryPreference: "vegetarian",
      mealsPerDay: 4,
      foodPreferences: ["roti"],
      restrictions: [],
    },
    {
      profileOverride: {
        dietaryPreference: "vegetarian",
        allergies: ["peanuts"],
        restrictions: [],
        preferredRegionalFoods: [],
      },
      foodsOverride: foods,
      geminiRequest: async () => ({
        steps: [{ type: "model_output", content: [{ type: "text", text: "not valid JSON" }] }],
      }),
    },
  );

  assert.equal(plan.generationMode, "rules");
  assert.equal(plan.aiNotice, "");
  assert.equal(plan.meals.length, 4);
  assert.ok(plan.budget.estimatedCost <= plan.budget.dailyBudget);
  assert.ok(plan.budget.remaining >= 0);
  assert.ok(plan.totals.calories > 0);
  assert.ok(plan.totals.protein > 0);
  assert.ok(
    plan.meals.every((meal) => meal.items.every((item) => item.name !== "Peanut chikki")),
  );
  assert.ok(
    plan.meals.some((meal) =>
      meal.alternatives.some((item) => item.name === "Rice"),
    ),
  );
});

test("Gemini API errors fall back to a safe rules-based plan", async () => {
  const plan = await generateBudgetPlan(
    { _id: "user-test" },
    {
      dailyBudget: 60,
      dietaryPreference: "vegetarian",
      mealsPerDay: 3,
      foodPreferences: [],
      restrictions: [],
    },
    {
      profileOverride: { allergies: [], restrictions: [], preferredRegionalFoods: [] },
      foodsOverride: foods,
      geminiRequest: async () => {
        throw new Error("upstream unavailable");
      },
    },
  );

  assert.equal(plan.generationMode, "rules");
  assert.match(plan.aiNotice, /Gemini was unavailable/);
  assert.deepEqual(plan.meals.map((meal) => meal.slot), ["breakfast", "lunch", "dinner"]);
  assert.ok(plan.budget.estimatedCost <= 60);
});

test("meal nutrition totals scale from catalog servings", () => {
  const totals = calculateMealTotals([
    {
      food: { perServing: { calories: 100, protein: 5, carbs: 15, fat: 2 } },
      servings: 0.5,
      cost: 4,
    },
  ]);
  assert.deepEqual(totals, {
    cost: 4,
    calories: 50,
    protein: 2.5,
    carbs: 7.5,
    fat: 1,
  });
});

test("protein upgrades improve protein and keep the revised daily cost within budget", () => {
  const higherProteinDal = food({
    id: "higher-protein-dal",
    name: "Higher-protein dal",
    group: "pulse",
    price: 9,
    protein: 12,
  });
  const suggestions = findProteinSuggestions({
    selections: [
      {
        slot: "lunch",
        items: [{ food: foods.find((item) => item.id === "dal"), servings: 1, cost: 8 }],
      },
    ],
    foods: [...foods, higherProteinDal],
    dailyBudget: 9,
  });

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].replaceFood, "Dal");
  assert.equal(suggestions[0].withFood, "Higher-protein dal");
  assert.equal(suggestions[0].proteinIncrease, 4);
  assert.equal(suggestions[0].revisedDailyCost, 9);
});

test("real seeded foods support every diet and meal-count fallback within minimum budget", () => {
  const seededViews = seedFoods.map((entry, index) => ({
    id: String(index),
    name: entry.name,
    category: entry.category,
    mealTypes: entry.mealTypes,
    foodGroup: entry.foodGroup,
    dietType: entry.dietType,
    allergens: entry.allergens ?? [],
    serving: entry.serving,
    perServing: scaleNutrients(entry.per100g, entry.serving.grams),
    price: { perServing: entry.price, currency: "INR", isEstimate: true },
    verified: entry.verified,
    source: "Seed data",
  }));

  for (const diet of ["vegan", "vegetarian", "eggetarian", "non_vegetarian"]) {
    const compatibleFoods = seededViews.filter((entry) =>
      allowedDietTypes(diet).includes(entry.dietType),
    );
    for (const mealsPerDay of [3, 4]) {
      const selections = buildRuleBasedSelections({
        foods: compatibleFoods,
        dailyBudget: 50,
        mealsPerDay,
        preferences: [],
      });
      const cost = selections
        .flatMap((meal) => meal.items)
        .reduce((sum, item) => sum + item.cost, 0);

      assert.equal(selections.length, mealsPerDay);
      assert.ok(cost <= 50);
      assert.ok(
        selections
          .flatMap((meal) => meal.items)
          .every((item) => allowedDietTypes(diet).includes(item.food.dietType)),
      );
    }
  }
});

test("budget plan auth middleware rejects requests without a session", async () => {
  let authError;
  await protect({ cookies: {} }, {}, (error) => {
    authError = error;
  });

  assert.equal(authError?.statusCode, 401);
  assert.match(authError?.message ?? "", /Not logged in/);
});
