import assert from "node:assert/strict";
import test from "node:test";

import { runRules } from "../services/ruleEngine.js";
import {
  filterRecommendationCandidates,
  getFoodSafetyRejectionReasons,
  normalizeRecommendationFood,
} from "../utils/recommendationSafety.js";

const profile = (overrides = {}) => ({
  dietaryPreference: "vegetarian",
  allergies: [],
  restrictions: [],
  ...overrides,
});

const candidate = (overrides = {}) => ({
  id: "food-1",
  name: "Dal",
  category: "lunch",
  foodGroup: "pulse",
  region: "Pan-India",
  dietType: "vegetarian",
  allergens: [],
  ingredients: [],
  ...overrides,
});

test("vegetarian preferences allow vegetarian and vegan foods but reject egg and meat", () => {
  const user = profile();
  assert.deepEqual(
    getFoodSafetyRejectionReasons(candidate({ dietType: "VEGAN" }), user),
    [],
  );
  assert.deepEqual(
    getFoodSafetyRejectionReasons(candidate({ dietType: "Vegetarian" }), user),
    [],
  );
  assert.deepEqual(
    getFoodSafetyRejectionReasons(
      candidate({ dietType: "eggetarian", foodGroup: "egg" }),
      user,
    ),
    ["diet_mismatch"],
  );
  assert.deepEqual(
    getFoodSafetyRejectionReasons(
      candidate({ dietType: "Non-Vegetarian", foodGroup: "meat_fish" }),
      user,
    ),
    ["diet_mismatch"],
  );
  assert.deepEqual(
    getFoodSafetyRejectionReasons(
      candidate({ dietType: "Non-Vegetarian", foodGroup: "meat_fish" }),
      profile({ dietaryPreference: "non vegetarian" }),
    ),
    [],
  );
});

test("allergy aliases normalize to canonical tags and retain exact allergen blocking", () => {
  const user = profile({ allergies: ["peanuts", "tree_nuts"] });
  assert.deepEqual(
    getFoodSafetyRejectionReasons(candidate({ allergens: ["Peanut"] }), user),
    ["allergen_match"],
  );
  assert.deepEqual(
    getFoodSafetyRejectionReasons(candidate({ allergens: ["Tree Nuts"] }), user),
    ["allergen_match"],
  );
  assert.deepEqual(
    getFoodSafetyRejectionReasons(candidate({ allergens: ["soy"] }), user),
    [],
  );
});

test("restriction matching uses whole food-name/ingredient terms, not metadata substrings", () => {
  const user = profile({ restrictions: ["egg"] });
  const eggplant = candidate({
    name: "Eggplant curry",
    foodGroup: "vegetable",
    allergens: [],
    keywords: ["egg", "regional", "Pan-India"],
  });
  assert.deepEqual(getFoodSafetyRejectionReasons(eggplant, user), []);

  const containsEgg = candidate({
    name: "Spinach curry",
    ingredients: ["spinach", "egg"],
  });
  assert.deepEqual(getFoodSafetyRejectionReasons(containsEgg, user), ["restricted_food_term"]);

  assert.deepEqual(
    getFoodSafetyRejectionReasons(
      candidate({ name: "Baked snack", allergens: ["egg"] }),
      user,
    ),
    ["restricted_food_term"],
    "a canonical allergen tag is explicit ingredient evidence for a matching restriction",
  );

  const ingredientRestricted = candidate({
    name: "Bhindi masala",
    ingredients: ["okra", "onion", "turmeric"],
  });
  assert.deepEqual(
    getFoodSafetyRejectionReasons(
      ingredientRestricted,
      profile({ restrictions: ["onion"] }),
    ),
    ["restricted_food_term"],
  );
});

test("rule-engine restriction rule shares the explicit whole-term index", () => {
  const personalRestrictionRule = {
    key: "personal-restrictions",
    active: true,
    type: "filter",
    priority: 1,
    when: [{ field: "profile.restrictions", op: "notEmpty" }],
    match: [{
      field: "food.restrictionTerms",
      op: "intersects",
      value: { ref: "profile.restrictions" },
    }],
  };
  const normalized = normalizeRecommendationFood(candidate({
    name: "Eggplant curry",
    category: "regional",
    allergens: ["mustard"],
    keywords: ["egg", "regional"],
  }));
  const result = runRules(
    [personalRestrictionRule],
    [normalized],
    { profile: { restrictions: ["egg"] } },
  );
  assert.equal(result.kept.length, 1);
  assert.equal(result.excluded.length, 0);
});

