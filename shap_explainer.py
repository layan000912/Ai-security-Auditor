import io
import base64
import numpy as np

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    MPL_AVAILABLE = True
except ImportError:
    MPL_AVAILABLE = False


def _chart_to_base64() -> str:
    """Convert current matplotlib figure to base64 PNG string."""
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight",
                facecolor="#13152e", dpi=120)
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _summary_chart(sv: np.ndarray, feature_cols: list) -> str:
    """Bar chart — mean absolute SHAP value per feature (top 10)."""
    if not MPL_AVAILABLE:
        return ""
    try:
        mean_abs   = np.abs(sv).mean(axis=0)
        sorted_idx = np.argsort(mean_abs)[::-1][:10]
        labels     = [feature_cols[i] for i in sorted_idx]
        values     = [float(mean_abs[i]) for i in sorted_idx]

        fig, ax = plt.subplots(figsize=(8, 4))
        fig.patch.set_facecolor("#13152e")
        ax.set_facecolor("#13152e")

        colors = ["#7c4dff" if v == max(values) else "#448aff" for v in values]
        bars   = ax.barh(labels[::-1], values[::-1], color=colors[::-1],
                         edgecolor="none", height=0.6)

        ax.set_xlabel("Mean |SHAP Value|", color="#8b8fb8", fontsize=9)
        ax.set_title("Feature Importance — SHAP Summary", color="#e8eaf6",
                     fontsize=11, fontweight="bold", pad=12)
        ax.tick_params(colors="#8b8fb8", labelsize=8)
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.xaxis.grid(True, color="rgba(255,255,255,0.05)", linestyle="--",
                      linewidth=0.5)
        ax.set_axisbelow(True)

        for bar, val in zip(bars, values[::-1]):
            ax.text(bar.get_width() + max(values) * 0.01, bar.get_y() +
                    bar.get_height() / 2, f"{val:.4f}",
                    va="center", color="#e8eaf6", fontsize=7)

        plt.tight_layout()
        return _chart_to_base64()
    except Exception:
        return ""


def _waterfall_chart(row_sv: np.ndarray, feature_cols: list,
                     record_index: int) -> str:
    """Waterfall chart for a single suspicious record."""
    if not MPL_AVAILABLE:
        return ""
    try:
        abs_sv    = np.abs(row_sv)
        top_order = np.argsort(abs_sv)[::-1][:8]
        labels    = [feature_cols[i] for i in top_order]
        values    = [float(row_sv[i]) for i in top_order]

        colors = ["#ff1744" if v > 0 else "#00e676" for v in values]

        fig, ax = plt.subplots(figsize=(8, 3.5))
        fig.patch.set_facecolor("#13152e")
        ax.set_facecolor("#13152e")

        ax.barh(labels[::-1], values[::-1], color=colors[::-1],
                edgecolor="none", height=0.55)
        ax.axvline(0, color="#4a4e7a", linewidth=0.8, linestyle="--")

        ax.set_xlabel("SHAP Value  (+ increases risk  /  − decreases risk)",
                      color="#8b8fb8", fontsize=8)
        ax.set_title(f"SHAP Explanation — Record #{record_index}",
                     color="#e8eaf6", fontsize=10, fontweight="bold", pad=10)
        ax.tick_params(colors="#8b8fb8", labelsize=8)
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.xaxis.grid(True, color="rgba(255,255,255,0.05)",
                      linestyle="--", linewidth=0.5)
        ax.set_axisbelow(True)

        plt.tight_layout()
        return _chart_to_base64()
    except Exception:
        return ""


def explain(model, X_all: np.ndarray, feature_cols: list,
            suspicious_mask: np.ndarray, max_records: int = 50) -> dict:
    if not SHAP_AVAILABLE:
        return _empty("SHAP library not installed — run: pip install shap")
    if X_all is None or len(X_all) == 0:
        return _empty("No data available for explanation")

    try:
        explainer   = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_all)

        sv = (shap_values[1]
              if isinstance(shap_values, list) and len(shap_values) == 2
              else shap_values)

        mean_abs   = np.abs(sv).mean(axis=0)
        sorted_idx = np.argsort(mean_abs)[::-1]

        feature_importance = {
            feature_cols[i]: round(float(mean_abs[i]), 4)
            for i in sorted_idx
        }
        top_features = list(feature_importance.keys())[:5]

        summary_chart_b64 = _summary_chart(sv, feature_cols)

        susp_indices        = np.where(suspicious_mask)[0][:max_records]
        record_explanations = []

        for idx in susp_indices:
            row_sv    = sv[idx]
            abs_sv    = np.abs(row_sv)
            top_order = np.argsort(abs_sv)[::-1][:min(5, len(feature_cols))]
            total_abs = abs_sv.sum() or 1.0

            contributors = [
                {
                    "feature":    feature_cols[i],
                    "shap_value": round(float(row_sv[i]), 4),
                    "direction":  "increases risk" if row_sv[i] > 0 else "decreases risk",
                    "percent":    round(abs(float(row_sv[i])) / total_abs * 100, 1),
                }
                for i in top_order
            ]

            waterfall_b64 = _waterfall_chart(row_sv, feature_cols, int(idx))

            record_explanations.append({
                "record_index":    int(idx),
                "contributors":    contributors,
                "waterfall_chart": waterfall_b64,
            })

        return {
            "available":           True,
            "feature_importance":  feature_importance,
            "top_features":        top_features,
            "summary_chart":       summary_chart_b64,
            "record_explanations": record_explanations,
            "total_explained":     len(record_explanations),
        }

    except Exception as e:
        return _empty(f"SHAP computation failed: {e}")


def _empty(reason: str = "") -> dict:
    return {
        "available":           False,
        "reason":              reason,
        "feature_importance":  {},
        "top_features":        [],
        "summary_chart":       "",
        "record_explanations": [],
        "total_explained":     0,
    }
