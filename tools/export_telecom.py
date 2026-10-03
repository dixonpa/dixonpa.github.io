"""Exporta el XGBoost ajustado del proyecto Telecom para la calculadora de la web.

Repite la preparación y el GridSearch del notebook y guarda en data/telecom.json el
escalado, las categorías del one-hot y los árboles. Se ejecuta con el entorno de telecom:

    ../telecom/.venv/Scripts/python tools/export_telecom.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

from xgb_json import booster_to_dict, predict

RANDOM_STATE = 12345
THRESHOLD = 0.4  # el umbral elegido en el notebook
DATA_DIR = Path(__file__).resolve().parents[2] / "telecom" / "data" / "raw"
OUT = Path(__file__).resolve().parents[1] / "data" / "telecom.json"

contract = pd.read_csv(DATA_DIR / "contract.csv")
personal = pd.read_csv(DATA_DIR / "personal.csv")
internet = pd.read_csv(DATA_DIR / "internet.csv")
phone = pd.read_csv(DATA_DIR / "phone.csv")

df = (
    contract.merge(personal, on="customerID", how="left")
    .merge(internet, on="customerID", how="left")
    .merge(phone, on="customerID", how="left")
)
df["BeginDate"] = pd.to_datetime(df["BeginDate"])
df["EndDate"] = pd.to_datetime(df["EndDate"].replace("No", pd.NA))
df["churn"] = df["EndDate"].notna().astype(int)
df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce").fillna(0)

internet_services = ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"]
df["has_internet"] = df["InternetService"].notna().astype(int)
df["has_phone"] = df["MultipleLines"].notna().astype(int)
df["InternetService"] = df["InternetService"].fillna("No")
df[internet_services] = df[internet_services].fillna("No")
df["MultipleLines"] = df["MultipleLines"].fillna("No")

cutoff_date = df["BeginDate"].max()
df["tenure_months"] = (df["EndDate"].fillna(cutoff_date) - df["BeginDate"]).dt.days / 30.44
df["n_services"] = (df[internet_services] == "Yes").sum(axis=1)

numeric_cols = ["tenure_months", "MonthlyCharges", "TotalCharges", "n_services", "SeniorCitizen", "has_internet", "has_phone"]
categorical_cols = [
    "Type", "PaperlessBilling", "PaymentMethod", "gender", "Partner", "Dependents",
    "InternetService", "MultipleLines", *internet_services,
]
X = df[numeric_cols + categorical_cols]
y = df["churn"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)

pipeline = Pipeline([
    ("prep", ColumnTransformer([
        ("num", StandardScaler(), numeric_cols),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
    ])),
    ("model", XGBClassifier(eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1)),
])
grid = GridSearchCV(
    pipeline,
    {"model__n_estimators": [100, 300], "model__max_depth": [3, 6], "model__learning_rate": [0.05, 0.1, 0.3]},
    scoring="roc_auc",
    cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
    n_jobs=-1,
).fit(X_train, y_train)
final_model = grid.best_estimator_
print("Mejores parámetros:", grid.best_params_)

test_proba = final_model.predict_proba(X_test)[:, 1]
test_pred = test_proba >= THRESHOLD
metrics = {
    "auc": round(roc_auc_score(y_test, test_proba), 3),
    "recall": round(recall_score(y_test, test_pred), 3),
    "precision": round(precision_score(y_test, test_pred), 3),
    "f1": round(f1_score(y_test, test_pred), 3),
}
print("Prueba:", metrics)

prep = final_model.named_steps["prep"]
scaler = prep.named_transformers_["num"]
encoder = prep.named_transformers_["cat"]
model = booster_to_dict(final_model.named_steps["model"].get_booster())

# compruebo que mi evaluación de los árboles da lo mismo que XGBoost
X_test_prep = prep.transform(X_test)
X_test_prep = X_test_prep.toarray() if hasattr(X_test_prep, "toarray") else X_test_prep
diff = np.abs(predict(model, X_test_prep) - test_proba).max()
print(f"Diferencia máxima con XGBoost: {diff:.2e}")
assert diff < 1e-4

out = {
    "numeric": [{"name": c, "mean": float(m), "scale": float(s)} for c, m, s in zip(numeric_cols, scaler.mean_, scaler.scale_)],
    "categorical": [{"name": c, "values": list(v)} for c, v in zip(categorical_cols, encoder.categories_)],
    "threshold": THRESHOLD,
    "metrics": metrics,
    "base_rate": round(float(y.mean()), 3),
    "model": model,
}
OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf8")
print(OUT, f"{OUT.stat().st_size / 1024:.0f} KB")
