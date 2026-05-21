#!/usr/bin/env python3
"""
AfricaGuard — Model retraining script
Trains Random Forest on cybernova_sample_data.csv and optionally registers to Azure ML.
"""
import io
import os
import pickle
import warnings

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

from azure_ml import FEATURE_COLS

DATA_FILE = os.getenv("AFRICAGUARD_DATA_FILE", "cybernova_sample_data.csv")
TARGET_COL = "traffic_type"


def train_and_save():
    print("AfricaGuard — retrain_model.py")
    df = pd.read_csv(DATA_FILE, low_memory=False)
    df[TARGET_COL] = df[TARGET_COL].astype(str).str.strip()

    X = df[FEATURE_COLS].apply(pd.to_numeric, errors="coerce").fillna(0)
    le = LabelEncoder()
    y = le.fit_transform(df[TARGET_COL])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        random_state=42,
        n_jobs=-1,
    )
    rf_model.fit(X_train_s, y_train)
    rf_model.classes_ = le.classes_
    accuracy = rf_model.score(X_test_s, y_test)
    print(f"Accuracy: {accuracy:.4f}")

    with open("rf_model.pkl", "wb") as f:
        pickle.dump(rf_model, f)
    with open("scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    print("Saved rf_model.pkl and scaler.pkl locally")

    _register_azure_ml(rf_model, scaler, accuracy)
    _upload_scaler_blob(scaler)
    return accuracy


def _register_azure_ml(rf_model, scaler, accuracy):
    sub = os.getenv("AZURE_SUBSCRIPTION_ID", "").strip()
    if not sub:
        print("Skip Azure ML registration — set AZURE_SUBSCRIPTION_ID")
        return

    try:
        import mlflow
        import mlflow.sklearn
        from azure.ai.ml import MLClient
        from azure.ai.ml.constants import AssetTypes
        from azure.ai.ml.entities import Model
        from azure.identity import DefaultAzureCredential

        ml_client = MLClient(
            credential=DefaultAzureCredential(),
            subscription_id=sub,
            resource_group_name=os.getenv("AZURE_RESOURCE_GROUP", "rg-africaguard-prod"),
            workspace_name=os.getenv("AZURE_ML_WORKSPACE", "mlw-africaguard"),
        )
        ws = ml_client.workspaces.get(os.getenv("AZURE_ML_WORKSPACE", "mlw-africaguard"))
        mlflow.set_tracking_uri(ws.mlflow_tracking_uri)
        mlflow.set_experiment("africaguard-threat-classification")

        with mlflow.start_run() as run:
            mlflow.log_param("n_estimators", rf_model.n_estimators)
            mlflow.log_param("max_depth", rf_model.max_depth)
            mlflow.log_metric("accuracy", accuracy)
            mlflow.sklearn.log_model(rf_model, "rf_model")
            registered = ml_client.models.create_or_update(
                Model(
                    path=f"runs:/{run.info.run_id}/rf_model",
                    name="africaguard-rf-classifier",
                    description="Random Forest threat classifier — AfricaGuard",
                    type=AssetTypes.MLFLOW_MODEL,
                    tags={"accuracy": str(round(accuracy, 4)), "version": "1.0"},
                )
            )
            print(f"Model registered: {registered.name} v{registered.version}")
    except Exception as exc:
        print(f"Azure ML registration skipped: {exc}")


def _upload_scaler_blob(scaler):
    conn = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "").strip()
    if not conn:
        print("Skip blob upload — set AZURE_STORAGE_CONNECTION_STRING")
        return
    try:
        from azure.storage.blob import BlobServiceClient

        blob_service = BlobServiceClient.from_connection_string(conn)
        container = blob_service.get_container_client("model-artifacts")
        try:
            container.create_container()
        except Exception:
            pass
        scaler_bytes = pickle.dumps(scaler)
        container.upload_blob("scaler.pkl", io.BytesIO(scaler_bytes), overwrite=True)
        print("scaler.pkl uploaded to Azure Blob Storage")
    except Exception as exc:
        print(f"Blob upload skipped: {exc}")


if __name__ == "__main__":
    train_and_save()
