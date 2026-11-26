import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const FOOD_CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
  "regional",
  "street_food",
  "fast_food",
  "non_vegetarian",
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const FOOD_GROUPS = [
  "cereal",
  "pulse",
  "vegetable",
  "fruit",
  "dairy",
  "egg",
  "meat_fish",
  "nuts_seeds",
  "mixed_dish",
];

const DIETARY_PREFERENCES = [
  "vegetarian",
  "vegan",
  "eggetarian",
  "non_vegetarian",
];

const ALLERGENS = [
  "peanuts",
  "tree_nuts",
  "milk",
  "egg",
  "soy",
  "gluten",
  "fish",
  "shellfish",
  "sesame",
  "mustard",
];

const FOOD_REGIONS = [
  "Pan-India",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const initialManualForm = {
  name: "",
  category: "lunch",
  mealTypes: ["lunch", "dinner"],
  foodGroup: "cereal",
  dietType: "vegetarian",
  allergens: [],
  region: "Pan-India",
  servingDescription: "100 g",
  servingGrams: "100",
  calories: "0",
  protein: "0",
  carbs: "0",
  fat: "0",
  fiber: "0",
  iron: "0",
  calcium: "0",
  vitaminC: "0",
  vitaminB12: "0",
  vitaminD: "0",
  price: "",
};

const initialUSDAForm = {
  category: "lunch",
  mealTypes: ["lunch", "dinner"],
  foodGroup: "cereal",
  dietType: "vegan",
  allergens: [],
  region: "Pan-India",
  servingDescription: "100 g",
  servingGrams: "100",
};

const nutrientFields = [
  ["calories", "Calories (kcal)"],
  ["protein", "Protein (g)"],
  ["carbs", "Carbohydrates (g)"],
  ["fat", "Fat (g)"],
  ["fiber", "Fiber (g)"],
  ["iron", "Iron (mg)"],
  ["calcium", "Calcium (mg)"],
  ["vitaminC", "Vitamin C (mg)"],
  ["vitaminB12", "Vitamin B12 (µg)"],
  ["vitaminD", "Vitamin D (µg)"],
];

export default function USDAFoodImport() {
  const formRef = useRef(null);

  const [activeTab, setActiveTab] = useState("usda");

  // USDA states
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [usdaForm, setUsdaForm] = useState(initialUSDAForm);

  // Manual food states
  const [manualForm, setManualForm] = useState(initialManualForm);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  // USDA search
  useEffect(() => {
    const controller = new AbortController();
    const search = async () => {
      if (activeTab !== "usda" || query.trim().length < 2) {
        setResults([]);
        setTotal(0);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get("/foods/usda/search", {
          params: {
            q: query.trim(),
            page,
          },
          signal: controller.signal,
        });

        const data = response.data;

        setResults(data.results || data.foods || data.data?.foods || []);

        setTotal(data.total || data.totalHits || 0);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to search USDA foods.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, activeTab]);

  // Scroll to USDA import form after selecting a food
  useEffect(() => {
    if (selectedFood && activeTab === "usda") {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedFood, activeTab]);

  const updateManual = (field, value) => {
    setManualForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateUSDA = (field, value) => {
    setUsdaForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const toggleArrayValue = (setter, field, value) => {
    setter((previous) => ({
      ...previous,
      [field]: previous[field].includes(value)
        ? previous[field].filter((item) => item !== value)
        : [...previous[field], value],
    }));
  };

  const selectFood = (food) => {
    setSelectedFood(food);
    setUsdaForm(initialUSDAForm);
    setMessage("");
    setError("");
  };

  // USDA import
  const importFood = async (event) => {
    event.preventDefault();

    if (!selectedFood) return;

    if (usdaForm.mealTypes.length === 0) {
      setError("Select at least one meal type.");
      return;
    }

    const grams = Number(usdaForm.servingGrams);

    if (!Number.isFinite(grams) || grams < 1 || grams > 2000) {
      setError("Serving weight must be between 1 and 2000 grams.");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setMessage("");

      const payload = {
        fdcId: selectedFood.fdcId,
        name: selectedFood.name,
        category: usdaForm.category,
        mealTypes: usdaForm.mealTypes,
        foodGroup: usdaForm.foodGroup,
        dietType: usdaForm.dietType,
        allergens: usdaForm.allergens,
        region: usdaForm.region,
        serving: {
          description: usdaForm.servingDescription,
          grams,
        },
      };

      const response = await api.post("/foods/usda/import", payload);

      setMessage(response.data.message || "USDA food imported successfully.");
      setSelectedFood(null);
      setUsdaForm(initialUSDAForm);
    } catch (err) {
      setError(err.response?.data?.message || "USDA food import failed.");
    } finally {
      setImporting(false);
    }
  };

  // Manual food creation
  const addManualFood = async (event) => {
    event.preventDefault();

    if (manualForm.mealTypes.length === 0) {
      setError("Select at least one meal type.");
      return;
    }

    const grams = Number(manualForm.servingGrams);

    if (!Number.isFinite(grams) || grams < 1 || grams > 2000) {
      setError("Serving weight must be between 1 and 2000 grams.");
      return;
    }

    const nutrientValues = {};

    for (const [key] of nutrientFields) {
      const value = Number(manualForm[key]);

      if (!Number.isFinite(value) || value < 0) {
        setError(`Enter a valid non-negative value for ${key}.`);
        return;
      }

      nutrientValues[key] = value;
    }

    try {
      setManualSaving(true);
      setError("");
      setMessage("");

      const payload = {
        name: manualForm.name.trim(),
        category: manualForm.category,
        mealTypes: manualForm.mealTypes,
        foodGroup: manualForm.foodGroup,
        dietType: manualForm.dietType,
        allergens: manualForm.allergens,
        region: manualForm.region,
        serving: {
          description: manualForm.servingDescription,
          grams,
        },
        per100g: nutrientValues,
      };

      if (manualForm.price.trim() !== "") {
        const price = Number(manualForm.price);

        if (!Number.isFinite(price) || price < 0) {
          setError("Enter a valid non-negative price.");
          return;
        }

        payload.price = price;
      }

      const response = await api.post("/foods", payload);

      setMessage(`Food "${response.data.food.name}" added successfully!`);

      setManualForm(initialManualForm);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add food. Please check the details.",
      );
    } finally {
      setManualSaving(false);
    }
  };

  const selectStyle = {
    ...fieldStyle,
  };

  return (
    <div style={pageStyle}>
      <h2>Admin Food Management</h2>

      <p>Import foods from USDA or manually add foods to your database.</p>

      {/* Main tabs */}
      <div style={tabContainerStyle}>
        <button
          type="button"
          onClick={() => {
            setActiveTab("usda");
            setError("");
            setMessage("");
          }}
          style={{
            ...tabStyle,
            ...(activeTab === "usda" ? activeTabStyle : {}),
          }}
        >
          USDA Import
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("manual");
            setSelectedFood(null);
            setError("");
            setMessage("");
          }}
          style={{
            ...tabStyle,
            ...(activeTab === "manual" ? activeTabStyle : {}),
          }}
        >
          + Add Food Manually
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {message && <div style={successStyle}>{message}</div>}

      {/* USDA IMPORT TAB */}
      {activeTab === "usda" && (
        <>
          <h3>Search USDA FoodData Central</h3>

          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              setSelectedFood(null);
            }}
            placeholder="Search rice, apple, milk, chicken..."
            style={fieldStyle}
          />

          {loading && <p>Searching USDA foods...</p>}

          <div style={{ display: "grid", gap: "12px" }}>
            {results.map((food) => (
              <div
                key={food.fdcId}
                style={{
                  ...resultCardStyle,
                  border:
                    selectedFood?.fdcId === food.fdcId
                      ? "2px solid #198754"
                      : "1px solid #ddd",
                }}
              >
                <strong>{food.name}</strong>

                <p>
                  FDC ID: {food.fdcId} | {food.dataType}
                </p>

                {food.per100g ? (
                  <p>
                    Calories: {food.per100g.calories ?? "N/A"} kcal | Protein:{" "}
                    {food.per100g.protein ?? "N/A"} g | Carbs:{" "}
                    {food.per100g.carbs ?? "N/A"} g | Fat:{" "}
                    {food.per100g.fat ?? "N/A"} g
                  </p>
                ) : (
                  <p>Nutrition preview unavailable.</p>
                )}

                <button
                  type="button"
                  onClick={() => selectFood(food)}
                  style={primaryButtonStyle}
                >
                  {selectedFood?.fdcId === food.fdcId
                    ? "Selected"
                    : "Select Food"}
                </button>
              </div>
            ))}
          </div>

          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <p>No USDA foods found.</p>
          )}

          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}

          {selectedFood && (
            <form ref={formRef} onSubmit={importFood} style={formStyle}>
              <h3>Import Selected USDA Food</h3>
              <strong>{selectedFood.name}</strong>
              <p>FDC ID: {selectedFood.fdcId}</p>

              <ClassificationFields
                form={usdaForm}
                update={updateUSDA}
                toggle={(field, value) =>
                  toggleArrayValue(setUsdaForm, field, value)
                }
              />

              <label>Serving Description</label>
              <input
                required
                value={usdaForm.servingDescription}
                onChange={(e) =>
                  updateUSDA("servingDescription", e.target.value)
                }
                style={fieldStyle}
              />

              <label>Serving Weight (grams)</label>
              <input
                required
                type="number"
                min="1"
                max="2000"
                value={usdaForm.servingGrams}
                onChange={(e) => updateUSDA("servingGrams", e.target.value)}
                style={fieldStyle}
              />

              <button
                type="submit"
                disabled={importing}
                style={successButtonStyle}
              >
                {importing ? "Importing..." : "Import Food into Database"}
              </button>
            </form>
          )}
        </>
      )}

      {/* MANUAL FOOD TAB */}
      {activeTab === "manual" && (
        <form onSubmit={addManualFood} style={formStyle}>
          <h3>Add Food Manually</h3>

          <label>Food Name *</label>
          <input
            required
            maxLength="80"
            value={manualForm.name}
            onChange={(e) => updateManual("name", e.target.value)}
            placeholder="Example: Homemade vegetable pulao"
            style={fieldStyle}
          />

          <ClassificationFields
            form={manualForm}
            update={updateManual}
            toggle={(field, value) =>
              toggleArrayValue(setManualForm, field, value)
            }
          />

          <h3>Serving Information</h3>

          <label>Serving Description *</label>
          <input
            required
            value={manualForm.servingDescription}
            onChange={(e) => updateManual("servingDescription", e.target.value)}
            placeholder="Example: 1 medium bowl"
            style={fieldStyle}
          />

          <label>Serving Weight (grams) *</label>
          <input
            required
            type="number"
            min="1"
            max="2000"
            value={manualForm.servingGrams}
            onChange={(e) => updateManual("servingGrams", e.target.value)}
            style={fieldStyle}
          />

          <h3>Nutrition Values per 100 g</h3>

          <p>
            Enter nutrition values per 100 grams, not per serving. Use reliable
            food composition data where possible.
          </p>

          <div style={nutrientGridStyle}>
            {nutrientFields.map(([key, label]) => (
              <div key={key}>
                <label>{label} *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={manualForm[key]}
                  onChange={(e) => updateManual(key, e.target.value)}
                  style={fieldStyle}
                />
              </div>
            ))}
          </div>

          <h3>Optional Price</h3>

          <label>Price per serving (₹)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={manualForm.price}
            onChange={(e) => updateManual("price", e.target.value)}
            placeholder="Leave empty if unknown"
            style={fieldStyle}
          />

          <button
            type="submit"
            disabled={manualSaving}
            style={successButtonStyle}
          >
            {manualSaving ? "Saving Food..." : "+ Add Food to Database"}
          </button>
        </form>
      )}
    </div>
  );
}

