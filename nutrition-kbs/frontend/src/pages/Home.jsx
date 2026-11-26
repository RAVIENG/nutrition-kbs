import { Link } from "react-router-dom";
import {
  FaWallet,
  FaLightbulb,
  FaDatabase,
  FaChartBar,
  FaComments,
} from "react-icons/fa";

const features = [
  {
    to: "/recommendations",
    icon: <FaLightbulb />,
    title: "Personalized Food Recommendations",
    text: "Get food suggestions based on your health goals, dietary preferences and regional food choices.",
  },
  {
    to: "/foods",
    icon: <FaDatabase />,
    title: "Food Nutrition Explorer",
    text: "Explore foods and their nutritional values using our food database.",
  },
  {
    to: "/nutrition-tracking",
    icon: <FaChartBar />,
    title: "Daily Nutrition Tracker",
    text: "Track daily calories, protein, carbohydrates, fats and other nutrients.",
  },
  {
    to: "/chat",
    icon: <FaComments />,
    title: "AI Nutrition Assistant",
    text: "Get personalized nutrition guidance and answers to food-related questions.",
  },
  {
    to: "/budget",
    icon: <FaWallet />,
    title: "Budget Diet Planner",
    text: "Generate meal plans according to your daily or weekly food budget.",
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
              <Link to={f.to} className="card-soft hoverable h-100 d-block text-decoration-none text-reset">
                <div className="stat-icon mb-3">{f.icon}</div>
                <h5 className="fw-semibold">{f.title}</h5>
                <p className="text-muted mb-0">{f.text}</p>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
