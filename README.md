# AI Security Auditor

نظام تحليل سجلات أمنية بالذكاء الاصطناعي، طورته كمشروع تدريب تعاوني (COOP) في شركة جودين. الفكرة إن النظام ياخذ ملف سجلات (log file) ويحلله تلقائياً، يكتشف النشاط المشبوه بقواعد ثابتة ونموذج تعلم آلي مع بعض، ويفسر كل قرار بدل ما يرمي رقم بدون تفسير.

## تشغيل المشروع

```bash
pip install -r requirements.txt
python app.py
```

بعدها افتح المتصفح على `http://localhost:5000`

## هيكل المشروع

```
ai-security-011/
├── app.py                     ← Flask + SocketIO، نقطة الدخول لكل شي
├── requirements.txt
├── data/
│   ├── auditor.db              ← قاعدة بيانات SQLite لكل التحليلات المحفوظة
│   ├── sample_logs.csv
│   ├── sample_logs.json
│   └── sample_logs.log
├── models/
│   ├── preprocess.py           ← قراءة وتنظيف الملف (CSV / JSON / Syslog)
│   ├── rules_engine.py         ← القواعد الأربع الثابتة لكشف التهديدات
│   ├── ai_model.py             ← Isolation Forest + Random Forest، واختيار الأفضل بـ F1
│   └── shap_explainer.py       ← تفسير قرارات النموذج بـ SHAP
├── utils/
│   ├── helpers.py               ← رفع الملفات والتحقق منها
│   ├── alerts.py                 ← توليد التنبيهات حسب الخطورة
│   ├── database.py               ← طبقة SQLite
│   ├── pdf_report.py             ← تصدير تقرير PDF
│   ├── excel_export.py           ← تصدير ملف Excel متعدد الأوراق
│   ├── geoip.py                   ← تحديد موقع الـ IP جغرافياً
│   ├── mitre.py                    ← ربط التهديدات بإطار MITRE ATT&CK
│   ├── feedback.py                  ← حفظ ملاحظات المحلل وإعادة تدريب النموذج
│   └── threat_intel.py               ← إثراء بيانات الـ IP بمعلومات تهديد إضافية
└── templates/                          ← كل صفحات الواجهة (13 صفحة)
```

## كيف يشتغل النظام

أول شي، أرفع ملف (CSV أو JSON أو LOG أو TXT)، وملف preprocess.py يتعرف على نوعه وينظفه ويوحد أسماء الأعمدة تلقائياً، حتى لو الأعمدة مسمّاة بشكل مختلف بين ملف وملف.

بعدها يشتغل الكشف على مسارين مع بعض: محرك القواعد الثابتة (rules_engine.py) يفحص أربع حالات معروفة (محاولات دخول كثيرة، فشل تسجيل دخول، اسم مستخدم مشبوه، تكرار IP)، وبنفس الوقت نموذجا تعلم آلي (Isolation Forest وRandom Forest) يتدربون على البيانات ويتنافسون، والأفضل بينهم يُختار بناءً على F1 Score مو الدقة، عشان البيانات الأمنية غير متوازنة أصلاً.

أي سجل يوصف بأنه مشبوه، من القواعد أو من النموذج، يتفسر بـ SHAP عشان يبين وش الأسباب اللي خلت النظام يشك فيه، ويترابط تلقائياً بتقنية من MITRE ATT&CK إذا انطبقت عليه.

كل هذا يظهر في Dashboard فيه أرقام سريعة، رسوم بيانية، خريطة جغرافية لمصادر الهجمات، وجدول قابل للفلترة والبحث.

## الأعمدة المدعومة (مرنة)

| العمود | مثال |
|--------|------|
| timestamp / date | 2024-01-01 08:00:00 |
| ip / source_ip | 192.168.1.10 |
| username / user | admin |
| service | SSH |
| status | failed |
| attempts | 7 |
| port | 22 |

## صفحات النظام

| الصفحة | الرابط | وش فيها |
|--------|--------|---------|
| Dashboard | `/` | رفع الملف والنتائج الرئيسية |
| History | `/history` | كل عمليات التحليل السابقة + مقارنة بينها |
| Alerts | `/alerts` | مركز التنبيهات مرتبة حسب الخطورة |
| SHAP Explain | `/explain` | تفسير قرارات النموذج لكل سجل مشبوه |
| Geo Map | `/map` | خريطة جغرافية لمصادر الهجمات |
| Timeline | `/timeline` | توزيع الأنشطة على مدار الوقت |
| IP Analytics | `/ip-analytics` | تفاصيل كل IP على حدة (fail rate، الحسابات المستهدفة) |
| Real-Time Monitor | `/monitor` | تحليل لحظي عبر WebSocket بدون رفع ملف |
| MITRE / Evaluation | `/evaluation` | مقارنة أداء النموذجين + Confusion Matrix |
| Dataset Stats | `/dataset-stats` | إحصائيات الملف المرفوع قبل التحليل |
| SOAR Operations | `/soar` | إدارة الحالات، ملاحظات المحلل، وإعادة تدريب النموذج |
| Methodology | `/methodology` | شرح بصري لمنهجية النظام |

## API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/analyze` | تحليل ملف مرفوع |
| POST | `/batch-analyze` | تحليل عدة ملفات مرة وحدة |
| GET | `/api/history` | كل نتائج التحليل |
| GET | `/api/history/<id>` | تفاصيل تحليل واحد |
| DELETE | `/api/history/<id>` | حذف سجل |
| GET | `/api/alerts/<id>` | تنبيهات تحليل معين |
| GET | `/api/report/<id>` | تصدير PDF |
| GET | `/api/export/excel/<id>` | تصدير Excel |
| GET | `/api/timeline/<id>` | بيانات المخطط الزمني |
| GET | `/api/compare?id1=&id2=` | مقارنة تحليلين |
| GET | `/api/geo/<id>` | بيانات الخريطة الجغرافية |
| GET | `/api/ip-analytics/<id>` | تفاصيل كل IP |
| GET | `/api/evaluation/<id>` | مقارنة أداء النموذجين |
| GET | `/api/dataset-stats/<id>` | إحصائيات الملف |
| GET / PUT | `/api/case/<id>/status`, `/assign` | إدارة حالة القضية بالـ SOAR |
| GET | `/api/threat-intel/<id>` | إثراء معلومات التهديد |
| POST | `/api/feedback` | تسجيل ملاحظة المحلل على قرار الذكاء الاصطناعي |
| GET | `/api/feedback/stats` | إحصائيات الملاحظات المجمّعة |
| POST | `/api/model/retrain` | إعادة تدريب النموذج بعد جمع 10 ملاحظات |
| GET | `/api/soar/stats` | إحصائيات عامة عن كل القضايا |

## اختبارات المشروع

يوجد ملف `test_system.py` فيه 10 اختبارات وحدة تغطي القواعد، معالجة الملفات، ونموذج الذكاء الاصطناعي. تشغيلها:

```bash
python -m pytest test_system.py -v
```
