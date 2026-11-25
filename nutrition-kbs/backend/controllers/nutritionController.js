import UserProfile from "../models/UserProfile.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { calculateBMI } from "../services/bmiService.js";
import { calculateCalories } from "../services/calorieService.js";

const BMI_FIELDS = ["heightCm", "weightKg"];
const CALORIE_FIELDS = [
  "age",
  "gender",
  "heightCm",
  "weightKg",
  "activityLevel",
];

// Values typed in the request win; anything missing comes from the saved profile
const resolveInputs = (fields, body, profile) => {
  const inputs = {};
  for (const f of fields) inputs[f] = body[f] ?? profile?.[f];

  const missing = fields.filter(
    (f) => inputs[f] === undefined || inputs[f] === null || inputs[f] === "",
  );
  if (missing.length) {
    throw new ApiError(
      400,
      `Missing: ${missing.join(", ")}. Complete your profile or enter the values.`,
    );
  }
  return inputs;
};

// POST /api/nutrition/bmi
export const getBMI = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({ user: req.user._id }).lean();
  const { heightCm, weightKg } = resolveInputs(BMI_FIELDS, req.body, profile);
  res.json({ success: true, result: calculateBMI(heightCm, weightKg) });
});

// POST /api/nutrition/calories
export const getCalories = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({ user: req.user._id }).lean();
  const inputs = resolveInputs(CALORIE_FIELDS, req.body, profile);
  res.json({ success: true, result: calculateCalories(inputs) });
});

// GET /api/nutrition/summary  (used by the dashboard)
export const getSummary = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({ user: req.user._id }).lean();

  const hasAll = (fields) =>
    profile &&
    fields.every((f) => profile[f] !== undefined && profile[f] !== null);

  const bmi = hasAll(BMI_FIELDS)
    ? calculateBMI(profile.heightCm, profile.weightKg)
    : null;
  const calories = hasAll(CALORIE_FIELDS)
    ? calculateCalories(
        CALORIE_FIELDS.reduce((acc, f) => ({ ...acc, [f]: profile[f] }), {}),
      )
    : null;

  res.json({
    success: true,
    profileComplete: !!(bmi && calories),
    bmi: bmi && {
      value: bmi.bmi,
      category: bmi.category,
      whoCategory: bmi.whoCategory,
    },
    calories: calories && {
      bmr: calories.bmr,
      tdee: calories.tdee,
      estimatedDailyCalories: calories.estimatedDailyCalories,
      activityLevel: calories.activityLevel,
    },
  });
});
