import io
import os
from datetime import datetime

import arabic_reshaper
from bidi.algorithm import get_display

from reportlab.lib             import colors
from reportlab.lib.enums       import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes   import A4
from reportlab.lib.styles      import ParagraphStyle
from reportlab.lib.units       import cm
from reportlab.pdfbase         import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus        import (
    HRFlowable, Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)
from reportlab.graphics.shapes           import Drawing, Rect, String
from reportlab.graphics.charts.piecharts  import Pie
from reportlab.graphics.charts.barcharts  import VerticalBarChart


_DARK     = colors.HexColor("#0d1f2d")
_CYAN     = colors.HexColor("#00e5ff")
_RED      = colors.HexColor("#ff3d71")
_GREEN    = colors.HexColor("#a0ff70")
_YELLOW   = colors.HexColor("#ffd740")
_GRAY_LT  = colors.HexColor("#f4f6f8")
_GRAY_MD  = colors.HexColor("#e0e6ea")
_TEXT_DIM = colors.HexColor("#527888")
_BORDER   = colors.HexColor("#0e3d52")
_WHITE    = colors.white

_FONT_PATHS = [
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/arialuni.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "C:/Windows/Fonts/calibri.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode MS.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]

_ARABIC_FONT  = "Helvetica"
_ARABIC_FONTB = "Helvetica-Bold"

for _fp in _FONT_PATHS:
    if os.path.exists(_fp):
        try:
            pdfmetrics.registerFont(TTFont("ArabicFont",  _fp))
            pdfmetrics.registerFont(TTFont("ArabicFontB", _fp))
            _ARABIC_FONT  = "ArabicFont"
            _ARABIC_FONTB = "ArabicFontB"
        except Exception:
            pass
        break


def _ar(text: str) -> str:
    if not text:
        return text
    try:
        return get_display(arabic_reshaper.reshape(str(text)))
    except Exception:
        return str(text)


_BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_LOGO_PATH = os.path.join(_BASE_DIR, "static", "logo.png")
if not os.path.exists(_LOGO_PATH):
    _LOGO_PATH = os.path.join(_BASE_DIR, "static", "logo_header.svg")


def _styles() -> dict:
    return {
        "title": ParagraphStyle(
            "Title", fontSize=20, fontName=_ARABIC_FONTB,
            textColor=_DARK, alignment=TA_CENTER, spaceAfter=6,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", fontSize=11, fontName=_ARABIC_FONT,
            textColor=_TEXT_DIM, alignment=TA_CENTER, spaceAfter=16,
        ),
        "section": ParagraphStyle(
            "Section", fontSize=13, fontName=_ARABIC_FONTB,
            textColor=_DARK, spaceBefore=18, spaceAfter=8, alignment=TA_RIGHT,
        ),
        "body": ParagraphStyle(
            "Body", fontSize=10, fontName=_ARABIC_FONT,
            textColor=colors.HexColor("#333333"), leading=16,
            spaceAfter=6, alignment=TA_RIGHT,
        ),
        "small": ParagraphStyle(
            "Small", fontSize=8, fontName=_ARABIC_FONT,
            textColor=_TEXT_DIM, alignment=TA_CENTER,
        ),
        "footer": ParagraphStyle(
            "Footer", fontSize=8, fontName=_ARABIC_FONT,
            textColor=_TEXT_DIM, alignment=TA_CENTER,
        ),
    }


def _stat_card(label: str, value: str, hex_color: str) -> Table:
    val_style = ParagraphStyle("sv", fontSize=18, fontName=_ARABIC_FONTB,
                               textColor=colors.HexColor(hex_color), alignment=TA_CENTER)
    lbl_style = ParagraphStyle("sl", fontSize=8, fontName=_ARABIC_FONT,
                               textColor=_TEXT_DIM, alignment=TA_CENTER)
    card = Table(
        [[Paragraph(f"<b>{value}</b>", val_style)],
         [Paragraph(_ar(label), lbl_style)]],
        colWidths=[5.0 * cm],
    )
    card.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 0.5, _GRAY_MD),
        ("BACKGROUND",    (0, 0), (-1, -1), _GRAY_LT),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return card


def _stat_row(summary: dict) -> Table:
    cards = [
        _stat_card("إجمالي السجلات",   str(summary.get("total_logs", 0)),        "#00e5ff"),
        _stat_card("الأنشطة المشبوهة", str(summary.get("suspicious_events", 0)), "#ff3d71"),
        _stat_card("الأنشطة الطبيعية", str(summary.get("normal_events", 0)),     "#a0ff70"),
        _stat_card("مستوى الخطر",      f"{summary.get('risk_score', 0)}%",       "#ffd740"),
        _stat_card("دقة النموذج",      f"{summary.get('model_accuracy', 0)}%",   "#00e5ff"),
        _stat_card("النموذج الفائز",   summary.get("model_name", "—"),           "#a0ff70"),
    ]
    outer = Table(
        [[cards[0], cards[1], cards[2]], [cards[3], cards[4], cards[5]]],
        colWidths=[5.4 * cm, 5.4 * cm, 5.4 * cm],
        rowHeights=[2.8 * cm, 2.8 * cm],
    )
    outer.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return outer


