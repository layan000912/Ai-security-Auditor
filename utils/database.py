import json
import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "auditor.db")


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with _conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS scan_results (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            filename     TEXT,
            scanned_at   TEXT,
            summary_json TEXT,
            case_status  TEXT DEFAULT 'Open',
            assigned_to  TEXT DEFAULT 'Unassigned',
            priority     TEXT DEFAULT 'Medium'
        );

        CREATE TABLE IF NOT EXISTS case_timeline (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id      INTEGER,
            old_status   TEXT,
            new_status   TEXT,
            analyst_note TEXT,
            changed_by   TEXT DEFAULT 'Analyst',
            changed_at   TEXT
        );

        CREATE TABLE IF NOT EXISTS analyst_feedback (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id        INTEGER,
            entry_index    INTEGER,
            ai_prediction  TEXT,
            correct_label  TEXT,
            analyst_note   TEXT,
            created_at     TEXT
        );

        CREATE TABLE IF NOT EXISTS threat_intel_cache (
            ip            TEXT PRIMARY KEY,
            abuse_score   INTEGER,
            country_code  TEXT,
            total_reports INTEGER,
            is_malicious  INTEGER,
            isp           TEXT,
            last_checked  TEXT
        );
        """)

        for col, defn in [
            ("case_status", "TEXT DEFAULT 'Open'"),
            ("assigned_to", "TEXT DEFAULT 'Unassigned'"),
            ("priority",    "TEXT DEFAULT 'Medium'"),
        ]:
            try:
                c.execute(f"ALTER TABLE scan_results ADD COLUMN {col} {defn}")
            except sqlite3.OperationalError:
                pass



def save_result(filename: str, summary: dict) -> int:
    init_db()
    with _conn() as c:
        cur = c.execute(
            "INSERT INTO scan_results (filename, scanned_at, summary_json) VALUES (?,?,?)",
            (filename, datetime.utcnow().isoformat(timespec="seconds"),
             json.dumps(summary, ensure_ascii=False)),
        )
        return cur.lastrowid


def get_all_results() -> list:
    init_db()
    with _conn() as c:
        rows = c.execute(
            """SELECT id, filename, scanned_at, summary_json,
                      case_status, assigned_to, priority
               FROM scan_results ORDER BY id DESC"""
        ).fetchall()
    out = []
    for r in rows:
        try:
            summary = json.loads(r["summary_json"] or "{}")
        except Exception:
            summary = {}
        out.append({
            "id":          r["id"],
            "filename":    r["filename"],
            "scanned_at":  r["scanned_at"],
            "summary":     summary,
            "case_status": r["case_status"] or "Open",
            "assigned_to": r["assigned_to"] or "Unassigned",
            "priority":    r["priority"] or "Medium",
        })
    return out


def get_result_by_id(result_id: int) -> dict | None:
    init_db()
    with _conn() as c:
        row = c.execute(
            """SELECT id, filename, scanned_at, summary_json,
                      case_status, assigned_to, priority
               FROM scan_results WHERE id=?""",
            (result_id,),
        ).fetchone()
    if not row:
        return None
    try:
        summary = json.loads(row["summary_json"] or "{}")
    except Exception:
        summary = {}
    return {
        "id":          row["id"],
        "filename":    row["filename"],
        "scanned_at":  row["scanned_at"],
        "summary":     summary,
        "case_status": row["case_status"] or "Open",
        "assigned_to": row["assigned_to"] or "Unassigned",
        "priority":    row["priority"] or "Medium",
    }


def delete_result(result_id: int):
    init_db()
    with _conn() as c:
        c.execute("DELETE FROM scan_results WHERE id=?", (result_id,))
        c.execute("DELETE FROM case_timeline WHERE scan_id=?", (result_id,))
        c.execute("DELETE FROM analyst_feedback WHERE scan_id=?", (result_id,))



def update_case_status(scan_id: int, new_status: str,
                       note: str = "", changed_by: str = "Analyst"):
    init_db()
    with _conn() as c:
        row = c.execute(
            "SELECT case_status FROM scan_results WHERE id=?", (scan_id,)
        ).fetchone()
        old_status = row["case_status"] if row else "Open"

        c.execute(
            """INSERT INTO case_timeline
               (scan_id, old_status, new_status, analyst_note, changed_by, changed_at)
               VALUES (?,?,?,?,?,?)""",
            (scan_id, old_status, new_status, note, changed_by,
             datetime.utcnow().isoformat(timespec="seconds")),
        )
        c.execute(
            "UPDATE scan_results SET case_status=? WHERE id=?",
            (new_status, scan_id),
        )


def assign_case(scan_id: int, assigned_to: str, priority: str):
    init_db()
    with _conn() as c:
        c.execute(
            "UPDATE scan_results SET assigned_to=?, priority=? WHERE id=?",
            (assigned_to, priority, scan_id),
        )


def get_case_timeline(scan_id: int) -> list:
    init_db()
    with _conn() as c:
        rows = c.execute(
            """SELECT id, old_status, new_status, analyst_note,
                      changed_by, changed_at
               FROM case_timeline WHERE scan_id=? ORDER BY id ASC""",
            (scan_id,),
        ).fetchall()
    return [dict(r) for r in rows]



def save_feedback(scan_id: int, entry_index: int,
                  ai_prediction: str, correct_label: str,
                  analyst_note: str = ""):
    init_db()
    with _conn() as c:
        c.execute(
            """INSERT INTO analyst_feedback
               (scan_id, entry_index, ai_prediction, correct_label,
                analyst_note, created_at)
               VALUES (?,?,?,?,?,?)""",
            (scan_id, entry_index, ai_prediction, correct_label,
             analyst_note, datetime.utcnow().isoformat(timespec="seconds")),
        )


def get_feedback_stats() -> dict:
    init_db()
    with _conn() as c:
        rows = c.execute(
            "SELECT ai_prediction, correct_label FROM analyst_feedback"
        ).fetchall()

    total = len(rows)
    if total == 0:
        return {
            "total": 0, "correct": 0, "false_positives": 0,
            "false_negatives": 0, "accuracy_rate": 0.0,
        }

    correct = sum(1 for r in rows if r["ai_prediction"] == r["correct_label"])
    fp      = sum(1 for r in rows
                  if r["ai_prediction"] == "suspicious"
                  and r["correct_label"] == "normal")
    fn      = sum(1 for r in rows
                  if r["ai_prediction"] == "normal"
                  and r["correct_label"] == "suspicious")
    return {
        "total":           total,
        "correct":         correct,
        "false_positives": fp,
        "false_negatives": fn,
        "accuracy_rate":   round(correct / total * 100, 1),
    }


def get_all_feedback() -> list:
    init_db()
    with _conn() as c:
        rows = c.execute(
            """SELECT scan_id, entry_index, ai_prediction,
                      correct_label, analyst_note, created_at
               FROM analyst_feedback ORDER BY id ASC"""
        ).fetchall()
    return [dict(r) for r in rows]



def cache_threat_intel(ip: str, data: dict):
    init_db()
    with _conn() as c:
        c.execute(
            """INSERT OR REPLACE INTO threat_intel_cache
               (ip, abuse_score, country_code, total_reports,
                is_malicious, isp, last_checked)
               VALUES (?,?,?,?,?,?,?)""",
            (
                ip,
                data.get("abuse_score", 0),
                data.get("country_code", ""),
                data.get("total_reports", 0),
                1 if data.get("is_malicious") else 0,
                data.get("isp", ""),
                datetime.utcnow().isoformat(timespec="seconds"),
            ),
        )


def get_cached_threat_intel(ip: str) -> dict | None:
    init_db()
    with _conn() as c:
        row = c.execute(
            "SELECT * FROM threat_intel_cache WHERE ip=?", (ip,)
        ).fetchone()
    return dict(row) if row else None



def get_soar_stats() -> dict:
    init_db()
    with _conn() as c:
        statuses = c.execute(
            "SELECT case_status, COUNT(*) as cnt FROM scan_results GROUP BY case_status"
        ).fetchall()
        total_feedback = c.execute(
            "SELECT COUNT(*) as cnt FROM analyst_feedback"
        ).fetchone()["cnt"]
        total_scans = c.execute(
            "SELECT COUNT(*) as cnt FROM scan_results"
        ).fetchone()["cnt"]

    counts = {r["case_status"]: r["cnt"] for r in statuses}
    return {
        "open":           counts.get("Open", 0),
        "in_progress":    counts.get("In Progress", 0),
        "resolved":       counts.get("Resolved", 0),
        "closed":         counts.get("Closed", 0),
        "total_feedback": total_feedback,
        "total_scans":    total_scans,
    }
