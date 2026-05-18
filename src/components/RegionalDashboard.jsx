// ═══════════════════════════════════════════════════════════════════════════════
// RegionalDashboard.jsx — COMPACT VERSION (FIXED: All bugs resolved)
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { getRegionalData } from "../services/api";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  formatNumber, 
  formatPercent, 
  formatCurrency, 
  assessMarketHealth 
} from "../utils/TrendUtils";

const TT = { 
  backgroundColor:"#fff", 
  border:"1px solid #e2e8f0", 
  borderRadius:8, 
  fontSize:11, 
  color:"#0f172a", 
  boxShadow:"0 4px 12px rgba(15,37,64,.1)" 
};

// ✨ FIXED: Market Health Badge - use healthLabel not status, add null checks
function MarketHealthBadge({ assessment }) {
  // FIXED: Check both assessment AND healthLabel exist
  if (!assessment || !assessment.healthLabel) return null;
  
  const config = {
    Excellent: { bg: "#059669", icon: "🌟", border: "#047857" },
    Good: { bg: "#0ea5e9", icon: "✅", border: "#0284c7" },
    Fair: { bg: "#f59e0b", icon: "⚠️", border: "#d97706" },
    Poor: { bg: "#dc2626", icon: "❌", border: "#b91c1c" }
  };
  
  // FIXED: Use healthLabel (not status)
  const c = config[assessment.healthLabel] || config.Poor;
  
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: c.bg,
      border: `2px solid ${c.border}`,
      color: "#fff",
      padding: "3px 10px",
      borderRadius: 6,
      fontSize: ".68rem",
      fontWeight: 700
    }}>
      <span>{c.icon}</span>
      {/* FIXED: Use healthLabel (not status) */}
      <span>{assessment.healthLabel.toUpperCase()}</span>
    </div>
  );
}

// ✨ Metric Indicator (shows good/bad with color)
function MetricIndicator({ value, format, threshold, inverse = false }) {
  const numValue = Number(value) || 0;
  let color;
  
  if (inverse) {
    // Lower is better (bot traffic)
    color = numValue <= threshold ? "#059669" : numValue <= threshold * 1.5 ? "#f59e0b" : "#dc2626";
  } else {
    // Higher is better (conversion, lead score)
    color = numValue >= threshold ? "#059669" : numValue >= threshold * 0.7 ? "#f59e0b" : "#dc2626";
  }
  
  const formatted = format === "percent" ? formatPercent(numValue) :
                    format === "currency" ? formatCurrency(numValue) :
                    formatNumber(numValue);
  
  return (
    <span style={{ color, fontWeight: 700, fontSize: ".75rem" }}>
      {formatted}
    </span>
  );
}

