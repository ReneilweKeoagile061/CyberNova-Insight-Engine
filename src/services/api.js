/**
 * api.js — CyberNova Insight Engine
 * Axios client with every export needed by all components.
 */
import axios from "axios";

export function getApiBaseUrl() {
  return (import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api").trim();
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 12000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function classifyError(error) {
  if (error?.response) {
    const s = error.response.status;
    if (s === 401) return { type: "unauthorized",  detail: "Session expired. Please sign in again.", status: 401 };
    if (s === 503) return { type: "databricks",     detail: "Databricks endpoint unreachable.",        status: 503 };
    if (s === 404) return { type: "not_found",      detail: "Endpoint not found (404).",               status: 404 };
    if (s >= 500)  return { type: "server_error",   detail: `Server error (HTTP ${s}).`,               status: s   };
    return { type: `http_${s}`, detail: error.response.statusText || `HTTP ${s}`, status: s };
  }
  const msg = String(error?.message || "");
  if (msg.includes("timeout"))               return { type: "timeout",            detail: "Request timed out.",                      status: null };
  if (msg.includes("Network Error"))         return { type: "network",            detail: "Network error — is Flask running?",       status: null };
  if (msg.includes("ERR_CONNECTION_REFUSED"))return { type: "connection_refused", detail: "Connection refused — start Flask first.", status: null };
  return { type: "unknown", detail: msg || "Unknown error.", status: null };
}

api.interceptors.response.use(
  r => r,
  err => {
    const url = String(err.config?.url || "");
    if (err.response?.status === 401 && !url.includes("/auth/login")) {
      window.dispatchEvent(new CustomEvent("cybernova:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export const getErrorDetails = err => classifyError(err);

/* ── Health ── */
export const checkHealth = async () => {
  const c = axios.create({ baseURL: getApiBaseUrl(), timeout: 8000, withCredentials: true });
  return (await c.get("/health")).data;
};

export const testApiUrl = async (baseUrl) => {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  try {
    const r = await axios.get(`${base}/health`, { timeout: 5000, withCredentials: true });
    return { ok: true, status: r.status, data: r.data, errorType: null, errorDetail: null };
  } catch (e) {
    const p = classifyError(e);
    return { ok: false, status: p.status, data: null, errorType: p.type, errorDetail: p.detail };
  }
};

/* ── Auth ── */
export const loginUser = async (email, password) =>
  (await api.post("/auth/login", { email, username: email, password })).data;
export const login = loginUser;

export const logoutUser = async () => (await api.post("/auth/logout")).data;
export const logout = logoutUser;

export const getSession = async () => (await api.get("/auth/session")).data;

/* ── Dashboard ── */
export async function getDashboardSummary(params = {}) {
  // params can include:
  // - timeRange: "24h" | "7d" | "30d" | "90d" | "all"
  // - historical: true (to fetch previous period for comparison)
  
  const queryString = new URLSearchParams(params).toString();
  const url = queryString 
    ? `${getApiBaseUrl()}/dashboard/summary?${queryString}`
    : `${getApiBaseUrl()}/dashboard/summary`;
  
  const response = await axios.get(url, { withCredentials: true });
  return response.data;
}

export async function getCampaignPerformance() {
  const response = await axios.get(
    `${getApiBaseUrl()}/campaigns/performance`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getPriorityOpportunities(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString
    ? `${getApiBaseUrl()}/dashboard/priority-opportunities?${queryString}`
    : `${getApiBaseUrl()}/dashboard/priority-opportunities`;
  
  const response = await axios.get(url, { withCredentials: true });
  return response.data;
}

export const getRegionalData = async (p = {}) => (await api.get("/dashboard/regional", { params: p })).data;
export const getThreatIntel = async (limit = 50) => (await api.get(`/threat-intel?limit=${limit}`)).data;

/* ── ML ── */
export const predict = async (features) => (await api.post("/predict", features)).data;
export const predictTrafficType = predict;
export const predictBatch = async (records) => (await api.post("/predict/batch", { records })).data;