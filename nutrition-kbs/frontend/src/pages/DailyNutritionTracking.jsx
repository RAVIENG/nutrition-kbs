import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../services/api";
import useProfile from "../hooks/useProfile";
import Loading from "../components/Loading";
import { summarizeNutritionHistory } from "../utils/nutritionHistory";

const MEALS = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["snack", "Snacks"],
  ["dinner", "Dinner"],
];
const NUTRIENTS = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbohydrates", "g"],
  ["fat", "Fat", "g"],
  ["fiber", "Fibre", "g"],
  ["iron", "Iron", "mg"],
  ["calcium", "Calcium", "mg"],
  ["vitaminC", "Vitamin C", "mg"],
  ["vitaminB12", "Vitamin B12", "mcg"],
  ["vitaminD", "Vitamin D", "mcg"],
];
const TARGETS = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbohydrates", "g"],
  ["fat", "Fat", "g"],
  ["fiber", "Fibre", "g"],
];

const localDateKey = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const shiftDate = (dateKey, amount) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
};
const requestId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `entry_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
const display = (value, places = 1) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: places }).format(value)
    : "Unavailable";
const coverageNote = (coverage) => {
  if (coverage?.status === "partial") {
    return `Partial: ${coverage.missingEntries} food ${coverage.missingEntries === 1 ? "entry is" : "entries are"} missing this value`;
  }
  if (coverage?.status === "unavailable") return "Unavailable for all logged foods";
  return "";
};
const displayDate = (dateKey) =>
  new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const emptyDay = (date) => ({
  date,
  entries: [],
  meals: Object.fromEntries(MEALS.map(([key]) => [key, { entries: [], totals: {} }])),
  totals: {},
  targets: {},
});

export default function DailyNutritionTracking() {
  const { profile } = useProfile();
  const [date, setDate] = useState(localDateKey());
  const [day, setDay] = useState(null);
  const [loadedDate, setLoadedDate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [period, setPeriod] = useState("week");
  const [history, setHistory] = useState(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [historyError, setHistoryError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sourceTab, setSourceTab] = useState("database");
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [regionalFoods, setRegionalFoods] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodDetailLoading, setFoodDetailLoading] = useState(false);
  const [quantity, setQuantity] = useState("100");
  const [mealType, setMealType] = useState("breakfast");
  const [savingEntry, setSavingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [targetValues, setTargetValues] = useState({});
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetMessage, setTargetMessage] = useState("");
  const [showTargets, setShowTargets] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/tracking/day", { params: { date } })
      .then((response) => {
        if (!active) return;
        setDay(response.data.day);
        setError("");
      })
      .catch((err) => {
        if (active) {
          setDay(emptyDay(date));
          setError(err.response?.data?.message || err.message || "Could not load this day.");
        }
      })
      .finally(() => { if (active) setLoadedDate(date); });
    return () => { active = false; };
  }, [date]);

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      return undefined;
    }
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        if (sourceTab === "database") {
          const response = await api.get("/tracking/foods", { params: { q: query.trim() }, signal: controller.signal });
          if (active) setFoods(response.data.foods);
        } else {
          const response = await api.get("/tracking/foodtales/search", { params: { q: query.trim() }, signal: controller.signal });
          if (active) setRegionalFoods(response.data.results);
        }
      } catch (err) {
        if (active) setSearchError(err.response?.data?.message || err.message || "Food search failed.");
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query, searchOpen, sourceTab]);

  useEffect(() => {
    let active = true;
    api.get("/tracking/history", { params: { date, period } })
      .then((response) => { if (active) { setHistory(response.data.history); setHistoryError(""); } })
      .catch((err) => { if (active) setHistoryError(err.response?.data?.message || err.message); });
    return () => { active = false; };
  }, [date, period, historyRefresh]);

  const openSearch = (meal) => {
    setMealType(meal);
    setSelectedFood(null);
    setQuery("");
    setSearchOpen(true);
    setEditingEntry(null);
  };

  const selectDatabaseFood = (food) => {
    setSelectedFood({ sourceType: "food_database", ...food });
    setQuantity(String(food.serving?.grams ?? 100));
  };

  const selectRegionalFood = async (food) => {
    setSelectedFood({ sourceType: "foodtales", ...food, loading: true });
    setFoodDetailLoading(true);
    try {
      const response = await api.get(`/tracking/foodtales/${encodeURIComponent(food.sku)}`);
      const details = response.data.food;
      setSelectedFood({
        sourceType: "foodtales",
        ...food,
        ...details,
        loading: false,
      });
      setQuantity(details.nutritionBasis === "per_100g" ? "100" : "1");
    } catch (err) {
      setSelectedFood(null);
      setSearchError(err.response?.data?.message || err.message || "Nutrition details are unavailable for this dish.");
    } finally {
      setFoodDetailLoading(false);
    }
  };

  const addSelectedFood = async () => {
    if (!selectedFood || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) return;
    setSavingEntry(true);
    setError("");
    setSuccess("");
    const entry = {
      requestId: requestId(),
      mealType,
      quantity: Number(quantity),
      sourceType: selectedFood.sourceType,
      ...(selectedFood.sourceType === "food_database"
        ? { foodId: selectedFood.id }
        : { foodTalesSku: selectedFood.sourceId || selectedFood.sku }),
    };
    try {
      const response = await api.post("/tracking/entries", { date, entries: [entry] });
      setDay(response.data.day);
      setHistoryRefresh((version) => version + 1);
      setSearchOpen(false);
      setSuccess(`${selectedFood.name} added to ${MEALS.find(([key]) => key === mealType)?.[1]}.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not add this food.");
    } finally {
      setSavingEntry(false);
    }
  };

  const beginEdit = (entry) => {
    setEditingEntry(entry);
    setQuantity(String(entry.quantity));
    setMealType(entry.mealType);
  };

  const saveEdit = async () => {
    if (!editingEntry || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) return;
    setSavingEntry(true);
    setError("");
    try {
      const response = await api.patch(`/tracking/entries/${editingEntry._id}`, {
        date,
        quantity: Number(quantity),
        mealType,
      });
      setDay(response.data.day);
      setHistoryRefresh((version) => version + 1);
      setEditingEntry(null);
      setSuccess(`${editingEntry.foodSnapshot.name} updated.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not update this food.");
    } finally {
      setSavingEntry(false);
    }
  };

  const removeEntry = async (entry) => {
    if (!window.confirm(`Remove ${entry.foodSnapshot.name} from this day's log?`)) return;
    try {
      const response = await api.delete(`/tracking/entries/${entry._id}`, { params: { date } });
      setDay(response.data.day);
      setHistoryRefresh((version) => version + 1);
      setSuccess(`${entry.foodSnapshot.name} removed.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not delete this food.");
    }
  };

  const saveTargets = async (event) => {
    event.preventDefault();
    setSavingTargets(true);
    setTargetMessage("");
    const nutritionTargets = Object.fromEntries(
      Object.entries(targetValues)
        .filter(([, value]) => value !== "")
        .map(([key, value]) => [key, Number(value)]),
    );
    for (const [key] of TARGETS) {
      if (targetValues[key] === undefined && profile?.nutritionTargets?.[key] != null) {
        nutritionTargets[key] = profile.nutritionTargets[key];
      }
    }
    try {
      await api.put("/users/profile", { nutritionTargets });
      const response = await api.get("/tracking/day", { params: { date } });
      setDay(response.data.day);
      setTargetMessage("Daily targets saved.");
    } catch (err) {
      setTargetMessage(err.response?.data?.message || err.message || "Could not save targets.");
    } finally {
      setSavingTargets(false);
    }
  };

  const chartData = useMemo(() => history?.days?.map((item) => ({
    ...item,
    label: new Date(`${item.date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: period === "month" ? undefined : "short" }),
  })) ?? [], [history, period]);
  const historySummary = summarizeNutritionHistory(chartData);

  if (loadedDate !== date) return <Loading text="Loading your nutrition log..." />;
  const currentDay = day ?? emptyDay(date);

  return (
    <div className="daily-tracking">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Daily Nutrition Tracking</h2>
          <p className="text-muted mb-0">Log what you ate. Partial totals include foods with reported nutrition values; missing values are shown as unavailable.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary" type="button" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
          <input className="form-control" type="date" value={date} max={localDateKey()} onChange={(event) => setDate(event.target.value)} aria-label="Nutrition log date" />
          <button className="btn btn-outline-secondary" type="button" onClick={() => setDate(shiftDate(date, 1))} disabled={date >= localDateKey()} aria-label="Next day">›</button>
          <button className="btn btn-outline-primary text-nowrap" type="button" onClick={() => setDate(localDateKey())}>Today</button>
        </div>
      </div>
      <h3 className="h5 fw-semibold mb-3">{displayDate(date)}</h3>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      <section className="card-soft mb-4" aria-label="Daily nutrition summary">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
          <div>
            <h3 className="h5 fw-bold mb-1">Today’s nutrition</h3>
            <div className="small text-muted">Targets are estimates unless you set a custom value.</div>
          </div>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setShowTargets((value) => !value)} aria-expanded={showTargets}>Edit daily targets</button>
        </div>
        <div className="row g-3">
          {TARGETS.map(([key, label, unit]) => {
            const total = currentDay.totals?.[key];
            const coverage = currentDay.coverage?.[key];
            const target = currentDay.targets?.[key]?.value;
            const totalIsComplete = !["partial", "unavailable"].includes(coverage?.status);
            const percent = totalIsComplete && Number.isFinite(total) && Number.isFinite(target) && target > 0 ? Math.min(100, (total / target) * 100) : null;
            const remaining = key === "calories" && totalIsComplete && Number.isFinite(total) && Number.isFinite(target) ? Math.max(0, target - total) : null;
            return <div className="col-6 col-lg" key={key}>
              <div className="nutrition-target-card h-100">
                <div className="small text-muted">{label}</div>
                <div className="fw-bold fs-5">{display(total, key === "calories" ? 0 : 1)} <span className="small fw-normal">{unit}</span></div>
                {coverageNote(coverage) && <div className="small text-warning-emphasis">{coverageNote(coverage)}</div>}
                {Number.isFinite(target) ? <>
                  <div className="small text-muted">Target {display(target, 0)} {unit}{currentDay.targets[key]?.isEstimate ? " · estimate" : ""}</div>
                  {totalIsComplete
                    ? <div className="nutrition-progress mt-2" role="progressbar" aria-label={`${label} target progress`} aria-valuenow={Math.min(100, Math.round(percent ?? 0))} aria-valuemin="0" aria-valuemax="100"><div style={{ width: `${percent ?? 0}%` }} /></div>
                    : <div className="small text-muted mt-2">Progress unavailable while some food values are missing.</div>}
                  {remaining !== null && <div className="small text-muted mt-1">{display(remaining, 0)} kcal remaining</div>}
                </> : <div className="small text-muted">Set a target to track progress</div>}
                {currentDay.targets?.[key]?.source && <div className="small text-muted mt-1">{currentDay.targets[key].source}</div>}
              </div>
            </div>;
          })}
        </div>
        {showTargets && <div id="nutrition-targets" className="mt-3 border-top pt-3">
          <h4 className="h6 fw-semibold">Personalize daily targets</h4>
          <form className="row g-2 mt-1" onSubmit={saveTargets}>
            {TARGETS.map(([key, label, unit]) => <div className="col-6 col-md" key={key}>
              <label className="form-label small" htmlFor={`target-${key}`}>{label} ({unit})</label>
              <input id={`target-${key}`} className="form-control" type="number" min="1" step="1" value={targetValues[key] ?? profile?.nutritionTargets?.[key] ?? ""} onChange={(event) => setTargetValues((current) => ({ ...current, [key]: event.target.value }))} placeholder={currentDay.targets?.[key]?.value ? String(Math.round(currentDay.targets[key].value)) : "Set target"} />
            </div>)}
            <div className="col-12 d-flex align-items-center gap-2 mt-3">
              <button className="btn btn-sm btn-primary" disabled={savingTargets}>{savingTargets ? "Saving..." : "Save targets"}</button>
              {targetMessage && <span className="small" role="status">{targetMessage}</span>}
            </div>
            <div className="col-12 small text-muted">Default estimates use Mifflin–St Jeor for calories, ICMR-NIN adult protein RDA (0.83 g/kg/day), and WHO fibre guidance. Carbohydrate and fat targets are user-set only.</div>
          </form>
        </div>}
      </section>

      <section className="row g-3 mb-4" aria-label="Additional nutrients">
        {NUTRIENTS.slice(5).map(([key, label, unit]) => <div className="col-6 col-md-4 col-xl" key={key}>
          <div className="card-soft py-3 h-100"><div className="small text-muted">{label}</div><div className="fw-semibold">{display(currentDay.totals?.[key])} {unit}</div>{coverageNote(currentDay.coverage?.[key]) && <div className="small text-warning-emphasis">{coverageNote(currentDay.coverage?.[key])}</div>}</div>
        </div>)}
      </section>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h3 className="h4 fw-bold mb-0">Meals</h3>
        <button type="button" className="btn btn-primary" onClick={() => openSearch("breakfast")}>Add food</button>
      </div>
      <div className="row g-3 mb-5">
        {MEALS.map(([key, label]) => {
          const meal = currentDay.meals?.[key] ?? { entries: [], totals: {} };
          return <div className="col-12 col-xl-6" key={key}>
            <section className="card-soft h-100">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div><h4 className="h5 fw-bold mb-1">{label}</h4><div className="small text-muted">{meal.entries.length} item{meal.entries.length === 1 ? "" : "s"}</div></div>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openSearch(key)}>Add food</button>
              </div>
              {meal.entries.length ? <div className="vstack gap-2">
                {meal.entries.map((entry) => <article className="nutrition-entry" key={entry._id}>
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="min-w-0"><div className="fw-semibold text-break">{entry.foodSnapshot.name}</div>
                      <div className="small text-muted">{display(entry.quantity, 2)} {entry.quantityUnit === "g" ? "g" : `${entry.quantityUnit}${entry.quantity === 1 ? "" : "s"}`} · {entry.sourceType === "foodtales" ? "FoodTales" : entry.foodSnapshot.source || "Food Database"}</div>
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0"><button type="button" className="btn btn-sm btn-light" onClick={() => beginEdit(entry)}>Edit</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeEntry(entry)} aria-label={`Remove ${entry.foodSnapshot.name}`}>Delete</button></div>
                  </div>
                  <div className="small text-muted mt-2">{[["calories", "kcal"], ["protein", "g protein"], ["carbs", "g carbs"], ["fat", "g fat"], ["fiber", "g fibre"]].map(([nutrient, labelText]) => `${display(entry.nutrients?.[nutrient])} ${labelText}`).join(" · ")}</div>
                  {entry.foodSnapshot.region && <div className="small text-muted">{entry.foodSnapshot.region}</div>}
                </article>)}
              </div> : <div className="text-center text-muted py-4">No foods logged for {label.toLowerCase()} yet.</div>}
              <div className="border-top pt-2 mt-3 small d-flex flex-wrap gap-3 text-muted">
                <span>{display(meal.totals.calories, 0)} kcal{coverageNote(meal.coverage?.calories) && ` (${coverageNote(meal.coverage.calories)})`}</span><span>{display(meal.totals.protein)} g protein{coverageNote(meal.coverage?.protein) && ` (${coverageNote(meal.coverage.protein)})`}</span><span>{display(meal.totals.carbs)} g carbs{coverageNote(meal.coverage?.carbs) && ` (${coverageNote(meal.coverage.carbs)})`}</span><span>{display(meal.totals.fat)} g fat{coverageNote(meal.coverage?.fat) && ` (${coverageNote(meal.coverage.fat)})`}</span><span>{display(meal.totals.fiber)} g fibre{coverageNote(meal.coverage?.fiber) && ` (${coverageNote(meal.coverage.fiber)})`}</span>
              </div>
            </section>
          </div>;
        })}
      </div>

      <section className="card-soft" aria-label="Nutrition history charts">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
          <div><h3 className="h4 fw-bold mb-1">Nutrition history</h3><p className="text-muted small mb-0">Compare recorded intake by day. Empty days are zero; partial values include only foods with reported nutrition.</p></div>
          <div className="btn-group" role="group" aria-label="History period">
            <button type="button" className={`btn btn-sm ${period === "week" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setPeriod("week")}>Weekly</button>
            <button type="button" className={`btn btn-sm ${period === "month" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setPeriod("month")}>Monthly</button>
          </div>
        </div>
        {historyError && <div className="alert alert-warning">{historyError}</div>}
        <div className="row g-4">
          <div className="col-12 col-xl-6"><h4 className="h6 fw-semibold">Calories</h4><div style={{ width: "100%", height: 290 }}>
            <ResponsiveContainer><BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 12, left: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="totals.calories" name="Calories (kcal)" fill="#34845c" radius={[4, 4, 0, 0]} />{Number.isFinite(currentDay.targets?.calories?.value) && <ReferenceLine y={currentDay.targets.calories.value} stroke="#d97706" strokeDasharray="4 4" label="Target" />}</BarChart></ResponsiveContainer>
          </div></div>
          <div className="col-12 col-xl-6"><h4 className="h6 fw-semibold">Macronutrients</h4><div style={{ width: "100%", height: 290 }}>
            <ResponsiveContainer><LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 12, left: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="totals.protein" name="Protein (g)" stroke="#b45309" connectNulls /><Line type="monotone" dataKey="totals.carbs" name="Carbs (g)" stroke="#2563eb" connectNulls /><Line type="monotone" dataKey="totals.fat" name="Fat (g)" stroke="#9333ea" connectNulls /></LineChart></ResponsiveContainer>
          </div></div>
        </div>
        <div className="small text-muted mt-2">{period === "week" ? "Week" : "Month"} summary: {historySummary.loggedDays} logged days · {historySummary.averageRecordedCalories !== null ? `${historySummary.averageRecordedCalories} kcal average recorded per day with calorie data` : "No calorie data available"}{historySummary.partialCalorieDays > 0 ? ` · ${historySummary.partialCalorieDays} partial day${historySummary.partialCalorieDays === 1 ? "" : "s"}` : ""}{historySummary.unavailableCalorieDays > 0 ? ` · ${historySummary.unavailableCalorieDays} day${historySummary.unavailableCalorieDays === 1 ? "" : "s"} without calorie data` : ""}.</div>
      </section>

      {(searchOpen || editingEntry) && <div className="nutrition-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSearchOpen(false); setEditingEntry(null); } }}>
        <section className="nutrition-modal card-soft" role="dialog" aria-modal="true" aria-labelledby="nutrition-modal-title">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-3"><div><h3 id="nutrition-modal-title" className="h5 fw-bold mb-1">{editingEntry ? "Edit logged food" : "Add food to your log"}</h3><p className="small text-muted mb-0">Only foods you confirm here are added.</p></div><button type="button" className="btn-close" aria-label="Close" onClick={() => { setSearchOpen(false); setEditingEntry(null); }} /></div>
          {editingEntry ? <>
            <div className="fw-semibold mb-2">{editingEntry.foodSnapshot.name}</div>
            <div className="row g-2 mb-3"><div className="col-6"><label htmlFor="edit-quantity" className="form-label">Quantity ({editingEntry.quantityUnit === "g" ? "grams" : "servings"})</label><input id="edit-quantity" type="number" className="form-control" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div className="col-6"><label htmlFor="edit-meal" className="form-label">Meal</label><select id="edit-meal" className="form-select" value={mealType} onChange={(event) => setMealType(event.target.value)}>{MEALS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div></div>
            <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" onClick={() => setEditingEntry(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={saveEdit} disabled={savingEntry}>{savingEntry ? "Saving..." : "Save changes"}</button></div>
          </> : <>
            <div className="btn-group w-100 mb-3" role="group" aria-label="Food source"><button type="button" className={`btn ${sourceTab === "database" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => { setSourceTab("database"); setSelectedFood(null); }}>Food Database</button><button type="button" className={`btn ${sourceTab === "foodtales" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => { setSourceTab("foodtales"); setSelectedFood(null); }}>FoodTales regional foods</button></div>
            <label className="form-label" htmlFor="tracked-food-search">Search foods</label><input id="tracked-food-search" className="form-control" minLength="2" maxLength="80" value={query} onChange={(event) => { setQuery(event.target.value); setFoods([]); setRegionalFoods([]); setSearchError(""); setSelectedFood(null); }} placeholder="Search by food or dish name" autoFocus />
            {searchLoading && <div className="small text-muted mt-2">Searching...</div>}{searchError && <div className="alert alert-warning mt-2 mb-0">{searchError}</div>}
            {!searchLoading && query.trim().length >= 2 && sourceTab === "database" && foods.length === 0 && !searchError && <div className="small text-muted mt-2">No foods found in the local catalogue.</div>}
            {query.trim().length >= 2 && sourceTab === "database" && foods.length > 0 && <div className="nutrition-search-results mt-2">{foods.map((food) => <button type="button" className={`nutrition-search-option ${selectedFood?.id === food.id ? "selected" : ""}`} key={food.id} onClick={() => selectDatabaseFood(food)}><span className="fw-semibold">{food.name}</span><span className="small text-muted">{food.serving?.description} | {food.serving?.grams} g serving{food.region ? ` | ${food.region}` : ""}</span></button>)}</div>}
            {query.trim().length >= 2 && sourceTab === "foodtales" && regionalFoods.length > 0 && <div className="nutrition-search-results mt-2">{regionalFoods.map((food) => <button type="button" className={`nutrition-search-option ${selectedFood?.sku === food.sku ? "selected" : ""}`} key={food.sku} onClick={() => selectRegionalFood(food)}><span className="fw-semibold">{food.name}</span><span className="small text-muted">{food.region || "Regional dish"}{food.course ? ` | ${food.course}` : ""}</span></button>)}</div>}
            {sourceTab === "foodtales" && query.trim().length >= 2 && !searchLoading && regionalFoods.length === 0 && !searchError && <div className="small text-muted mt-2">No regional dishes found.</div>}
            {selectedFood && <div className="border-top mt-3 pt-3">
              <div className="fw-semibold mb-1">{selectedFood.name}</div>
              {foodDetailLoading ? <div className="small text-muted">Loading FoodTales nutrition basis...</div> : <>
                {selectedFood.sourceType === "foodtales" && <div className="small text-muted mb-2">Nutrition from FoodTales · {selectedFood.source?.split("·").slice(1).join("·")}</div>}
                <div className="row g-2"><div className="col-6"><label className="form-label" htmlFor="add-quantity">Quantity ({selectedFood.sourceType === "food_database" || selectedFood.nutritionBasis === "per_100g" ? "grams" : "servings"})</label><input id="add-quantity" type="number" className="form-control" min="0.1" step="0.1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div><div className="col-6"><label className="form-label" htmlFor="add-meal">Meal</label><select id="add-meal" className="form-select" value={mealType} onChange={(event) => setMealType(event.target.value)}>{MEALS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div></div>
                <div className="d-flex justify-content-end gap-2 mt-3"><button type="button" className="btn btn-outline-secondary" onClick={() => setSearchOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={addSelectedFood} disabled={savingEntry || foodDetailLoading}>{savingEntry ? "Adding..." : "Add to meal"}</button></div>
              </>}
            </div>}
          </>}
        </section>
      </div>}
    </div>
  );
}
