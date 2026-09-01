import { Routes, Route, Link, useLocation, useNavigate } from "react-router";
import Login from "./components/login";
import Register from "./components/register";
import PrivateRoute from "./components/private-route";
import Upload from "./components/upload";
import Catalog from "./components/catalog";
import api from "./api";

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuth = !!localStorage.getItem("access");
  const isActive = (p: string) => location.pathname === p;

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      if (refresh) await api.post("logout/", { refresh });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      navigate("/login");
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to={isAuth ? "/" : "/login"} className="brand">
          <div className="brand-mark">◐</div>
          <span>Catalog</span>
          <small>· Excel Import</small>
        </Link>

        <nav className="nav-links">
          {!isAuth ? (
            <>
              <Link to="/login" className={`nav-link ${isActive("/login") ? "active" : ""}`}>
                Sign in
              </Link>
              <Link to="/register" className={`nav-link ${isActive("/register") ? "active" : ""}`}>
                Create account
              </Link>
            </>
          ) : (
            <>
              <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
                Import
              </Link>
              <Link to="/catalog" className={`nav-link ${isActive("/catalog") ? "active" : ""}`}>
                Catalog
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost">
                Sign out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Topbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Upload />
            </PrivateRoute>
          }
        />
        <Route
          path="/catalog"
          element={
            <PrivateRoute>
              <Catalog />
            </PrivateRoute>
          }
        />
      </Routes>
      <footer style={{ borderTop: "1px solid var(--border)", padding: "18px 24px", textAlign: "center", color: "var(--text-faint)", fontSize: 12.5 }}>
        <div style={{ maxWidth: "var(--max)", margin: "0 auto" }}>
          Minimal catalog — Built for clarity. <span style={{ color: "var(--text-soft)" }}>Preview, validate, import.</span>
        </div>
      </footer>
    </div>
  );
}
