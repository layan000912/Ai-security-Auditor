import logging
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify, render_template, send_file
from flask_socketio import SocketIO, emit

from models.preprocess import load_and_clean, select_features
from models.rules_engine import apply_rules
from models.ai_model import train_and_predict, combined_flag
from utils.helpers import allowed_file, save_upload, build_summary
from utils.database import (
    save_result, get_all_results, get_result_by_id, delete_result,
    update_case_status, assign_case, get_case_timeline,
    save_feedback, get_feedback_stats, get_soar_stats, init_db,
)
from utils.pdf_report import generate_pdf
from utils.alerts import generate_alerts
from utils.geoip import build_geo_summary
from utils.excel_export import generate_excel
from models.shap_explainer import explain as shap_explain
from utils.mitre import map_to_mitre

logging.basicConfig(level=logging.ERROR)
_logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or os.urandom(24)

socketio = SocketIO(app, cors_allowed_origins="*")
init_db()

_rate_store = defaultdict(list)
RATE_LIMIT  = 10
RATE_WINDOW = 60

def _get_client_ip() -> str:
    if os.environ.get("TRUST_PROXY") == "1":
        forwarded = request.headers.get("X-Forwarded-For", "")
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip
    return request.remote_addr or "unknown"

def _is_rate_limited(ip: str) -> bool:
    now   = time.time()
    calls = [t for t in _rate_store[ip] if now - t < RATE_WINDOW]
    _rate_store[ip] = calls
    if len(calls) >= RATE_LIMIT:
        return True
    _rate_store[ip].append(now)
    return False

_GEO_CACHE_MAX = 200
_geo_cache: dict = {}



@app.route("/")
def index():
    return render_template("index.html")

@app.route("/history")
def history_page():
    return render_template("history.html")

@app.route("/explain")
def explain_page():
    return render_template("explain.html")

@app.route("/alerts")
def alerts_page():
    return render_template("alerts.html")

@app.route("/timeline")
def timeline_page():
    return render_template("timeline.html")

@app.route("/map")
def map_page():
    return render_template("map.html")

@app.route("/monitor")
def monitor_page():
    return render_template("monitor.html")

@app.route("/ip-analytics")
def ip_analytics_page():
    return render_template("ip_analytics.html")

@app.route("/methodology")
def methodology_page():
    return render_template("methodology.html")

@app.route("/evaluation")
def evaluation_page():
    return render_template("evaluation.html")

@app.route("/dataset-stats")
def dataset_stats_page():
    return render_template("dataset_stats.html")

@app.route("/soar")
def soar_page():
    return render_template("soar.html")



def _run_analysis(file):
    filepath      = save_upload(file)
    original_name = file.filename
    try:
        df          = load_and_clean(filepath)
        df          = select_features(df)
        df          = apply_rules(df)
        df, metrics = train_and_predict(df)
        df          = combined_flag(df)
        summary     = build_summary(df, metrics)

        rf_model     = metrics.pop("_rf_model",     None)
        feature_cols = metrics.pop("_feature_cols", [])
        X_all        = metrics.pop("_X_all",        None)

        if rf_model is not None and X_all is not None:
            import numpy as np
            susp_mask = df["suspicious"].values == 1 if "suspicious" in df.columns else None
            summary["shap"] = shap_explain(
                model=rf_model, X_all=X_all, feature_cols=feature_cols,
                suspicious_mask=susp_mask if susp_mask is not None else np.zeros(len(X_all), dtype=bool),
            )
        else:
            summary["shap"] = {"available": False, "reason": "Model not available"}

        summary["mitre"]  = map_to_mitre(summary)
        summary["alerts"] = generate_alerts(summary)
    finally:
        try:
            os.remove(filepath)
        except Exception:
            pass

    return original_name, summary


@app.route("/analyze", methods=["POST"])
def analyze():
    if _is_rate_limited(_get_client_ip()):
        return jsonify({"error": "Rate limit exceeded — please wait a minute"}), 429

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Filename is empty"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Accepted formats: CSV, JSON, LOG, SYSLOG, TXT"}), 400

    try:
        original_name, summary = _run_analysis(file)
        record_id              = save_result(original_name, summary)
        summary["record_id"]   = record_id
        return jsonify(summary)
    except Exception:
        _logger.exception("File analysis error")
        return jsonify({"error": "Analysis failed — check logs"}), 500



