import { useState } from "react";
import { predictTrafficType } from "../services/api";

const DEFAULTS = {
  pages_viewed: 15, time_on_site: 600, engagement_score: 2.5, bot_score: 0,
  requests_per_ip: 1, requests_per_session: 1, hour_of_day: 14,
  is_weekend: 0, is_business_hours: 1, seconds_since_last_request: 30,
  avg_time_per_page: 40, is_bounce: 0, error_count: 0,
  bot_indicator_user_agent: 0, bot_indicator_high_freq: 0, bot_indicator_fast_requests: 0,
};

const PRESETS = {
  "High-Value": { pages_viewed:22, time_on_site:1200, engagement_score:4.2, bot_score:0, requests_per_ip:2, requests_per_session:2, hour_of_day:10, is_weekend:0, is_business_hours:1, seconds_since_last_request:45, avg_time_per_page:55, is_bounce:0, error_count:0, bot_indicator_user_agent:0, bot_indicator_high_freq:0, bot_indicator_fast_requests:0 },
  "Likely Bot": { pages_viewed:180, time_on_site:30, engagement_score:0.1, bot_score:0.95, requests_per_ip:500, requests_per_session:200, hour_of_day:3, is_weekend:1, is_business_hours:0, seconds_since_last_request:0.1, avg_time_per_page:0.2, is_bounce:1, error_count:12, bot_indicator_user_agent:1, bot_indicator_high_freq:1, bot_indicator_fast_requests:1 },
  "Normal":     { pages_viewed:4, time_on_site:180, engagement_score:1.5, bot_score:0.05, requests_per_ip:5, requests_per_session:4, hour_of_day:16, is_weekend:0, is_business_hours:1, seconds_since_last_request:20, avg_time_per_page:45, is_bounce:0, error_count:1, bot_indicator_user_agent:0, bot_indicator_high_freq:0, bot_indicator_fast_requests:0 },
};

const TOGGLES = new Set(["is_weekend","is_business_hours","is_bounce","bot_indicator_user_agent","bot_indicator_high_freq","bot_indicator_fast_requests"]);

function classColor(cls) {
  if (!cls) return "var(--t2)";
  const c = cls.toLowerCase();
  if (c.includes("high")) return "var(--green)";
  if (c.includes("bot"))  return "var(--red)";
  return "var(--cyan)";
}

export default function PredictionWorkbench() {
  const [features, setFeatures] = useState({ ...DEFAULTS });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [result,   setResult]   = useState(null);

  function setField(key, val) { setFeatures(p => ({ ...p, [key]: val })); }

  async function runPrediction(e) {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try { 
      const res = await predictTrafficType(features);
      
      // 🔍 DEBUG: Log backend response to console
      console.log("🔍 Backend Response:", res);
      console.log("   Traffic Type:", res?.traffic_type);
      console.log("   Confidence (raw):", res?.confidence, typeof res?.confidence);
      console.log("   Probabilities:", res?.probabilities);
      
      setResult(res);
    }
    catch (err) { 
      console.error("❌ Prediction error:", err);
      setError("Prediction failed — check model files and Flask is running."); 
    }
    finally { setLoading(false); }
  }

  // ✅ FIXED: Safe confidence extraction with backend bug workaround
  const trafficType = result?.traffic_type || result?.prediction;
  const confidence = (() => {
    if (!result) return 0;
    
    // Try to get confidence from result
    if (result.confidence !== undefined && result.confidence !== null) {
      const conf = Number(result.confidence);
      
      // ✅ WORKAROUND: Handle extreme backend bug (value > 100)
      // Backend is incorrectly returning value * 100000 (e.g., 32309 instead of 0.32309)
      if (conf > 100) {
        console.log("🐛 Backend bug detected - extreme value:", conf);
        const normalized = conf / 100000;  // Convert 32309 → 0.32309
        console.log("   Auto-correcting to:", normalized);
        return normalized;
      }
      
      // If it's a percentage (1-100), convert to decimal
      if (conf > 1) {
        console.log("⚠️  Confidence is a percentage, converting:", conf, "→", conf / 100);
        return conf / 100;
      }
      
      // Already a decimal (0-1)
      return conf;
    }
    
    // Fallback: calculate from probabilities
    if (result.probabilities && Object.keys(result.probabilities).length > 0) {
      const maxProb = Math.max(...Object.values(result.probabilities).map(p => Number(p) || 0));
      console.log("ℹ️  Using max probability as confidence:", maxProb);
      return maxProb;
    }
    
    return 0;
  })();

  // Calculate percentage for display
  const confidencePercent = (confidence * 100).toFixed(2);

  return (
    <div>
      <div className="section-header">
        <span className="section-title">ML Prediction Workbench</span>
        <span className="section-sub">Live Random Forest classification · Flask → local model</span>
        <span className="section-tag">CRISP-DM · Deployment</span>
      </div>

      {/* Presets */}
      <div className="filters-bar" style={{ marginBottom: 14 }}>
        <label>Load preset:</label>
        {Object.keys(PRESETS).map(name => (
          <button key={name} type="button" className="btn-refresh"
            onClick={() => { setFeatures({ ...PRESETS[name] }); setResult(null); }}>
            {name}
          </button>
        ))}
      </div>

      <form onSubmit={runPrediction}>
        <div className="prediction-grid">
          {Object.entries(features).map(([key, val]) => (
            <div className="prediction-field" key={key}>
              <span>{key.replace(/_/g," ")}</span>
              {TOGGLES.has(key) ? (
                <div className="toggle-row">
                  {[0,1].map(v => (
                    <button key={v} type="button"
                      className={`toggle-btn ${val === v ? "toggle-btn--active" : ""}`}
                      onClick={() => setField(key, v)}>
                      {v === 1 ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              ) : (
                <input type="number" step="any" value={val}
                  onChange={e => setField(key, parseFloat(e.target.value) || 0)} />
              )}
            </div>
          ))}
          <div className="prediction-actions">
            <button type="submit" className="btn-predict" disabled={loading}>
              {loading ? "Scoring…" : "Run Prediction"}
            </button>
          </div>
        </div>
      </form>

      {error && <p className="status-error">⚠ {error}</p>}

      {result && (
        <div className="result-card">
          <div className="result-class" style={{ color: classColor(trafficType) }}>
            {trafficType || "—"}
          </div>
          <div className="result-meta">
            {/* ✅ FIXED: Display confidence percentage correctly */}
            Confidence: <strong>{confidencePercent}%</strong>
            {result.inference_time_ms !== undefined && (
              <> · Inference: <strong>{result.inference_time_ms} ms</strong></>
            )}
          </div>
          {result.probabilities && (
            <>
              <div style={{ fontSize:".62rem", color:"var(--t3)", marginBottom:8, textTransform:"uppercase", letterSpacing:".08em" }}>Class Probabilities</div>
              {Object.entries(result.probabilities).map(([cls, prob]) => {
                const pct = Math.round(Number(prob) * 100);
                return (
                  <div key={cls} style={{ marginBottom: 8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:".65rem", marginBottom:3 }}>
                      <span style={{ color: classColor(cls) }}>{cls}</span>
                      <span style={{ color:"var(--t2)" }}>{pct}%</span>
                    </div>
                    <div className="score-bar-track" style={{ height: 6 }}>
                      <div className="score-bar-fill" style={{ width:`${pct}%`, background: classColor(cls) }} />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
