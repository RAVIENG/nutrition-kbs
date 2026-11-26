import mongoose from "mongoose";
import { NUTRIENT_KEYS } from "../utils/constants.js";

const nutrientSnapshotSchema = new mongoose.Schema(
  Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      { type: Number, min: 0, default: null },
    ]),
  ),
  { _id: false },
);

const entrySchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, maxlength: 80 },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "snack", "dinner"],
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["food_database", "foodtales"],
      required: true,
    },
    sourceId: { type: String, required: true, maxlength: 100 },
    quantity: { type: Number, required: true, min: 0.1, max: 100000 },
    quantityUnit: { type: String, enum: ["g", "serving"], required: true },
    addedAt: { type: Date, default: Date.now },
    foodSnapshot: {
      name: { type: String, required: true, maxlength: 160 },
      region: { type: String, default: null, maxlength: 80 },
      source: { type: String, default: "", maxlength: 300 },
      verified: { type: Boolean, default: false },
      nutritionBasis: { type: String, enum: ["per_100g", "per_serving"] },
      nutrientsPerBasis: { type: nutrientSnapshotSchema, required: true },
    },
    nutrients: { type: nutrientSnapshotSchema, required: true },
  },
  { _id: true },
);

const dailyNutritionLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    entries: { type: [entrySchema], default: [] },
  },
  { timestamps: true },
);

dailyNutritionLogSchema.index({ user: 1, dateKey: 1 }, { unique: true });

export default mongoose.model("DailyNutritionLog", dailyNutritionLogSchema);
