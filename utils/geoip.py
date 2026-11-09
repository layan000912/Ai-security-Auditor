import re
from collections import Counter

try:
    import requests as _requests
    _REQ_OK = True
except ImportError:
    _REQ_OK = False


_PRIVATE   = re.compile(
    r"^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|::1|localhost)", re.I
)
_BATCH_URL = "https://ip-api.com/batch"
_FIELDS    = "query,status,country,countryCode,city,lat,lon,isp"


def _is_private(ip: str) -> bool:
    return bool(_PRIVATE.match(str(ip).strip()))


def lookup_ips(ip_list: list, timeout: int = 8) -> list:
    if not _REQ_OK:
        return []

    public = list({
        ip for ip in ip_list
        if ip and str(ip) not in ("unknown", "—", "") and not _is_private(str(ip))
    })
    if not public:
        return []

    results = []
    for i in range(0, len(public), 100):
        payload = [{"query": ip, "fields": _FIELDS} for ip in public[i:i + 100]]
        try:
            resp = _requests.post(_BATCH_URL, json=payload, timeout=timeout)
            if not resp.ok:
                continue
            for item in resp.json():
                if item.get("status") == "success":
                    results.append({
                        "ip":           item.get("query", ""),
                        "country":      item.get("country", "—"),
                        "country_code": item.get("countryCode", ""),
                        "city":         item.get("city", "—"),
                        "lat":          float(item.get("lat", 0)),
                        "lon":          float(item.get("lon", 0)),
                        "isp":          item.get("isp", "—"),
                    })
        except Exception:
            pass

    return results


def build_geo_summary(suspicious_table: list) -> dict:
    raw_ips = [
        str(r.get("ip", r.get("source_ip", "")))
        for r in suspicious_table
    ]
    raw_ips = [ip for ip in raw_ips if ip and ip not in ("unknown", "—", "")]

    if not raw_ips:
        return {
            "points": [], "country_counts": {}, "top_countries": [],
            "total_public": 0, "message": "No IP addresses found in suspicious records",
        }

    ip_counts  = Counter(raw_ips)
    geo_data   = lookup_ips(list(ip_counts.keys()))

    if not geo_data:
        return {
            "points": [], "country_counts": {}, "top_countries": [],
            "total_public": 0, "message": "Could not connect to GeoIP service — check internet connection",
        }

    points: list        = []
    country_counts: dict = {}

    for geo in geo_data:
        ip    = geo["ip"]
        count = ip_counts.get(ip, 1)
        points.append({**geo, "count": count})
        c = geo["country"]
        country_counts[c] = country_counts.get(c, 0) + count

    country_counts = dict(sorted(country_counts.items(), key=lambda x: x[1], reverse=True))
    top_countries  = list(country_counts.items())[:10]

    return {
        "points":         points,
        "country_counts": country_counts,
        "top_countries":  [{"country": c, "count": n} for c, n in top_countries],
        "total_public":   len(geo_data),
        "message":        "",
    }
