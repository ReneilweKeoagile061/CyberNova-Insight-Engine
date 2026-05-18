// ═══════════════════════════════════════════════════════════════════════════════
// CampaignPerformance.jsx — FIXED VERSION (Portfolio ROI + Efficiency Matrix)
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { getCampaignPerformance } from "../services/api";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from "recharts";
import { 
  formatNumber, 
  formatPercent, 
  formatCurrency 
} from "../utils/TrendUtils";

const TT = { 
  backgroundColor:"#fff", 
  border:"1px solid #e2e8f0", 
  borderRadius:8, 
  fontSize:11, 
  color:"#0f172a", 
  boxShadow:"0 4px 12px rgba(15,37,64,.1)" 
};

// ✅ FIXED: Campaign ROI calculation that uses correct field names
function calculateCampaignROI(campaign) {
  // ✅ Use correct field names from backend
  const requests = Number(campaign.traffic) || 0;  // Was: total_requests
  const conversions = Number(campaign.conversions) || 0;  // Was: conversion_count
  const hvCount = Number(campaign.high_value_count) || 0;
  const conversionRate = Number(campaign.conversion_rate) || 0;
  const hvPercent = Number(campaign.high_value_percentage) || 0;
  
  // Estimate costs (adjust based on your actual costs)
  const costPerClick = 1.50; // $1.50 per click average
  const totalCost = requests * costPerClick;
  
  // Estimate revenue (adjust based on your actual LTV)
  const avgDealValue = 1500; // $1500 average deal value
  const projectedRevenue = conversions * avgDealValue;
  
  // Calculate ROI
  const roi = totalCost > 0 ? ((projectedRevenue - totalCost) / totalCost) * 100 : 0;
  const cpa = conversions > 0 ? totalCost / conversions : 0;
  
  // Efficiency score: ratio of conversion rate to HV percentage
  const efficiency = hvPercent > 0 && conversionRate > 0 
    ? (conversionRate / hvPercent) * 100 
    : 0;
  
  // Grade assignment
  let grade = "D";
  if (roi >= 300) grade = "A";
  else if (roi >= 150) grade = "B";
  else if (roi >= 50) grade = "C";
  
  return {
    totalCost,
    projectedRevenue,
    roi,
    cpa,
    efficiency,
    grade,
    conversions,
    hvCount,
    // ✅ ADDED: Return these for efficiency matrix
    conversion_rate: conversionRate,
    hv_percentage: hvPercent
  };
}

// ✨ ROI Grade Badge
function ROIGradeBadge({ grade, roi }) {
  const config = {
    A: { bg: "#059669", icon: "🏆", label: "Excellent" },
    B: { bg: "#0ea5e9", icon: "✅", label: "Good" },
    C: { bg: "#f59e0b", icon: "⚠️", label: "Fair" },
    D: { bg: "#dc2626", icon: "❌", label: "Poor" }
  };
  
  const c = config[grade] || config.D;
  
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: c.bg,
      color: "#fff",
      padding: "4px 10px",
      borderRadius: 6,
      fontSize: ".7rem",
      fontWeight: 700
    }}>
      <span style={{ fontSize: "1rem" }}>{c.icon}</span>
      <div>
        <div style={{ lineHeight: 1 }}>{grade} Grade</div>
        <div style={{ fontSize: ".6rem", opacity: 0.9, lineHeight: 1, marginTop: 2 }}>
          {c.label} · {formatPercent(roi)}
        </div>
      </div>
    </div>
  );
}

// ✨ Empty State Component
function EmptyState({ icon, title, message }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "40px 20px",
      color: "#94a3b8"
    }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: ".9rem", fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: ".7rem", lineHeight: 1.5 }}>
        {message}
      </div>
    </div>
  );
}

