import { useState } from "react";
import { getErrorDetails } from "../services/api";

export default function Login({ onLogin, apiStatus }) {
  const [email,    setEmail]    = useState("sales@cybernova.ai");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const apiOk = !!apiStatus;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await onLogin(email, password); }
    catch (err) { setError(getErrorDetails(err).detail || "Login failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <span className="login-logo">⬡</span>
        <h1 className="login-title">CyberNova Insight Engine</h1>
        <p className="login-sub">CET333 Product Development — Southern Africa Analytics.</p>
        <p className="login-dev">Reneilwe Keoagile · BIDA22-061 · CRISP-DM</p>

        {!apiOk && (
          <div className="login-api-warn">
            <strong>Pipeline Offline</strong><br />
            Start Flask: <code>cd submission_package &amp;&amp; python app.py</code>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="username" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••" required autoComplete="current-password" />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-signin" disabled={loading || !apiOk}>
            {loading ? "Connecting…" : "Sign in"}
          </button>
        </form>

        <details className="login-demo">
          <summary>▾ Academic Demo Credentials</summary>
          <dl>
            <dt>Sales:</dt>    <dd>sales@cybernova.ai / CyberNovaSales2026</dd>
            <dt>Security:</dt> <dd>security@cybernova.ai / CyberNovaSecurity2026</dd>
          </dl>
        </details>
      </div>
    </div>
  );
}