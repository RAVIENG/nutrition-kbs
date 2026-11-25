import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { prettify } from "../utils/format";

const emptyForm = {
  name: "",
  age: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  dietaryPreference: "",
  healthGoal: "",
  state: "",
  allergies: [],
  restrictionsText: "",
  regionalFoodsText: "",
};

const splitList = (text) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Convert the API profile into form values
const toForm = (name, p) => ({
  ...emptyForm,
  name,
  ...(p && {
    age: p.age ?? "",
    gender: p.gender ?? "",
    heightCm: p.heightCm ?? "",
    weightKg: p.weightKg ?? "",
    activityLevel: p.activityLevel ?? "",
    dietaryPreference: p.dietaryPreference ?? "",
    healthGoal: p.healthGoal ?? "",
    state: p.state ?? "",
    allergies: p.allergies ?? [],
    restrictionsText: (p.restrictions ?? []).join(", "),
    regionalFoodsText: (p.preferredRegionalFoods ?? []).join(", "),
  }),
});

export default function Profile() {
  const { user, refreshUser, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/users/options"), api.get("/users/profile")])
      .then(([optRes, profRes]) => {
        setOptions(optRes.data.options);
        setComplete(profRes.data.profileComplete);
        setForm(toForm(user.name, profRes.data.profile));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const toggleAllergy = (allergen) => {
    const has = form.allergies.includes(allergen);
    setForm({
      ...form,
      allergies: has
        ? form.allergies.filter((a) => a !== allergen)
        : [...form.allergies, allergen],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      allergies: form.allergies,
      restrictions: splitList(form.restrictionsText),
      preferredRegionalFoods: splitList(form.regionalFoodsText),
    };
    ["age", "heightCm", "weightKg"].forEach((f) => {
      if (form[f] !== "") payload[f] = Number(form[f]);
    });
    [
      "gender",
      "activityLevel",
      "dietaryPreference",
      "healthGoal",
      "state",
    ].forEach((f) => {
      if (form[f]) payload[f] = form[f];
    });

    try {
      const res = await api.put("/users/profile", payload);
      setComplete(res.data.profileComplete);
      setSuccess("Profile saved successfully.");
      await refreshUser(); // updates the name shown in the navbar
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    if (
      !window.confirm(
        "This permanently deletes your account and data. Continue?",
      )
    )
      return;
    try {
      await deleteAccount(deletePassword);
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  const select = (name, label, values) => (
    <div className="col-md-6">
      <label className="form-label" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="form-select"
        value={form[name]}
        onChange={handleChange}
      >
        <option value="">Select...</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {prettify(v)}
          </option>
        ))}
      </select>
    </div>
  );

  if (loading) return <Loading text="Loading your profile..." />;
  if (!options)
    return (
      <div className="alert alert-danger">
        {error || "Could not load profile options."}
      </div>
    );

  return (
    <div style={{ maxWidth: 820 }}>
      <h2 className="fw-bold mb-1">My Profile</h2>
      <p className="text-muted">
        This information powers your BMI, calorie estimate and food
        recommendations. The system is for adults (18+) and gives educational
        guidance, not medical advice.
      </p>

      {!complete && (
        <div className="alert alert-warning">
          Please fill in age, gender, height, weight, activity level, dietary
          preference and health goal to unlock calculations and recommendations.
        </div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form className="card-soft mb-4" onSubmit={handleSubmit}>
        <h5 className="fw-semibold mb-3">Personal details</h5>
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label className="form-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              className="form-control"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="age">
              Age (years)
            </label>
            <input
              id="age"
              name="age"
              type="number"
              min="18"
              max="100"
              className="form-control"
              value={form.age}
              onChange={handleChange}
            />
          </div>
          {select("gender", "Gender (for calorie formula)", options.genders)}
          <div className="col-md-3">
            <label className="form-label" htmlFor="heightCm">
              Height (cm)
            </label>
            <input
              id="heightCm"
              name="heightCm"
              type="number"
              min="100"
              max="250"
              step="0.1"
              className="form-control"
              value={form.heightCm}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="weightKg">
              Weight (kg)
            </label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              min="25"
              max="300"
              step="0.1"
              className="form-control"
              value={form.weightKg}
              onChange={handleChange}
            />
          </div>
          {select("activityLevel", "Activity level", options.activityLevels)}
          {select("state", "State / region", options.states)}
        </div>

        <h5 className="fw-semibold mb-3">Food preferences</h5>
        <div className="row g-3 mb-4">
          {select(
            "dietaryPreference",
            "Dietary preference",
            options.dietaryPreferences,
          )}
          {select("healthGoal", "Health goal", options.healthGoals)}
          <div className="col-12">
            <label className="form-label d-block">Food allergies</label>
            <div className="d-flex flex-wrap gap-3">
              {options.allergens.map((a) => (
                <div className="form-check" key={a}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`allergy-${a}`}
                    checked={form.allergies.includes(a)}
                    onChange={() => toggleAllergy(a)}
                  />
                  <label className="form-check-label" htmlFor={`allergy-${a}`}>
                    {prettify(a)}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="restrictionsText">
              Other food restrictions
            </label>
            <input
              id="restrictionsText"
              name="restrictionsText"
              className="form-control"
              placeholder="e.g. onion, garlic"
              value={form.restrictionsText}
              onChange={handleChange}
            />
            <div className="form-text">Separate with commas.</div>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="regionalFoodsText">
              Preferred regional foods
            </label>
            <input
              id="regionalFoodsText"
              name="regionalFoodsText"
              className="form-control"
              placeholder="e.g. mandua roti, jhangora"
              value={form.regionalFoodsText}
              onChange={handleChange}
            />
            <div className="form-text">Separate with commas.</div>
          </div>
        </div>

        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <div className="card-soft border border-danger-subtle">
        <h5 className="fw-semibold text-danger">Delete account</h5>
        <p className="text-muted small">
          This permanently removes your account and nutrition data. Enter your
          password to confirm.
        </p>
        {deleteError && (
          <div className="alert alert-danger py-2">{deleteError}</div>
        )}
        <div className="d-flex gap-2" style={{ maxWidth: 420 }}>
          <input
            type="password"
            className="form-control"
            placeholder="Password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <button
            className="btn btn-outline-danger"
            onClick={handleDelete}
            disabled={!deletePassword}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
