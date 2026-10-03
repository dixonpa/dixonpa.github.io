"""Exporta los gráficos agregados y un modelo pequeño de demostración para el proyecto de fraude.

El modelo del proyecto (Random Forest de 200 árboles) pesa cientos de MB, así que para la web
entreno un XGBoost chico con las mismas variables y la misma validación por fechas, y guardo
sus propias métricas en la prueba. Se ejecuta con el entorno de FraudDetection:

    ../FraudDetection/.venv/Scripts/python tools/export_fraud.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, fbeta_score, precision_score, recall_score
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

PROJECT = Path(__file__).resolve().parents[2] / "FraudDetection"
sys.path.append(str(PROJECT))
from src.data.data_clean import clean_data, drop_unnecessary_columns, load_data  # noqa: E402
from src.features.engineering import add_features  # noqa: E402
from src.preprocessing.preprocessing import create_preprocessor  # noqa: E402

from xgb_json import booster_to_dict, predict  # noqa: E402

RANDOM_STATE = 42
OUT = Path(__file__).resolve().parents[1] / "data" / "fraud.json"
numerical_cols = ["amt", "age", "hour", "day_of_week", "distance_km", "city_pop"]
categorical_cols = ["category", "gender"]
features = numerical_cols + categorical_cols


def prepare(file_name):
    return drop_unnecessary_columns(add_features(clean_data(load_data(file_name))))


def make_model():
    # pocos árboles y poco profundos para que el JSON pese poco
    return Pipeline([
        ("prep", create_preprocessor(categorical_cols, numerical_cols)),
        ("model", XGBClassifier(n_estimators=80, max_depth=4, learning_rate=0.2, n_jobs=-1, random_state=RANDOM_STATE)),
    ])


train = prepare("fraudTrain.csv")
test = prepare("fraudTest.csv")
print("Entrenamiento:", train.shape, "Prueba:", test.shape)

# --- gráficos agregados (entrenamiento + prueba) ---
everything = pd.concat([train, test])
by_hour = everything.groupby("hour")["is_fraud"].agg(["mean", "size"])
by_category = everything.groupby("category")["is_fraud"].agg(["mean", "size"]).sort_values("mean", ascending=False)
amount_bins = [0, 10, 25, 50, 100, 200, 300, 500, 800, 1200, 30000]
by_amount = everything.groupby(pd.cut(everything["amt"], amount_bins), observed=True)["is_fraud"].agg(["mean", "size"])

# --- umbral elegido con validación por fechas, igual que en el proyecto ---
split = int(len(train) * 0.8)
valid_model = make_model().fit(train[features].iloc[:split], train["is_fraud"].iloc[:split])
valid_proba = valid_model.predict_proba(train[features].iloc[split:])[:, 1]
y_valid = train["is_fraud"].iloc[split:]
thresholds = np.arange(0.1, 0.95, 0.05).round(2)
f2 = [fbeta_score(y_valid, valid_proba >= t, beta=2) for t in thresholds]
threshold = float(thresholds[int(np.argmax(f2))])
print("Umbral elegido:", threshold)

# --- modelo final y métricas en la prueba ---
final_model = make_model().fit(train[features], train["is_fraud"])
test_proba = final_model.predict_proba(test[features])[:, 1]
test_pred = test_proba >= threshold
metrics = {
    "auc_pr": round(average_precision_score(test["is_fraud"], test_proba), 3),
    "recall": round(recall_score(test["is_fraud"], test_pred), 3),
    "precision": round(precision_score(test["is_fraud"], test_pred), 3),
}
print("Prueba (modelo de demostración):", metrics)

prep = final_model.named_steps["prep"]
scaler = prep.named_transformers_["num"]
encoder = prep.named_transformers_["cat"]
model = booster_to_dict(final_model.named_steps["model"].get_booster())

sample = test.sample(20_000, random_state=RANDOM_STATE)
sample_prep = prep.transform(sample[features])
sample_prep = sample_prep.toarray() if hasattr(sample_prep, "toarray") else sample_prep
diff = np.abs(predict(model, sample_prep) - final_model.predict_proba(sample[features])[:, 1]).max()
print(f"Diferencia máxima con XGBoost: {diff:.2e}")
assert diff < 1e-4

# ejemplos reales de la prueba (solo las variables del modelo, sin datos personales)
examples = pd.concat([
    test[test["is_fraud"] == 1].sample(8, random_state=RANDOM_STATE),
    test[test["is_fraud"] == 0].sample(8, random_state=RANDOM_STATE),
])
examples = [
    {**{c: round(float(row[c]), 2) for c in numerical_cols}, "category": row["category"], "gender": row["gender"],
     "is_fraud": int(row["is_fraud"])}
    for _, row in examples.iterrows()
]

out = {
    "rows": len(everything),
    "fraud_rate": round(float(everything["is_fraud"].mean()), 5),
    "by_hour": [{"hour": int(h), "rate": round(r["mean"], 5), "n": int(r["size"])} for h, r in by_hour.iterrows()],
    "by_category": [{"category": c, "rate": round(r["mean"], 5), "n": int(r["size"])} for c, r in by_category.iterrows()],
    "by_amount": [{"from": int(b.left), "to": int(b.right), "rate": round(r["mean"], 5), "n": int(r["size"])}
                  for b, r in by_amount.iterrows()],
    "medians": {c: round(float(train[c].median()), 2) for c in numerical_cols},
    "numeric": [{"name": c, "mean": float(m), "scale": float(s)} for c, m, s in zip(numerical_cols, scaler.mean_, scaler.scale_)],
    "categorical": [{"name": c, "values": list(v)} for c, v in zip(categorical_cols, encoder.categories_)],
    "threshold": threshold,
    "metrics": metrics,
    "examples": examples,
    "model": model,
}
OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf8")
print(OUT, f"{OUT.stat().st_size / 1024:.0f} KB")