test("local, USDA and FoodTales-shaped foods normalize conservatively", () => {
  const localFood = normalizeRecommendationFood(candidate({
    source: "Approximate typical values",
    dietType: "vegan",
  }));
  assert.equal(localFood.dietType, "vegan");

  const usdaFood = normalizeRecommendationFood(candidate({
    fdcId: 12345,
    source: "USDA FoodData Central",
    dietType: "VEGETARIAN",
    allergens: ["Tree Nuts"],
    ingredients: ["  Chickpeas ", "Onion"],
  }));
  assert.equal(usdaFood.dietType, "vegetarian");
  assert.deepEqual(usdaFood.allergens, ["tree_nuts"]);
  assert.deepEqual(usdaFood.ingredients, ["chickpeas", "onion"]);

  const foodTalesDish = normalizeRecommendationFood({
    sourceType: "foodtales",
    name: "Regional stew",
    nutritionBasis: "per_serving",
    nutrientsPerBasis: { calories: 100 },
  });
  assert.equal(foodTalesDish.dietType, null);
  assert.ok(getFoodSafetyRejectionReasons(foodTalesDish, profile()).includes("diet_mismatch"));
});

test("budget-only removals are not classified or counted as safety rejections", () => {
  const eligible = { food: candidate({ id: "eligible" }), score: 5 };
  const overBudget = { food: candidate({ id: "over-budget" }), score: 4 };
  const unsafe = {
    food: candidate({ id: "unsafe", dietType: "non_vegetarian" }),
    score: 3,
  };

  const result = filterRecommendationCandidates(
    [eligible, overBudget, unsafe],
    profile(),
    new Set(["over-budget"]),
  );

  assert.deepEqual(result.safe, [eligible]);
  assert.equal(result.budgetRejected.length, 1);
  assert.deepEqual(result.safetyRejected.map((item) => item.food.id), ["unsafe"]);
  assert.deepEqual(result.safetyRejected[0].reasons, ["diet_mismatch"]);
});

test("a stale budget score rule produces a budget rejection, never an unsafe-food warning", () => {
  const staleBudgetRule = {
    key: "budget-limit",
    active: true,
    type: "score",
    priority: 1,
    weight: 0,
    when: [{ field: "request.maxPricePerServing", op: "exists" }],
    match: [{
      field: "food.price.perServing",
      op: "gt",
      value: { ref: "request.maxPricePerServing" },
    }],
  };
  const food = normalizeRecommendationFood(candidate({
    id: "over-budget",
    price: { perServing: 25 },
    dietType: "vegan",
  }));
  const run = runRules(
    [staleBudgetRule],
    [food],
    { profile: profile(), request: { maxPricePerServing: 10 }, context: {} },
  );
  assert.equal(run.kept.length, 1, "a stale score rule leaves the priced food in the rule-engine kept set");

  const filtered = filterRecommendationCandidates(
    run.kept,
    profile(),
    new Set(["over-budget"]),
  );
  assert.equal(filtered.safetyRejected.length, 0);
  assert.equal(filtered.budgetRejected.length, 1);
});

test("valid vegetarian recommendations are preserved", () => {
  const validFoods = [
    candidate({ id: "dal", name: "Moong dal", dietType: "vegan", ingredients: ["moong"] }),
    candidate({ id: "eggplant", name: "Eggplant curry", dietType: "vegetarian", foodGroup: "vegetable" }),
  ];
  const result = filterRecommendationCandidates(
    validFoods.map((food) => ({ food, score: 10 })),
    profile({ restrictions: ["egg"] }),
  );

  assert.deepEqual(result.safe.map((item) => item.food.id), ["dal", "eggplant"]);
  assert.deepEqual(result.safetyRejected, []);
});
