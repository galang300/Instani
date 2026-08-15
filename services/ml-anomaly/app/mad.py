import numpy as np


def mad_status(values: list[float], value: float):
    arr = np.asarray(values, dtype=float)
    if arr.size < 5:
        return "INSUFFICIENT_DATA"
    median = float(np.median(arr))
    mad = float(np.median(np.abs(arr - median)))
    if mad == 0:
        return "NORMAL"
    score = 0.6745 * (value - median) / mad
    if score <= -1.5:
        return "LOW"
    if score >= 1.5:
        return "HIGH"
    return "NORMAL"
