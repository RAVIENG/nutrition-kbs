import ApiError from "../utils/ApiError.js";

const round1 = (n) => Math.round(n * 10) / 10;

// Each category starts at "from" and runs until the next category begins
const WHO_CATEGORIES = [
  { key: "underweight", label: "Underweight", from: 0 },
  { key: "normal", label: "Normal range", from: 18.5 },
  { key: "overweight", label: "Overweight", from: 25 },
  { key: "obese", label: "Obese", from: 30 },
];

const ASIA_PACIFIC_CATEGORIES = [
  { key: "underweight", label: "Underweight", from: 0 },
  { key: "normal", label: "Normal range", from: 18.5 },
  { key: "overweight", label: "Overweight (at risk)", from: 23 },
  { key: "obese", label: "Obese", from: 25 },
];

// The visual indicator is drawn between these values
const SCALE = { min: 15, max: 40 };

// Last category whose "from" is <= bmi
const classify = (table, bmi) => {
  const found = [...table].reverse().find((c) => bmi >= c.from);
  return { key: found.key, label: found.label };
};

// Segments for the frontend indicator, so React needs no BMI rules of its own
const toSegments = (table) =>
  table.map((c, i) => {
    const next = table[i + 1];
    let rangeText;
    if (i === 0) rangeText = `Below ${next.from}`;
    else if (!next) rangeText = `${c.from} and above`;
    else rangeText = `${c.from} to ${(next.from - 0.1).toFixed(1)}`;
    return {
      key: c.key,
      label: c.label,
      rangeText,
      from: Math.max(c.from, SCALE.min),
      to: next ? next.from : SCALE.max,
    };
  });

export const calculateBMI = (heightCm, weightKg) => {
  const h = Number(heightCm);
  const w = Number(weightKg);

  if (!(h >= 100 && h <= 250))
    throw new ApiError(400, "Height must be between 100 and 250 cm");
  if (!(w >= 25 && w <= 300))
    throw new ApiError(400, "Weight must be between 25 and 300 kg");

  const heightM = h / 100;
  const bmi = round1(w / (heightM * heightM)); // BMI = kg / m^2

  // Weight range that corresponds to the Asia-Pacific "normal range" for this height
  const normalFrom = ASIA_PACIFIC_CATEGORIES[1].from;
  const normalTo = ASIA_PACIFIC_CATEGORIES[2].from - 0.1;

  return {
    bmi,
    heightCm: h,
    weightKg: w,
    category: classify(ASIA_PACIFIC_CATEGORIES, bmi), // main (Asia-Pacific) category
    whoCategory: classify(WHO_CATEGORIES, bmi),
    healthyWeightRangeKg: {
      min: round1(normalFrom * heightM * heightM),
      max: round1(normalTo * heightM * heightM),
    },
    scale: SCALE,
    segments: toSegments(ASIA_PACIFIC_CATEGORIES),
    whoSegments: toSegments(WHO_CATEGORIES),
    references: [
      "Main category: Asia-Pacific cut-offs (WHO Expert Consultation, The Lancet, 2004).",
      "Standard WHO adult cut-offs are shown for comparison.",
    ],
    limitations: [
      "BMI is a screening number, not a diagnosis of health or disease.",
      "It does not separate muscle from fat, so muscular people may show a high BMI.",
      "These categories apply to adults aged 18 and above only; children and teenagers use age-based growth charts.",
      "BMI may be less accurate for older adults, pregnancy, and people with very high or very low muscle mass.",
      "Cut-offs vary between populations. Talk to a doctor or dietitian for personal advice.",
    ],
  };
};
