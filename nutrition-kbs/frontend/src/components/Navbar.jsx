import { Link, useNavigate } from "react-router-dom";
import { FaLeaf, FaBars } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="navbar top-navbar px-3">
      <div className="d-flex align-items-center gap-2">
        {onMenuClick && (
          <button
            className="btn d-lg-none"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <FaBars />
          </button>
        )}
        <Link
          to="/"
          className="navbar-brand d-flex align-items-center gap-2 mb-0"
        >
          <FaLeaf color="#2e9e5b" /> NutriGuide India
        </Link>
      </div>
      <div className="d-flex align-items-center gap-2">
        {user ? (
          <>
            <span className="text-muted small d-none d-sm-inline">
              Hi, {user.name}
            </span>
            <Link to="/dashboard" className="btn btn-outline-primary btn-sm">
              Dashboard
            </Link>
            <button className="btn btn-primary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline-primary btn-sm">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
