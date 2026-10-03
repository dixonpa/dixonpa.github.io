"""Exporta todos los pares (predicción, reserva real) de validación para la demo de OilyGiant.

Repite el entrenamiento del notebook (misma semilla y división) y guarda los ~25 000
pozos de validación de cada región en data/oilygiant.json (con una muestra el
bootstrap daba resultados distintos). Se ejecuta con el entorno de Onlygiant:

    ../Onlygiant/.venv/Scripts/python tools/export_oilygiant.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split

RANDOM_STATE = 12345
DATA_DIR = Path(__file__).resolve().parents[2] / "Onlygiant" / "data" / "raw"
OUT = Path(__file__).resolve().parents[1] / "data" / "oilygiant.json"
FEATURES = ["f0", "f1", "f2"]


def bootstrap(pred, real, n=1000, points=500, wells=200, seed=RANDOM_STATE):
    state = np.random.RandomState(seed)
    profits = []
    for _ in range(n):
        idx = state.randint(0, len(pred), points)
        best = idx[np.argsort(-pred[idx])[:wells]]
        profits.append(real[best].sum() * 4500 - 100_000_000)
    profits = np.array(profits) / 1e6
    return profits.mean(), (profits < 0).mean() * 100


regions = []
for r in [0, 1, 2]:
    data = pd.read_csv(DATA_DIR / f"geo_data_{r}.csv")
    data = data[~data["id"].duplicated(keep=False)].reset_index(drop=True)
    X_train, X_valid, y_train, y_valid = train_test_split(
        data[FEATURES], data["product"], test_size=0.25, random_state=RANDOM_STATE
    )
    pred = LinearRegression().fit(X_train, y_train).predict(X_valid)
    real = y_valid.to_numpy()
    rmse = root_mean_squared_error(real, pred)

    profit, risk = bootstrap(pred, real)  # comprobación: debe dar lo mismo que el notebook
    print(f"Región {r}: RMSE {rmse:.2f}, ganancia {profit:.2f} M USD, riesgo {risk:.1f}%")

    regions.append({
        "rmse": round(rmse, 2),
        # enteros en décimas de miles de barriles para que el archivo pese poco
        "pred": np.round(pred * 10).astype(int).tolist(),
        "real": np.round(real * 10).astype(int).tolist(),
    })

OUT.write_text(json.dumps({"regions": regions}, separators=(",", ":")))
print(OUT, f"{OUT.stat().st_size / 1024:.0f} KB")