@app.route("/api/history", methods=["GET"])
def api_history():
    return jsonify(get_all_results())

@app.route("/api/history/<int:result_id>", methods=["GET"])
def api_history_detail(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404
    return jsonify(result)

@app.route("/api/history/<int:result_id>", methods=["DELETE"])
def api_history_delete(result_id):
    delete_result(result_id)
    return jsonify({"deleted": True})



@app.route("/api/alerts/<int:result_id>", methods=["GET"])
def api_alerts(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404
    return jsonify(generate_alerts(result["summary"]))



@app.route("/api/report/<int:result_id>", methods=["GET"])
def api_report(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404
    try:
        import io
        buf = io.BytesIO(generate_pdf(result["summary"], result["filename"]))
        buf.seek(0)
        return send_file(buf, mimetype="application/pdf", as_attachment=True,
                         download_name=f"security_report_{result_id}.pdf")
    except Exception:
        _logger.exception("PDF generation failed for record %d", result_id)
        return jsonify({"error": "Report generation failed"}), 500



@app.route("/api/export/excel/<int:result_id>", methods=["GET"])
def api_export_excel(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404
    try:
        import io
        buf = io.BytesIO(generate_excel(result["summary"], result["filename"]))
        buf.seek(0)
        return send_file(
            buf,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"security_report_{result_id}.xlsx",
        )
    except Exception:
        _logger.exception("Excel export failed for record %d", result_id)
        return jsonify({"error": "Excel export failed"}), 500



@app.route("/api/timeline/<int:result_id>", methods=["GET"])
def api_timeline(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404

    summary  = result["summary"]
    rows     = summary.get("suspicious_table", [])
    time_col = next(
        (col for col in summary.get("columns", [])
         if any(k in col for k in ("time", "date", "stamp"))),
        None,
    )

    hourly   = {str(h).zfill(2): 0 for h in range(24)}
    daily    = {}
    timeline = []

    for r in rows:
        raw = r.get(time_col, "") if time_col else ""
        try:
            import pandas as pd
            ts = pd.to_datetime(raw, errors="coerce")
            if pd.isna(ts):
                raise ValueError
            hour = str(ts.hour).zfill(2)
            day  = ts.strftime("%Y-%m-%d")
            hourly[hour] = hourly.get(hour, 0) + 1
            daily[day]   = daily.get(day, 0) + 1
            timeline.append({
                "time":     ts.strftime("%Y-%m-%d %H:%M"),
                "hour":     ts.hour,
                "username": r.get("username", r.get("user", "—")),
                "ip":       r.get("ip", r.get("source_ip", "—")),
                "service":  r.get("service", "—"),
                "status":   r.get("status", "—"),
                "reason":   r.get("rule_reason", "—"),
            })
        except Exception:
            pass

    peak_hour = max(hourly, key=lambda h: hourly[h]) if any(hourly.values()) else "—"

    return jsonify({
        "filename":         result["filename"],
        "scanned_at":       result["scanned_at"],
        "total_suspicious": summary.get("suspicious_events", 0),
        "hourly":           hourly,
        "daily":            daily,
        "peak_hour":        peak_hour,
        "timeline":         timeline[:200],
        "has_time":         bool(timeline),
    })


@app.route("/api/timeline/latest", methods=["GET"])
def api_timeline_latest():
    rows = get_all_results()
    if not rows:
        return jsonify({"error": "No saved analyses found"}), 404
    from flask import redirect, url_for
    return redirect(url_for("api_timeline", result_id=rows[0]["id"]))



@app.route("/api/compare", methods=["GET"])
def api_compare():
    id1 = request.args.get("id1", type=int)
    id2 = request.args.get("id2", type=int)
    if not id1 or not id2:
        return jsonify({"error": "id1 and id2 are required"}), 400

    r1 = get_result_by_id(id1)
    r2 = get_result_by_id(id2)
    if not r1 or not r2:
        return jsonify({"error": "One of the records was not found"}), 404

    def _extract(r):
        s = r["summary"]
        return {
            "id":                r["id"],
            "filename":          r["filename"],
            "scanned_at":        r["scanned_at"],
            "total_logs":        s.get("total_logs", 0),
            "suspicious_events": s.get("suspicious_events", 0),
            "normal_events":     s.get("normal_events", 0),
            "risk_score":        s.get("risk_score", 0),
            "model_accuracy":    s.get("model_accuracy", 0),
            "model_f1":          s.get("model_f1", 0),
            "model_name":        s.get("model_name", "—"),
        }

    return jsonify({"scan1": _extract(r1), "scan2": _extract(r2)})



@app.route("/api/geo/<int:result_id>", methods=["GET"])
def api_geo(result_id):
    if result_id in _geo_cache:
        return jsonify(_geo_cache[result_id])

    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404

    summary = result["summary"]
    payload = {
        "filename":   result["filename"],
        "scanned_at": result["scanned_at"],
        "suspicious": summary.get("suspicious_events", 0),
        **build_geo_summary(summary.get("suspicious_table", [])),
    }
    if len(_geo_cache) >= _GEO_CACHE_MAX:
        _geo_cache.pop(next(iter(_geo_cache)))
    _geo_cache[result_id] = payload
    return jsonify(payload)



@app.route("/api/ip-analytics/<int:result_id>", methods=["GET"])
def api_ip_analytics(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404

    rows    = result["summary"].get("suspicious_table", [])
    ip_stats: dict = {}

    for row in rows:
        ip = str(row.get("ip", row.get("source_ip", "unknown")))
        if ip not in ip_stats:
            ip_stats[ip] = {"ip": ip, "count": 0, "usernames": set(),
                            "services": set(), "statuses": {}, "reasons": set()}
        st = ip_stats[ip]
        st["count"] += 1

        u = str(row.get("username", row.get("user", "")))
        if u and u not in ("unknown", ""):
            st["usernames"].add(u)

        svc = str(row.get("service", ""))
        if svc and svc != "unknown":
            st["services"].add(svc)

        status = str(row.get("status", "unknown")).lower()
        st["statuses"][status] = st["statuses"].get(status, 0) + 1

        reason = str(row.get("rule_reason", ""))
        if reason:
            st["reasons"].add(reason)

    ip_list = []
    for ip, st in ip_stats.items():
        fail  = sum(st["statuses"].get(k, 0) for k in ("failed", "failure", "denied"))
        total = st["count"]
        risk  = ("critical" if fail > 20 or total > 50 else
                 "high"     if fail > 10 or total > 20 else
                 "medium"   if fail > 3  or total > 5  else "low")
        ip_list.append({
            "ip":        ip,
            "count":     total,
            "fail":      fail,
            "usernames": list(st["usernames"])[:5],
            "services":  list(st["services"])[:5],
            "statuses":  st["statuses"],
            "reasons":   list(st["reasons"])[:3],
            "risk":      risk,
        })

    ip_list.sort(key=lambda x: x["count"], reverse=True)
    return jsonify({
        "filename":   result["filename"],
        "scanned_at": result["scanned_at"],
        "total_ips":  len(ip_list),
        "ips":        ip_list[:100],
    })



@app.route("/api/evaluation/<int:result_id>", methods=["GET"])
def api_evaluation(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404

    s      = result["summary"]
    total  = s.get("total_logs", 1) or 1
    susp   = s.get("suspicious_events", 0)
    baseline = {
        "model_name":       "Baseline (Random)",
        "accuracy":         round(max(susp, total - susp) / total * 100, 2),
        "precision":        0,
        "recall":           0,
        "f1":               0,
        "auc_roc":          50.0,
        "confusion_matrix": [],
        "winner":           False,
        "note":             "Majority-class classifier",
    }

    return jsonify({
        "filename":   result["filename"],
        "scanned_at": result["scanned_at"],
        "winner":     s.get("model_name", "—"),
        "models":     s.get("model_comparison", []) + [baseline],
        "train_size": s.get("train_size", 0),
        "test_size":  s.get("test_size",  0),
        "total_logs": s.get("total_logs", 0),
    })



@app.route("/api/dataset-stats/<int:result_id>", methods=["GET"])
def api_dataset_stats(result_id):
    result = get_result_by_id(result_id)
    if not result:
        return jsonify({"error": "Record not found"}), 404

    s = result["summary"]
    return jsonify({
        "filename":      result["filename"],
        "scanned_at":    result["scanned_at"],
        "total_logs":    s.get("total_logs",       0),
        "total_columns": s.get("total_columns",    0),
        "null_pct":      s.get("null_pct_overall", 0),
        "suspicious":    s.get("suspicious_events", 0),
        "normal":        s.get("normal_events",     0),
        "file_type":     s.get("file_type",         "—"),
        "columns":       s.get("dataset_stats",    []),
        "status_chart":  s.get("status_chart",     {}),
        "ip_chart":      s.get("ip_chart",         {}),
        "shap":          s.get("shap",             {}),
    })



@app.route("/batch-analyze", methods=["POST"])
def batch_analyze():
    if _is_rate_limited(_get_client_ip()):
        return jsonify({"error": "Rate limit exceeded"}), 429

    files = request.files.getlist("files")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No files uploaded"}), 400

    results, errors = [], []

    for file in files[:10]:
        if not file.filename or not allowed_file(file.filename):
            errors.append({"filename": file.filename, "error": "Unsupported format"})
            continue
        try:
            original_name, summary = _run_analysis(file)
            record_id = save_result(original_name, summary)
            results.append({
                "filename":          original_name,
                "record_id":         record_id,
                "total_logs":        summary.get("total_logs", 0),
                "suspicious_events": summary.get("suspicious_events", 0),
                "risk_score":        summary.get("risk_score", 0),
                "model_name":        summary.get("model_name", "—"),
                "model_f1":          summary.get("model_f1", 0),
            })
        except Exception:
            _logger.exception("Batch analysis error for %s", file.filename)
            errors.append({"filename": file.filename, "error": "Analysis failed — check logs"})

    return jsonify({"results": results, "errors": errors})



_IP_RE      = re.compile(r"\b(\d{1,3}(?:\.\d{1,3}){3})\b")
_USER_RE    = re.compile(r"(?:for|user)\s+(\S+)", re.I)
_FAIL_KW    = frozenset({"failed", "failure", "denied", "invalid", "error", "refused"})
_SUCC_KW    = frozenset({"accepted", "success", "opened", "connected", "granted"})
_SUSP_USERS = frozenset({"root", "admin", "administrator", "test", "guest", "anonymous"})


def _analyze_line(line: str) -> dict:
    lower  = line.lower()
    result = {
        "line":      line[:300],
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "suspicious": False,
        "ip":        "—",
        "username":  "—",
        "status":    "unknown",
        "reasons":   [],
    }

    m_ip = _IP_RE.search(line)
    if m_ip:
        result["ip"] = m_ip.group(1)

    if any(w in lower for w in _FAIL_KW):
        result["status"]     = "failed"
        result["suspicious"] = True
        result["reasons"].append("Login failure")
    elif any(w in lower for w in _SUCC_KW):
        result["status"] = "success"

    m_user = _USER_RE.search(line)
    if m_user:
        username = m_user.group(1).strip(".,;:")
        result["username"] = username
        if username.lower() in _SUSP_USERS:
            result["suspicious"] = True
            result["reasons"].append(f"Suspicious username: {username}")

    m_att = re.search(r"(\d+)\s*(?:attempt|tries|failure)", lower)
    if m_att and int(m_att.group(1)) > 5:
        result["suspicious"] = True
        result["reasons"].append(f"High attempts: {m_att.group(1)}")

    result["reason"] = "; ".join(result["reasons"]) or "Normal"
    return result


@socketio.on("analyze_line")
def handle_analyze_line(data):
    line = str(data.get("line", "")).strip()
    if line:
        emit("line_result", _analyze_line(line))


@socketio.on("analyze_bulk")
def handle_analyze_bulk(data):
    lines = [l.strip() for l in str(data.get("text", "")).splitlines() if l.strip()]
    stats = {"total": len(lines), "suspicious": 0, "normal": 0}
    for line in lines:
        result = _analyze_line(line)
        stats["suspicious" if result["suspicious"] else "normal"] += 1
        emit("line_result", result)
    emit("bulk_done", stats)



@app.route("/api/case/<int:scan_id>/status", methods=["PUT"])
def api_case_status(scan_id):
    body = request.get_json(silent=True) or {}
    new_status = body.get("new_status", "").strip()
    if new_status not in ("Open", "In Progress", "Resolved", "Closed"):
        return jsonify({"success": False, "error": "Invalid status"}), 400
    update_case_status(
        scan_id, new_status,
        note=body.get("note", ""),
        changed_by=body.get("changed_by", "Analyst"),
    )
    return jsonify({"success": True, "data": {"status": new_status}})


@app.route("/api/case/<int:scan_id>/timeline", methods=["GET"])
def api_case_timeline(scan_id):
    return jsonify({"success": True, "data": get_case_timeline(scan_id)})


@app.route("/api/case/<int:scan_id>/assign", methods=["PUT"])
def api_case_assign(scan_id):
    body = request.get_json(silent=True) or {}
    assigned_to = body.get("assigned_to", "Unassigned")
    priority    = body.get("priority", "Medium")
    if priority not in ("Low", "Medium", "High", "Critical"):
        priority = "Medium"
    assign_case(scan_id, assigned_to, priority)
    return jsonify({"success": True, "data": {"assigned_to": assigned_to, "priority": priority}})



@app.route("/api/threat-intel/<int:scan_id>", methods=["GET"])
def api_threat_intel(scan_id):
    try:
        from utils.threat_intel import enrich_scan
        data = enrich_scan(scan_id)
        return jsonify({"success": True, "data": data})
    except Exception as exc:
        _logger.exception("Threat intel error for scan %d", scan_id)
        return jsonify({"success": False, "error": str(exc)}), 500



@app.route("/api/feedback", methods=["POST"])
def api_feedback():
    body = request.get_json(silent=True) or {}
    try:
        scan_id      = int(body.get("scan_id", 0))
        entry_index  = int(body.get("entry_index", 0))
        ai_pred      = body.get("ai_prediction", "").strip()
        correct      = body.get("correct_label", "").strip()
        note         = body.get("note", "").strip()
        if not scan_id or not ai_pred or not correct:
            return jsonify({"success": False, "error": "scan_id, ai_prediction and correct_label required"}), 400
        save_feedback(scan_id, entry_index, ai_pred, correct, note)
        return jsonify({"success": True, "data": {}})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/feedback/stats", methods=["GET"])
def api_feedback_stats():
    return jsonify({"success": True, "data": get_feedback_stats()})



@app.route("/api/model/retrain", methods=["POST"])
def api_model_retrain():
    try:
        from utils.feedback import retrain_with_feedback
        result = retrain_with_feedback()
        if "error" in result:
            return jsonify({"success": False, "error": result["error"],
                            "data": result}), 400
        return jsonify({"success": True, "data": result})
    except Exception as exc:
        _logger.exception("Retrain error")
        return jsonify({"success": False, "error": str(exc)}), 500



@app.route("/api/soar/stats", methods=["GET"])
def api_soar_stats():
    return jsonify({"success": True, "data": get_soar_stats()})


if __name__ == "__main__":
    print("\n🛡  AI Security Auditor v10")
    print("=" * 40)
    print("  Dashboard:  http://localhost:5000")
    print("  History:    http://localhost:5000/history")
    print("  Alerts:     http://localhost:5000/alerts")
    print("  Timeline:   http://localhost:5000/timeline")
    print("  Map:        http://localhost:5000/map")
    print("  Monitor:    http://localhost:5000/monitor")
    print("  IP Analytics: http://localhost:5000/ip-analytics")
    print("=" * 40 + "\n")
    socketio.run(app, debug=True, port=5000)
