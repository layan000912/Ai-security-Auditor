[README.md](https://github.com/user-attachments/files/29146546/README.md)
# Ai-security-Auditor
The project is an AI-powered cybersecurity log analysis system that processes CSV, JSON, and Syslog files to detect suspicious activities. It combines rule-based detection, machine learning, and SHAP explainability to identify threats and provide clear reasons behind each security alert.
# 🛡 AI Security Auditor v10

نظام تحليل سجلات الأمن بالذكاء الاصطناعي — مشروع تخرج

## 🚀 تشغيل المشروع

```bash
# 1. تثبيت المتطلبات
pip install -r requirements.txt

# 2. تشغيل التطبيق
python app.py

# 3. افتح المتصفح
#    http://localhost:5000
```

## 📁 هيكل المشروع

```
AI-Security-Auditor-v10/
├── app.py                  ← Flask backend (نقطة الدخول)
├── requirements.txt
├── data/                   ← ملفات تجريبية وقاعدة البيانات
│   ├── sample_logs.csv
│   ├── sample_logs.json
│   └── sample_logs.log
├── models/
│   ├── preprocess.py       ← معالجة البيانات (CSV/JSON/Syslog)
│   ├── rules_engine.py     ← كشف التهديدات بالقواعد
│   └── ai_model.py         ← Isolation Forest + Random Forest
├── templates/
│   ├── index.html          ← Dashboard الرئيسي (محسّن)
│   ├── history.html        ← السجل التاريخي + المقارنة
│   ├── alerts.html         ← مركز التنبيهات
│   └── timeline.html       ← المخطط الزمني
└── utils/
    ├── helpers.py          ← معالجة الملفات
    ├── alerts.py           ← محرك التنبيهات
    ├── database.py         ← SQLite
    └── pdf_report.py       ← تصدير PDF
```

## 🧠 كيف يعمل النظام

1. **رفع الملف** — يقبل CSV, JSON, LOG, SYSLOG, TXT
2. **المعالجة** — تنظيف البيانات وتوحيد الأعمدة تلقائياً
3. **قواعد الكشف** — يرصد: كثرة المحاولات، فشل الدخول، أسماء مشبوهة، تكرار IP
4. **نموذج الذكاء** — يدرّب Isolation Forest و Random Forest ويختار الأفضل (F1)
5. **Dashboard** — يعرض KPIs، رسوم بيانية، تنبيهات، وجدول الأنشطة المشبوهة

## 📊 الأعمدة المدعومة (مرنة)

| العمود | مثال |
|--------|------|
| timestamp / date | 2024-01-01 08:00:00 |
| ip / source_ip | 192.168.1.10 |
| username / user | admin |
| service | SSH |
| status | failed |
| attempts | 7 |
| port | 22 |

## ✨ ما تم تطويره في v10

### 🔧 إصلاح الثغرات
- ✅ نقل جميع routes فوق `if __name__ == "__main__"` (كانت لا تعمل مع Gunicorn)
- ✅ إضافة Rate Limiting على endpoint التحليل (10 طلبات/دقيقة)
- ✅ إزالة البيانات العشوائية من Timeline — رسالة واضحة عند غياب بيانات الوقت
- ✅ توحيد رسائل الخطأ لتعكس الصيغ المدعومة فعلاً

### 🎨 تحسينات الواجهة
- ✅ Dashboard جديد كلياً مع KPI cards متحركة
- ✅ ملخص ذكاء اصطناعي نصي يلخص النتائج بالعربي
- ✅ مقياس الخطر (Risk Gauge) المتحرك
- ✅ مقارنة مرئية بين نموذجَي IF و RF مع metric bars
- ✅ جدول الأنشطة المشبوهة مع بحث وفلاتر حية
- ✅ شريط التقدم (Progress Steps) أثناء التحليل

### 🆕 ميزات جديدة
- ✅ تصدير PDF بضغطة زر من الـ Dashboard والسجل
- ✅ مقارنة أي تحليلين مع رسم بياني مقارن
- ✅ API endpoint `/api/compare?id1=X&id2=Y`
- ✅ Toast notifications لكل إجراء

## 🌐 الصفحات

| الصفحة | الرابط | الوصف |
|--------|--------|-------|
| الرئيسية | `/` | رفع الملف وعرض النتائج |
| السجل | `/history` | جميع عمليات التحليل + المقارنة |
| التنبيهات | `/alerts` | مركز التنبيهات الأمنية |
| التايملاين | `/timeline` | توزيع الأنشطة الزمني |

## 📡 API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/analyze` | تحليل ملف مرفوع |
| GET | `/api/history` | جميع نتائج التحليل |
| GET | `/api/history/<id>` | تفاصيل تحليل واحد |
| DELETE | `/api/history/<id>` | حذف سجل |
| GET | `/api/alerts/<id>` | تنبيهات تحليل |
| GET | `/api/report/<id>` | تصدير PDF |
| GET | `/api/timeline/<id>` | بيانات المخطط الزمني |
| GET | `/api/compare?id1=&id2=` | مقارنة تحليلين |