export default function CampaignPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("roi");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const r = await getCampaignPerformance();
        
        // 🔍 DEBUG: Log backend response
        console.log("📊 Campaign data received:", r);
        if (r.campaigns && r.campaigns.length > 0) {
          console.log("   Sample campaign:", r.campaigns[0]);
        }
        
        setData(r);
      } catch (e) {
        console.error("Campaign fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const t = setInterval(fetch, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="state-loading"><div className="spinner" /><span>Loading campaigns…</span></div>;
  if (!data) return <div className="state-empty">No campaign data available</div>;

  const campaigns = (data.campaigns || []).map(c => ({
    ...c,
    analysis: calculateCampaignROI(c)
  }));

  // Debug: Log calculated campaigns
  if (campaigns.length > 0) {
    console.log("   First campaign analysis:", campaigns[0].analysis);
  }

  // ✨ CHECK: Do we have any real data?
  const hasData = campaigns.some(c => c.traffic > 0 || c.conversions > 0);

  const sorted = [...campaigns].sort((a,b) => {
    const valA = sortBy === "roi" ? a.analysis.roi : 
                 sortBy === "conversion_rate" ? a.analysis.conversion_rate :
                 sortBy === "traffic" ? a.traffic : 0;
    const valB = sortBy === "roi" ? b.analysis.roi : 
                 sortBy === "conversion_rate" ? b.analysis.conversion_rate :
                 sortBy === "traffic" ? b.traffic : 0;
    return sortOrder === "asc" ? valA - valB : valB - valA;
  });

  // ✨ IMPROVED: Limit to top 8 campaigns
  const topCampaigns = sorted.slice(0, 8);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  // ✅ FIXED: Portfolio totals - use correct field name (totalCost not estimated_cost)
  const totalTraffic = campaigns.reduce((s,c) => s + (c.traffic||0), 0);
  const totalConversions = campaigns.reduce((s,c) => s + (c.conversions||0), 0);
  const totalRevenue = campaigns.reduce((s,c) => s + (c.analysis?.projectedRevenue||0), 0);
  const totalCost = campaigns.reduce((s,c) => s + (c.analysis?.totalCost||0), 0);  // ✅ FIXED
  const portfolioROI = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
  const avgConvRate = totalTraffic > 0 ? (totalConversions / totalTraffic) * 100 : 0;

  // Debug: Log portfolio calculations
  console.log("💰 Portfolio Metrics:");
  console.log("   Total Cost:", totalCost);
  console.log("   Total Revenue:", totalRevenue);
  console.log("   Portfolio ROI:", portfolioROI.toFixed(1) + "%");

  // ✅ FIXED: Efficiency scatter data - now uses correct fields
  const efficiencyData = hasData ? campaigns
    .filter(c => c.traffic > 0)
    .map(c => ({
      x: c.analysis.conversion_rate,
      y: c.analysis.hv_percentage,
      z: c.traffic,
      name: c.campaign_source,
      roi: c.analysis.roi,
      grade: c.analysis.grade
    })) : [];

  // Debug: Log efficiency data
  if (efficiencyData.length > 0) {
    console.log("📊 Efficiency Matrix Data:", efficiencyData.length, "campaigns");
    console.log("   Sample:", efficiencyData[0]);
  }

  // Top 3 insights
  const topPerformer = campaigns.length > 0 ? campaigns.reduce((a,b) => 
    (b.analysis.roi > a.analysis.roi ? b : a), campaigns[0]) : null;
  const mostEfficient = campaigns.length > 0 ? campaigns.reduce((a,b) => 
    (b.analysis.conversion_rate > a.analysis.conversion_rate ? b : a), campaigns[0]) : null;
  const highestTraffic = campaigns.length > 0 ? campaigns.reduce((a,b) => 
    (b.traffic > a.traffic ? b : a), campaigns[0]) : null;

  return (
    <div>
      {/* ✨ Portfolio KPI Cards - More Compact */}
      <div style={{ 
        display:"grid", 
        gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", 
        gap:10, 
        marginBottom:12 
      }}>
        <div className="kpi-card kpi-card--purple" style={{ padding:"10px 12px" }}>
          <span className="kpi-icon" style={{ fontSize:"1.2rem" }}>💰</span>
          <div className="kpi-label" style={{ fontSize:".68rem" }}>Portfolio ROI</div>
          <div className="kpi-value" style={{ fontSize:"1.4rem" }}>{formatPercent(portfolioROI)}</div>
          <div style={{ fontSize:".6rem", color:"#64748b", marginTop:2 }}>
            {formatCurrency(totalRevenue)} revenue
          </div>
        </div>
        
        <div className="kpi-card kpi-card--green" style={{ padding:"10px 12px" }}>
          <span className="kpi-icon" style={{ fontSize:"1.2rem" }}>✅</span>
          <div className="kpi-label" style={{ fontSize:".68rem" }}>Avg Conversion</div>
          <div className="kpi-value" style={{ fontSize:"1.4rem" }}>{formatPercent(avgConvRate)}</div>
          <div style={{ fontSize:".6rem", color:"#64748b", marginTop:2 }}>
            {formatNumber(totalConversions)} conversions
          </div>
        </div>
        
        <div className="kpi-card kpi-card--cyan" style={{ padding:"10px 12px" }}>
          <span className="kpi-icon" style={{ fontSize:"1.2rem" }}>📊</span>
          <div className="kpi-label" style={{ fontSize:".68rem" }}>Total Traffic</div>
          <div className="kpi-value" style={{ fontSize:"1.4rem" }}>{formatNumber(totalTraffic)}</div>
          <div style={{ fontSize:".6rem", color:"#64748b", marginTop:2 }}>
            {campaigns.length} campaigns
          </div>
        </div>
        
        <div className="kpi-card kpi-card--amber" style={{ padding:"10px 12px" }}>
          <span className="kpi-icon" style={{ fontSize:"1.2rem" }}>💵</span>
          <div className="kpi-label" style={{ fontSize:".68rem" }}>Avg CPA</div>
          <div className="kpi-value" style={{ fontSize:"1.4rem" }}>
            {totalConversions > 0 ? formatCurrency(totalCost / totalConversions) : "$0"}
          </div>
          <div style={{ fontSize:".6rem", color:"#64748b", marginTop:2 }}>
            {formatCurrency(totalCost)} spent
          </div>
        </div>
      </div>

      {/* ✨ IMPROVED: Only show scatter plot if we have data */}
      {hasData ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          {/* Efficiency Scatter */}
          <div className="chart-card">
            <div className="chart-title">Efficiency Matrix</div>
            <div className="chart-sub" style={{ fontSize:".65rem" }}>
              Conversion Rate vs HV % · bubble size = traffic
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ top:10, right:10, bottom:10, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Conv Rate" 
                  unit="%" 
                  tick={{ fontSize:9, fill:"#94a3b8" }}
                  label={{ value:"Conversion Rate %", position:"insideBottom", offset:-5, fontSize:10, fill:"#64748b" }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="HV %" 
                  unit="%" 
                  tick={{ fontSize:9, fill:"#94a3b8" }}
                  label={{ value:"High-Value %", angle:-90, position:"insideLeft", fontSize:10, fill:"#64748b" }}
                />
                <ZAxis type="number" dataKey="z" range={[50, 400]} />
                <Tooltip 
                  contentStyle={TT}
                  formatter={(value, name) => {
                    if (name === "Conv Rate") return `${value.toFixed(1)}%`;
                    if (name === "HV %") return `${value.toFixed(1)}%`;
                    if (name === "Traffic") return formatNumber(value);
                    return value;
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      const d = payload[0].payload;
                      return `${d.name} (${d.grade} Grade · ${formatPercent(d.roi)} ROI)`;
                    }
                    return "";
                  }}
                />
                <Scatter name="Campaigns" data={efficiencyData}>
                  {efficiencyData.map((entry, i) => {
                    const color = entry.grade === "A" ? "#059669" : 
                                  entry.grade === "B" ? "#0ea5e9" :
                                  entry.grade === "C" ? "#f59e0b" : "#dc2626";
                    return <Cell key={i} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Top Insights */}
          <div className="chart-card">
            <div className="chart-title">Campaign Insights</div>
            <div className="chart-sub" style={{ fontSize:".65rem" }}>Key performance highlights</div>
            <div style={{ marginTop:10 }}>
              {topPerformer && (
                <div style={{ 
                  background:"#f0fdf4", 
                  border:"1px solid #bbf7d0", 
                  borderRadius:6, 
                  padding:"8px 10px", 
                  marginBottom:6 
                }}>
                  <div style={{ fontSize:".68rem", color:"#059669", fontWeight:600, marginBottom:3 }}>
                    🏆 Top Performer
                  </div>
                  <div style={{ fontSize:".7rem", color:"#0f172a", marginBottom:2 }}>
                    <strong>{topPerformer.campaign_source}</strong>
                  </div>
                  <div style={{ fontSize:".62rem", color:"#64748b" }}>
                    {formatPercent(topPerformer.analysis.roi)} ROI · 
                    {formatPercent(topPerformer.analysis.conversion_rate)} conversion · 
                    Grade {topPerformer.analysis.grade}
                  </div>
                </div>
              )}
              
              {mostEfficient && (
                <div style={{ 
                  background:"#eff6ff", 
                  border:"1px solid #bfdbfe", 
                  borderRadius:6, 
                  padding:"8px 10px", 
                  marginBottom:6 
                }}>
                  <div style={{ fontSize:".68rem", color:"#0284c7", fontWeight:600, marginBottom:3 }}>
                    ✅ Most Efficient
                  </div>
                  <div style={{ fontSize:".7rem", color:"#0f172a", marginBottom:2 }}>
                    <strong>{mostEfficient.campaign_source}</strong>
                  </div>
                  <div style={{ fontSize:".62rem", color:"#64748b" }}>
                    {formatPercent(mostEfficient.analysis.conversion_rate)} conversion rate · 
                    {formatCurrency(mostEfficient.analysis.cpa)} CPA
                  </div>
                </div>
              )}
              
              {highestTraffic && (
                <div style={{ 
                  background:"#fef3c7", 
                  border:"1px solid #fde68a", 
                  borderRadius:6, 
                  padding:"8px 10px" 
                }}>
                  <div style={{ fontSize:".68rem", color:"#92400e", fontWeight:600, marginBottom:3 }}>
                    📊 Highest Traffic
                  </div>
                  <div style={{ fontSize:".7rem", color:"#0f172a", marginBottom:2 }}>
                    <strong>{highestTraffic.campaign_source}</strong>
                  </div>
                  <div style={{ fontSize:".62rem", color:"#64748b" }}>
                    {formatNumber(highestTraffic.traffic)} requests · 
                    {formatNumber(highestTraffic.conversions)} conversions
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ✨ NEW: Show friendly empty state instead of useless 0-data graph
        <div className="chart-card chart-card--full" style={{ marginBottom:12 }}>
          <EmptyState 
            icon="📊"
            title="No Campaign Data Yet"
            message="Campaign performance data will appear here once traffic is recorded. Check back after the first campaigns generate activity."
          />
        </div>
      )}

      {/* ✨ IMPROVED: TOP 8 CAMPAIGNS ONLY with Clear ROI Signals */}
      <div className="section-header">
        <span className="section-title">Campaign Detail</span>
        <span className="section-sub" style={{ fontSize:".7rem" }}>
          {hasData ? `Top ${Math.min(8, campaigns.length)} campaigns by performance` : "No campaigns to display"}
        </span>
        <span className="section-tag">RSD FR §5</span>
      </div>
      
      <div className="chart-card chart-card--full">
        {!hasData ? (
          <EmptyState 
            icon="🎯"
            title="No Campaign Activity"
            message="Start running campaigns to see performance metrics, ROI analysis, and optimization recommendations here."
          />
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table className="data-table" style={{ fontSize:".7rem", width:"100%" }}>
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Campaign</th>
                  <th style={{ cursor:"pointer" }} onClick={() => handleSort("traffic")}>
                    Traffic {sortBy === "traffic" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ cursor:"pointer" }} onClick={() => handleSort("conversion_rate")}>
                    Conv Rate {sortBy === "conversion_rate" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>HV %</th>
                  <th style={{ cursor:"pointer" }} onClick={() => handleSort("roi")}>
                    ROI {sortBy === "roi" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>CPA</th>
                  <th>Revenue</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c,i) => (
                  <tr key={c.campaign_source || i}>
                    <td>
                      <ROIGradeBadge grade={c.analysis.grade} roi={c.analysis.roi} />
                    </td>
                    <td style={{ fontWeight:600, fontSize:".72rem" }}>
                      {c.campaign_source}
                    </td>
                    <td>{formatNumber(c.traffic)}</td>
                    <td>
                      <span style={{
                        color: c.analysis.conversion_rate >= 8 ? "#059669" : 
                               c.analysis.conversion_rate >= 5 ? "#0ea5e9" : 
                               c.analysis.conversion_rate >= 3 ? "#f59e0b" : "#dc2626",
                        fontWeight: 700
                      }}>
                        {formatPercent(c.analysis.conversion_rate)}
                      </span>
                    </td>
                    <td>{formatPercent(c.analysis.hv_percentage)}</td>
                    <td>
                      <span style={{
                        color: c.analysis.roi >= 300 ? "#059669" : 
                               c.analysis.roi >= 150 ? "#0ea5e9" : 
                               c.analysis.roi >= 50 ? "#f59e0b" : "#dc2626",
                        fontWeight: 700
                      }}>
                        {formatPercent(c.analysis.roi)}
                      </span>
                    </td>
                    <td>{formatCurrency(c.analysis.cpa)}</td>
                    <td>{formatCurrency(c.analysis.projectedRevenue)}</td>
                    <td>
                      <div style={{
                        background: c.analysis.efficiency >= 75 ? "#dcfce7" :
                                   c.analysis.efficiency >= 50 ? "#dbeafe" :
                                   c.analysis.efficiency >= 25 ? "#fef3c7" : "#fee2e2",
                        color: c.analysis.efficiency >= 75 ? "#059669" :
                               c.analysis.efficiency >= 50 ? "#0284c7" :
                               c.analysis.efficiency >= 25 ? "#d97706" : "#dc2626",
                        padding:"2px 6px",
                        borderRadius:4,
                        fontSize:".65rem",
                        fontWeight:700,
                        textAlign:"center"
                      }}>
                        {c.analysis.efficiency.toFixed(0)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
