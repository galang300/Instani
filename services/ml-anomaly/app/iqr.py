import numpy as np


def iqr_status(values: list[float], value: float):
    arr = np.asarray(values, dtype=float)
    if arr.size < 5:
        return "INSUFFICIENT_DATA"
    q1 = float(np.percentile(arr, 25))
    q3 = float(np.percentile(arr, 75))
    iqr = q3 - q1
    if value < q1 - 1.5 * iqr:
        return "LOW"
    if value > q3 + 1.5 * iqr:
        return "HIGH"
    return "NORMAL"
