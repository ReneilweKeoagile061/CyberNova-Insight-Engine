# AfricaGuard API — Azure Container Apps
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py africaguard_auth.py azure_ml.py ./
COPY rf_model.pkl scaler.pkl cybernova_sample_data.csv ./

ENV FLASK_ENV=production
ENV AUTH_MODE=session

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "app:app"]
