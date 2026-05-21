// ═══════════════════════════════════════════════════════════════════════════════
// TrendUtils.js — Business Intelligence Utilities for AfricaGuard Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Number Formatting ─────────────────────────────────────────────────────────
export function formatNumber(num) {
  const n = Number(num);
  if (isNaN(n)) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(num, decimals = 1) {
  const n = Number(num);
  return isNaN(n) ? "0%" : `${n.toFixed(decimals)}%`;
}

export function formatCurrency(num) {
  const n = Number(num);
  if (isNaN(n)) return "$0";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

// ─── Trend Calculation ─────────────────────────────────────────────────────────
export function calculateTrend(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  
  if (prev === 0) return { change: 0, percent: 0, direction: "neutral", arrow: "→" };
  
  const change = curr - prev;
  const percent = ((change / prev) * 100);
  
  return {
    change,
    percent,
    direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
    arrow: change > 0 ? "↑" : change < 0 ? "↓" : "→"
  };
}

export function formatTrend(trend, inverse = false) {
  // inverse=true means "down is good" (e.g., bot traffic decrease is positive)
  if (!trend || trend.direction === "neutral") {
    return { text: "→ 0%", color: "#94a3b8", icon: "→" };
  }
  
  const isPositive = inverse ? trend.direction === "down" : trend.direction === "up";
  const color = isPositive ? "#059669" : "#dc2626";
  const sign = trend.percent > 0 ? "+" : "";
  
  return {
    text: `${trend.arrow} ${sign}${trend.percent.toFixed(1)}%`,
    color,
    icon: trend.arrow
  };
}

// ─── Urgency Scoring for Priority Opportunities ────────────────────────────────
export function calculateUrgency(record) {
  const leadScore = Number(record.lead_score) || 0;
  const anomalyScore = Number(record.anomaly_score) || 0;
  const engagementScore = Number(record.engagement_score) || 0;
  
  // High lead + low conversion = urgent opportunity
  // High lead + high anomaly = security concern
  let urgencyScore = 0;
  let urgencyLabel = "LOW";
  let urgencyColor = "#94a3b8";
  let actionTime = "Review within 7 days";
  
  // Sales perspective: high lead score + no conversion
  if (leadScore >= 80) {
    urgencyScore += 40;
  } else if (leadScore >= 60) {
    urgencyScore += 25;
  }
  
  // Engagement factor
  if (engagementScore >= 4) {
    urgencyScore += 20;
  } else if (engagementScore >= 3) {
    urgencyScore += 10;
  }
  
  // Anomaly risk factor
  if (anomalyScore >= 70) {
    urgencyScore += 30; // High anomaly = potential fraud/bot
  }
  
  // Determine urgency level
  if (urgencyScore >= 80) {
    urgencyLabel = "CRITICAL";
    urgencyColor = "#dc2626";
    actionTime = "Contact within 2 hours";
  } else if (urgencyScore >= 60) {
    urgencyLabel = "HIGH";
    urgencyColor = "#d97706";
    actionTime = "Contact within 24 hours";
  } else if (urgencyScore >= 40) {
    urgencyLabel = "MEDIUM";
    urgencyColor = "#0ea5e9";
    actionTime = "Contact within 3 days";
  }
  
  return { urgencyScore, urgencyLabel, urgencyColor, actionTime };
}

// ─── Campaign ROI Calculation ──────────────────────────────────────────────────
export function calculateCampaignROI(campaign) {
  const requests = Number(campaign.total_requests) || 0;
  const conversions = Number(campaign.conversion_count) || 0;
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
  
  // Efficiency score: ratio of HV traffic to conversion rate
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
    hvCount
  };
}

// ─── Regional Market Health Assessment ─────────────────────────────────────────
export function assessMarketHealth(region) {
  const conversionRate = Number(region.conversion_rate) || 0;
  const botRate = Number(region.bot_rate) || 0;
  const hvCount = Number(region.high_value_count) || 0;
  const totalRequests = Number(region.total_requests) || 0;
  const avgLeadScore = Number(region.avg_lead_score) || 0;
  
  let healthScore = 0;
  
  // Positive factors
  if (conversionRate >= 15) healthScore += 30;
  else if (conversionRate >= 10) healthScore += 20;
  else if (conversionRate >= 5) healthScore += 10;
  
  if (avgLeadScore >= 70) healthScore += 20;
  else if (avgLeadScore >= 50) healthScore += 10;
  
  if (hvCount >= 1000) healthScore += 20;
  else if (hvCount >= 500) healthScore += 10;
  
  if (totalRequests >= 10000) healthScore += 15;
  else if (totalRequests >= 5000) healthScore += 10;
  
  // Negative factors
  if (botRate >= 60) healthScore -= 20;
  else if (botRate >= 40) healthScore -= 10;
  
  // Normalize to 0-100
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  // Classification
  let healthLabel = "Poor";
  let healthColor = "#dc2626";
  
  if (healthScore >= 70) {
    healthLabel = "Excellent";
    healthColor = "#059669";
  } else if (healthScore >= 50) {
    healthLabel = "Good";
    healthColor = "#0ea5e9";
  } else if (healthScore >= 30) {
    healthLabel = "Fair";
    healthColor = "#d97706";
  }
  
  return { healthScore, healthLabel, healthColor };
}

// ─── Alert Threshold Checks ────────────────────────────────────────────────────
export function checkAlertThresholds(metrics) {
  const alerts = [];
  
  const botRate = Number(metrics.bot_percentage) || 0;
  const conversionRate = Number(metrics.conversion_rate) || 0;
  const avgLeadScore = Number(metrics.avg_lead_score) || 0;
  
  // Bot traffic alert
  if (botRate >= 60) {
    alerts.push({
      severity: "critical",
      message: `Bot traffic at ${botRate.toFixed(1)}% — above 60% threshold`,
      action: "Review security filters and implement stricter bot detection",
      color: "#dc2626"
    });
  } else if (botRate >= 45) {
    alerts.push({
      severity: "warning",
      message: `Bot traffic at ${botRate.toFixed(1)}% — approaching 60% threshold`,
      action: "Monitor bot patterns and prepare mitigation strategies",
      color: "#d97706"
    });
  }
  
  // Conversion rate alert
  if (conversionRate < 5) {
    alerts.push({
      severity: "warning",
      message: `Conversion rate at ${conversionRate.toFixed(1)}% — below 5% target`,
      action: "Review campaign targeting and landing page optimization",
      color: "#d97706"
    });
  }
  
  // Lead score alert
  if (avgLeadScore < 40) {
    alerts.push({
      severity: "warning",
      message: `Average lead score at ${avgLeadScore.toFixed(0)} — below 40 threshold`,
      action: "Improve lead quality through better targeting and qualification",
      color: "#d97706"
    });
  }
  
  return alerts;
}

// ─── Time Range Utilities ──────────────────────────────────────────────────────
export function getTimeRangeFilter(timeRange) {
  const now = new Date();
  let startDate = null;
  
  switch (timeRange) {
    case "24h":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "all":
    default:
      startDate = null;
  }
  
  return startDate;
}

export function formatTimeRange(timeRange) {
  const labels = {
    "24h": "Last 24 Hours",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    "all": "All Time"
  };
  return labels[timeRange] || "All Time";
}
