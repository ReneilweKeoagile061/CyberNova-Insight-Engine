# AfricaGuard — Deployment Guide

Migrated from **CyberNova Insight Engine** to a national-scale Azure platform.  
Full phase-by-phase instructions are in your migration spec; this file is the operational quick reference.

## Architecture

```
React (Static Web Apps)  →  Flask API (Container Apps)  →  Azure ML endpoint
        │                          │                              │
   Azure AD B2C              AbuseIPDB / Claude            Databricks + Blob
```

## Local development (default)

```bash
# Terminal 1 — API
cd submission_package
pip install -r requirements.txt
python app.py

# Terminal 2 — Dashboard
npm install
npm run dev
```

| Setting | Value |
|---------|--------|
| Auth | `AUTH_MODE=session` (backend), `VITE_USE_B2C_AUTH=false` (frontend) |
| Sales | `sales@africaguard.ai` / `AfricaGuardSales2026` |
| Security | `security@africaguard.ai` / `AfricaGuardSecurity2026` |

Legacy `@cybernova.ai` accounts still work.

## Migration phases (Azure CLI)

### Phase 0 — Prerequisites

```bash
az login
az group create --name rg-africaguard-prod --location southafricanorth
```

Copy `.env.azure` values into Azure Portal / Container App secrets.

### Phase 1 — Databricks + Azure ML

```bash
az databricks workspace create --name dbw-africaguard --resource-group rg-africaguard-prod --location southafricanorth --sku standard
az ml workspace create --name mlw-africaguard --resource-group rg-africaguard-prod --location southafricanorth
cd submission_package
python retrain_model.py
```

### Phase 2 — ML online endpoint

Deploy `africaguard-rf-classifier` to an online endpoint; set `AZURE_ML_ENDPOINT_URL` and `AZURE_ML_ENDPOINT_KEY`.  
`/api/predict` returns `inference_source: azure_ml` or `local_fallback`.

### Phase 3 — Container Apps

```bash
cd submission_package
az acr create --name africaguardacr --resource-group rg-africaguard-prod --sku Basic --admin-enabled true
az acr login --name africaguardacr
docker build -t africaguardacr.azurecr.io/africaguard-api:v1 .
docker push africaguardacr.azurecr.io/africaguard-api:v1
az containerapp env create --name env-africaguard --resource-group rg-africaguard-prod --location southafricanorth
# az containerapp create ... (see full migration guide)
```

### Phase 4 — Azure AD B2C

1. Create B2C tenant `africaguard`
2. Groups: `AfricaGuard_Sales`, `AfricaGuard_Security`
3. Set `AUTH_MODE=b2c` on API and `VITE_USE_B2C_AUTH=true` on frontend

### Phase 5 — Static Web Apps

```bash
az staticwebapp create --name africaguard-dashboard --resource-group rg-africaguard-prod ...
```

Add GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN` for CI/CD (workflow included).

### Phase 6 — Claude + API Management

- Set `ANTHROPIC_API_KEY` for `/api/explain-threat`
- Deploy APIM `apim-africaguard` for cached AbuseIPDB calls

## Repo rename on GitHub

1. Settings → General → Repository name → `AfricaGuard`
2. Update local remote: `git remote set-url origin https://github.com/ReneilweKeoagile061/AfricaGuard.git`

---

*AfricaGuard v3.0 · Reneilwe Keoagile · BIDA22-061*