export default function RegionalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const r = await getRegionalData({ 
          country: selectedCountry !== "all" ? selectedCountry : undefined,
          campaign: selectedCampaign !== "all" ? selectedCampaign : undefined
        });
        setData(r);
      } catch (e) {
        console.error("Regional fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, [selectedCountry, selectedCampaign]);

  if (loading) return <div className="state-loading"><div className="spinner" /><span>Loading regional data…</span></div>;
  if (!data) return <div className="state-empty">No regional data available</div>;

  const countries = ["all", ...(data.countries || [])];
  const campaigns = ["all", ...(data.campaigns || [])];

  // Portfolio totals (FIXED: null-safe)
  const totalTraffic = data.portfolio?.total_traffic || 0;
  const totalConversions = data.portfolio?.total_conversions || 0;
  const avgConvRate = data.portfolio?.avg_conversion_rate || 0;
  const totalRevenue = data.portfolio?.projected_revenue || 0;

  // Country data with health assessments (FIXED: error handling + null-safe)
  const countryData = (data.by_country || []).map(c => {
    try {
      return {
        ...c,
        health: assessMarketHealth(c)
      };
    } catch (err) {
      console.error("Health assessment error for:", c.country, err);
      return {
        ...c,
        health: { healthScore: 0, healthLabel: "Poor", healthColor: "#dc2626" }
      };
    }
  });

  // Insights (FIXED: null-safe comparisons)
  const topPerformer = countryData.length > 0 ? countryData.reduce((a,b) => 
    (b.conversion_rate || 0) > (a.conversion_rate || 0) ? b : a, countryData[0]) : null;
  const highestBot = countryData.length > 0 ? countryData.reduce((a,b) => 
    (b.bot_percentage || 0) > (a.bot_percentage || 0) ? b : a, countryData[0]) : null;
  const bestConversion = countryData.length > 0 ? countryData.reduce((a,b) => 
    (b.conversion_rate || 0) > (a.conversion_rate || 0) ? b : a, countryData[0]) : null;

  // Chart data (FIXED: null-safe calculations)
  const trafficChart = countryData.map(c => ({
    country: c.country,
    bot: c.bot_traffic || 0,
    legit: (c.total_traffic || 0) - (c.bot_traffic || 0)
  }));

  const conversionChart = countryData.map(c => ({
    country: c.country,
    rate: c.conversion_rate || 0
  }));

  return (
    <div>
      {/* ✨ IMPROVED: Compact Filters */}
      <div style={{ 
        display:"flex", 
        gap:10, 
        marginBottom:12, 
        background:"#f8fafc", 
        padding:"8px 12px", 
        borderRadius:8, 
        border:"1px solid #e2e8f0" 
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:".7rem", fontWeight:600, color:"#475569" }}>Country:</span>
          <select 
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            style={{ 
              fontSize:".7rem", 
              padding:"4px 8px", 
              border:"1px solid #cbd5e1", 
              borderRadius:4,
              background:"#fff"
            }}
          >
            {countries.map(c => (
              <option key={c} value={c}>{c === "all" ? "All Countries" : c}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:".7rem", fontWeight:600, color:"#475569" }}>Campaign:</span>
          <select 
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            style={{ 
              fontSize:".7rem", 
              padding:"4px 8px", 
              border:"1px solid #cbd5e1", 
              borderRadius:4,
              background:"#fff"
            }}
          >
            {campaigns.map(c => (
              <option key={c} value={c}>{c === "all" ? "All Campaigns" : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ✨ Portfolio KPI Cards - More Compact */}
      <div style={{ 
        display:"grid", 
        gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", 
        gap:10, 
        marginBottom:12 
      }}>
        <div className="kpi-card kpi-card--cyan" style={{ padding:"10px 12px" }}>
          <span className="kpi-icon" style={{ fontSize:"1.2rem" }}>🌍</span>
          <div className="kpi-label" style={{ fontSize:".68rem" }}>Portfolio Traffic</div>
          <div className="kpi-value" style={{ fontSize:"1.4rem" }}>{formatNumber(totalTraffic)}</div>
          <div style={{ fontSize:".6rem", color:"#64748b", marginTop:2 }}>
            {countryData.length} markets
          </div>
        </div>
        
        <div className="kpi-card kpi-card--green" style={{ padding:"10px 12px" }}>
          <span className="kpi-icon" style={{ fontSize:"1.2rem" }}>✅</span>
          <div className="kpi-label" style={{ fontSize:".68rem" }}>Conversions</div>
          <div className="kpi-value" style={{ fontSize:"1.4rem" }}>{formatNumber(totalConversions)}</div>
          <div style={{ fontSize:".6rem", color:"#64748b", marginTop:2 }}>
            {formatPercent(avgConvRate)} avg rate
          </div>
        </div>
        
        <div className="kpi-card kpi-card--purple" style={{ padding:"10px 12px" }}>
          <span className="kpi-icon" style={{ fontSize:"1.2rem" }}>💰</span>
          <div className="kpi-label" style={{ fontSize:".68rem" }}>Proj. Revenue</div>
          <div className="kpi-value" style={{ fontSize:"1.4rem" }}>{formatCurrency(totalRevenue)}</div>
          <div style={{ fontSize:".6rem", color:"#64748b", marginTop:2 }}>
            Aggregate value
          </div>
        </div>
      </div>

      {/* ✨ NEW: Market Insights Panel (FIXED: null-safe) */}
      <div className="chart-card chart-card--full" style={{ 
        marginBottom:12, 
        padding:"10px 14px",
        background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color:"#fff"
      }}>
        <div style={{ fontSize:".8rem", fontWeight:700, marginBottom:8 }}>🎯 Market Insights</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:8 }}>
          {topPerformer && (
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"6px 10px" }}>
              <div style={{ fontSize:".65rem", opacity:0.9, marginBottom:2 }}>Top Performer</div>
              <div style={{ fontSize:".75rem", fontWeight:700 }}>{topPerformer.country}</div>
              <div style={{ fontSize:".62rem", opacity:0.8, marginTop:2 }}>
                {formatPercent(topPerformer.conversion_rate || 0)} conversion · 
                {formatNumber(topPerformer.total_traffic || 0)} traffic
              </div>
            </div>
          )}
          
          {highestBot && (
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"6px 10px" }}>
              <div style={{ fontSize:".65rem", opacity:0.9, marginBottom:2 }}>Highest Bot Activity</div>
              <div style={{ fontSize:".75rem", fontWeight:700 }}>{highestBot.country}</div>
              <div style={{ fontSize:".62rem", opacity:0.8, marginTop:2 }}>
                {formatPercent(highestBot.bot_percentage || 0)} bot traffic · Review filters
              </div>
            </div>
          )}
          
          {bestConversion && (
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"6px 10px" }}>
              <div style={{ fontSize:".65rem", opacity:0.9, marginBottom:2 }}>Best Conversion</div>
              <div style={{ fontSize:".75rem", fontWeight:700 }}>{bestConversion.country}</div>
              <div style={{ fontSize:".62rem", opacity:0.8, marginTop:2 }}>
                {formatPercent(bestConversion.conversion_rate || 0)} rate · 
                {formatNumber(bestConversion.conversions || 0)} conversions
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✨ IMPROVED: Smaller Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div className="chart-card">
          <div className="chart-title">Traffic Distribution</div>
          <div className="chart-sub" style={{ fontSize:".65rem" }}>Bot vs legitimate by country</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trafficChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="country" tick={{ fontSize:9, fill:"#94a3b8" }} />
              <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} />
              <Tooltip contentStyle={TT} formatter={(v) => formatNumber(v)} />
              <Legend wrapperStyle={{ fontSize:10 }} />
              <Bar dataKey="legit" stackId="a" fill="#0ea5e9" name="Legitimate" radius={[0,0,0,0]} />
              <Bar dataKey="bot" stackId="a" fill="#dc2626" name="Bot" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Conversion Rates</div>
          <div className="chart-sub" style={{ fontSize:".65rem" }}>Performance by market</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={conversionChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="country" tick={{ fontSize:9, fill:"#94a3b8" }} />
              <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} />
              <Tooltip 
                contentStyle={TT} 
                formatter={(v) => `${v.toFixed(2)}%`}
                labelFormatter={(label) => `${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#059669" 
                strokeWidth={2.5} 
                dot={{ fill:"#059669", r:4 }}
                name="Conv Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ✨ IMPROVED: Market Health Table with Clear Signals */}
      <div className="section-header">
        <span className="section-title">Regional Market Performance</span>
        <span className="section-sub" style={{ fontSize:".7rem" }}>
          Health scoring based on traffic quality & conversion
        </span>
        <span className="section-tag">RSD FR §4</span>
      </div>
      
      <div className="chart-card chart-card--full">
        <table className="data-table" style={{ fontSize:".7rem" }}>
          <thead>
            <tr>
              <th>Market Health</th>
              <th>Country</th>
              <th>Traffic</th>
              <th>Bot %</th>
              <th>Conv Rate</th>
              <th>Conversions</th>
              <th>Avg Lead</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {countryData.map((c,i) => (
              <tr key={c.country || i}>
                <td>
                  <MarketHealthBadge assessment={c.health} />
                </td>
                <td style={{ fontWeight:700, fontSize:".75rem" }}>{c.country || "—"}</td>
                <td>{formatNumber(c.total_traffic || 0)}</td>
                <td>
                  <MetricIndicator 
                    value={c.bot_percentage || 0} 
                    format="percent"
                    threshold={30}
                    inverse={true}
                  />
                </td>
                <td>
                  <MetricIndicator 
                    value={c.conversion_rate || 0} 
                    format="percent"
                    threshold={5}
                    inverse={false}
                  />
                </td>
                <td>{formatNumber(c.conversions || 0)}</td>
                <td>
                  <MetricIndicator 
                    value={c.avg_lead_score || 0} 
                    format="number"
                    threshold={50}
                    inverse={false}
                  />
                </td>
                <td>{formatCurrency(c.projected_revenue || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* ✨ Health Score Legend */}
        <div style={{ 
          marginTop:10, 
          padding:"8px 12px", 
          background:"#f8fafc", 
          borderRadius:6, 
          fontSize:".65rem",
          color:"#64748b"
        }}>
          <strong style={{ color:"#0f172a" }}>Health Score:</strong> 
          {" "}🌟 Excellent (≥70) · 
          {" "}✅ Good (50-69) · 
          {" "}⚠️ Fair (30-49) · 
          {" "}❌ Poor (&lt;30) · 
          Based on conv rate, bot %, traffic volume, lead quality
        </div>
      </div>
    </div>
  );
}
