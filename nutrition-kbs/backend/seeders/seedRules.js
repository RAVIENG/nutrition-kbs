import "dotenv/config";
import mongoose from "mongoose";
import RecommendationRule from "../models/RecommendationRule.js";
import rules from "./data/rules.js";

const reset = process.argv.includes("--reset");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  let created = 0;

  for (const rule of rules) {
    const result = await RecommendationRule.updateOne(
      { key: rule.key },

      reset || rule.locked ? { $set: rule } : { $setOnInsert: rule },

      {
        upsert: true,
        runValidators: true,
      },
    );

    if (result.upsertedCount) {
      created += 1;
    }
  }

  console.log(
    reset
      ? `Reset ${rules.length} default rules to their original values.`
      : `Seeded ${created} new rules and synchronized locked safety rules; unlocked existing rules were left unchanged.`,
  );

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Seeding rules failed:", err);

  await mongoose.disconnect();
  process.exit(1);
});
