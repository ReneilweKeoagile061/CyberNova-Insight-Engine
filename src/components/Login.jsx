import { useState } from "react";
import { getErrorDetails } from "../services/api";
import { useB2CAuth } from "../auth/msalConfig";

export default function Login({ onLogin, apiStatus }) {
  const [email, setEmail] = useState("sales@africaguard.ai");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const apiOk = !!apiStatus;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(getErrorDetails(err).detail || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleB2CLogin() {
    setLoading(true);
    try {
      onLogin();
    } catch (err) {
      setError(getErrorDetails(err).detail || "Sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <span className="login-logo">⬡</span>
        <h1 className="login-title">AfricaGuard</h1>
        <p className="login-sub">National Cybersecurity Platform — Southern Africa.</p>
        <p className="login-dev">Reneilwe Keoagile · BIDA22-061 · CRISP-DM · CET333</p>

        {!apiOk && (
          <div className="login-api-warn">
            <strong>API Offline</strong><br />
            Start Flask: <code>cd submission_package &amp;&amp; python app.py</code>
          </div>
        )}

        {useB2CAuth ? (
          <>
            <button
              type="button"
              className="btn-signin"
              disabled={loading || !apiOk}
              onClick={handleB2CLogin}
            >
              {loading ? "Redirecting…" : "Sign in with Microsoft (Azure AD B2C)"}
            </button>
            <p className="login-sub" style={{ marginTop: 12, fontSize: ".72rem" }}>
              Enterprise SSO · MFA · Multi-tenant (BTC, FNBB, BOCRA)
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="btn-signin" disabled={loading || !apiOk}>
              {loading ? "Connecting…" : "Sign in"}
            </button>
          </form>
        )}

        {!useB2CAuth && (
          <details className="login-demo">
            <summary>▾ Academic Demo Credentials</summary>
            <dl>
              <dt>Sales:</dt>
              <dd>sales@africaguard.ai / AfricaGuardSales2026</dd>
              <dt>Security:</dt>
              <dd>security@africaguard.ai / AfricaGuardSecurity2026</dd>
            </dl>
          </details>
        )}
      </div>
    </div>
  );
}
