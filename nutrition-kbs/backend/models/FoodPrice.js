import mongoose from "mongoose";
import { DEFAULT_PRICE_REGION } from "../utils/constants.js";

const foodPriceSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodItem",
      required: true,
    },
    pricePerServing: { type: Number, required: true, min: 0 }, // rupees for one serving
    currency: { type: String, default: "INR" },
    region: { type: String, default: DEFAULT_PRICE_REGION },
    isEstimate: { type: Boolean, default: true },
    note: {
      type: String,
      default: "Approximate home-cooking cost per serving; varies by market",
    },
  },
  { timestamps: true },
);

// One price per food per region
foodPriceSchema.index({ food: 1, region: 1 }, { unique: true });

export default mongoose.model("FoodPrice", foodPriceSchema);
