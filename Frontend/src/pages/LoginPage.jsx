import { useState } from "react";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function LoginPage({ onNavigate }) {
  const { loginUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      loginUser(data.token, data.user);
      onNavigate("home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">✈</span>
          <h1>Welcome back</h1>
          <p>Sign in to your LeedsAir account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <button className="link-btn" onClick={() => onNavigate("register")}>
              Create one
            </button>
          </p>
          <p>
            <button className="link-btn" onClick={() => onNavigate("home")}>
              Continue as guest
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}