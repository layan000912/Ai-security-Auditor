import numpy as np
import pandas as pd
from sklearn.ensemble        import IsolationForest, RandomForestClassifier
from sklearn.preprocessing   import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics         import (
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix,
)

_SKIP_COLS = {"rule_flag", "rule_reason", "rule_severity"}


def _fit_encoders(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Fit encoders on training data ONLY — prevents data leakage."""
    df_enc   = df.copy()
    encoders = {}
    for col in df_enc.columns:
        if col in _SKIP_COLS:
            continue
        if df_enc[col].dtype == object:
            le = LabelEncoder()
            df_enc[col]  = le.fit_transform(df_enc[col].astype(str))
            encoders[col] = le
        elif str(df_enc[col].dtype).startswith("datetime"):
            df_enc[col] = df_enc[col].astype(np.int64) // 10 ** 9
    return df_enc, encoders


def _safe_transform(le: LabelEncoder, series: pd.Series) -> np.ndarray:
    """Transform unseen categories to the first known class instead of crashing."""
    known    = set(le.classes_)
    fallback = le.classes_[0]
    mapped   = series.astype(str).apply(lambda x: x if x in known else fallback)
    return le.transform(mapped)


def _apply_encoders(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
    """Apply pre-fitted encoders to test / full data."""
    df_enc = df.copy()
    for col in df_enc.columns:
        if col in _SKIP_COLS:
            continue
        if col in encoders:
            df_enc[col] = _safe_transform(encoders[col], df_enc[col])
        elif str(df_enc[col].dtype).startswith("datetime"):
            df_enc[col] = df_enc[col].astype(np.int64) // 10 ** 9
    return df_enc


def _metrics(y_true, y_pred, n_train, n_test) -> dict:
    return {
        "accuracy":         round(accuracy_score(y_true, y_pred)                   * 100, 2),
        "precision":        round(precision_score(y_true, y_pred, zero_division=0) * 100, 2),
        "recall":           round(recall_score(y_true, y_pred, zero_division=0)    * 100, 2),
        "f1":               round(f1_score(y_true, y_pred, zero_division=0)        * 100, 2),
        "train_size":       n_train,
        "test_size":        n_test,
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def _isolation_forest(X_train, X_test, X_all, y_train, y_test):
    contamination = float(np.clip(y_train.mean(), 0.01, 0.49))

    scaler     = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc  = scaler.transform(X_test)
    X_all_sc   = scaler.transform(X_all)

    model = IsolationForest(n_estimators=200, contamination=contamination,
                            max_samples="auto", random_state=42, n_jobs=-1)
    model.fit(X_train_sc)

    test_preds = np.where(model.predict(X_test_sc) == -1, 1, 0)
    all_preds  = np.where(model.predict(X_all_sc)  == -1, 1, 0)

    result = _metrics(y_test, test_preds, len(X_train), len(X_test))
    result["model_name"]         = "Isolation Forest"
    result["contamination_used"] = round(contamination, 3)
    return all_preds, result


def _random_forest(X_train, X_test, X_all, y_train, y_test):
    model = RandomForestClassifier(n_estimators=100, max_depth=8,
                                   class_weight="balanced", random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    result = _metrics(y_test, model.predict(X_test), len(X_train), len(X_test))
    result["model_name"] = "Random Forest"
    return model.predict(X_all), result, model


_EMPTY_METRICS = {
    "accuracy": 0, "precision": 0, "recall": 0, "f1": 0,
    "train_size": 0, "test_size": 0, "confusion_matrix": [],
    "model_name": "—", "model_comparison": [],
}


def train_and_predict(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    y        = df["rule_flag"].values if "rule_flag" in df.columns else np.zeros(len(df))
    stratify = y if len(np.unique(y)) > 1 else None

    # ── Step 1: split indices BEFORE any encoding ──────────────────────────────
    idx                  = np.arange(len(df))
    idx_train, idx_test  = train_test_split(
        idx, test_size=0.20, random_state=42, stratify=stratify
    )

    df_train = df.iloc[idx_train].reset_index(drop=True)
    df_test  = df.iloc[idx_test].reset_index(drop=True)

    # ── Step 2: fit encoders on TRAIN only, then apply to test & full ──────────
    df_train_enc, encoders = _fit_encoders(df_train)
    df_test_enc            = _apply_encoders(df_test,  encoders)
    df_all_enc             = _apply_encoders(df,       encoders)

    # ── Step 3: select numeric feature columns ─────────────────────────────────
    feature_cols = [
        c for c in df_train_enc.columns
        if c not in _SKIP_COLS and pd.api.types.is_numeric_dtype(df_train_enc[c])
    ]

    if not feature_cols:
        df = df.copy()
        df["ai_flag"] = 0
        return df, _EMPTY_METRICS

    X_train = df_train_enc[feature_cols].fillna(0).values
    X_test  = df_test_enc[feature_cols].fillna(0).values
    X_all   = df_all_enc[feature_cols].fillna(0).values

    y_train = df_train["rule_flag"].values if "rule_flag" in df_train.columns else np.zeros(len(X_train))
    y_test  = df_test["rule_flag"].values  if "rule_flag" in df_test.columns  else np.zeros(len(X_test))

    # ── Step 4: train both models ──────────────────────────────────────────────
    if_preds, if_metrics            = _isolation_forest(X_train, X_test, X_all, y_train, y_test)
    rf_preds, rf_metrics, rf_model  = _random_forest(X_train, X_test, X_all, y_train, y_test)

    if rf_metrics["f1"] >= if_metrics["f1"]:
        best_preds, best = rf_preds, rf_metrics
    else:
        best_preds, best = if_preds, if_metrics

    best["model_comparison"] = [
        {
            "model_name":    if_metrics["model_name"],
            "accuracy":      if_metrics["accuracy"],
            "precision":     if_metrics["precision"],
            "recall":        if_metrics["recall"],
            "f1":            if_metrics["f1"],
            "winner":        if_metrics["f1"] >= rf_metrics["f1"],
            "contamination": if_metrics.get("contamination_used", "—"),
        },
        {
            "model_name":    rf_metrics["model_name"],
            "accuracy":      rf_metrics["accuracy"],
            "precision":     rf_metrics["precision"],
            "recall":        rf_metrics["recall"],
            "f1":            rf_metrics["f1"],
            "winner":        rf_metrics["f1"] > if_metrics["f1"],
            "contamination": "—",
        },
    ]
    best["_rf_model"]     = rf_model
    best["_feature_cols"] = feature_cols
    best["_X_all"]        = X_all

    df = df.copy()
    df["ai_flag"] = best_preds
    return df, best


def combined_flag(df: pd.DataFrame) -> pd.DataFrame:
    df        = df.copy()
    rule_flag = df.get("rule_flag", pd.Series(0, index=df.index))
    ai_flag   = df.get("ai_flag",   pd.Series(0, index=df.index))
    df["suspicious"] = ((rule_flag == 1) | (ai_flag == 1)).astype(int)
    return df
