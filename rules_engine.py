import pandas as pd

MAX_ATTEMPTS  = 5
MAX_IP_REPEAT = 10

SUSPICIOUS_USERNAMES = frozenset({
    "root", "admin", "administrator", "test", "guest", "anonymous",
})
FAILED_STATUSES = frozenset({"failed", "failure", "denied", "0"})

CRITICAL = "CRITICAL"
HIGH     = "HIGH"
MEDIUM   = "MEDIUM"
LOW      = "LOW"

_SEV_RANK = {CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, "": 0}


def _upgrade(current: pd.Series, new_level: str) -> pd.Series:
    """Keep the highest severity seen so far for each row."""
    return current.where(
        current.map(_SEV_RANK) >= _SEV_RANK[new_level],
        other=new_level
    )


def _rule_high_attempts(df, flags, reasons, severities):
    for col in (c for c in df.columns if "attempt" in c):
        mask = pd.to_numeric(df[col], errors="coerce") > MAX_ATTEMPTS
        flags[mask]      = 1
        reasons[mask]   += "High login attempts; "
        severities[mask] = _upgrade(severities[mask], HIGH)


def _rule_failed_login(df, flags, reasons, severities):
    for col in (c for c in df.columns if "status" in c):
        mask = df[col].astype(str).str.lower().isin(FAILED_STATUSES)
        flags[mask]      = 1
        reasons[mask]   += "Failed login; "
        severities[mask] = _upgrade(severities[mask], MEDIUM)


def _rule_suspicious_username(df, flags, reasons, severities):
    for col in (c for c in df.columns if "user" in c):
        mask = df[col].astype(str).str.lower().isin(SUSPICIOUS_USERNAMES)
        flags[mask]      = 1
        reasons[mask]   += "Suspicious username; "
        severities[mask] = _upgrade(severities[mask], CRITICAL)


def _rule_repeated_ip(df, flags, reasons, severities):
    for col in (c for c in df.columns if "ip" in c):
        ip_counts = df[col].astype(str).value_counts()
        mask = df[col].astype(str).map(ip_counts) > MAX_IP_REPEAT
        flags[mask]      = 1
        reasons[mask]   += "Repeated IP; "
        severities[mask] = _upgrade(severities[mask], HIGH)


_RULES = [
    _rule_high_attempts,
    _rule_failed_login,
    _rule_suspicious_username,
    _rule_repeated_ip,
]


def apply_rules(df: pd.DataFrame) -> pd.DataFrame:
    df         = df.copy()
    flags      = pd.Series(0,  index=df.index, dtype=int)
    reasons    = pd.Series("", index=df.index, dtype=str)
    severities = pd.Series("", index=df.index, dtype=str)

    for rule in _RULES:
        rule(df, flags, reasons, severities)

    df["rule_flag"]     = flags
    df["rule_reason"]   = reasons.str.strip("; ")
    df["rule_severity"] = severities.where(flags == 1, other="")
    return df