def _pie_chart(normal: int, suspicious: int) -> Drawing:
    drawing = Drawing(200, 140)
    pie = Pie()
    pie.x, pie.y   = 30, 10
    pie.width = pie.height = 120
    pie.data   = [normal, suspicious] if (normal + suspicious) > 0 else [1, 0]
    pie.labels = [f"{_ar('طبيعي')}\n{normal}", f"{_ar('مشبوه')}\n{suspicious}"]
    pie.slices[0].fillColor   = colors.HexColor("#a0ff70")
    pie.slices[1].fillColor   = colors.HexColor("#ff3d71")
    pie.slices[0].strokeColor = _WHITE
    pie.slices[1].strokeColor = _WHITE
    pie.slices[0].strokeWidth = 1.5
    pie.slices[1].strokeWidth = 1.5
    pie.sideLabels = True
    drawing.add(pie)
    return drawing


def _bar_chart(model_comparison: list) -> Drawing | None:
    if not model_comparison:
        return None
    drawing = Drawing(300, 150)
    bc = VerticalBarChart()
    bc.x, bc.y = 30, 20
    bc.height  = 100
    bc.width   = 240
    bc.data    = [
        [m.get("accuracy", 0) for m in model_comparison],
        [m.get("f1",       0) for m in model_comparison],
    ]
    bc.groupSpacing = 10
    bc.bars[0].fillColor = colors.HexColor("#00e5ff")
    bc.bars[1].fillColor = colors.HexColor("#a0ff70")
    bc.valueAxis.valueMin  = 0
    bc.valueAxis.valueMax  = 100
    bc.valueAxis.valueStep = 20
    bc.categoryAxis.categoryNames = [m.get("model_name", "?")[:14] for m in model_comparison]
    bc.categoryAxis.labels.fontSize = 7
    drawing.add(bc)
    drawing.add(Rect(30,  130, 12, 10, fillColor=colors.HexColor("#00e5ff"), strokeColor=None))
    drawing.add(String(46, 131, "Accuracy", fontSize=8, fillColor=colors.HexColor("#333")))
    drawing.add(Rect(120, 130, 12, 10, fillColor=colors.HexColor("#a0ff70"), strokeColor=None))
    drawing.add(String(136, 131, "F1 Score", fontSize=8, fillColor=colors.HexColor("#333")))
    return drawing


def _suspicious_table(rows: list, columns: list, st: dict) -> Table | Paragraph:
    if not rows:
        return Paragraph(_ar("لا توجد أنشطة مشبوهة"), st["body"])

    priority     = ["timestamp", "ip", "username", "service", "status", "rule_reason"]
    display_cols = [c for c in priority if c in columns]
    if not display_cols:
        skip         = {"rule_flag", "ai_flag", "suspicious"}
        display_cols = [c for c in columns if c not in skip][:6]
    display_cols = display_cols[:6]

    header_style = ParagraphStyle("th", fontSize=8, fontName=_ARABIC_FONTB,
                                  textColor=_WHITE, alignment=TA_CENTER)
    cell_style   = ParagraphStyle("td", fontSize=7, fontName=_ARABIC_FONT,
                                  textColor=colors.HexColor("#222222"))

    header    = [Paragraph(f"<b>{c}</b>", header_style) for c in display_cols]
    data_rows = [
        [Paragraph(str(row.get(c, "—"))[:28], cell_style) for c in display_cols]
        for row in rows[:25]
    ]

    col_w = (16.5 * cm) / len(display_cols)
    table = Table([header] + data_rows, colWidths=[col_w] * len(display_cols), repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1,  0), _DARK),
        ("TEXTCOLOR",     (0, 0), (-1,  0), _WHITE),
        ("FONTNAME",      (0, 0), (-1,  0), _ARABIC_FONTB),
        ("ALIGN",         (0, 0), (-1,  0), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _GRAY_LT]),
        ("GRID",          (0, 0), (-1, -1), 0.3, _GRAY_MD),
        ("BOX",           (0, 0), (-1, -1), 0.5, _BORDER),
    ]))
    return table


