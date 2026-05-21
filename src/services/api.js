/**
 * api.js — AfricaGuard
 * Axios client — session cookies (local) or Bearer token (Azure AD B2C).
 */
import axios from "axios";
import { useB2CAuth } from "../auth/msalConfig";

export function getApiBaseUrl() {
  return (import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api").trim();
}

const useCredentials = !useB2CAuth;

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 12000,
  withCredentials: useCredentials,
  headers: { "Content-Type": "application/json" },
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

function classifyError(error) {
  if (error?.response) {
    const s = error.response.status;
    if (s === 401) return { type: "unauthorized", detail: "Session expired. Please sign in again.", status: 401 };
    if (s === 503) return { type: "databricks", detail: "Databricks endpoint unreachable.", status: 503 };
    if (s === 404) return { type: "not_found", detail: "Endpoint not found (404).", status: 404 };
    if (s >= 500) return { type: "server_error", detail: `Server error (HTTP ${s}).`, status: s };
    return { type: `http_${s}`, detail: error.response.statusText || `HTTP ${s}`, status: s };
  }
  const msg = String(error?.message || "");
  if (msg.includes("timeout")) return { type: "timeout", detail: "Request timed out.", status: null };
  if (msg.includes("Network Error")) return { type: "network", detail: "Network error — is the API running?", status: null };
  if (msg.includes("ERR_CONNECTION_REFUSED")) return { type: "connection_refused", detail: "Connection refused — start Flask first.", status: null };
  return { type: "unknown", detail: msg || "Unknown error.", status: null };
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = String(err.config?.url || "");
    if (err.response?.status === 401 && !url.includes("/auth/login")) {
      window.dispatchEvent(new CustomEvent("africaguard:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export const getErrorDetails = (err) => classifyError(err);

export const checkHealth = async () => {
  const c = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 8000,
    withCredentials: useCredentials,
    headers: api.defaults.headers.common,
  });
  return (await c.get("/health")).data;
};

export const testApiUrl = async (baseUrl) => {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  try {
    const r = await axios.get(`${base}/health`, { timeout: 5000, withCredentials: useCredentials });
    return { ok: true, status: r.status, data: r.data, errorType: null, errorDetail: null };
  } catch (e) {
    const p = classifyError(e);
    return { ok: false, status: p.status, data: null, errorType: p.type, errorDetail: p.detail };
  }
};

export const loginUser = async (email, password) =>
  (await api.post("/auth/login", { email, username: email, password })).data;
export const login = loginUser;

export const logoutUser = async () => (await api.post("/auth/logout")).data;
export const logout = logoutUser;

export const getSession = async () => (await api.get("/auth/session")).data;

export async function getDashboardSummary(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString
    ? `/dashboard/summary?${queryString}`
    : "/dashboard/summary";
  return (await api.get(url)).data;
}

export async function getCampaignPerformance() {
  return (await api.get("/campaigns/performance")).data;
}

export async function getPriorityOpportunities(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString
    ? `/dashboard/priority-opportunities?${queryString}`
    : "/dashboard/priority-opportunities";
  return (await api.get(url)).data;
}

export const getRegionalData = async (p = {}) => (await api.get("/dashboard/regional", { params: p })).data;
export const getThreatIntel = async (limit = 50) => (await api.get(`/threat-intel?limit=${limit}`)).data;

export const predict = async (features) => (await api.post("/predict", features)).data;
export const predictTrafficType = predict;
export const predictBatch = async (records) => (await api.post("/predict/batch", { records })).data;

export const explainThreat = async (threatData, audience = "executive") =>
  (await api.post("/explain-threat", { threat_data: threatData, audience })).data;

export default api;
