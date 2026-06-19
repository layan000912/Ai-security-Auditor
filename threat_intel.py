import json
import os
from datetime import datetime, timezone

import requests

from utils.database import (
    cache_threat_intel,
    get_cached_threat_intel,
    get_result_by_id,
)

ABUSEIPDB_KEY = os.environ.get("ABUSEIPDB_API_KEY", "")
_CACHE_TTL_HOURS = 24


def _is_stale(last_checked: str) -> bool:
    if not last_checked:
        return True
    try:
        checked = datetime.fromisoformat(last_checked).replace(tzinfo=timezone.utc)
        age_h   = (datetime.now(timezone.utc) - checked).total_seconds() / 3600
        return age_h > _CACHE_TTL_HOURS
    except Exception:
        return True


def _mock(ip: str) -> dict:
    return {
        "ip":            ip,
        "abuse_score":   0,
        "country_code":  "XX",
        "isp":           "Unknown (no API key)",
        "total_reports": 0,
        "is_malicious":  False,
    }


def check_ip_reputation(ip: str, api_key: str | None = None) -> dict:
    key = api_key or ABUSEIPDB_KEY
    if not key:
        return _mock(ip)

    cached = get_cached_threat_intel(ip)
    if cached and not _is_stale(cached.get("last_checked", "")):
        return {
            "ip":            cached["ip"],
            "abuse_score":   cached["abuse_score"],
            "country_code":  cached["country_code"],
            "isp":           cached["isp"],
            "total_reports": cached["total_reports"],
            "is_malicious":  bool(cached["is_malicious"]),
        }

    try:
        resp = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={"Key": key, "Accept": "application/json"},
            params={"ipAddress": ip, "maxAgeInDays": 90},
            timeout=8,
        )
        resp.raise_for_status()
        d    = resp.json().get("data", {})
        result = {
            "ip":            ip,
            "abuse_score":   d.get("abuseConfidenceScore", 0),
            "country_code":  d.get("countryCode", ""),
            "isp":           d.get("isp", ""),
            "total_reports": d.get("totalReports", 0),
            "is_malicious":  d.get("abuseConfidenceScore", 0) >= 50,
        }
    except Exception:
        return _mock(ip)

    cache_threat_intel(ip, result)
    return result


def check_ips_batch(ip_list: list) -> list:
    results = []
    for ip in ip_list:
        if not ip or ip in ("—", "unknown", ""):
            continue
        results.append(check_ip_reputation(ip))
    return results


def enrich_scan(scan_id: int) -> list:
    record = get_result_by_id(scan_id)
    if not record:
        return []

    rows = record["summary"].get("suspicious_table", [])
    seen: set = set()
    ips:  list = []
    for r in rows:
        ip = str(r.get("ip", r.get("source_ip", ""))).strip()
        if ip and ip not in seen and ip not in ("—", "unknown"):
            seen.add(ip)
            ips.append(ip)

    return check_ips_batch(ips[:50])