// Shared classification fields
function ClassificationFields({ form, update, toggle }) {
  return (
    <>
      <h3>Food Classification</h3>

      <label>Food Category *</label>
      <select
        required
        value={form.category}
        onChange={(e) => update("category", e.target.value)}
        style={fieldStyle}
      >
        {FOOD_CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <label>Meal Types *</label>
      <div style={choiceStyle}>
        {MEAL_TYPES.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={form.mealTypes.includes(item)}
              onChange={() => toggle("mealTypes", item)}
            />{" "}
            {item}
          </label>
        ))}
      </div>

      <label>Food Group *</label>
      <select
        required
        value={form.foodGroup}
        onChange={(e) => update("foodGroup", e.target.value)}
        style={fieldStyle}
      >
        {FOOD_GROUPS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <label>Dietary Type *</label>
      <select
        required
        value={form.dietType}
        onChange={(e) => update("dietType", e.target.value)}
        style={fieldStyle}
      >
        {DIETARY_PREFERENCES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <label>Allergens</label>
      <div style={choiceStyle}>
        {ALLERGENS.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={form.allergens.includes(item)}
              onChange={() => toggle("allergens", item)}
            />{" "}
            {item}
          </label>
        ))}
      </div>

      <label>Region</label>
      <select
        value={form.region}
        onChange={(e) => update("region", e.target.value)}
        style={fieldStyle}
      >
        {FOOD_REGIONS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </>
  );
}

