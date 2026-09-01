import { useState } from "react";
import { useNavigate, Link } from "react-router";
import api from "../api";

type FieldErrors = { username?: string; password?: string };

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [nonFieldError, setNonFieldError] = useState("");
  const navigate = useNavigate();

  const clearErrors = () => {
    setFieldErrors({});
    setNonFieldError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // client-side required check (premium: inline, not browser tooltip)
    const nextErrors: FieldErrors = {};
    if (!username.trim()) nextErrors.username = "Username is required.";
    if (!password) nextErrors.password = "Password is required.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("token/", { username: username.trim(), password });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      navigate("/");
    } catch (err: any) {
      const data = err.response?.data;
      const status = err.response?.status;

      if (!err.response) {
        setNonFieldError("Network error. Please check your connection and try again.");
      } else if (status === 401) {
        // simplejwt returns {"detail":"No active account found with the given credentials"}
        const detail = data?.detail || "";
        if (detail.toLowerCase().includes("no active account")) {
          setNonFieldError("Invalid username or password.");
        } else if (detail) {
          setNonFieldError(detail);
        } else {
          setNonFieldError("Invalid username or password.");
        }
      } else if (data) {
        if (data.detail) setNonFieldError(data.detail);
        else if (data.non_field_errors) setNonFieldError(data.non_field_errors[0]);
        else {
          const fe: FieldErrors = {};
          if (data.username) fe.username = Array.isArray(data.username) ? data.username[0] : data.username;
          if (data.password) fe.password = Array.isArray(data.password) ? data.password[0] : data.password;
          // DRF sometimes nests under "detail" already handled, fallback to generic
          if (Object.keys(fe).length) setFieldErrors(fe);
          else setNonFieldError(typeof data === "string" ? data : "Unable to sign in. Please try again.");
        }
      } else {
        setNonFieldError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-eyebrow">Catalog — Secure access</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">
          Sign in to preview and import your catalog.{" "}
          <Link to="/register">Need an account?</Link>
        </p>

        {nonFieldError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{nonFieldError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack" noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className={`input ${fieldErrors.username ? "input-error" : ""}`}
              placeholder="e.g. alexandra"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }));
                if (nonFieldError) setNonFieldError("");
              }}
              autoComplete="username"
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
            />
            {fieldErrors.username && (
              <span id="username-error" className="field-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.username}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className={`input ${fieldErrors.password ? "input-error" : ""}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                if (nonFieldError) setNonFieldError("");
              }}
              autoComplete="current-password"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            {fieldErrors.password && (
              <span id="password-error" className="field-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? (
              <>
                <span className="spinner" /> Signing in…
              </>
            ) : (
              "Continue"
            )}
          </button>

          <p className="small muted" style={{ textAlign: "center", marginTop: 4 }}>
            Protected by JWT • Sessions expire after 30 minutes
          </p>
        </form>
      </div>
    </div>
  );
}
