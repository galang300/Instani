from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.iqr import iqr_status
from app.mad import mad_status
from app.zscore import zscore

app = FastAPI(title="PanganTerkini ML Anomaly", version="0.1.0")


class DetectionPayload(BaseModel):
    values: list[float] = Field(min_length=3)
    value: float


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/detect")
def detect(payload: DetectionPayload):
    return {
        "zScore": zscore(payload.values, payload.value),
        "iqr": iqr_status(payload.values, payload.value),
        "mad": mad_status(payload.values, payload.value),
    }
