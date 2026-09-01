import { useState } from "react";
import { useNavigate, Link } from "react-router";
import api from "../api";

type FieldErrors = { username?: string; email?: string; password?: string };

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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

    // client-side validation
    const nextErrors: FieldErrors = {};
    if (!username.trim()) nextErrors.username = "Username is required.";
    else if (username.trim().length < 3) nextErrors.username = "Username must be at least 3 characters.";
    else if (!/^[a-zA-Z0-9@._+-]+$/.test(username.trim())) nextErrors.username = "Letters, digits and @ . + - _ only.";

    if (!email.trim()) nextErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Enter a valid email address.";

    if (!password) nextErrors.password = "Password is required.";
    else if (password.length < 8) nextErrors.password = "Password must be at least 8 characters.";

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post("register/", { username: username.trim(), email: email.trim(), password });
    } catch (err: any) {
      const data = err.response?.data;
      if (!err.response) {
        setNonFieldError("Network error. Please check your connection and try again.");
      } else if (data) {
        // handle DRF field errors
        const fe: FieldErrors = {};
        let hasField = false;
        if (data.username) { fe.username = Array.isArray(data.username) ? data.username[0] : String(data.username); hasField = true; }
        if (data.email) { fe.email = Array.isArray(data.email) ? data.email[0] : String(data.email); hasField = true; }
        if (data.password) { fe.password = Array.isArray(data.password) ? data.password[0] : String(data.password); hasField = true; }
        if (hasField) {
          // prettify common messages
          if (fe.username?.includes("already exists")) fe.username = "That username is already taken.";
          if (fe.password?.includes("at least 8")) fe.password = "Password must be at least 8 characters.";
          setFieldErrors(fe);
        } else if (data.detail) {
          setNonFieldError(data.detail);
        } else if (data.non_field_errors) {
          setNonFieldError(Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : String(data.non_field_errors));
        } else if (data.detail || typeof data === "string") {
          setNonFieldError(typeof data === "string" ? data : data.detail);
        } else {
          // fallback: show first error found
          const firstKey = Object.keys(data)[0];
          const firstVal = firstKey ? data[firstKey] : null;
          const msg = Array.isArray(firstVal) ? firstVal[0] : typeof firstVal === "string" ? firstVal : "Registration failed. Please check your details.";
          if (firstKey === "username" || firstKey === "email" || firstKey === "password") {
            setFieldErrors({ [firstKey]: String(msg) } as FieldErrors);
          } else {
            setNonFieldError(String(msg));
          }
        }
      } else {
        setNonFieldError("Registration failed. Please check your details.");
      }
      setLoading(false);
      return;
    }

    // auto sign-in
    try {
      const res = await api.post("token/", { username: username.trim(), password });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      navigate("/");
    } catch {
      setNonFieldError("Account created, but we couldn’t sign you in automatically. Please sign in with your new credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-eyebrow">Catalog — Create workspace</div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">
          Start importing in under a minute. <Link to="/login">Already have an account?</Link>
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
              placeholder="Choose a username"
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
            {fieldErrors.username ? (
              <span id="username-error" className="field-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.username}
              </span>
            ) : (
              <span className="small muted">Letters, digits and @ . + - _ only.</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className={`input ${fieldErrors.email ? "input-error" : ""}`}
              placeholder="you@company.com"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                if (nonFieldError) setNonFieldError("");
              }}
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <span id="email-error" className="field-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className={`input ${fieldErrors.password ? "input-error" : ""}`}
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                if (nonFieldError) setNonFieldError("");
              }}
              autoComplete="new-password"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            {fieldErrors.password ? (
              <span id="password-error" className="field-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.password}
              </span>
            ) : (
              <span className="small muted">Must be 8+ characters. Use a strong password.</span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? (
              <>
                <span className="spinner" /> Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>

          <p className="small muted" style={{ textAlign: "center" }}>
            By continuing you agree to our Terms & Privacy.
          </p>
        </form>
      </div>
    </div>
  );
}
