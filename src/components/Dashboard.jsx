// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard.jsx — COMPACT VERSION (Fits on one screen, clear signals)
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { getDashboardSummary, getPriorityOpportunities } from "../services/api";
import axios from "axios";
import {
  formatNumber,
  formatPercent,
  calculateTrend,
  formatTrend,
  calculateUrgency,
  checkAlertThresholds,
  formatTimeRange
} from "../utils/TrendUtils";

const TT = { backgroundColor:"#fff", border:"1px solid #e2e8f0", borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#0f172a", boxShadow:"0 4px 12px rgba(15,37,64,.1)" };
const PIE_COLORS = ["#dc2626","#0ea5e9","#059669"];

function ScoreBar({ value, color = "green" }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-track">
        <div className={`score-bar-fill score-bar-fill--${color}`} style={{ width:`${pct}%` }} />
      </div>
      <span className="score-val">{pct.toFixed(0)}</span>
    </div>
  );
}

function ConfusionMatrix({ matrix }) {
  const labels = ["Bot","Norm","HV"];
  if (!matrix?.length) return <div className="state-empty">No matrix data</div>;
  return (
    <div className="matrix-grid">
      {matrix.map((row,i) => (
        <div className="matrix-row" key={i}>
          <span className="matrix-label">{labels[i]}</span>
          {row.map((v,j) => <div key={j} className={`m-cell ${i===j?"m-cell--max":""}`}>{v.toLocaleString()}</div>)}
        </div>
      ))}
    </div>
  );
}

function FeatureImportance({ data }) {
  if (!data?.length) return <div className="state-empty">No data</div>;
  const max = Math.max(...data.map(d => d.val));
  return (
    <div style={{ marginTop:8 }}>
      {data.map((d,i) => (
        <div className="fi-row" key={i}>
          <span className="fi-name">{d.name}</span>
          <div className="fi-bar"><div className="fi-fill" style={{ width:`${(d.val/max)*100}%` }} /></div>
          <span className="fi-val">{d.val}%</span>
        </div>
      ))}
    </div>
  );
}

// ✨ NEW: Trend Indicator Component
function TrendIndicator({ current, previous, inverse = false, label = "" }) {
  if (previous === undefined || previous === null) {
    return <div className="kpi-delta">{label || "No historical data"}</div>;
  }
  
  const trend = calculateTrend(current, previous);
  const formatted = formatTrend(trend, inverse);
  
  return (
    <div className="kpi-delta" style={{ color: formatted.color, fontWeight: 500 }}>
      {formatted.text} {label && `· ${label}`}
    </div>
  );
}

