import { useState } from "react";
import { prettify } from "../utils/format";

const DIET_COLOR = {
  vegan: "success",
  vegetarian: "success",
  eggetarian: "warning",
  non_vegetarian: "danger",
};

const DETAIL_ROWS = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbohydrates", "g"],
  ["fat", "Fat", "g"],
  ["fiber", "Fiber", "g"],
  ["iron", "Iron", "mg"],
  ["calcium", "Calcium", "mg"],
  ["vitaminC", "Vitamin C", "mg"],
  ["vitaminB12", "Vitamin B12", "mcg"],
  ["vitaminD", "Vitamin D", "mcg"],
];

export default function FoodCard({ food }) {
  const [open, setOpen] = useState(false);
  const n = food.perServing;

  const tiles = [
    ["Calories", `${n.calories} kcal`],
    ["Protein", `${n.protein} g`],
    ["Carbs", `${n.carbs} g`],
    ["Fat", `${n.fat} g`],
    ["Fiber", `${n.fiber} g`],
    ["Price (est.)", food.price ? `\u20B9${food.price.perServing}` : "--"],
  ];

  return (
    <div className="card-soft hoverable h-100 d-flex flex-column">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <h5 className="fw-semibold mb-0">{food.name}</h5>
        <span
          className={`badge text-bg-${DIET_COLOR[food.dietType]} flex-shrink-0`}
        >
          {prettify(food.dietType)}
        </span>
      </div>
      <div className="text-muted small mb-3">
        {food.serving.description} ({food.serving.grams} g) &middot;{" "}
        {prettify(food.category)}
        {food.region !== "Pan-India" && <> &middot; {food.region}</>}
      </div>

      <div className="row g-2 text-center mb-3">
        {tiles.map(([label, value]) => (
          <div className="col-4" key={label}>
            <div className="bg-light rounded py-2">
              <div className="fw-semibold small">{value}</div>
              <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="small mb-3">
        {food.allergens.length > 0 ? (
          <>
            <span className="text-muted">Contains: </span>
            {food.allergens.map((a) => (
              <span key={a} className="badge text-bg-light border me-1">
                {prettify(a)}
              </span>
            ))}
          </>
        ) : (
          <span className="text-muted">No major allergens listed</span>
        )}
      </div>

      <button
        className="btn btn-sm btn-outline-primary mt-auto"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide details" : "Nutrition details"}
      </button>

      {open && (
        <>
          <table className="table table-sm small mt-3 mb-0">
            <thead>
              <tr>
                <th>Nutrient</th>
                <th className="text-end">Per serving</th>
                <th className="text-end">Per 100 g</th>
              </tr>
            </thead>
            <tbody>
              {DETAIL_ROWS.map(([key, label, unit]) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td className="text-end">
                    {n[key]} {unit}
                  </td>
                  <td className="text-end">
                    {food.per100g[key]} {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="small text-muted mt-2">
            {food.verified
              ? "Verified against its source."
              : "Approximate values, not yet verified."}{" "}
            Source: {food.source}
          </div>
        </>
      )}
    </div>
  );
}
