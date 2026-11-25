import mongoose from "mongoose";
import {
  FOOD_CATEGORIES,
  MEAL_TYPES,
  FOOD_GROUPS,
  FOOD_REGIONS,
  DIETARY_PREFERENCES,
  ALLERGENS,
} from "../utils/constants.js";

const nutrientValue = (required = false) => ({
  type: Number,
  min: [0, "Nutrient values cannot be negative"],
  ...(required ? { required: true } : { default: 0 }),
});

// All values are per 100 g of the food as served
const nutrientsSchema = new mongoose.Schema(
  {
    calories: nutrientValue(true),
    protein: nutrientValue(true),
    carbs: nutrientValue(true),
    fat: nutrientValue(true),
    fiber: nutrientValue(true),
    iron: nutrientValue(),
    calcium: nutrientValue(),
    vitaminC: nutrientValue(),
    vitaminB12: nutrientValue(),
    vitaminD: nutrientValue(),
  },
  { _id: false },
);

const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Food name is required"],
      unique: true,
      trim: true,
      maxlength: 80,
    },

    category: {
      type: String,
      enum: FOOD_CATEGORIES,
      required: true,
    },

    mealTypes: {
      type: [{ type: String, enum: MEAL_TYPES }],
      validate: [(v) => v.length > 0, "Choose at least one meal type"],
    },

    foodGroup: {
      type: String,
      enum: FOOD_GROUPS,
      required: true,
    },

    dietType: {
      type: String,
      enum: DIETARY_PREFERENCES,
      required: true,
    },

    allergens: [{ type: String, enum: ALLERGENS }],

    serving: {
      description: { type: String, required: true, trim: true },
      grams: { type: Number, required: true, min: 1, max: 2000 },
    },

    per100g: {
      type: nutrientsSchema,
      required: true,
    },

    region: {
      type: String,
      enum: FOOD_REGIONS,
      default: "Pan-India",
    },

    source: {
      type: String,
      default: "Approximate typical values; verify against IFCT 2017",
    },

    verified: {
      type: Boolean,
      default: false,
    },

    // USDA FoodData Central fields
    fdcId: {
      type: Number,
      min: 1,
      unique: true,
      sparse: true,
    },

    fdcDataType: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

foodItemSchema.index({ category: 1 });
foodItemSchema.index({ dietType: 1 });
foodItemSchema.index({ mealTypes: 1 });

export default mongoose.model("FoodItem", foodItemSchema);
