import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  FaLeaf,
  FaHome,
  FaUser,
  FaCalculator,
  FaFireAlt,
  FaDatabase,
  FaLightbulb,
  FaCalendarDay,
  FaCalendarWeek,
  FaCarrot,
  FaRupeeSign,
  FaSun,
  FaExchangeAlt,
  FaHeartbeat,
  FaChartPie,
  FaSave,
  FaUserShield,
} from "react-icons/fa";

const sections = [
  {
    title: "Overview",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: <FaHome /> },
      { to: "/profile", label: "My Profile", icon: <FaUser /> },
    ],
  },
  {
    title: "Calculators",
    links: [
      { to: "/bmi", label: "BMI Calculator", icon: <FaCalculator /> },
      { to: "/calories", label: "Calorie Calculator", icon: <FaFireAlt /> },
    ],
  },
  {
    title: "Food Knowledge",
    links: [
      { to: "/foods", label: "Food Database", icon: <FaDatabase /> },
      {
        to: "/recommendations",
        label: "Recommendations",
        icon: <FaLightbulb />,
      },
    ],
  },
  {
    title: "Planning",
    links: [
      { to: "/meal-planner", label: "Meal Planner", icon: <FaCalendarDay /> },
      {
        to: "/weekly-planner",
        label: "Weekly Planner",
        icon: <FaCalendarWeek />,
      },
      { to: "/saved-plans", label: "Saved Plans", icon: <FaSave /> },
    ],
  },
  {
    title: "Smart Features",
    links: [
      { to: "/kitchen", label: "My Kitchen", icon: <FaCarrot /> },
      { to: "/budget", label: "Budget Planner", icon: <FaRupeeSign /> },
      { to: "/seasonal", label: "Seasonal Foods", icon: <FaSun /> },
      {
        to: "/substitution",
        label: "Food Substitution",
        icon: <FaExchangeAlt />,
      },
      {
        to: "/nutrition-awareness",
        label: "Nutrition Awareness",
        icon: <FaHeartbeat />,
      },
      {
        to: "/nutrition-analysis",
        label: "Nutrition Analysis",
        icon: <FaChartPie />,
      },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();

  return (
    <>
      {open && <div className="sidebar-backdrop d-lg-none" onClick={onClose} />}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand d-flex align-items-center gap-2">
          <FaLeaf /> NutriGuide India
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <div className="nav-section">{section.title}</div>

            {section.links.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={onClose}>
                {link.icon} {link.label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Admin-only navigation */}
        {user?.role === "admin" && (
          <div style={{ marginTop: "25px" }}>
            <div className="nav-section">Admin</div>

            <NavLink to="/admin" onClick={onClose}>
              <FaUserShield /> Admin Dashboard
            </NavLink>

            <NavLink
              to="/admin/usda-import"
              onClick={onClose}
              style={{ marginTop: "8px" }}
            >
              <FaDatabase /> USDA Food Import
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
}
