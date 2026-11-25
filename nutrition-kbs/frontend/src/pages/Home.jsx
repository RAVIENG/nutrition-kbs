import { Link } from "react-router-dom";
import {
  FaWallet,
  FaCarrot,
  FaSun,
  FaExchangeAlt,
  FaHeartbeat,
} from "react-icons/fa";

const features = [
  {
    icon: <FaCarrot />,
    title: "What Is in My Kitchen?",
    text: "Enter the ingredients you have and get Indian recipe suggestions.",
  },
  {
    icon: <FaWallet />,
    title: "Budget Diet Planner",
    text: "Meal plans that fit your daily or weekly food budget.",
  },
  {
    icon: <FaSun />,
    title: "Seasonal Foods",
    text: "Fruits and vegetables suited to the season and your region.",
  },
  {
    icon: <FaExchangeAlt />,
    title: "Smart Substitution",
    text: "Find alternatives when a food is unavailable or too costly.",
  },
  {
    icon: <FaHeartbeat />,
    title: "Nutrition Awareness",
    text: "Spot possible gaps in your food log, with food-source ideas.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero text-center">
        <div className="container">
          <h1 className="fw-bold display-5">
            Personalized nutrition for Indian households
          </h1>
          <p className="lead mt-3 mb-4">
            A knowledge-based system that recommends affordable, seasonal and
            practical foods, and explains why.
          </p>
          <Link
            to="/register"
            className="btn btn-light btn-lg me-2 fw-semibold"
          >
            Get started
          </Link>
          <Link to="/login" className="btn btn-outline-light btn-lg">
            Login
          </Link>
        </div>
      </section>

      <section className="container py-5">
        <h3 className="text-center fw-bold mb-4">What you can do</h3>
        <div className="row g-4">
          {features.map((f) => (
            <div className="col-md-6 col-lg-4" key={f.title}>
              <div className="card-soft hoverable h-100">
                <div className="stat-icon mb-3">{f.icon}</div>
                <h5 className="fw-semibold">{f.title}</h5>
                <p className="text-muted mb-0">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
