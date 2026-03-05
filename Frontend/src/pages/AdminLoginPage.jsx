import { useState } from "react";
import { adminLogin } from "../services/api";

export function AdminLoginPage({ onNavigate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await adminLogin(username, password);
      localStorage.setItem("adminToken", data.token);
      onNavigate("admin-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page admin-login-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo admin-logo">🛡</span>
          <h1>Admin Portal</h1>
          <p>LeedsAir staff access only</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input
              placeholder="Admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <button type="submit" className="auth-btn admin-auth-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In to Admin"}
          </button>
        </form>

        <div className="auth-footer">
          <button className="link-btn" onClick={() => onNavigate("home")}>
            ← Back to main site
          </button>
        </div>
      </div>
    </div>
  );
}