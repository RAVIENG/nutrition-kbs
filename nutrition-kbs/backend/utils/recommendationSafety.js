import { allowedDietTypes } from "./diet.js";

const VALID_DIETS = new Set([
  "vegan",
  "vegetarian",
  "eggetarian",
  "non_vegetarian",
]);

const DIET_ALIASES = new Map([
  ["veg", "vegetarian"],
  ["plant based", "vegan"],
  ["non veg", "non_vegetarian"],
  ["nonveg", "non_vegetarian"],
  ["non vegetarian", "non_vegetarian"],
  ["omnivore", "non_vegetarian"],
]);

const ALLERGEN_ALIASES = new Map([
  ["peanut", "peanuts"],
  ["tree nut", "tree_nuts"],
  ["tree nuts", "tree_nuts"],
  ["soya", "soy"],
  ["soybean", "soy"],
  ["soybeans", "soy"],
  ["shell fish", "shellfish"],
  ["dairy", "milk"],
  ["sesame seed", "sesame"],
  ["mustard seed", "mustard"],
]);

export const normalizeFoodTerm = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

export const normalizeDietType = (value) => {
  const normalized = normalizeFoodTerm(value).replace(/\s+/g, "_");
  const alias = DIET_ALIASES.get(normalized.replace(/_/g, " "));
  const candidate = alias ?? normalized;
  return VALID_DIETS.has(candidate) ? candidate : null;
};

export const normalizeAllergen = (value) => {
  const normalized = normalizeFoodTerm(value);
  if (!normalized) return "";
  return ALLERGEN_ALIASES.get(normalized) ?? normalized.replace(/\s+/g, "_");
};

export const normalizeAllergens = (values) =>
  [...new Set((Array.isArray(values) ? values : []).map(normalizeAllergen).filter(Boolean))];

export const normalizeFoodIngredients = (values) => {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string")
        .map(normalizeFoodTerm)
        .filter(Boolean),
    ),
  ];
};

const addNgrams = (set, value) => {
  const words = normalizeFoodTerm(value).split(" ").filter(Boolean);
  for (let start = 0; start < words.length; start += 1) {
    for (let length = 1; length <= Math.min(5, words.length - start); length += 1) {
      set.add(words.slice(start, start + length).join(" "));
    }
  }
};

export const getRestrictionTerms = (food) => {
  const terms = new Set();
  addNgrams(terms, food?.name);
  for (const ingredient of normalizeFoodIngredients(food?.ingredients)) {
    addNgrams(terms, ingredient);
  }
  for (const allergen of normalizeAllergens(food?.allergens)) {
    addNgrams(terms, allergen);
  }
  return [...terms];
};

export const normalizeRecommendationFood = (food) => ({
  ...food,
  dietType: normalizeDietType(food?.dietType),
  allergens: normalizeAllergens(food?.allergens),
  ingredients: normalizeFoodIngredients(food?.ingredients),
  restrictionTerms: getRestrictionTerms(food),
});

export const getFoodSafetyRejectionReasons = (food, profile) => {
  const reasons = [];
  const dietaryPreference = normalizeDietType(profile?.dietaryPreference);
  const allowed = allowedDietTypes(dietaryPreference);
  const foodDiet = normalizeDietType(food?.dietType);

  if (!foodDiet || !allowed.includes(foodDiet)) reasons.push("diet_mismatch");

  const foodAllergens = new Set(normalizeAllergens(food?.allergens));
  const userAllergies = normalizeAllergens(profile?.allergies);
  if (userAllergies.some((allergen) => foodAllergens.has(allergen))) {
    reasons.push("allergen_match");
  }

  const restrictionTerms = new Set(getRestrictionTerms(food));
  const hasRestrictedFoodTerm = (profile?.restrictions ?? [])
    .map(normalizeFoodTerm)
    .filter(Boolean)
    .some((restriction) => restrictionTerms.has(restriction));
  if (hasRestrictedFoodTerm) reasons.push("restricted_food_term");

  return reasons;
};

export const filterRecommendationCandidates = (
  kept,
  profile,
  budgetExcludedIds = new Set(),
) => {
  const safe = [];
  const safetyRejected = [];
  const budgetRejected = [];

  for (const item of kept) {
    const reasons = getFoodSafetyRejectionReasons(item.food, profile);
    if (reasons.length) {
      safetyRejected.push({ food: item.food, reasons });
    } else if (budgetExcludedIds.has(String(item.food.id))) {
      budgetRejected.push(item);
    } else {
      safe.push(item);
    }
  }

  return { safe, safetyRejected, budgetRejected };
};