// Styles
const pageStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "20px",
};

const tabContainerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  margin: "25px 0",
};

const tabStyle = {
  padding: "12px 20px",
  border: "1px solid #ccc",
  borderRadius: "7px",
  cursor: "pointer",
  background: "#f5f5f5",
  color: "#222",
};

const activeTabStyle = {
  background: "#0d6efd",
  color: "#fff",
  borderColor: "#0d6efd",
};

const fieldStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  margin: "7px 0 16px",
  border: "1px solid #ccc",
  borderRadius: "5px",
};

const choiceStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  margin: "10px 0 18px",
};

const formStyle = {
  marginTop: "25px",
  padding: "20px",
  border: "1px solid #ddd",
  borderRadius: "9px",
  scrollMarginTop: "25px",
};

const resultCardStyle = {
  padding: "15px",
  borderRadius: "8px",
};

const primaryButtonStyle = {
  padding: "9px 16px",
  background: "#0d6efd",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const successButtonStyle = {
  marginTop: "20px",
  padding: "12px 20px",
  background: "#198754",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const paginationStyle = {
  display: "flex",
  alignItems: "center",
  gap: "15px",
  margin: "20px 0",
};

const nutrientGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "10px",
};

const errorStyle = {
  padding: "12px",
  margin: "12px 0",
  background: "#fde8e8",
  color: "#b42318",
  borderRadius: "6px",
};

const successStyle = {
  padding: "12px",
  margin: "12px 0",
  background: "#e7f6ec",
  color: "#18743a",
  borderRadius: "6px",
};
