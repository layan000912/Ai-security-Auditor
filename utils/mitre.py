import re
from collections import Counter


TECHNIQUES: dict[str, dict] = {
    "T1110": {
        "id": "T1110", "name": "Brute Force", "name_ar": "هجوم القوة الغاشمة",
        "tactic": "Credential Access", "tactic_ar": "الوصول إلى بيانات الاعتماد",
        "description": "المهاجم يجرب كلمات مرور متعددة للوصول للحساب",
        "severity": "high", "url": "https://attack.mitre.org/techniques/T1110/",
        "indicators": {"status_keywords": ["failed", "failure", "denied"], "min_failed_count": 5},
    },
    "T1078": {
        "id": "T1078", "name": "Valid Accounts", "name_ar": "استخدام حسابات صحيحة",
        "tactic": "Defense Evasion / Persistence", "tactic_ar": "التحايل على الدفاع / الاستمرارية",
        "description": "المهاجم يستخدم حسابات شرعية (root, admin) للوصول",
        "severity": "high", "url": "https://attack.mitre.org/techniques/T1078/",
        "indicators": {"username_keywords": ["root", "admin", "administrator"], "min_failed_count": 0},
    },
    "T1021": {
        "id": "T1021", "name": "Remote Services", "name_ar": "الخدمات عن بُعد",
        "tactic": "Lateral Movement", "tactic_ar": "الحركة الجانبية",
        "description": "المهاجم يستخدم خدمات SSH/RDP/Telnet للوصول للأنظمة",
        "severity": "medium", "url": "https://attack.mitre.org/techniques/T1021/",
        "indicators": {"service_keywords": ["ssh", "rdp", "telnet", "ftp", "smb"], "min_failed_count": 0},
    },
    "T1190": {
        "id": "T1190", "name": "Exploit Public-Facing Application", "name_ar": "استغلال التطبيقات المكشوفة",
        "tactic": "Initial Access", "tactic_ar": "الوصول الأولي",
        "description": "المهاجم يستغل ثغرات في التطبيقات المتاحة للعموم",
        "severity": "critical", "url": "https://attack.mitre.org/techniques/T1190/",
        "indicators": {
            "status_keywords": ["error", "exploit", "injection", "overflow"],
            "service_keywords": ["http", "https", "web", "apache", "nginx"],
            "min_failed_count": 0,
        },
    },
    "T1133": {
        "id": "T1133", "name": "External Remote Services", "name_ar": "الخدمات الخارجية عن بُعد",
        "tactic": "Initial Access / Persistence", "tactic_ar": "الوصول الأولي / الاستمرارية",
        "description": "وصول من خارج الشبكة عبر خدمات VPN أو Remote Desktop",
        "severity": "medium", "url": "https://attack.mitre.org/techniques/T1133/",
        "indicators": {"service_keywords": ["vpn", "remote", "external"], "min_failed_count": 0},
    },
}

SEVERITY_COLOR = {
    "critical": "#ff3d71", "high": "#ff8c00", "medium": "#ffd740", "low": "#00e5ff",
}


def _count_failed(rows: list[dict]) -> int:
    fail_words = {"failed", "failure", "denied", "error"}
    return sum(
        1 for row in rows
        if any(w in str(row.get("status", row.get("label", ""))).lower() for w in fail_words)
    )


def _has_username(rows: list[dict], usernames: list[str]) -> bool:
    return any(
        any(u in str(row.get("username", row.get("user", ""))).lower() for u in usernames)
        for row in rows
    )


def _has_service(rows: list[dict], services: list[str]) -> bool:
    return any(
        any(s in str(row.get("service", row.get("protocol", ""))).lower() for s in services)
        for row in rows
    )


def _top_ips(rows: list[dict], top_n: int = 3) -> list[str]:
    ips = [
        str(r.get("ip", r.get("source_ip", "")))
        for r in rows
        if r.get("ip") or r.get("source_ip")
    ]
    ips = [ip for ip in ips if ip and ip != "unknown"]
    return [ip for ip, _ in Counter(ips).most_common(top_n)]


def map_to_mitre(summary: dict) -> dict:
    rows          = summary.get("suspicious_table", [])
    failed_count  = _count_failed(rows)
    matched       = []

    for tech in TECHNIQUES.values():
        ind       = tech["indicators"]
        triggered = False

        if ind.get("min_failed_count", 0) > 0 and failed_count >= ind["min_failed_count"]:
            triggered = True
        if not triggered and ind.get("username_keywords") and _has_username(rows, ind["username_keywords"]):
            triggered = True
        if not triggered and ind.get("service_keywords") and _has_service(rows, ind["service_keywords"]):
            triggered = True
        if not triggered and ind.get("status_keywords"):
            triggered = any(
                any(kw in str(row.get("status", row.get("label", ""))).lower()
                    for kw in ind["status_keywords"])
                for row in rows
            )

        if triggered:
            matched.append({
                "id":          tech["id"],
                "name":        tech["name"],
                "name_ar":     tech["name_ar"],
                "tactic":      tech["tactic"],
                "tactic_ar":   tech["tactic_ar"],
                "description": tech["description"],
                "severity":    tech["severity"],
                "color":       SEVERITY_COLOR.get(tech["severity"], "#cde8ef"),
                "url":         tech["url"],
            })

    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    matched.sort(key=lambda t: severity_order.get(t["severity"], 9))

    return {
        "matched_techniques": matched,
        "tactics_summary":    list({t["tactic_ar"] for t in matched}),
        "top_ips":            _top_ips(rows),
        "total_matched":      len(matched),
        "failed_attempts":    failed_count,
    }
