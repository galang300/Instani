import numpy as np


def zscore(values: list[float], value: float):
    arr = np.asarray(values, dtype=float)
    if arr.size < 5:
        return {
            "value": value,
            "mean": value,
            "standardDeviation": 0,
            "zScore": 0,
            "status": "INSUFFICIENT_DATA",
        }

    mean = float(arr.mean())
    std = float(arr.std())
    score = 0 if std == 0 else (value - mean) / std
    status = "LOW" if score <= -1.5 else "HIGH" if score >= 1.5 else "NORMAL"
    return {
        "value": value,
        "mean": mean,
        "standardDeviation": std,
        "zScore": score,
        "status": status,
    }
