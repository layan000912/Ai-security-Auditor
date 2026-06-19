from datetime import datetime

from utils.database import (
    get_all_feedback,
    get_feedback_stats,
    get_result_by_id,
    save_feedback as _db_save,
)

VALID_LABELS = {"suspicious", "normal"}
MIN_FEEDBACK = 10


def save_analyst_feedback(scan_id: int, entry_index: int,
                          ai_said: str, analyst_says: str,
                          note: str = "") -> dict:
    if ai_said not in VALID_LABELS or analyst_says not in VALID_LABELS:
        return {"error": f"Labels must be one of {VALID_LABELS}"}
    _db_save(scan_id, entry_index, ai_said, analyst_says, note)
    return {"success": True}


def retrain_with_feedback() -> dict:
    rows = get_all_feedback()
    if len(rows) < MIN_FEEDBACK:
        return {
            "error":   f"Need at least {MIN_FEEDBACK} feedback records",
            "needed":  MIN_FEEDBACK,
            "current": len(rows),
        }

    try:
        import numpy as np
        import pandas as pd
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score, f1_score
        from sklearn.model_selection import train_test_split

        records = []
        for r in rows:
            record = get_result_by_id(r["scan_id"])
            if not record:
                continue
            table = record["summary"].get("suspicious_table", [])
            idx   = r["entry_index"]
            if 0 <= idx < len(table):
                entry = table[idx].copy()
                entry["_correct_label"] = 1 if r["correct_label"] == "suspicious" else 0
                records.append(entry)

        if not records:
            return {"error": "No matching entries found in scans"}

        df = pd.DataFrame(records)
        y  = df.pop("_correct_label").values

        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            return {"error": "No numeric features available for retraining"}

        X = df[numeric_cols].fillna(0).values

        if len(set(y)) < 2:
            return {"error": "Need both suspicious and normal samples"}

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        baseline_acc = accuracy_score(
            y_test,
            [int(y.mean() > 0.5)] * len(y_test),
        )

        clf = RandomForestClassifier(n_estimators=100, random_state=42)
        clf.fit(X_train, y_train)
        preds        = clf.predict(X_test)
        new_accuracy = round(accuracy_score(y_test, preds) * 100, 2)
        new_f1       = round(f1_score(y_test, preds, zero_division=0) * 100, 2)
        improvement  = round(new_accuracy - baseline_acc * 100, 2)

        return {
            "new_accuracy":   new_accuracy,
            "new_f1":         new_f1,
            "improvement":    improvement,
            "samples_used":   len(rows),
            "baseline":       round(baseline_acc * 100, 2),
            "retrained_at":   datetime.utcnow().isoformat(timespec="seconds"),
        }

    except Exception as exc:
        return {"error": str(exc)}


def get_model_improvement_trend() -> list:
    rows = get_all_feedback()
    if not rows:
        return []

    snapshots = []
    window    = 10
    for i in range(window, len(rows) + 1, window):
        chunk   = rows[:i]
        correct = sum(1 for r in chunk if r["ai_prediction"] == r["correct_label"])
        acc     = round(correct / len(chunk) * 100, 1)
        snapshots.append({
            "sample":   i,
            "accuracy": acc,
            "date":     chunk[-1].get("created_at", ""),
        })
    return snapshots
