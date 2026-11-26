import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import Recommendation from "../models/Recommendation.js";
import DailyNutritionLog from "../models/DailyNutritionLog.js";

import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { clearTokenCookie } from "../utils/generateToken.js";

import {
  GENDERS,
  ACTIVITY_LEVELS,
  DIETARY_PREFERENCES,
  HEALTH_GOALS,
  ALLERGENS,
  INDIAN_STATES,
  FOOD_CATEGORIES,
  MEAL_TYPES,
} from "../utils/constants.js";

// Only these fields can be changed through the profile endpoint
const ALLOWED_FIELDS = [
  "age",
  "gender",
  "heightCm",
  "weightKg",
  "activityLevel",
  "dietaryPreference",
  "allergies",
  "restrictions",
  "healthGoal",
  "preferredRegionalFoods",
  "nutritionTargets",
  "state",
];

// Required fields for BMI, calories and recommendations
const REQUIRED_FOR_COMPLETE = [
  "age",
  "gender",
  "heightCm",
  "weightKg",
  "activityLevel",
  "dietaryPreference",
  "healthGoal",
];

const isComplete = (profile) =>
  !!profile &&
  REQUIRED_FOR_COMPLETE.every(
    (field) =>
      profile[field] !== undefined &&
      profile[field] !== null &&
      profile[field] !== "",
  );

// Trim, lowercase, remove blanks and duplicates
const tidyList = (list) => [
  ...new Set(list.map((item) => item.trim().toLowerCase()).filter(Boolean)),
];

// GET /api/users/options
export const getOptions = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    options: {
      genders: GENDERS,
      activityLevels: ACTIVITY_LEVELS,
      dietaryPreferences: DIETARY_PREFERENCES,
      healthGoals: HEALTH_GOALS,
      allergens: ALLERGENS,
      states: INDIAN_STATES,
      foodCategories: FOOD_CATEGORIES,
      mealTypes: MEAL_TYPES,
    },
  });
});

// GET /api/users/profile
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await UserProfile.findOne({
    user: req.user._id,
  });

  res.json({
    success: true,
    profile,
    profileComplete: isComplete(profile),
  });
});

// PUT /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const update = {};

  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) {
      update[field] = req.body[field];
    }
  }

  if (update.restrictions) {
    update.restrictions = tidyList(update.restrictions);
  }

  if (update.preferredRegionalFoods) {
    update.preferredRegionalFoods = tidyList(update.preferredRegionalFoods);
  }

  if (update.allergies) {
    update.allergies = [...new Set(update.allergies)];
  }

  if (Object.keys(update).length === 0 && !req.body.name) {
    throw new ApiError(400, "No changes provided");
  }

  // The name lives on the User document
  if (req.body.name) {
    req.user.name = req.body.name.trim();
    await req.user.save();
  }

  let profile = await UserProfile.findOne({
    user: req.user._id,
  });

  // Update or create profile only when profile fields are provided
  if (Object.keys(update).length > 0) {
    profile = await UserProfile.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  res.json({
    success: true,
    message: "Profile saved",
    profile,
    profileComplete: isComplete(profile),
  });
});

// DELETE /api/users/account
export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Verify password before deleting account
  if (!(await user.matchPassword(req.body.password))) {
    throw new ApiError(401, "Incorrect password");
  }

  // Delete all user-related data
  await Recommendation.deleteMany({
    user: user._id,
  });

  await UserProfile.deleteOne({
    user: user._id,
  });

  await DailyNutritionLog.deleteMany({ user: user._id });

  // Delete the user account
  await User.deleteOne({
    _id: user._id,
  });

  // Clear authentication cookie
  clearTokenCookie(res);

  res.json({
    success: true,
    message: "Account deleted",
  });
});
