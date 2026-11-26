import { Routes, Route } from "react-router-dom";

import PublicLayout from "./components/PublicLayout";
import AppLayout from "./components/AppLayout";
import PagePlaceholder from "./components/PagePlaceholder";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import BMICalculator from "./pages/BMICalculator";
import CalorieCalculator from "./pages/CalorieCalculator";

import FoodDatabase from "./pages/FoodDatabase";
import USDAFoodImport from "./pages/USDAFoodImport";

import Recommendations from "./pages/Recommendations";
import NutritionChat from "./pages/NutritionChat";
import BudgetPlanner from "./pages/BudgetPlanner";
import DailyNutritionTracking from "./pages/DailyNutritionTracking";

// Normal application pages
const appRoutes = [
  { path: "kitchen", title: "My Kitchen", phase: "Phase 9" },
  {
    path: "kitchen/suggestions",
    title: "Kitchen Recipe Suggestions",
    phase: "Phase 9",
  },
  {
    path: "seasonal",
    title: "Seasonal Food Recommendations",
    phase: "Phase 11",
  },
  {
    path: "substitution",
    title: "Smart Food Substitution",
    phase: "Phase 12",
  },
  {
    path: "nutrition-awareness",
    title: "Nutrition Awareness Dashboard",
    phase: "Phase 13",
  },
  {
    path: "meal-planner",
    title: "Daily Meal Planner",
    phase: "Phase 14",
  },
  {
    path: "weekly-planner",
    title: "Weekly Meal Planner",
    phase: "Phase 14",
  },
  {
    path: "saved-plans",
    title: "Saved Meal Plans",
    phase: "Phase 14",
  },
  {
    path: "nutrition-analysis",
    title: "Nutrition Analysis",
    phase: "Phase 15",
  },
];

// Admin-only pages
const adminRoutes = [
  {
    path: "admin",
    title: "Admin Dashboard",
    phase: "Phase 16",
  },
  {
    path: "admin/foods",
    title: "Manage Food Database",
    phase: "Phase 16",
  },
  {
    path: "admin/recipes",
    title: "Manage Recipes",
    phase: "Phase 16",
  },
  {
    path: "admin/rules",
    title: "Manage Recommendation Rules",
    phase: "Phase 16",
  },
  {
    path: "admin/seasonal",
    title: "Manage Seasonal Foods",
    phase: "Phase 16",
  },
  {
    path: "admin/prices",
    title: "Manage Food Prices",
    phase: "Phase 16",
  },
];

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/bmi" element={<BMICalculator />} />
          <Route path="/calories" element={<CalorieCalculator />} />

          <Route path="/foods" element={<FoodDatabase />} />

          {/* Phase 8 - Actual Recommendations Page */}
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/chat" element={<NutritionChat />} />
          <Route path="/budget" element={<BudgetPlanner />} />
          <Route path="/nutrition-tracking" element={<DailyNutritionTracking />} />

          {/* Other Application Pages */}
          {appRoutes.map((r) => (
            <Route
              key={r.path}
              path={`/${r.path}`}
              element={<PagePlaceholder title={r.title} phase={r.phase} />}
            />
          ))}

          {/* Admin-only Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/usda-import" element={<USDAFoodImport />} />

            {adminRoutes.map((r) => (
              <Route
                key={r.path}
                path={`/${r.path}`}
                element={<PagePlaceholder title={r.title} phase={r.phase} />}
              />
            ))}
          </Route>
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
