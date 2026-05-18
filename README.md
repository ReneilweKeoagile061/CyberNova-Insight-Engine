# CyberNova Insight Engine

**CyberNova Insight Engine** is a full-stack analytics platform for Southern Africa cybersecurity and sales intelligence. It combines a **Databricks-trained ML pipeline** (Random Forest) with a **Flask REST API** and a **React + Vite** dashboard for role-based insights.

> CET333 Product Development · CRISP-DM · Botswana Accountancy College  
> Author: **Reneilwe Keoagile** (BIDA22-061)

---

## Features

| Module | Role | Description |
|--------|------|-------------|
| **Main Dashboard** | Sales, Security | KPIs, trends, confusion matrix, feature importance, priority opportunities |
| **Regional Demand** | Sales | Regional demand and opportunity views |
| **Campaign Performance** | Sales | Campaign metrics and performance tracking |
| **Threat Intelligence** | Security | Threat-focused analytics and signals |
| **ML Predictions** | Sales, Security | Prediction workbench powered by the trained RF model |

- **Role-based access** — Sales and Security users see different tabs after login  
- **Session auth** — Flask session cookies with `withCredentials`  
- **Live simulation** — Toggle streaming/simulated data from the UI  
- **Health monitoring** — API status and record counts in the top bar  

---

## Architecture

```
┌─────────────────────┐     HTTP (REST)      ┌──────────────────────┐
│  React + Vite UI    │ ◄──────────────────► │  Flask API (app.py)  │
│  localhost:3000     │   /api/* + cookies   │  localhost:5000      │
└─────────────────────┘                      └──────────┬───────────┘
                                                          │
                                                          ▼
                                               rf_model.pkl · scaler.pkl
                                               cybernova_sample_data.csv
```

The frontend lives in this repository. The backend runs from `submission_package/` (exported from Databricks).

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.8+ and **pip**

### 1. Backend (Flask API)

```bash
cd submission_package
pip install -r requirements.txt
python app.py
```

API base: `http://localhost:5000`  
Health check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 2. Frontend (React dashboard)

From the project root:

```bash
npm install
```

Create `.env` (or copy `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**PowerShell execution policy** (if `npm` is blocked):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 3. Sign in (demo accounts)

| Role | Email | Password |
|------|-------|----------|
| Sales | `sales@cybernova.ai` | `CyberNovaSales2026` |
| Security | `security@cybernova.ai` | `CyberNovaSecurity2026` |

Dashboard API routes require an active session; unauthenticated calls return `401`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

---

## Project Structure

```
CyberNova-Insight-Engine/
├── src/
│   ├── components/       # Dashboard, Regional, Campaigns, Threats, Predictions, Login
│   ├── contexts/         # AuthContext
│   ├── services/         # api.js (Axios client)
│   └── utils/            # TrendUtils
├── submission_package/   # Flask API, model artifacts, sample data
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## Environment Variables

### Frontend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Flask API base URL |

### Backend (optional)

| Variable | Description |
|----------|-------------|
| `FLASK_SECRET_KEY` | Session signing key |
| `CYBERNOVA_SALES_PASSWORD` | Override sales demo password |
| `CYBERNOVA_SECURITY_PASSWORD` | Override security demo password |
| `CYBERNOVA_CACHE_TTL` | Response cache TTL (seconds, default `45`) |

See `submission_package/README.md` for full API documentation.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 5000 in use | Stop the conflicting process or change Flask port and update `VITE_API_BASE_URL` |
| CORS errors | Ensure Flask has CORS enabled and allows `http://localhost:3000` |
| API Offline in UI | Start Flask first: `python app.py` in `submission_package/` |
| Missing `.pkl` / `.csv` | Keep model files in the same folder as `app.py` |
| `401` on dashboards | Sign in via the login screen |

---

## Submission & Demo Checklist

- [ ] Flask running: `http://localhost:5000/api/health` returns healthy JSON  
- [ ] React running: `http://localhost:3000`  
- [ ] Logged in as Sales or Security  
- [ ] Screenshots of backend terminal + frontend dashboards  

---

## License & Academic Use

Developed for **CET333 Product Development** coursework. For educational and demonstration purposes.

---

## Repository

[https://github.com/ReneilweKeoagile061/CyberNova-Insight-Engine](https://github.com/ReneilweKeoagile061/CyberNova-Insight-Engine)
