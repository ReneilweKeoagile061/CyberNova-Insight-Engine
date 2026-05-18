import { useEffect, useState, useCallback } from "react";
import { checkHealth, getApiBaseUrl, getErrorDetails } from "./services/api";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import RegionalDashboard from "./components/RegionalDashboard";
import CampaignPerformance from "./components/CampaignPerformance";
import PredictionWorkbench from "./components/PredictionWorkbench";
import ThreatIntelligence from "./components/ThreatIntelligence";

// Role-based tab visibility
// Sales: dashboard, regional, campaigns, predictions
// Security: dashboard, threats, predictions
const ALL_TABS = [
  { key: "dashboard",   label: "Main Dashboard",      icon: "◈", roles: ["sales","security"] },
  { key: "regional",    label: "Regional Demand",      icon: "◉", roles: ["sales"] },
  { key: "campaigns",   label: "Campaign Performance", icon: "◇", roles: ["sales"] },
  { key: "threats",     label: "Threat Intelligence",  icon: "◬", roles: ["security"] },
  { key: "predictions", label: "ML Predictions",       icon: "◎", roles: ["sales","security"] },
];

function SimulationSwitch({ isActive, onToggle }) {
  return (
    <div className="sim-toggle-wrap" onClick={onToggle} title="Toggle live data simulation">
      <div className={isActive ? "pulse-red" : "dot-idle"} />
      <span className="sim-label">{isActive ? "Live Streaming" : "Sim Paused"}</span>
      <div className={`sim-switch ${isActive ? "active" : ""}`}>
        <div className="sim-handle" />
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const isSecure = role === "security";
  return (
    <span style={{
      fontSize: ".58rem", padding: "2px 8px", borderRadius: 20, fontWeight: 600,
      background: isSecure ? "rgba(124,58,237,.15)" : "rgba(14,165,233,.15)",
      color: isSecure ? "#a78bfa" : "rgba(255,255,255,.7)",
      border: `1px solid ${isSecure ? "rgba(124,58,237,.3)" : "rgba(14,165,233,.3)"}`,
      textTransform: "uppercase", letterSpacing: ".04em",
    }}>
      {isSecure ? "🔒 Security" : "💼 Sales"}
    </span>
  );
}

function AppInner() {
  const { user, loading, login, logout } = useAuth();
  const [activeTab,  setActiveTab]  = useState(null);
  const [health,     setHealth]     = useState(null);
  const [healthErr,  setHealthErr]  = useState("");
  const [simActive,  setSimActive]  = useState(false);

  // Filter tabs by role
  const role = user?.role || "";
  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(role));

  // Set default tab when user logs in
  useEffect(() => {
    if (user && visibleTabs.length > 0 && !activeTab) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [user]);

  const loadHealth = useCallback(async () => {
    try {
      const r = await checkHealth();
      setHealth(r);
      setHealthErr("");
    } catch (e) {
      setHealth(null);
      setHealthErr(getErrorDetails(e).detail);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    const t = setInterval(loadHealth, 30000);
    return () => clearInterval(t);
  }, [loadHealth]);

  const handleToggleSim = async () => {
    const next = !simActive;
    try {
      await fetch(`${getApiBaseUrl()}/settings/simulation`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
    } catch (_) {}
    setSimActive(next);
  };

  if (loading) return (
    <div className="app-shell app-shell--loading">
      <div className="spinner" />
      <p>Initialising CyberNova pipeline…</p>
    </div>
  );

  if (!user) return <Login onLogin={login} apiStatus={health} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark">CN</div>
          <div>
            <h1 className="brand-title">CyberNova Insight Engine</h1>
            <p className="brand-sub">Southern Africa · RSD / CRISP-DM · CET333</p>
          </div>
        </div>

        <SimulationSwitch isActive={simActive} onToggle={handleToggleSim} />

        <div className="topbar-right">
          <div className={`health-pill ${health ? "health-pill--ok" : "health-pill--error"}`}>
            <span className={`health-dot ${health ? "health-dot--ok" : "health-dot--error"}`} />
            <span>
              {health
                ? `API Online · ${(health.records_count ?? 0).toLocaleString()} records`
                : healthErr || "API Offline"}
            </span>
          </div>
          <div className="user-badge">
            <div className="user-info">
              <span className="user-name">{user.display_name}</span>
              <RoleBadge role={role} />
            </div>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>

      <nav className="tabs">
        {visibleTabs.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`tab ${activeTab === key ? "tab--active" : ""}`}
            onClick={() => setActiveTab(key)}
            type="button"
          >
            <span className="tab-icon">{icon}</span>{label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === "dashboard"   && <Dashboard simulationActive={simActive} userRole={role} />}
        {activeTab === "regional"    && <RegionalDashboard />}
        {activeTab === "campaigns"   && <CampaignPerformance />}
        {activeTab === "threats"     && <ThreatIntelligence />}
        {activeTab === "predictions" && <PredictionWorkbench />}
      </main>

      <footer className="app-footer">
        <span>© 2026 CyberNova Analytics Ltd</span>
        <span className="footer-sep">|</span>
        <span>Reneilwe Keoagile · BIDA22-061</span>
        <span className="footer-sep">|</span>
        <span>CET333 Product Development · CRISP-DM Methodology</span>
        <span className="footer-sep">|</span>
        <span>Botswana Accountancy College</span>
      </footer>
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}