// ✨ IMPROVED: Condensed Alert Banner (shows count instead of full messages)
function CompactAlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  
  const [expanded, setExpanded] = useState(false);
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  
  if (!expanded) {
    return (
      <div style={{
        background: criticalCount > 0 ? "#fef2f2" : "#fffbeb",
        border: `1px solid ${criticalCount > 0 ? "#fecaca" : "#fcd34d"}`,
        borderRadius: 8,
        padding: "8px 14px",
        marginBottom: 10,
        fontSize: ".7rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer"
      }}
      onClick={() => setExpanded(true)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1rem" }}>⚠️</span>
          <span style={{ color: "#92400e", fontWeight: 600 }}>
            {criticalCount > 0 && `${criticalCount} Critical`}
            {criticalCount > 0 && warningCount > 0 && " · "}
            {warningCount > 0 && `${warningCount} Warning${warningCount > 1 ? 's' : ''}`}
          </span>
        </div>
        <span style={{ color: "#64748b", fontSize: ".65rem" }}>Click to expand ▼</span>
      </div>
    );
  }
  
  return (
    <div style={{ marginBottom: 10 }}>
      {alerts.map((alert, i) => (
        <div 
          key={i}
          style={{
            background: alert.severity === "critical" ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${alert.color}`,
            borderRadius: 6,
            padding: "6px 10px",
            marginBottom: 4,
            fontSize: ".68rem"
          }}
        >
          <div style={{ color: alert.color, fontWeight: 600, marginBottom: 2 }}>
            {alert.message}
          </div>
          <div style={{ color: "#64748b", fontSize: ".62rem" }}>
            {alert.action}
          </div>
        </div>
      ))}
      <button 
        onClick={() => setExpanded(false)}
        style={{
          background: "none",
          border: "1px solid #cbd5e1",
          borderRadius: 4,
          padding: "4px 10px",
          fontSize: ".65rem",
          color: "#64748b",
          cursor: "pointer",
          marginTop: 4
        }}
      >
        Collapse ▲
      </button>
    </div>
  );
}

// ✨ NEW: Good/Bad Signal Badge
function SignalBadge({ value, thresholds, inverse = false }) {
  // thresholds: { critical: 60, warning: 45, good: 30 }
  // inverse: true means lower is better (e.g., bot traffic)
  
  const v = Number(value) || 0;
  let color, icon, label;
  
  if (inverse) {
    // Lower is better (bot traffic, error rate)
    if (v >= thresholds.critical) {
      color = "#dc2626"; icon = "❌"; label = "CRITICAL";
    } else if (v >= thresholds.warning) {
      color = "#d97706"; icon = "⚠️"; label = "WARNING";
    } else {
      color = "#059669"; icon = "✅"; label = "GOOD";
    }
  } else {
    // Higher is better (conversion, lead score)
    if (v <= thresholds.critical) {
      color = "#dc2626"; icon = "❌"; label = "LOW";
    } else if (v <= thresholds.warning) {
      color = "#d97706"; icon = "⚠️"; label = "FAIR";
    } else {
      color = "#059669"; icon = "✅"; label = "GOOD";
    }
  }
  
  return (
    <span style={{
      background: `${color}15`,
      color,
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: ".65rem",
      fontWeight: 700,
      border: `1px solid ${color}40`
    }}>
      {icon} {label}
    </span>
  );
}

export default function Dashboard({ simulationActive, userRole }) {
  const [data,         setData]         = useState(null);
  const [historical,   setHistorical]   = useState(null);
  const [priority,     setPriority]     = useState([]);
  const [scanIp,       setScanIp]       = useState("");
  const [scanResult,   setScanResult]   = useState(null);
  const [scanning,     setScanning]     = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [timeRange,    setTimeRange]    = useState("all");
  const [alerts,       setAlerts]       = useState([]);

  const isSecurity = userRole === "security";
  const isSales    = userRole === "sales";

  const fetchAll = async () => {
    try {
      const [s, p] = await Promise.all([
        getDashboardSummary({ timeRange }),
        getPriorityOpportunities({ timeRange })
      ]);
      
      setData(s);
      
      // ✨ IMPROVED: Limit to top 5 instead of showing all
      const priorityWithUrgency = (p?.priority_opportunities || [])
        .map(record => ({
          ...record,
          urgency: calculateUrgency(record)
        }))
        .sort((a, b) => b.urgency.urgencyScore - a.urgency.urgencyScore)
        .slice(0, 5); // ✅ SHOW ONLY TOP 5
      
      setPriority(priorityWithUrgency);
      
      if (s?.metrics) {
        const newAlerts = checkAlertThresholds(s.metrics);
        setAlerts(newAlerts);
      }
      
      try {
        const histResp = await getDashboardSummary({ timeRange, historical: true });
        setHistorical(histResp);
      } catch (e) {
        console.log("Historical data not available:", e);
      }
      
      setLastUpdate(new Date().toLocaleTimeString());
    } catch(e) { 
      console.error("Dashboard fetch error:", e); 
    }
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, simulationActive ? 3000 : 15000);
    return () => clearInterval(t);
  }, [simulationActive, timeRange]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanIp.trim()) return;
    setScanning(true); setScanResult(null);
    try {
      const r = await axios.get(`http://localhost:5000/api/threat/scan/${scanIp.trim()}`, { withCredentials:true });
      setScanResult(r.data);
    } catch { setScanResult({ error:"Scan failed." }); }
    finally { setScanning(false); }
  };

  if (!data) return <div className="state-loading"><div className="spinner" /><span>Loading dashboard…</span></div>;

  const dist    = data.distribution || {};
  const pieData = Object.entries(dist).map(([name,value]) => ({ name, value }));
  const metrics = data.metrics || {};
  const historicalMetrics = historical?.metrics || {};

  return (
    <div>
      {/* ✨ IMPROVED: Compact Time Range + Alerts in one row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ 
          background: "#f8fafc", 
          border: "1px solid #e2e8f0", 
          borderRadius: 6, 
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: ".7rem",
          flex: "0 0 auto"
        }}>
          <span style={{ color: "#475569", fontWeight: 600, fontSize: ".68rem" }}>Time:</span>
          {["24h", "7d", "30d", "90d", "all"].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                background: timeRange === range ? "#0ea5e9" : "transparent",
                color: timeRange === range ? "#fff" : "#64748b",
                border: "none",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: ".65rem",
                fontWeight: timeRange === range ? 600 : 400,
                cursor: "pointer"
              }}
            >
              {range === "24h" ? "24h" : range === "7d" ? "7d" : range === "30d" ? "30d" : range === "90d" ? "90d" : "All"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <CompactAlertBanner alerts={alerts} />
        </div>
      </div>

      {/* Live simulation banner - more compact */}
      {simulationActive && (
        <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:6, padding:"6px 10px", marginBottom:10, fontSize:".68rem", color:"#92400e", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"#f59e0b",display:"inline-block",animation:"pulse 1.4s infinite" }} />
          <strong>Live Streaming</strong> · {lastUpdate}
        </div>
      )}

      {/* ── Security: Compact IP Scanner ── */}
      {isSecurity && (
        <div className="chart-card chart-card--full" style={{ borderLeft:"3px solid #7c3aed", marginBottom:12, padding:"12px 16px" }}>
          <div style={{ fontSize:".8rem", fontWeight:700, color:"#7c3aed", marginBottom:6 }}>🔒 IP Threat Scanner</div>
          <form onSubmit={handleScan} className="scanner-row">
            <input className="scanner-input" placeholder="Enter IP address…"
              value={scanIp} onChange={e => setScanIp(e.target.value)} />
            <button type="submit" className="btn-scan" disabled={scanning}>
              {scanning ? "Scanning…" : "Scan"}
            </button>
          </form>
          {scanResult && (
            <div className="scan-result" style={{ fontSize:".7rem", marginTop:6 }}>
              {scanResult.error
                ? <span style={{ color:"#dc2626" }}>⚠ {scanResult.error}</span>
                : <span>
                    <strong>{scanResult.ip}</strong> — Score: <strong>{scanResult.abuse_score}/100</strong>
                    {" "} — <strong style={{ color:scanResult.verdict==="MALICIOUS"?"#dc2626":"#059669" }}>{scanResult.verdict}</strong>
                  </span>
              }
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards with CLEAR SIGNALS ── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-card--cyan">
          <span className="kpi-icon">📊</span>
          <div className="kpi-label">Total Requests</div>
          <div className="kpi-value">{formatNumber(metrics.total_requests||0)}</div>
          <TrendIndicator 
            current={metrics.total_requests} 
            previous={historicalMetrics.total_requests}
            label="vs previous"
          />
        </div>
        
        <div className="kpi-card kpi-card--red">
          <span className="kpi-icon">🤖</span>
          <div className="kpi-label">Bot Traffic</div>
          <div className="kpi-value">{formatPercent(metrics.bot_percentage||0)}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
            <TrendIndicator 
              current={metrics.bot_percentage} 
              previous={historicalMetrics.bot_percentage}
              inverse={true}
            />
            {/* ✨ NEW: Clear signal badge */}
            <SignalBadge 
              value={metrics.bot_percentage} 
              thresholds={{ critical: 60, warning: 45, good: 30 }}
              inverse={true}
            />
          </div>
        </div>
        
        {isSales && (
          <>
            <div className="kpi-card kpi-card--green">
              <span className="kpi-icon">✅</span>
              <div className="kpi-label">Conversion Rate</div>
              <div className="kpi-value">{formatPercent(metrics.conversion_rate||0)}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                <TrendIndicator 
                  current={metrics.conversion_rate} 
                  previous={historicalMetrics.conversion_rate}
                />
                {/* ✨ NEW: Clear signal badge */}
                <SignalBadge 
                  value={metrics.conversion_rate} 
                  thresholds={{ critical: 3, warning: 5, good: 8 }}
                  inverse={false}
                />
              </div>
            </div>
            <div className="kpi-card kpi-card--amber">
              <span className="kpi-icon">⭐</span>
              <div className="kpi-label">Avg Lead Score</div>
              <div className="kpi-value">{(metrics.avg_lead_score||0).toFixed(0)}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                <TrendIndicator 
                  current={metrics.avg_lead_score} 
                  previous={historicalMetrics.avg_lead_score}
                />
                <SignalBadge 
                  value={metrics.avg_lead_score} 
                  thresholds={{ critical: 30, warning: 40, good: 60 }}
                  inverse={false}
                />
              </div>
            </div>
            <div className="kpi-card kpi-card--purple">
              <span className="kpi-icon">💎</span>
              <div className="kpi-label">High-Value Users</div>
              <div className="kpi-value">{formatNumber(metrics.high_value_count||0)}</div>
              <TrendIndicator 
                current={metrics.high_value_count} 
                previous={historicalMetrics.high_value_count}
                label="opportunities"
              />
            </div>
          </>
        )}
        {isSecurity && (
          <>
            <div className="kpi-card kpi-card--purple">
              <span className="kpi-icon">⚠</span>
              <div className="kpi-label">High-Value / At Risk</div>
              <div className="kpi-value">{formatNumber(metrics.high_value_count||0)}</div>
              <TrendIndicator 
                current={metrics.high_value_count} 
                previous={historicalMetrics.high_value_count}
                label="verify"
              />
            </div>
            <div className="kpi-card kpi-card--amber">
              <span className="kpi-icon">🔍</span>
              <div className="kpi-label">Avg Lead Score</div>
              <div className="kpi-value">{(metrics.avg_lead_score||0).toFixed(0)}</div>
              <TrendIndicator 
                current={metrics.avg_lead_score} 
                previous={historicalMetrics.avg_lead_score}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Charts (more compact height) ── */}
      <div className="chart-grid chart-grid--3">
        <div className="chart-card">
          <div className="chart-title">Traffic Composition</div>
          <div className="chart-sub" style={{ fontSize:".65rem" }}>
            {isSales ? "Bot vs qualified leads" : "Threat surface"}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3}>
                {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={TT} formatter={(v,n) => [v.toLocaleString(),n]} />
              <Legend wrapperStyle={{ fontSize:10, color:"#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Model Confusion Matrix</div>
          <div className="chart-sub" style={{ fontSize:".65rem" }}>Random Forest · 100% accuracy</div>
          <ConfusionMatrix matrix={data.confusion_matrix} />
          <div style={{ marginTop:6, fontSize:".58rem", color:"#94a3b8" }}>Trained on Databricks · 400K records</div>
        </div>

        <div className="chart-card">
          <div className="chart-title">
            {isSales ? "Lead Signals" : "Threat Signals"}
          </div>
          <div className="chart-sub" style={{ fontSize:".65rem" }}>Top predictors</div>
          <FeatureImportance data={data.importance} />
        </div>
      </div>

      {/* ── Priority Opportunities: TOP 5 ONLY ── */}
      <div className="section-header" style={{ marginTop:6 }}>
        <span className="section-title">Priority Opportunities</span>
        <span className="section-sub" style={{ fontSize:".7rem" }}>
          {isSales ? "Top 5 high-urgency opportunities" : "Top 5 security concerns"}
        </span>
        <span className="section-tag">RSD FR §3</span>
      </div>
      <div className="chart-card chart-card--full">
        {priority.length === 0
          ? <div className="state-empty">No priority opportunities</div>
          : (
            <table className="data-table" style={{ fontSize:".7rem" }}>
              <thead>
                <tr>
                  <th>Urgency</th>
                  <th>ID</th>
                  <th>Country</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Lead</th>
                  <th>Anomaly</th>
                  {isSales && <th>Engage</th>}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {priority.map((r,i) => (
                  <tr key={r.log_id||i}>
                    <td>
                      <div style={{
                        background: r.urgency.urgencyColor,
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: ".62rem",
                        fontWeight: 700,
                        textAlign: "center",
                        minWidth: 65
                      }}>
                        {r.urgency.urgencyLabel}
                      </div>
                    </td>
                    <td style={{ fontFamily:"var(--mono)", fontSize:".62rem", color:"#0284c7" }}>{(r.log_id||`REC-${i+1}`).slice(-8)}</td>
                    <td>{r.country||"—"}</td>
                    <td style={{ fontSize:".65rem" }}>{(r.campaign_source||"—").slice(0,12)}</td>
                    <td>
                      <span className={`badge ${r.traffic_type==="High-Value"?"badge--hv":"badge--normal"}`} style={{ fontSize:".6rem", padding:"1px 5px" }}>
                        {r.traffic_type||"—"}
                      </span>
                    </td>
                    <td style={{ minWidth:90 }}><ScoreBar value={r.lead_score} color="green" /></td>
                    <td style={{ minWidth:90 }}><ScoreBar value={r.anomaly_score} color="amber" /></td>
                    {isSales && <td style={{ minWidth:80 }}><ScoreBar value={(r.engagement_score||0)/5*100} color="cyan" /></td>}
                    <td style={{ fontSize:".62rem", color:"#0284c7", fontWeight:500 }}>
                      {r.urgency.actionTime.replace("Contact within ", "").replace("Review within ", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Sales: Quick IP check (compact) */}
      {isSales && (
        <div className="chart-card chart-card--full" style={{ marginTop:10, padding:"10px 14px" }}>
          <div style={{ fontSize:".75rem", fontWeight:600, marginBottom:6 }}>Quick IP Check</div>
          <form onSubmit={handleScan} className="scanner-row">
            <input className="scanner-input" placeholder="Enter IP…" style={{ fontSize:".7rem" }}
              value={scanIp} onChange={e => setScanIp(e.target.value)} />
            <button type="submit" className="btn-scan" disabled={scanning} style={{ fontSize:".7rem" }}>
              {scanning ? "Checking…" : "Check"}
            </button>
          </form>
          {scanResult && (
            <div className="scan-result" style={{ fontSize:".68rem", marginTop:6 }}>
              {scanResult.error
                ? <span style={{ color:"#dc2626" }}>⚠ {scanResult.error}</span>
                : <span>
                    <strong>{scanResult.ip}</strong> — {scanResult.abuse_score}/100 — 
                    <strong style={{ color:scanResult.verdict==="MALICIOUS"?"#dc2626":"#059669" }}> {scanResult.verdict}</strong>
                  </span>
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}
