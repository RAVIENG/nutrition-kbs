import { useState } from "react";
import { FaCoins, FaFireAlt, FaDrumstickBite, FaCarrot } from "react-icons/fa";
import api from "../services/api";
import useProfile from "../hooks/useProfile";
import Loading from "../components/Loading";
import StatCard from "../components/StatCard";
import { logCatalogFoods } from "../utils/nutritionTracking";

const parseList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const DIETS = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["eggetarian", "Eggetarian"],
  ["non_vegetarian", "Non-vegetarian"],
];

const EMPTY_FORM = {
  dailyBudget: "250",
  dietaryPreference: "",
  mealsPerDay: "4",
  foodPreferences: "",
  restrictions: "",
};

export default function BudgetPlanner() {
  const { profile, loading: profileLoading } = useProfile();
  const [form, setForm] = useState(EMPTY_FORM);
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const generatePlan = async (event) => {
    event.preventDefault();
    setError("");
    setGenerating(true);
    setPlan(null);

    const payload = {
      dailyBudget: Number(form.dailyBudget),
      dietaryPreference:
        form.dietaryPreference || profile?.dietaryPreference || "vegetarian",
      mealsPerDay: Number(form.mealsPerDay),
      foodPreferences: parseList(form.foodPreferences),
      restrictions: parseList(form.restrictions),
    };

    try {
      const response = await api.post("/budget/plan", payload);
      setPlan(response.data.plan);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate a meal plan.",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (profileLoading) return <Loading text="Loading your food preferences..." />;

  return (
    <div className="budget-planner">
      <h2 className="fw-bold mb-1">Budget-Based Diet Assistant</h2>
      <p className="text-muted">
        Build an affordable daily plan from the foods, nutrition values, and
        estimated prices already in the local database.
      </p>

      <form className="card-soft mb-4" onSubmit={generatePlan}>
        <div className="row g-3 align-items-end">
          <div className="col-sm-6 col-lg-3">
            <label className="form-label" htmlFor="dailyBudget">
              Daily food budget (₹)
            </label>
            <input
              id="dailyBudget"
              className="form-control"
              type="number"
              min="50"
              max="5000"
              step="1"
              required
              value={form.dailyBudget}
              onChange={(event) => update("dailyBudget", event.target.value)}
            />
          </div>

          <div className="col-sm-6 col-lg-3">
            <label className="form-label" htmlFor="dietaryPreference">
              Dietary preference
            </label>
            <select
              id="dietaryPreference"
              className="form-select"
              value={
                form.dietaryPreference ||
                profile?.dietaryPreference ||
                "vegetarian"
              }
              onChange={(event) =>
                update("dietaryPreference", event.target.value)
              }
            >
              {DIETS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-sm-6 col-lg-2">
            <label className="form-label" htmlFor="mealsPerDay">
              Meals per day
            </label>
            <select
              id="mealsPerDay"
              className="form-select"
              value={form.mealsPerDay}
              onChange={(event) => update("mealsPerDay", event.target.value)}
            >
              <option value="3">3 meals</option>
              <option value="4">4 meals</option>
            </select>
          </div>

          <div className="col-sm-6 col-lg-4">
            <button className="btn btn-primary w-100" disabled={generating}>
              {generating ? "Building your plan..." : "Generate diet plan"}
            </button>
          </div>

          <div className="col-md-6">
            <label className="form-label" htmlFor="foodPreferences">
              Foods you like <span className="text-muted">(optional)</span>
            </label>
            <input
              id="foodPreferences"
              className="form-control"
              maxLength="400"
              placeholder="e.g. rice, dal, banana"
              value={form.foodPreferences}
              onChange={(event) =>
                update("foodPreferences", event.target.value)
              }
            />
            <div className="form-text">Separate foods with commas.</div>
          </div>

          <div className="col-md-6">
            <label className="form-label" htmlFor="restrictions">
              Additional restrictions <span className="text-muted">(optional)</span>
            </label>
            <input
              id="restrictions"
              className="form-control"
              maxLength="400"
              placeholder="e.g. onion, garlic"
              value={form.restrictions}
              onChange={(event) => update("restrictions", event.target.value)}
            />
            <div className="form-text">
              Your saved profile allergies and restrictions are always applied.
            </div>
          </div>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      {plan && (
        <>
          {plan.aiNotice && (
            <div className="alert alert-warning" role="status">
              {plan.aiNotice}
            </div>
          )}

          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon={<FaCoins />}
                label="Estimated daily cost"
                value={money(plan.budget.estimatedCost)}
                hint={"Budget " + money(plan.budget.dailyBudget)}
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon={<FaCoins />}
                label="Budget remaining"
                value={money(plan.budget.remaining)}
                hint="After planned meals"
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon={<FaFireAlt />}
                label="Calories"
                value={Math.round(plan.totals.calories) + " kcal"}
                hint={
                  plan.estimatedDailyCaloriesFromProfile
                    ? "Profile maintenance estimate: " +
                      plan.estimatedDailyCaloriesFromProfile +
                      " kcal"
                    : "From selected portions"
                }
              />
            </div>
            <div className="col-sm-6 col-xl-3">
              <StatCard
                icon={<FaDrumstickBite />}
                label="Protein"
                value={plan.totals.protein + " g"}
                hint={plan.totals.carbs + " g carbs · " + plan.totals.fat + " g fat"}
              />
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h3 className="fw-bold mb-0">
              Your {plan.mealsPerDay}-meal plan
            </h3>
            <span className="badge text-bg-light border">
              {plan.generationMode === "gemini"
                ? "Gemini selected the plan"
                : plan.generationMode === "gemini_adjusted"
                  ? "Gemini plan adjusted to fit rules"
                : "Rules-based plan"}
            </span>
          </div>

          <div className="row g-3">
            {plan.meals.map((meal) => (
              <div className="col-12 col-xl-6" key={meal.slot}>
                <MealCard meal={meal} />
              </div>
            ))}
          </div>

          <section className="card-soft mt-4" aria-labelledby="protein-suggestions-title">
            <h4 id="protein-suggestions-title" className="fw-semibold mb-2">
              Protein upgrades within your budget
            </h4>
            {plan.proteinSuggestions.length ? (
              <ul className="mb-0">
                {plan.proteinSuggestions.map((suggestion) => (
                  <li
                    className="mb-2"
                    key={`${suggestion.slot}-${suggestion.withFood}`}
                  >
                    {suggestion.mealLabel}: replace {suggestion.replaceFood} with{" "}
                    {" "}{suggestion.withFood} ({suggestion.quantityGrams} g) for about{" "}
                    {suggestion.proteinIncrease} g more protein. The daily total would be{" "}
                    {suggestion.costChange >= 0 ? "about " : "about "}
                    {suggestion.costChange >= 0
                      ? money(suggestion.costChange) + " more"
                      : money(Math.abs(suggestion.costChange)) + " less"}
                    , or {money(suggestion.revisedDailyCost)} overall.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mb-0">
                No higher-protein same-category swap fits the remaining budget
                for this plan.
              </p>
            )}
          </section>

          <div className="card-soft mt-4">
            <h4 className="fw-semibold mb-3">
              <FaCarrot className="text-success me-2" />
              Budget breakdown
            </h4>
            <div className="budget-meter mb-2" aria-label="Budget usage">
              <div
                className="budget-meter-fill"
                style={{
                  width:
                    Math.min(
                      100,
                      (plan.budget.estimatedCost / plan.budget.dailyBudget) * 100,
                    ) + "%",
                }}
              />
            </div>
            <div className="d-flex justify-content-between small">
              <span>Estimated cost {money(plan.budget.estimatedCost)}</span>
              <span>Daily cap {money(plan.budget.dailyBudget)}</span>
            </div>
            <div className="small text-muted mt-3">
              {plan.meals.map((meal) => (
                <div
                  className="d-flex justify-content-between"
                  key={meal.slot}
                >
                  <span>{meal.label}</span>
                  <span>{money(meal.totals.estimatedCost)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="alert alert-light border small mt-3">
            <strong>Data notes:</strong> Costs are estimates from the local food
            price records and can vary by region and market. Nutrition totals
            are recalculated from stored food data and selected portions; actual
            recipes and preparation can change them. This plan is educational,
            not a medical diet prescription.
            {plan.limitations.map((item) => (
              <div className="text-muted mt-1" key={item}>
                {item}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MealCard({ meal }) {
  const [logging, setLogging] = useState(false);
  const [logStatus, setLogStatus] = useState("");
  const addMealToLog = async () => {
    setLogging(true);
    setLogStatus("");
    try {
      await logCatalogFoods(meal.items.map((item) => ({
        foodId: item.id,
        mealType: meal.slot,
        quantity: item.quantityGrams,
      })));
      setLogStatus("Meal added to today’s nutrition log.");
    } catch (error) {
      setLogStatus(error.response?.data?.message || "Could not add this meal to your log.");
    } finally {
      setLogging(false);
    }
  };

  return (
    <article className="card-soft h-100">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h4 className="fw-bold mb-1">{meal.label}</h4>
          <p className="small text-muted mb-0">{meal.explanation}</p>
        </div>
        <span className="badge text-bg-success">
          {money(meal.totals.estimatedCost)}
        </span>
      </div>

      <div className="budget-meal-items">
        {meal.items.map((item) => (
          <div className="budget-food-item border-top py-3" key={item.id}>
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="fw-semibold">{item.name}</div>
                <div className="small text-muted">
                  {item.servings} serving × {item.servingDescription} ·{" "}
                  {item.quantityGrams} g
                </div>
              </div>
              <span className="small text-nowrap">
                {money(item.estimatedCost)}
              </span>
            </div>
            <NutritionLine nutrition={item.nutrition} />
            {!item.verified && (
              <div className="small text-muted">
                Approximate nutrition values · {item.source}
              </div>
            )}
            {meal.alternatives
              .filter((alternative) => alternative.forFoodId === item.id)
              .map((alternative) => (
                <div
                  className="budget-alternative small mt-2"
                  key={alternative.id}
                >
                  <strong>Lower-cost alternative:</strong> {alternative.name} (
                  {money(alternative.estimatedCost)}, saves{" "}
                  {money(alternative.estimatedSavings)})
                  <div className="text-muted">
                    At the same serving size · values from local food record
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="border-top pt-3 mt-1">
        <div className="d-flex justify-content-between small fw-semibold mb-1">
          <span>Meal nutrition</span>
          <span>{Math.round(meal.totals.calories)} kcal</span>
        </div>
        <NutritionLine nutrition={meal.totals} />
      </div>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addMealToLog} disabled={logging}>
          {logging ? "Adding meal..." : "I ate this meal · Add to log"}
        </button>
        {logStatus && <span className="small text-muted" role="status">{logStatus}</span>}
      </div>
    </article>
  );
}

function NutritionLine({ nutrition }) {
  return (
    <div className="d-flex flex-wrap gap-3 small text-muted my-2">
      <span>{nutrition.protein} g protein</span>
      <span>{nutrition.carbs} g carbs</span>
      <span>{nutrition.fat} g fat</span>
      {nutrition.calories !== undefined && (
        <span>{Math.round(nutrition.calories)} kcal</span>
      )}
    </div>
  );
}
