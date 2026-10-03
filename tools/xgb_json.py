"""Convierte un XGBClassifier a un JSON pequeño que la web evalúa en JavaScript."""
import json

import numpy as np


def booster_to_dict(booster):
    model = json.loads(booster.save_raw("json"))["learner"]
    base_score = float(model["learner_model_param"]["base_score"].strip("[]"))
    trees = []
    for tree in model["gradient_booster"]["model"]["trees"]:
        left = tree["left_children"]
        # cada nodo: [variable, umbral, hijo izquierdo, hijo derecho]; las hojas: [-1, valor]
        nodes = []
        for i in range(len(left)):
            if left[i] == -1:
                nodes.append([-1, round(tree["split_conditions"][i], 6)])  # en las hojas aquí va el valor
            else:
                # el umbral va sin redondear: XGBoost compara en float32 y un redondeo
                # cambia el lado de los valores que caen justo en el corte
                nodes.append([tree["split_indices"][i], tree["split_conditions"][i],
                              left[i], tree["right_children"][i]])
        trees.append(nodes)
    # XGBoost guarda base_score como probabilidad; el margen inicial es su logit
    return {"base": round(float(np.log(base_score / (1 - base_score))), 6), "trees": trees}


def predict(model, X):
    """Lo mismo que hará el JavaScript, para comprobar que da igual que XGBoost."""
    X = np.asarray(X, dtype=np.float32)  # XGBoost trabaja en float32 (en JS: Math.fround)
    out = []
    for row in X:
        margin = model["base"]
        for nodes in model["trees"]:
            n = nodes[0]
            while n[0] != -1:
                n = nodes[n[2]] if row[n[0]] < np.float32(n[1]) else nodes[n[3]]
            margin += n[1]
        out.append(1 / (1 + np.exp(-margin)))
    return np.array(out)
