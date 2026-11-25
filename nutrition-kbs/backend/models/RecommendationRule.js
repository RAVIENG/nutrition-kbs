import mongoose from "mongoose";
import { RULE_TYPES, RULE_OPERATORS } from "../utils/constants.js";

const conditionSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
    },
    op: {
      type: String,
      enum: RULE_OPERATORS,
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false },
);

const ruleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-]+$/,
        "Key may contain only lowercase letters, numbers and hyphens",
      ],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    ifThen: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: RULE_TYPES,
      required: true,
    },

    priority: {
      type: Number,
      default: 100,
    },

    weight: {
      type: Number,
      default: 0,
      min: -100,
      max: 100,
    },

    active: {
      type: Boolean,
      default: true,
    },

    locked: {
      type: Boolean,
      default: false,
    },

    when: {
      type: [conditionSchema],
      default: [],
    },

    match: {
      type: [conditionSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "A rule needs at least one match condition",
      },
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("RecommendationRule", ruleSchema);
