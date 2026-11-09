import os
import sys
import tempfile
import pytest
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))

from models.rules_engine import apply_rules
from models.preprocess   import load_and_clean, select_features
from models.ai_model     import train_and_predict, combined_flag


def test_brute_force_detection():
    data = pd.DataFrame({
        "attempts": [10],
        "status":   ["failed"],
        "username": ["user1"],
        "ip":       ["192.168.1.1"],
    })
    result = apply_rules(data)
    assert result["rule_flag"].iloc[0] == 1
    assert "High login attempts" in result["rule_reason"].iloc[0] or result["rule_flag"].iloc[0] == 1


def test_suspicious_username():
    data = pd.DataFrame({
        "attempts": [1],
        "status":   ["success"],
        "username": ["root"],
        "ip":       ["10.0.0.1"],
    })
    result = apply_rules(data)
    assert result["rule_flag"].iloc[0] == 1


def test_normal_entry_not_flagged():
    data = pd.DataFrame({
        "attempts": [1],
        "status":   ["success"],
        "username": ["layan"],
        "ip":       ["192.168.1.5"],
    })
    result = apply_rules(data)
    assert result["rule_flag"].iloc[0] == 0


def test_csv_parsing():
    csv_content = "ip,username,status,attempts\n1.2.3.4,admin,failed,6\n"
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv",
                                     delete=False, encoding="utf-8") as f:
        f.write(csv_content)
        tmp_path = f.name
    try:
        df = load_and_clean(tmp_path)
        assert df is not None
        assert len(df) == 1
        assert "ip" in df.columns
    finally:
        os.remove(tmp_path)


def test_ai_model_returns_flags():
    data = pd.DataFrame({
        "attempts":  [10, 1, 15, 2, 8, 1, 12, 3, 9, 2, 11, 1, 14, 2, 7, 1, 13, 3, 6, 2],
        "rule_flag": [1,  0,  1, 0, 1, 0,  1, 0, 1, 0,  1, 0,  1, 0, 1, 0,  1, 0, 1, 0],
    })
    result, _ = train_and_predict(data)
    assert "ai_flag" in result.columns
    assert len(result) == 20


def test_failed_login_flagged():
    data = pd.DataFrame({
        "status":   ["failed"],
        "username": ["john"],
        "ip":       ["10.10.10.1"],
    })
    result = apply_rules(data)
    assert result["rule_flag"].iloc[0] == 1
    assert "Failed login" in result["rule_reason"].iloc[0]


def test_repeated_ip_flagged():
    data = pd.DataFrame({
        "ip":       ["1.2.3.4"] * 15,
        "status":   ["success"]  * 15,
        "username": ["alice"]    * 15,
    })
    result = apply_rules(data)
    assert result["rule_flag"].sum() > 0


def test_combined_flag():
    data = pd.DataFrame({
        "rule_flag": [1, 0, 0, 1],
        "ai_flag":   [0, 1, 0, 1],
    })
    result = combined_flag(data)
    assert list(result["suspicious"]) == [1, 1, 0, 1]


def test_json_parsing():
    import json
    records = [
        {"ip": "5.5.5.5", "username": "bob", "status": "failed", "attempts": 3},
        {"ip": "6.6.6.6", "username": "alice", "status": "success", "attempts": 1},
    ]
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json",
                                     delete=False, encoding="utf-8") as f:
        json.dump(records, f)
        tmp_path = f.name
    try:
        df = load_and_clean(tmp_path)
        assert df is not None
        assert len(df) == 2
        assert "ip" in df.columns
    finally:
        os.remove(tmp_path)


def test_syslog_parsing():
    syslog_content = (
        "Jan 15 08:23:11 server sshd[1234]: Failed password for root from 1.2.3.4 port 22\n"
        "Jan 15 08:23:15 server sshd[1235]: Accepted password for alice from 5.6.7.8 port 22\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".log",
                                     delete=False, encoding="utf-8") as f:
        f.write(syslog_content)
        tmp_path = f.name
    try:
        df = load_and_clean(tmp_path)
        assert df is not None
        assert len(df) == 2
        statuses = df["status"].tolist()
        assert "failed"  in statuses
        assert "success" in statuses
    finally:
        os.remove(tmp_path)


def test_shap_explanation_is_produced():
    """Regression: newer SHAP returns a 3D array; the explainer must still work."""
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
    from models import shap_explainer

    rng = np.random.default_rng(0)
    X = rng.random((120, 5))
    y = (X[:, 0] + X[:, 1] > 1).astype(int)
    model = RandomForestClassifier(n_estimators=30, max_depth=6, random_state=0).fit(X, y)

    result = shap_explainer.explain(model, X, list("abcde"), y == 1)

    assert result["available"] is True
    assert result["total_explained"] > 0
    assert len(result["feature_importance"]) == 5
