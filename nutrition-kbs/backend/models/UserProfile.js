import mongoose from "mongoose";
import {
  GENDERS,
  ACTIVITY_LEVELS,
  DIETARY_PREFERENCES,
  HEALTH_GOALS,
  ALLERGENS,
  INDIAN_STATES,
} from "../utils/constants.js";

const userProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // exactly one profile per user
    },
    age: {
      type: Number,
      min: [18, "Age must be at least 18"],
      max: [100, "Age must be 100 or less"],
    },
    gender: { type: String, enum: GENDERS },
    heightCm: {
      type: Number,
      min: [100, "Height must be at least 100 cm"],
      max: [250, "Height must be 250 cm or less"],
    },
    weightKg: {
      type: Number,
      min: [25, "Weight must be at least 25 kg"],
      max: [300, "Weight must be 300 kg or less"],
    },
    activityLevel: { type: String, enum: ACTIVITY_LEVELS },
    dietaryPreference: { type: String, enum: DIETARY_PREFERENCES },
    allergies: [{ type: String, enum: ALLERGENS }],
    restrictions: [
      { type: String, trim: true, lowercase: true, maxlength: 40 },
    ],
    healthGoal: { type: String, enum: HEALTH_GOALS },
    preferredRegionalFoods: [
      { type: String, trim: true, lowercase: true, maxlength: 40 },
    ],
    state: { type: String, enum: INDIAN_STATES },
  },
  { timestamps: true },
);

export default mongoose.model("UserProfile", userProfileSchema);
