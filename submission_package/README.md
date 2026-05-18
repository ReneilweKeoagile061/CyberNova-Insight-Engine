# CyberNova Insight Engine - Local Setup Guide

## 📋 Overview

This is the **local execution package** for the CyberNova Insight Engine Flask API. It allows you to run the complete system on your local machine without requiring Databricks access.

## 📦 Package Contents

```
submission_package/
├── app.py                          # Flask API server (standalone)
├── rf_model.pkl                    # Trained Random Forest model
├── scaler.pkl                      # StandardScaler for feature normalization
├── cybernova_sample_data.csv      # Sample dataset (50,000 records)
├── requirements.txt                # Python dependencies
└── README.md                       # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Authentication (CET333 / RSD)

Protected API routes require a Flask **session cookie** after login (`POST /api/auth/login`). Demo accounts:

- **Sales Member:** `sales@cybernova.ai` / `CyberNovaSales2026`
- **Security Analyst:** `security@cybernova.ai` / `CyberNovaSecurity2026`

Set `CYBERNOVA_SALES_PASSWORD` and/or `CYBERNOVA_SECURITY_PASSWORD` in the environment for production demos.  
Set `FLASK_SECRET_KEY` for a stable signing key. Optional response cache TTL: `CYBERNOVA_CACHE_TTL` (seconds, default `45`).

### Setup Instructions

1. **Navigate to the package directory:**
   ```bash
   cd submission_package
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Flask API server:**
   ```bash
   python app.py
   ```

4. **Verify server is running:**
   Open your browser and go to: `http://localhost:5000/api/health`
   
   You should see:
   ```json
   {
     "status": "healthy",
     "model_loaded": true,
     "data_loaded": true,
     "records_count": 50000
   }
   ```

## 🧪 Testing the API

### Using curl (Command Line)

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

**Get Dashboard Summary:**
```bash
curl http://localhost:5000/api/dashboard/summary
```

**Make a Prediction:**
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "pages_viewed": 15,
    "time_on_site": 600,
    "engagement_score": 2.5,
    "bot_score": 0,
    "requests_per_ip": 1,
    "requests_per_session": 1,
    "hour_of_day": 14,
    "is_weekend": 0,
    "is_business_hours": 1,
    "seconds_since_last_request": 30,
    "avg_time_per_page": 40,
    "is_bounce": 0,
    "error_count": 0,
    "bot_indicator_user_agent": 0,
    "bot_indicator_high_freq": 0,
    "bot_indicator_fast_requests": 0
  }'
```

### Using Python requests

```python
import requests

# Health check
response = requests.get('http://localhost:5000/api/health')
print(response.json())

# Dashboard summary
response = requests.get('http://localhost:5000/api/dashboard/summary')
print(response.json())
```

### Using Postman

1. Import the following endpoints:
   - GET `http://localhost:5000/api/health`
   - GET `http://localhost:5000/api/dashboard/summary`
   - GET `http://localhost:5000/api/dashboard/regional`
   - GET `http://localhost:5000/api/campaigns/performance`
   - POST `http://localhost:5000/api/predict`
   - POST `http://localhost:5000/api/predict/batch`

2. For POST requests, set:
   - Headers: `Content-Type: application/json`
   - Body: Raw JSON (see examples above)

## 📊 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/predict` | POST | Single traffic classification |
| `/api/predict/batch` | POST | Batch traffic classification |
| `/api/dashboard/summary` | GET | Dashboard metrics + top leads |
| `/api/dashboard/regional` | GET | Regional demand analysis |
| `/api/campaigns/performance` | GET | Campaign performance metrics |

## 🔧 Technical Details

### Model Information

- **Algorithm:** Random Forest Classifier
- **Training Records:** 400,000
- **Test Accuracy:** 100%
- **Features:** 16 (behavioral, temporal, bot indicators)
- **Classes:** Bot, Normal, High-Value

### Dataset Information

- **Records:** 50,000 (stratified sample)
- **Fields:** 40 (including traffic_type)
- **Time Period:** March 19 - April 18, 2026
- **Traffic Distribution:**
  - Bot: ~48%
  - Normal: ~28%
  - High-Value: ~24%

### Performance Metrics

- Single prediction: ~5-10ms
- Batch prediction (1000 records): <1.15s
- Dashboard query: ~300ms

## 🐛 Troubleshooting

### Port 5000 Already in Use

**Error:** `Address already in use`

**Solution:** Change the port in `app.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=True)
```

### Module Not Found Error

**Error:** `ModuleNotFoundError: No module named 'flask'`

**Solution:** Install dependencies:
```bash
pip install -r requirements.txt
```

### File Not Found Error

**Error:** `FileNotFoundError: rf_model.pkl not found`

**Solution:** Ensure all files are in the same directory:
```
app.py
rf_model.pkl
scaler.pkl
cybernova_sample_data.csv
```

## 📝 Notes for Evaluation

- This is a **standalone version** that runs locally without Databricks
- The sample dataset (50K records) is a stratified subset of the full 500K dataset
- All API endpoints are fully functional and return real data
- The model achieves 100% accuracy on test data
- Server logs show request/response times for performance evaluation

## 📧 Contact

For questions or issues, contact: reneilwekeo@gmail.com

## 🎓 Academic Context

**Course:** CET333 Product Development  
**Institution:** Botswana Accountancy College  
**Project:** CyberNova Insight Engine  
**Submission Date:** May 15, 2026  
