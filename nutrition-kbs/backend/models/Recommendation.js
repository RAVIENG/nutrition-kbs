import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    request: {
      mealType: String,
      proteinRich: Boolean,
      maxPricePerServing: Number,
      limit: Number,
    },

    summary: {
      dietaryPreference: String,
      allergies: [String],
      estimatedDailyCalories: Number,
      bmi: Number,
    },

    results: [
      {
        _id: false,
        food: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FoodItem",
        },
        name: String,
        score: Number,
        rulesApplied: [String],
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Recommendation", recommendationSchema);
