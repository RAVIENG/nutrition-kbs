import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaWeight,
  FaFireAlt,
  FaDrumstickBite,
  FaSeedling,
} from "react-icons/fa";
import api from "../services/api";
import StatCard from "../components/StatCard";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { getDashboardNutrientCard, todayDateKeyIndia } from "../utils/dashboardNutrition";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackingDay, setTrackingDay] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(true);
  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    api
      .get("/nutrition/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    let requestVersion = 0;
    const loadToday = () => {
      const currentVersion = ++requestVersion;
      setTrackingLoading(true);
      api
        .get("/tracking/day", { params: { date: todayDateKeyIndia() } })
        .then((res) => {
          if (active && currentVersion === requestVersion) {
            setTrackingDay(res.data.day);
            setTrackingError("");
          }
        })
        .catch((err) => {
          if (active && currentVersion === requestVersion) {
            setTrackingError(err.userMessage || err.message);
          }
        })
        .finally(() => {
          if (active && currentVersion === requestVersion) setTrackingLoading(false);
        });
    };

    loadToday();
    window.addEventListener("nutrition-log-updated", loadToday);
    return () => {
      active = false;
      window.removeEventListener("nutrition-log-updated", loadToday);
    };
  }, []);

  if (loading) return <Loading />;

  const proteinCard = trackingLoading
    ? getDashboardNutrientCard(null, "protein")
    : trackingError
      ? { value: "Unavailable", hint: "Today's food log could not be loaded." }
      : getDashboardNutrientCard(trackingDay, "protein");
  const fiberCard = trackingLoading
    ? getDashboardNutrientCard(null, "fiber")
    : trackingError
      ? { value: "Unavailable", hint: "Today's food log could not be loaded." }
      : getDashboardNutrientCard(trackingDay, "fiber");

  return (
    <div>
      <h2 className="fw-bold mb-1">Hello, {user.name}</h2>
      <p className="text-muted">Your nutrition overview.</p>

      {error && <div className="alert alert-danger">{error}</div>}
      {trackingError && <div className="alert alert-warning" role="status">Today's protein and fibre could not be loaded: {trackingError}</div>}

      {summary && !summary.profileComplete && (
        <div className="alert alert-warning">
          Your profile is incomplete, so BMI and calories can't be calculated
          yet. <Link to="/profile">Complete your profile</Link>.
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6 col-xl-3">
          <StatCard
            icon={<FaWeight />}
            label="BMI"
            value={summary?.bmi ? summary.bmi.value : "--"}
            hint={summary?.bmi ? summary.bmi.category.label : "Needs profile"}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            icon={<FaFireAlt />}
            label="Daily calories (estimate)"
            value={
              summary?.calories
                ? `${summary.calories.estimatedDailyCalories.toLocaleString("en-IN")} kcal`
                : "--"
            }
            hint={summary?.calories ? "Maintenance estimate" : "Needs profile"}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard icon={<FaDrumstickBite />} label="Protein today" value={proteinCard.value} hint={proteinCard.hint} />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard icon={<FaSeedling />} label="Fiber today" value={fiberCard.value} hint={fiberCard.hint} />
        </div>
      </div>
    </div>
  );
}
