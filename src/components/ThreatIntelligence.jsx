// ═══════════════════════════════════════════════════════════════════════════════
// ThreatIntelligence.jsx — COMPACT VERSION (Top 10 IPs, clear signals)
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { getThreatIntel, explainThreat } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatNumber, formatPercent } from "../utils/TrendUtils";

const TT = { backgroundColor:"#fff", border:"1px solid #e2e8f0", borderRadius:8, fontSize:12, color:"#0f172a", boxShadow:"0 4px 12px rgba(15,37,64,.1)" };
const PIE_COLORS = ["#dc2626","#f59e0b","#0ea5e9"];

// ✨ NEW: Severity Badge Component
function SeverityBadge({ level }) {
  const config = {
    Critical: { bg: "#fef2f2", border: "#dc2626", color: "#dc2626", icon: "🚨" },
    High: { bg: "#fff7ed", border: "#f59e0b", color: "#ea580c", icon: "⚠️" },
    Medium: { bg: "#eff6ff", border: "#0ea5e9", color: "#0284c7", icon: "ℹ️" }
  };
  
  const c = config[level] || config.Medium;
  
  return (
    <span style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.color,
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: ".65rem",
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }}>
      {c.icon} {level.toUpperCase()}
    </span>
  );
}

export default function ThreatIntelligence() {
  const { user } = useAuth();
  const userRole = user?.role || "security";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("abuse_score");
  const [sortOrder, setSortOrder] = useState("desc");
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explainedIp, setExplainedIp] = useState(null);

  const handleExplain = async (threat) => {
    setExplaining(true);
    setExplanation(null);
    try {
      const audience = userRole === "security" ? "technical" : "executive";
      const res = await explainThreat(threat, audience);
      setExplanation(res.explanation);
      setExplainedIp(threat.ip_address);
    } catch (e) {
      setExplanation("Could not generate explanation. Check API and ANTHROPIC_API_KEY.");
    } finally {
      setExplaining(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // ✨ IMPROVED: Limit to top 10 instead of 50
        const r = await getThreatIntel(10); 
        setData(r);
      } catch (e) {
        console.error("Threat intel fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="state-loading"><div className="spinner" /><span>Loading threat intelligence…</span></div>;
  if (!data) return <div className="state-empty">No threat data available</div>;

  const threats = data.threats || [];
  
  // ✨ NEW: Calculate severity breakdown
  const severityCounts = {
    Critical: threats.filter(t => t.abuse_score >= 75).length,
    High: threats.filter(t => t.abuse_score >= 50 && t.abuse_score < 75).length,
    Medium: threats.filter(t => t.abuse_score < 50).length
  };
  
  const severityChartData = [
    { name: "Critical", value: severityCounts.Critical },
    { name: "High", value: severityCounts.High },
    { name: "Medium", value: severityCounts.Medium }
  ];

  const actionData = data.by_action?.map(x => ({
    name: x.action === "monitor" ? "Monitor" : "Block",
    count: x.count,
    pct: x.percentage
  })) || [];

  const sorted = [...threats].sort((a,b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    return sortOrder === "asc" ? valA - valB : valB - valA;
  });

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  return (
    <div>
      {/* ✨ NEW: Threat Severity Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 10, 
        marginBottom: 12 
      }}>
        <div style={{ 
          background: "#fef2f2", 
          border: "1px solid #fecaca", 
          borderRadius: 8, 
          padding: "10px 14px",
          borderLeft: "3px solid #dc2626"
        }}>
          <div style={{ fontSize: ".68rem", color: "#991b1b", fontWeight: 600, marginBottom: 4 }}>
            🚨 Critical Threats
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626" }}>
            {severityCounts.Critical}
          </div>
          <div style={{ fontSize: ".62rem", color: "#7f1d1d", marginTop: 2 }}>
            Abuse score ≥75 · Immediate action required
          </div>
        </div>
        
        <div style={{ 
          background: "#fff7ed", 
          border: "1px solid #fed7aa", 
          borderRadius: 8, 
          padding: "10px 14px",
          borderLeft: "3px solid #f59e0b"
        }}>
          <div style={{ fontSize: ".68rem", color: "#92400e", fontWeight: 600, marginBottom: 4 }}>
            ⚠️ High Priority
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ea580c" }}>
            {severityCounts.High}
          </div>
          <div style={{ fontSize: ".62rem", color: "#78350f", marginTop: 2 }}>
            Abuse score 50-74 · Monitor closely
          </div>
        </div>
        
        <div style={{ 
          background: "#eff6ff", 
          border: "1px solid #bfdbfe", 
          borderRadius: 8, 
          padding: "10px 14px",
          borderLeft: "3px solid #0ea5e9"
        }}>
          <div style={{ fontSize: ".68rem", color: "#075985", fontWeight: 600, marginBottom: 4 }}>
            ℹ️ Medium Risk
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7" }}>
            {severityCounts.Medium}
          </div>
          <div style={{ fontSize: ".62rem", color: "#0c4a6e", marginTop: 2 }}>
            Abuse score &lt;50 · Routine monitoring
          </div>
        </div>
      </div>

      {/* ✨ IMPROVED: Smaller Charts Section */}
      <div className="chart-grid chart-grid--2" style={{ marginBottom: 12 }}>
        <div className="chart-card">
          <div className="chart-title">Threat Severity Distribution</div>
          <div className="chart-sub" style={{ fontSize:".65rem" }}>Based on abuse score ranges</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie 
                data={severityChartData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                innerRadius={42} 
                outerRadius={65} 
                paddingAngle={3}
              >
                {severityChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize:10, color:"#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Recommended Actions</div>
          <div className="chart-sub" style={{ fontSize:".65rem" }}>Block vs Monitor distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={actionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize:10, fill:"#94a3b8" }} />
              <YAxis tick={{ fontSize:10, fill:"#94a3b8" }} />
              <Tooltip contentStyle={TT} formatter={(v,n) => [v.toLocaleString(), n]} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ✨ IMPROVED: TOP 10 THREATS ONLY with Clear Signals */}
      <div className="section-header">
        <span className="section-title">IP Threat Detail</span>
        <span className="section-sub" style={{ fontSize:".7rem" }}>
          Top 10 IPs · source: synthetic_iis_logs
        </span>
        <span className="section-tag">RSD FR §7</span>
      </div>
      
      <div className="chart-card chart-card--full">
        <table className="data-table" style={{ fontSize:".7rem" }}>
          <thead>
            <tr>
              <th>Severity</th>
              <th style={{ cursor:"pointer" }} onClick={() => handleSort("ip_address")}>
                IP Address {sortBy === "ip_address" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th style={{ cursor:"pointer" }} onClick={() => handleSort("abuse_score")}>
                Abuse Score {sortBy === "abuse_score" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th style={{ cursor:"pointer" }} onClick={() => handleSort("confidence")}>
                Confidence {sortBy === "confidence" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th>Verdict</th>
              <th>ISP</th>
              <th>Country</th>
              <th>Action</th>
              <th>AI</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t,i) => {
              const severity = t.abuse_score >= 75 ? "Critical" : t.abuse_score >= 50 ? "High" : "Medium";
              const verdictColor = t.verdict === "MALICIOUS" ? "#dc2626" : t.verdict === "SUSPICIOUS" ? "#f59e0b" : "#059669";
              
              return (
                <tr key={t.ip_address || i}>
                  <td><SeverityBadge level={severity} /></td>
                  <td style={{ fontFamily:"var(--mono)", fontSize:".65rem", color:"#0284c7" }}>
                    {t.ip_address}
                  </td>
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontWeight:700, fontSize:".75rem" }}>{t.abuse_score}</span>
                      <div style={{ 
                        flex:1, 
                        height:4, 
                        background:"#e2e8f0", 
                        borderRadius:2, 
                        overflow:"hidden",
                        maxWidth:60
                      }}>
                        <div style={{ 
                          width:`${t.abuse_score}%`, 
                          height:"100%", 
                          background: severity === "Critical" ? "#dc2626" : severity === "High" ? "#f59e0b" : "#0ea5e9"
                        }} />
                      </div>
                    </div>
                  </td>
                  <td>{formatPercent(t.confidence)}</td>
                  <td>
                    <span style={{ 
                      color: verdictColor, 
                      fontWeight: 600, 
                      fontSize: ".68rem",
                      background: `${verdictColor}15`,
                      padding: "2px 6px",
                      borderRadius: 4
                    }}>
                      {t.verdict}
                    </span>
                  </td>
                  <td style={{ fontSize:".65rem", color:"#64748b" }}>{t.isp || "—"}</td>
                  <td>{t.country_code || "—"}</td>
                  <td>
                    <button 
                      className={t.recommended_action === "block" ? "btn-action btn-action--block" : "btn-action btn-action--monitor"}
                      style={{ fontSize:".65rem", padding:"3px 10px" }}
                    >
                      {t.recommended_action === "block" ? "🚫 Block" : "👁 Monitor"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-action btn-action--monitor"
                      style={{ fontSize:".65rem", padding:"3px 8px" }}
                      disabled={explaining}
                      onClick={() => handleExplain(t)}
                    >
                      {explaining && explainedIp === t.ip_address ? "…" : "🤖 Explain"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {explanation && (
          <div
            className="threat-explanation"
            style={{
              marginTop: 12,
              padding: "12px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: ".75rem",
              lineHeight: 1.5,
              color: "#334155",
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>
              Claude analysis {explainedIp ? `· ${explainedIp}` : ""}
            </strong>
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
}
