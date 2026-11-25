import "dotenv/config";
import mongoose from "mongoose";
import FoodItem from "../models/FoodItem.js";
import FoodPrice from "../models/FoodPrice.js";
import { DEFAULT_PRICE_REGION } from "../utils/constants.js";
import foods from "./data/foods.js";

// Sanity check: do the macronutrients roughly explain the listed calories?
// kcal ~= 4 x protein + 4 x (carbs - fiber) + 9 x fat.
const checkCalories = ({ name, per100g: n }) => {
  const estimate =
    4 * n.protein + 4 * Math.max(n.carbs - n.fiber, 0) + 9 * n.fat;

  const difference = Math.abs(estimate - n.calories) / n.calories;

  return difference > 0.25
    ? `${name}: lists ${n.calories} kcal but its macros suggest about ${Math.round(estimate)} kcal`
    : null;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  console.log(`Connected to ${mongoose.connection.name}. Seeding foods...`);

  const warnings = foods.map(checkCalories).filter(Boolean);

  for (const { price, ...data } of foods) {
    // Upsert food by name
    const food = await FoodItem.findOneAndUpdate(
      { name: data.name },
      { $set: data },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    // Upsert price by food and region
    await FoodPrice.findOneAndUpdate(
      { food: food._id, region: DEFAULT_PRICE_REGION },
      {
        $set: {
          pricePerServing: price,
          isEstimate: true,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  console.log(`Seeded ${foods.length} foods and ${foods.length} prices.`);

  if (warnings.length) {
    console.log("\nCalorie sanity warnings (check these values):");
    warnings.forEach((warning) => console.log(` - ${warning}`));
  } else {
    console.log("Calorie sanity check passed for every food.");
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Seeding failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
