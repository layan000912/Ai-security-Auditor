from datetime import datetime


CRITICAL = "critical"
HIGH     = "high"
MEDIUM   = "medium"
LOW      = "low"

_PRIORITY = {CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3}


def _max_ip_count(summary: dict) -> int:
    ip_counts: dict[str, int] = {}
    for row in summary.get("suspicious_table", []):
        ip = str(row.get("ip", row.get("source_ip", "")))
        if ip and ip not in ("", "unknown"):
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
    return max(ip_counts.values(), default=0)


_RULES: list[dict] = [
    {
        "id":      "risk_critical",
        "level":   CRITICAL,
        "title":   "Critical Risk Level",
        "check":   lambda s: s.get("risk_score", 0) >= 70,
        "message": lambda s: f"Risk score reached {s['risk_score']}% — immediate action required",
        "icon": "alert",
    },
    {
        "id":      "risk_high",
        "level":   HIGH,
        "title":   "High Risk Level",
        "check":   lambda s: 40 <= s.get("risk_score", 0) < 70,
        "message": lambda s: f"Risk score is {s['risk_score']}% — review recommended",
        "icon": "warning",
    },
    {
        "id":      "risk_medium",
        "level":   MEDIUM,
        "title":   "Medium Risk Level",
        "check":   lambda s: 20 <= s.get("risk_score", 0) < 40,
        "message": lambda s: f"Risk score is {s['risk_score']}% — monitor the situation",
        "icon": "zap",
    },
    {
        "id":      "high_ratio",
        "level":   CRITICAL,
        "title":   "Very High Suspicious Ratio",
        "check":   lambda s: (s.get("suspicious_events", 0) / max(s.get("total_logs", 1), 1)) > 0.8,
        "message": lambda s: (
            f"{s['suspicious_events']} of {s['total_logs']} logs are suspicious "
            f"({round(s['suspicious_events'] / max(s['total_logs'], 1) * 100)}%)"
        ),
        "icon": "warning",
    },
    {
        "id":      "many_suspicious",
        "level":   HIGH,
        "title":   "Large Number of Suspicious Events",
        "check":   lambda s: s.get("suspicious_events", 0) > 100,
        "message": lambda s: f"Detected {s['suspicious_events']} suspicious events in this file",
        "icon": "alert",
    },
    {
        "id":      "root_login",
        "level":   HIGH,
        "title":   "Root Account Login Attempts",
        "check":   lambda s: any(
            str(r.get("username", r.get("user", ""))).lower() == "root"
            for r in s.get("suspicious_table", [])
        ),
        "message": lambda s: "Root account login attempts detected — high security risk",
        "icon": "user",
    },
    {
        "id":      "admin_login",
        "level":   MEDIUM,
        "title":   "Admin Account Login Attempts",
        "check":   lambda s: any(
            str(r.get("username", r.get("user", ""))).lower() in ("admin", "administrator")
            for r in s.get("suspicious_table", [])
        ),
        "message": lambda s: "Admin account login attempts detected",
        "icon": "user",
    },
    {
        "id":      "ip_attack",
        "level":   HIGH,
        "title":   "Single IP Attack",
        "check":   lambda s: _max_ip_count(s) > 20,
        "message": lambda s: f"A single IP recorded {_max_ip_count(s)} suspicious attempts",
        "icon": "network",
    },
    {
        "id":      "low_accuracy",
        "level":   MEDIUM,
        "title":   "Low Model Accuracy",
        "check":   lambda s: 0 < s.get("model_accuracy", 100) < 60,
        "message": lambda s: f"Model accuracy is {s['model_accuracy']}% — some results may be inaccurate",
        "icon": "trend",
    },
    {
        "id":      "high_accuracy",
        "level":   LOW,
        "title":   "Excellent Model Accuracy",
        "check":   lambda s: s.get("model_accuracy", 0) >= 85,
        "message": lambda s: f"Model {s.get('model_name', 'AI')} achieved {s['model_accuracy']}% accuracy",
        "icon": "check",
    },
    {
        "id":      "rf_winner",
        "level":   LOW,
        "title":   "Random Forest is the Winning Model",
        "check":   lambda s: s.get("model_name") == "Random Forest",
        "message": lambda s: f"Random Forest won with F1={s.get('model_f1', 0)}%",
        "icon": "award",
    },
]


def generate_alerts(summary: dict) -> list[dict]:
    now    = datetime.now().strftime("%H:%M:%S")
    alerts = []
    for rule in _RULES:
        try:
            if rule["check"](summary):
                alerts.append({
                    "id":      rule["id"],
                    "level":   rule["level"],
                    "title":   rule["title"],
                    "message": rule["message"](summary),
                    "icon":    rule["icon"],
                    "time":    now,
                })
        except Exception:
            pass
    return sorted(alerts, key=lambda a: _PRIORITY.get(a["level"], 9))