def generate_pdf(summary: dict, filename: str = "report") -> bytes:
    buffer = io.BytesIO()
    doc    = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2.5 * cm, bottomMargin=2 * cm,
        title="AI Security Auditor — Security Report",
    )
    st    = _styles()
    story = [Spacer(1, 0.3 * cm)]

    if os.path.exists(_LOGO_PATH) and _LOGO_PATH.endswith(".png"):
        logo_row = Table([[Image(_LOGO_PATH, width=2.5 * cm, height=2.5 * cm)]],
                         colWidths=[16.5 * cm])
        logo_row.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
        story.append(logo_row)
        story.append(Spacer(1, 0.3 * cm))

    story += [
        Paragraph("AI Security Auditor", st["title"]),
        Paragraph(_ar("تقرير تحليل السجلات الأمنية"), st["subtitle"]),
        Paragraph(
            _ar(f"تاريخ التقرير: {datetime.now().strftime('%Y-%m-%d %H:%M')}  |  الملف: {filename}"),
            st["small"],
        ),
        HRFlowable(width="100%", thickness=1.5, color=_CYAN, spaceAfter=14),
        Paragraph(_ar("ملخص التحليل"), st["section"]),
        _stat_row(summary),
        Spacer(1, 0.3 * cm),
    ]

    risk = summary.get("risk_score", 0)
    risk_label, risk_color = (
        (_ar("منخفض — الوضع طبيعي"),          "#27500A") if risk < 20 else
        (_ar("متوسط — يستدعي المتابعة"),       "#633806") if risk < 50 else
        (_ar("مرتفع — يستدعي التدخل الفوري"), "#791F1F")
    )
    story.append(Paragraph(
        f'{_ar("مستوى الخطر العام:")} <font color="{risk_color}"><b>{risk_label}</b></font>',
        st["body"],
    ))

    story += [
        HRFlowable(width="100%", thickness=0.5, color=_GRAY_MD, spaceBefore=12, spaceAfter=4),
        Paragraph(_ar("التوزيع البياني"), st["section"]),
    ]

    pie = _pie_chart(summary.get("normal_events", 0), summary.get("suspicious_events", 0))
    bar = _bar_chart(summary.get("model_comparison", []))
    charts_tbl = Table([[pie, bar or Spacer(1, 1)]], colWidths=[9 * cm, 9 * cm])
    charts_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(charts_tbl)

    comparison = summary.get("model_comparison", [])
    if comparison:
        header_style = ParagraphStyle("mh", fontSize=8, fontName=_ARABIC_FONTB,
                                      textColor=_WHITE, alignment=TA_CENTER)
        cell_style   = ParagraphStyle("mc", fontSize=9, fontName=_ARABIC_FONT,
                                      textColor=colors.HexColor("#222222"), alignment=TA_CENTER)
        col_labels = [_ar("النموذج"), "Accuracy", "Precision", "Recall", "F1 Score", _ar("النتيجة")]
        m_rows = [
            [
                Paragraph(m.get("model_name", "—"), cell_style),
                Paragraph(f"{m.get('accuracy',  0)}%", cell_style),
                Paragraph(f"{m.get('precision', 0)}%", cell_style),
                Paragraph(f"{m.get('recall',    0)}%", cell_style),
                Paragraph(f"{m.get('f1',        0)}%", cell_style),
                Paragraph(_ar("فائز") if m.get("winner") else "—", cell_style),
            ]
            for m in comparison
        ]
        m_table = Table(
            [[Paragraph(f"<b>{c}</b>", header_style) for c in col_labels]] + m_rows,
            colWidths=[4.5 * cm, 2.4 * cm, 2.4 * cm, 2.4 * cm, 2.4 * cm, 2.4 * cm],
        )
        m_table.setStyle(TableStyle([
            ("BACKGROUND",     (0, 0), (-1,  0), _DARK),
            ("TEXTCOLOR",      (0, 0), (-1,  0), _WHITE),
            ("FONTNAME",       (0, 0), (-1,  0), _ARABIC_FONTB),
            ("FONTSIZE",       (0, 0), (-1, -1), 9),
            ("ALIGN",          (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [_WHITE, _GRAY_LT]),
            ("GRID",           (0, 0), (-1, -1), 0.3, _GRAY_MD),
            ("BOX",            (0, 0), (-1, -1), 0.5, _BORDER),
            ("TOPPADDING",     (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 6),
        ]))
        story += [
            HRFlowable(width="100%", thickness=0.5, color=_GRAY_MD, spaceBefore=12, spaceAfter=4),
            Paragraph(_ar("مقارنة نماذج الذكاء الاصطناعي"), st["section"]),
            Paragraph(
                _ar(f"التدريب: {summary.get('train_size', 0)} سجل (80%)  |  "
                    f"الاختبار: {summary.get('test_size', 0)} سجل (20%)"),
                st["body"],
            ),
            Spacer(1, 0.2 * cm),
            m_table,
        ]

    susp_rows = summary.get("suspicious_table", [])
    columns   = summary.get("columns", [])
    story += [
        HRFlowable(width="100%", thickness=0.5, color=_GRAY_MD, spaceBefore=12, spaceAfter=4),
        Paragraph(_ar(f"الأنشطة المشبوهة — {len(susp_rows)} حدث (يعرض أول 25)"), st["section"]),
        _suspicious_table(susp_rows, columns, st),
        Spacer(1, 0.8 * cm),
        HRFlowable(width="100%", thickness=0.5, color=_GRAY_MD),
        Spacer(1, 0.2 * cm),
        Paragraph(
            _ar("تم إنشاء هذا التقرير تلقائياً بواسطة AI Security Auditor  |  جميع البيانات محمية وسرية"),
            st["footer"],
        ),
    ]

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
