import UserProfile from "../models/UserProfile.js";
import FoodItem from "../models/FoodItem.js";
import RecommendationRule from "../models/RecommendationRule.js";
import Recommendation from "../models/Recommendation.js";

import ApiError from "../utils/ApiError.js";
import { allowedDietTypes } from "../utils/diet.js";

import { calculateBMI } from "./bmiService.js";
import { calculateCalories } from "./calorieService.js";
import { attachPrices } from "./foodService.js";
import { runRules } from "./ruleEngine.js";

const REQUIRED_PROFILE_FIELDS = [
  "age",
  "gender",
  "heightCm",
  "weightKg",
  "activityLevel",
  "dietaryPreference",
  "healthGoal",
];

const MAX_PER_GROUP = 3;

const spaced = (text) => String(text ?? "").replace(/_/g, " ");

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const generateRecommendations = async (user, rawRequest = {}) => {
  const trace = [];

  const request = {
    mealType: rawRequest.mealType || undefined,
    proteinRich: Boolean(rawRequest.proteinRich),
    maxPricePerServing:
      rawRequest.maxPricePerServing !== undefined
        ? rawRequest.maxPricePerServing
        : undefined,
    limit: rawRequest.limit || 10,
  };

  // STEP 1: USER PROFILE

  const saved = await UserProfile.findOne({
    user: user._id,
  }).lean();

  const missing = REQUIRED_PROFILE_FIELDS.filter(
    (field) => !saved || saved[field] === undefined || saved[field] === null,
  );

  if (missing.length) {
    throw new ApiError(
      400,
      `Complete your profile first (missing: ${missing.join(", ")})`,
    );
  }

  const profile = {
    ...saved,
    allergies: saved.allergies ?? [],
    restrictions: saved.restrictions ?? [],
    preferredRegionalFoods: saved.preferredRegionalFoods ?? [],
  };

  trace.push({
    title: "Retrieved your profile",
    detail: `${profile.age} years, ${spaced(profile.gender)}, goal: ${spaced(profile.healthGoal)}.`,
  });

  // STEP 2: BMI

  const bmi = calculateBMI(profile.heightCm, profile.weightKg);

  trace.push({
    title: "Analyzed body measurements",
    detail: `BMI ${bmi.bmi} (${bmi.category.label}).`,
  });

  // STEP 3: CALORIES

  const calories = calculateCalories(profile);

  trace.push({
    title: "Estimated daily calories",
    detail: `About ${calories.estimatedDailyCalories} kcal/day.`,
  });

  // STEP 4: DIET

  const allowed = allowedDietTypes(profile.dietaryPreference);

  trace.push({
    title: "Identified dietary preference",
    detail: `${spaced(profile.dietaryPreference)} diet. Allowed food types: ${allowed.join(", ")}.`,
  });

  // STEP 5: ALLERGIES

  trace.push({
    title: "Checked allergies",
    detail: profile.allergies.length
      ? `Avoiding: ${profile.allergies.join(", ")}.`
      : "No allergies listed.",
  });

  // SHARED FACTS

  const context = {
    allowedDietTypes: allowed,

    wantsProtein:
      request.proteinRich || profile.healthGoal === "muscle_development",

    calorieTarget: calories.estimatedDailyCalories,

    seasonalFoodNames: [],
    kitchenItems: [],
    gapNutrients: [],
  };

  const baseFacts = {
    profile,
    request,
    context,
  };

  // STEP 6: RETRIEVE USDA + LOCAL FOODS

  const query = request.mealType ? { mealTypes: request.mealType } : {};

  const foodDocuments = await FoodItem.find(query).lean();

  const views = await attachPrices(foodDocuments);

  const candidates = views.map((food) => ({
    ...food,

    // USDA and locally seeded foods use the same view.
    // Price can be null when no FoodPrice record exists.
    allergens: food.allergens ?? [],

    keywords: [
      food.name,
      food.foodGroup,
      food.category,
      food.region,
      ...(food.allergens ?? []),
    ]
      .filter(Boolean)
      .map((item) => String(item).toLowerCase()),
  }));

  trace.push({
    title: "Retrieved foods",
    detail: `${candidates.length} foods from your food database, including USDA imports.`,
  });

  // STEP 7: LOAD RULES

  const rules = await RecommendationRule.find({
    active: true,
  })
    .sort({ priority: 1 })
    .lean();

  if (!rules.length) {
    throw new ApiError(
      503,
      "No recommendation rules found. Run npm run seed:rules",
    );
  }

  // STEP 8: RUN RULE ENGINE

  const { kept, excluded, applied, notTriggered } = runRules(
    rules,
    candidates,
    baseFacts,
  );

  trace.push({
    title: "Applied recommendation rules",
    detail: `${applied.length} of ${rules.length} active rules were relevant.`,
  });

  trace.push({
    title: "Safety filters",
    detail: `${excluded.length} foods excluded. ${kept.length} foods remaining.`,
  });

  if (notTriggered.length) {
    trace.push({
      title: "Rules not triggered",
      detail: notTriggered.map((r) => r.name).join(", "),
    });
  }

  // STEP 9: INDEPENDENT SAFETY CHECK

  // Never rely only on database rules for allergy and diet safety.

  const safe = kept.filter(({ food }) => {
    const foodAllergens = (food.allergens ?? []).map(normalize);

    const userAllergies = profile.allergies.map(normalize);

    const hasAllergy = userAllergies.some((allergy) =>
      foodAllergens.includes(allergy),
    );

    const compatibleDiet = allowed.includes(food.dietType);

    const restrictionText = [
      food.name,
      food.foodGroup,
      ...(food.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();

    const hasRestriction = profile.restrictions.some((restriction) =>
      restrictionText.includes(normalize(restriction)),
    );

    return !hasAllergy && compatibleDiet && !hasRestriction;
  });

  if (safe.length !== kept.length) {
    trace.push({
      title: "Safety net",
      detail: `Removed ${kept.length - safe.length} additional unsafe foods.`,
    });

    console.warn(
      `[SAFETY NET] ${kept.length - safe.length} unsafe food(s) removed. Check recommendation rules.`,
    );
  }

  // STEP 10: RANK FOODS

  safe.sort(
    (a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name),
  );

  const picked = [];
  const perGroup = {};

  for (const item of safe) {
    const group = item.food.foodGroup || "unknown";

    if ((perGroup[group] ?? 0) >= MAX_PER_GROUP) {
      continue;
    }

    perGroup[group] = (perGroup[group] ?? 0) + 1;

    picked.push(item);

    if (picked.length >= request.limit) {
      break;
    }
  }

  trace.push({
    title: "Ranked results",
    detail: `Selected ${picked.length} foods, with a maximum of ${MAX_PER_GROUP} per food group.`,
  });

  // STEP 11: EXPLANATIONS

  const recommendations = picked.map(({ food, score, fired }) => ({
    food: {
      id: food.id,
      fdcId: food.fdcId,
      fdcDataType: food.fdcDataType,
      name: food.name,
      category: food.category,
      foodGroup: food.foodGroup,
      dietType: food.dietType,
      allergens: food.allergens,
      region: food.region,
      source: food.source,
    },

    serving: food.serving,

    nutrition: food.perServing,

    caloriePercentOfDaily: Math.round(
      (food.perServing.calories / calories.estimatedDailyCalories) * 100,
    ),

    price: food.price,

    score,

    reason: fired.length
      ? fired.map((f) => f.reason).join(" ")
      : "Compatible with your profile. No additional preference rule applied.",

    rulesApplied: fired,

    checks: {
      allergy: {
        label: "Allergy check",
        passed: true,
        note: profile.allergies.length
          ? `Contains none of: ${profile.allergies.join(", ")}`
          : "No allergies listed.",
      },

      diet: {
        label: "Diet check",
        passed: true,
        note: `Compatible with your ${spaced(profile.dietaryPreference)} preference.`,
      },

      restrictions: {
        label: "Restriction check",
        passed: true,
        note: profile.restrictions.length
          ? `No matching restriction: ${profile.restrictions.join(", ")}.`
          : "No restrictions listed.",
      },
    },
  }));

  // STEP 12: WHY FOODS WERE EXCLUDED

  const byRule = {};

  for (const { food, rule } of excluded) {
    if (!byRule[rule.key]) {
      byRule[rule.key] = {
        rule: {
          key: rule.key,
          name: rule.name,
        },
        count: 0,
        examples: [],
      };
    }

    byRule[rule.key].count += 1;

    if (byRule[rule.key].examples.length < 5) {
      byRule[rule.key].examples.push(food.name);
    }
  }

  // STEP 13: SUMMARY

  const summary = {
    bmi: {
      value: bmi.bmi,
      category: bmi.category.label,
    },

    estimatedDailyCalories: calories.estimatedDailyCalories,

    dietaryPreference: profile.dietaryPreference,

    allergies: profile.allergies,
  };

  // STEP 14: SAVE HISTORY

  const record = await Recommendation.create({
    user: user._id,

    request,

    summary: {
      dietaryPreference: profile.dietaryPreference,
      allergies: profile.allergies,
      estimatedDailyCalories: calories.estimatedDailyCalories,
      bmi: bmi.bmi,
    },

    results: picked.map((item) => ({
      food: item.food.id,
      name: item.food.name,
      score: item.score,
      rulesApplied: item.fired.map((f) => f.key),
    })),
  });

  return {
    recommendationId: record._id,

    generatedAt: record.createdAt,

    request,

    summary,

    trace,

    excluded: Object.values(byRule),

    recommendations,

    disclaimer:
      "Educational guidance only, not medical advice. Nutrition values and prices are approximate. USDA nutrient data may not reflect the exact preparation or recipe. Always verify food ingredients and allergen labels.",
  };
};
