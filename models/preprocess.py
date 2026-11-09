import re
import json
import pandas as pd
import numpy as np
from pathlib import Path


_SYSLOG_LINE = re.compile(
    r"(?P<month>\w{3})\s+(?P<day>\d+)\s+(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<hostname>\S+)\s+(?P<service>\S+?)(?:\[(?P<pid>\d+)\])?:\s+(?P<message>.+)"
)
_SSH_FAILED   = re.compile(r"Failed\s+\w+\s+for\s+(?P<username>\S+)\s+from\s+(?P<ip>[\d.]+)\s+port\s+(?P<port>\d+)")
_SSH_ACCEPTED = re.compile(r"Accepted\s+\w+\s+for\s+(?P<username>\S+)\s+from\s+(?P<ip>[\d.]+)\s+port\s+(?P<port>\d+)")
_SSH_INVALID  = re.compile(r"Invalid\s+user\s+(?P<username>\S+)\s+from\s+(?P<ip>[\d.]+)")
_IP_PATTERN   = re.compile(r"\b(\d{1,3}(?:\.\d{1,3}){3})\b")

_FAIL_WORDS    = frozenset({"failed", "failure", "denied", "invalid", "error"})
_SUCCESS_WORDS = frozenset({"accepted", "success", "opened", "connected"})


def _detect_type(path: str) -> str:
    suffix = Path(path).suffix.lower()
    if suffix == ".json":
        return "json"
    if suffix in (".log", ".syslog", ".txt"):
        return "syslog"
    if suffix == ".csv":
        return "csv"
    try:
        with open(path, "r", errors="ignore") as f:
            sample = f.read(500).strip()
        if sample.startswith(("{", "[")):
            return "json"
        if re.search(r"\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}", sample):
            return "syslog"
    except OSError:
        pass
    return "csv"


def _load_csv(path: str) -> pd.DataFrame:
    return pd.read_csv(path, sep=None, engine="python", on_bad_lines="skip")


def _load_json(path: str) -> pd.DataFrame:
    with open(path, "r", errors="ignore") as f:
        raw = json.load(f)

    if isinstance(raw, list):
        records = raw
    elif isinstance(raw, dict):
        records = next((v for v in raw.values() if isinstance(v, list) and v), [raw])
    else:
        records = [raw]

    flat = []
    for rec in records:
        row = {}
        for key, val in rec.items():
            if isinstance(val, dict):
                for k2, v2 in val.items():
                    row[f"{key}_{k2}"] = v2
            elif isinstance(val, list):
                row[key] = ", ".join(str(x) for x in val)
            else:
                row[key] = val
        flat.append(row)

    return pd.DataFrame(flat)


def _load_syslog(path: str) -> pd.DataFrame:
    records = []
    with open(path, "r", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            record = {"raw_message": line}
            m = _SYSLOG_LINE.match(line)
            if m:
                record.update({
                    "timestamp": f"{m.group('month')} {m.group('day')} {m.group('time')}",
                    "hostname":  m.group("hostname"),
                    "service":   m.group("service"),
                    "pid":       m.group("pid") or "",
                    "message":   m.group("message"),
                })
                text = m.group("message")
            else:
                text = line

            for pattern, status in [
                (_SSH_FAILED,   "failed"),
                (_SSH_ACCEPTED, "success"),
                (_SSH_INVALID,  "invalid"),
            ]:
                ssh = pattern.search(text)
                if ssh:
                    record["status"]   = status
                    record["username"] = ssh.groupdict().get("username", "")
                    record["ip"]       = ssh.groupdict().get("ip", "")
                    if "port" in ssh.groupdict():
                        record["port"] = ssh.group("port")
                    break

            if "ip" not in record:
                ip_match = _IP_PATTERN.search(text)
                if ip_match:
                    record["ip"] = ip_match.group(1)

            if "status" not in record:
                lower = text.lower()
                if any(w in lower for w in _FAIL_WORDS):
                    record["status"] = "failed"
                elif any(w in lower for w in _SUCCESS_WORDS):
                    record["status"] = "success"
                else:
                    record["status"] = "unknown"

            records.append(record)

    if not records:
        raise ValueError("Empty file or no valid Syslog records found")
    return pd.DataFrame(records)


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [
        str(c).strip().lower().replace(" ", "_").replace("-", "_")
        for c in df.columns
    ]
    df = df.drop_duplicates()

    for col in df.columns:
        if any(kw in col for kw in ("time", "date", "stamp")):
            df[col] = pd.to_datetime(df[col], errors="coerce", format="mixed")

    df = df.dropna(how="all")
    df = df.fillna("unknown")
    return df


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    priority = ["ip", "username", "user", "service", "status",
                "attempts", "action", "protocol", "port", "hostname", "pid", "message"]

    selected = []
    for kw in priority:
        for col in df.columns:
            if kw in col and col not in selected:
                selected.append(col)

    for col in df.select_dtypes(include=[np.number]).columns:
        if col not in selected:
            selected.append(col)

    selected = [c for c in selected if c != "raw_message"]
    return df[selected] if selected else df


def load_and_clean(path: str) -> pd.DataFrame:
    file_type = _detect_type(path)
    loaders   = {"json": _load_json, "syslog": _load_syslog, "csv": _load_csv}
    df        = loaders[file_type](path)
    df        = _clean(df)
    df.attrs["file_type"] = file_type
    return df
