function toast(msg, duration=2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

async function apiFetch(url, opts={}) {
  try {
    const res  = await fetch(url, { headers: {'Content-Type':'application/json'}, ...opts });
    const json = await res.json();
    return json;
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function loadSidebarBadges() {
  try {
    const data = await apiFetch('/api/history');
    if (Array.isArray(data) && data.length) {
      const hb = document.getElementById('historyBadge');
      if (hb) { hb.textContent = data.length; hb.style.display=''; }
      const totalSusp = data.reduce((s,r) => s + (r.summary?.suspicious_events||0), 0);
      const ab = document.getElementById('alertBadge');
      if (ab && totalSusp) { ab.textContent = totalSusp; ab.style.display=''; }
    }
  } catch(e) {}
}
loadSidebarBadges();

const AR = {
  'Main':               'عام',
  'Analysis':           'التحليل',
  'SOAR':               'SOAR',
  'Dashboard':          'لوحة التحكم',
  'History':            'السجل',
  'Alerts':             'التنبيهات',
  'SHAP Explain':       'شرح SHAP',
  'Geo Map':            'الخريطة الجغرافية',
  'Timeline':           'الجدول الزمني',
  'IP Analytics':       'تحليل IP',
  'Real-Time Monitor':  'المراقبة اللحظية',
  'MITRE / Evaluation': 'MITRE / التقييم',
  'Dataset Stats':      'إحصائيات البيانات',
  'SOAR Operations':    'عمليات SOAR',
  'Home':               'الرئيسية',
};

function applyLang(lang) {
  const isAr = lang === 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = isAr ? (AR[key] || key) : key;
  });

  const lbl = document.getElementById('langLabel');
  if (lbl) lbl.textContent = isAr ? 'EN' : 'AR';
  localStorage.setItem('lang', lang);
}

function toggleLang() {
  const current = localStorage.getItem('lang') || 'en';
  applyLang(current === 'en' ? 'ar' : 'en');
}

applyLang(localStorage.getItem('lang') || 'en');
