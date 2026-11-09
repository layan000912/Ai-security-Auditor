import os
import uuid
import numpy as np
import pandas as pd
from werkzeug.utils import secure_filename


ALLOWED_EXTENSIONS = frozenset({"csv", "json", "log", "syslog", "txt"})
UPLOAD_FOLDER      = os.path.join(os.path.dirname(__file__), "..", "data")

_INTERNAL_COLS = frozenset({"rule_flag", "ai_flag", "suspicious", "rule_reason"})


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload(file) -> str:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext      = secure_filename(file.filename).rsplit(".", 1)[-1]
    filepath = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4().hex}.{ext}")
    file.save(filepath)
    return filepath


def _get_suspicious_table(df: pd.DataFrame) -> list[dict]:
    if "suspicious" not in df.columns:
        return []
    susp_df = df[df["suspicious"] == 1].head(200).copy()
    for col in susp_df.select_dtypes(include=["datetime64[ns]", "datetimetz"]).columns:
        susp_df[col] = susp_df[col].astype(str)
    return susp_df.to_dict(orient="records")


def _top_values(df: pd.DataFrame, keyword: str, top_n: int = 10) -> dict:
    cols = [c for c in df.columns if keyword in c.lower()]
    if not cols:
        return {}
    return df[cols[0]].astype(str).value_counts().head(top_n).to_dict()


def _dataset_stats(df: pd.DataFrame) -> list[dict]:
    total = len(df)
    stats = []
    for col in df.columns:
        if col in _INTERNAL_COLS:
            continue
        series     = df[col]
        null_count = int(series.isna().sum())
        if series.dtype == object:
            null_count += int((series == "unknown").sum())
        null_pct = round(null_count / total * 100, 1) if total else 0.0
        try:
            sample = str(series.dropna().iloc[0]) if len(series.dropna()) > 0 else "—"
        except Exception:
            sample = "—"
        stats.append({
            "name":       col,
            "dtype":      str(series.dtype),
            "unique":     int(series.nunique()),
            "null_count": null_count,
            "null_pct":   null_pct,
            "sample":     sample[:50],
        })
    return stats


def build_summary(df: pd.DataFrame, metrics: dict | float) -> dict:
    total      = len(df)
    suspicious = int(df["suspicious"].sum()) if "suspicious" in df.columns else 0
    normal     = total - suspicious
    risk_score = round((suspicious / total) * 100, 1) if total else 0.0

    if isinstance(metrics, dict):
        accuracy   = metrics.get("accuracy",         0)
        precision  = metrics.get("precision",         0)
        recall     = metrics.get("recall",            0)
        f1         = metrics.get("f1",                0)
        train_size = metrics.get("train_size",        0)
        test_size  = metrics.get("test_size",         0)
        cm         = metrics.get("confusion_matrix", [])
        model_name = metrics.get("model_name",       "—")
        model_comp = metrics.get("model_comparison", [])
    else:
        accuracy = float(metrics)
        precision = recall = f1 = train_size = test_size = 0
        cm, model_name, model_comp = [], "—", []

    return {
        "total_logs":        total,
        "suspicious_events": suspicious,
        "normal_events":     normal,
        "risk_score":        risk_score,
        "model_accuracy":    accuracy,
        "model_precision":   precision,
        "model_recall":      recall,
        "model_f1":          f1,
        "train_size":        train_size,
        "test_size":         test_size,
        "confusion_matrix":  cm,
        "model_name":        model_name,
        "model_comparison":  model_comp,
        "suspicious_table":  _get_suspicious_table(df),
        "ip_chart":          _top_values(df, keyword="ip"),
        "status_chart":      _top_values(df, keyword="status"),
        "file_type":         df.attrs.get("file_type", "csv"),
        "columns":           list(df.columns),
        "dataset_stats":     _dataset_stats(df),
        "total_columns":     len([c for c in df.columns if c not in _INTERNAL_COLS]),
        "null_pct_overall":  round(
            df.drop(columns=[c for c in _INTERNAL_COLS if c in df.columns], errors="ignore")
              .isnull().mean().mean() * 100, 1
        ),
    }
