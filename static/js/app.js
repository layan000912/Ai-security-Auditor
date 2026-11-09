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

'use strict';

const ICONS = {

  
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>`,

  
  brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3z"/>
  </svg>`,

  
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`,

  
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>`,

  
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>`,

  
  pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <text x="6" y="19" font-size="5" stroke="none" fill="currentColor" font-family="monospace" font-weight="bold">PDF</text>
  </svg>`,

  
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>`,

  
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
    <line x1="2"  y1="20" x2="22" y2="20"/>
  </svg>`,

  
  trend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>`,

  
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9"  x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,

  
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>`,

  
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8"  x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,

  
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>`,

  
  network: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2"  y="2"  width="6" height="6" rx="1"/>
    <rect x="16" y="2"  width="6" height="6" rx="1"/>
    <rect x="9"  y="16" width="6" height="6" rx="1"/>
    <path d="M5 8v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
  </svg>`,

  
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>`,

  
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <rect x="9" y="9" width="6"  height="6"/>
    <line x1="9"  y1="1"  x2="9"  y2="4"/>
    <line x1="15" y1="1"  x2="15" y2="4"/>
    <line x1="9"  y1="20" x2="9"  y2="23"/>
    <line x1="15" y1="20" x2="15" y2="23"/>
    <line x1="20" y1="9"  x2="23" y2="9"/>
    <line x1="20" y1="14" x2="23" y2="14"/>
    <line x1="1"  y1="9"  x2="4"  y2="9"/>
    <line x1="1"  y1="14" x2="4"  y2="14"/>
  </svg>`,

  
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-5.66L1 10"/>
    <polyline points="12 7 12 12 15 15"/>
  </svg>`,

  
  timeline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <line x1="2" y1="12" x2="22" y2="12"/>
    <circle cx="6"  cy="12" r="2" fill="currentColor"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <circle cx="18" cy="12" r="2" fill="currentColor"/>
    <line x1="6"  y1="12" x2="6"  y2="7"/>
    <line x1="12" y1="12" x2="12" y2="5"/>
    <line x1="18" y1="12" x2="18" y2="8"/>
  </svg>`,

  
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`,

  
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>`,

  
  compare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/>
    <path d="M3 9l4-4-4-4"/>
    <path d="M21 15l-4 4 4 4"/>
    <line x1="3"  y1="5"  x2="12" y2="5"/>
    <line x1="21" y1="19" x2="12" y2="19"/>
  </svg>`,

  
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>`,

  
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,

  
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>`,

  
  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>`,

  
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>`,

  
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="8" y1="16" x2="12" y2="16"/>
  </svg>`,

  
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`,

  
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>`,

};

function icon(name, size = 20, cls = '') {
  const svg = ICONS[name];
  if (!svg) return '';
  return svg.replace(
    '<svg ',
    `<svg width="${size}" height="${size}" class="icon ${cls}" `
  );
}

function iconEl(name, size = 20, cls = '') {
  const span = document.createElement('span');
  span.className = `icon-wrap ${cls}`;
  span.innerHTML = icon(name, size);
  return span;
}

(function injectIconStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .icon {
      display: inline-block;
      vertical-align: middle;
      flex-shrink: 0;
    }
    .icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon svg   { color: var(--accent); }
    .btn svg         { color: inherit; }
    .nav-link svg    { color: inherit; }
    .section-title svg { color: var(--accent); }
  `;
  document.head.appendChild(style);
})();

(function(){
  if (!document.getElementById('kpiCrit')) return;
let allAlerts   = [];
let activeSev   = 'all';
let scanDate    = '';

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data) || !data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r => `<option value="${r.id}">${r.filename} (${(r.scanned_at||'').slice(0,10)})</option>`).join('');
  loadAlerts();
}

async function loadAlerts() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;
  const data = await apiFetch(`/api/alerts/${id}`);
  const rec  = await apiFetch(`/api/history/${id}`);
  scanDate = (rec.scanned_at||'').slice(0,10);

  allAlerts = Array.isArray(data) ? data : [];

  const cnt = { Critical:0, High:0, Medium:0, Low:0 };
  allAlerts.forEach(a => { const s = a.severity||'Low'; cnt[s] = (cnt[s]||0)+1; });
  document.getElementById('kpiCrit').textContent = cnt.Critical;
  document.getElementById('kpiHigh').textContent = cnt.High;
  document.getElementById('kpiMed').textContent  = cnt.Medium;
  document.getElementById('kpiLow').textContent  = cnt.Low;

  applyFilter();
}

function applyFilter() {
  const q   = document.getElementById('alertSearch').value.toLowerCase();
  let rows  = allAlerts;
  if (activeSev !== 'all') rows = rows.filter(a => a.severity === activeSev);
  if (q) rows = rows.filter(a =>
    (a.ip||'').toLowerCase().includes(q) ||
    (a.title||'').toLowerCase().includes(q) ||
    (a.description||'').toLowerCase().includes(q)
  );
  renderAlerts(rows);
}

function setSev(sev, btn) {
  activeSev = sev;
  document.querySelectorAll('#sevFilters button').forEach(b => b.classList.remove('active-filter'));
  btn.classList.add('active-filter');
  applyFilter();
}

const sevClass = s => ({ Critical:'pill-critical', High:'pill-high', Medium:'pill-medium', Low:'pill-low' }[s]||'pill-low');
const mitreBadge = id => id ? `<span style="font-size:10px;background:rgba(124,77,255,.15);color:var(--purple);padding:2px 7px;border-radius:4px;font-family:monospace">${id}</span>` : '—';

function renderAlerts(rows) {
  const tbody = document.getElementById('alertsBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg><p>No alerts match the filter</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(a => `
    <tr>
      <td><span class="pill ${sevClass(a.severity)}">${a.severity||'Low'}</span></td>
      <td><code style="font-size:11px;color:var(--teal)">${a.ip||'—'}</code></td>
      <td>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:12px;font-weight:500;color:var(--txt1)">${a.title||'—'}</span>
          ${mitreBadge(a.mitre_id)}
        </div>
      </td>
      <td style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.description||'—'}</td>
      <td><span class="pill pill-open">Open</span></td>
      <td style="color:var(--txt3);font-size:11px">${scanDate}</td>
      <td>
        <button class="action-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </td>
    </tr>`).join('');
}

initScans();
})();

(function(){
  if (!document.getElementById('kpiRows')) return;
Chart.defaults.color = '#4a4e7a';
Chart.defaults.borderColor = 'rgba(255,255,255,.04)';

const tooltipCfg = {
  backgroundColor:'#191b38', borderColor:'rgba(255,255,255,.08)',
  borderWidth:1, padding:10, titleColor:'#e8eaf6', bodyColor:'#8b8fb8', cornerRadius:8
};

let typeChart = null, missingChart = null;

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data)||!data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r=>`<option value="${r.id}">${r.filename}</option>`).join('');
  loadStats();
}

async function loadStats() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;
  const data = await apiFetch(`/api/dataset-stats/${id}`);
  if (!data||data.error) return;

  document.getElementById('kpiRows').textContent = (data.total_logs||0).toLocaleString();
  document.getElementById('kpiCols').textContent = data.total_columns||'—';
  document.getElementById('kpiNull').textContent = (data.null_pct||0).toFixed(1)+'%';
  document.getElementById('kpiType').textContent = (data.file_type||'—').toUpperCase();

  const cols = data.columns || [];
  document.getElementById('typeTotal').textContent = cols.length || data.total_columns || '—';

  const typeCounts = {};
  cols.forEach(c => { const t=c.dtype||c.type||'object'; typeCounts[t]=(typeCounts[t]||0)+1; });
  const typeLabels = Object.keys(typeCounts);
  const typeVals   = typeLabels.map(k=>typeCounts[k]);
  const typeColors = ['rgba(124,77,255,.8)','rgba(68,138,255,.8)','rgba(0,229,255,.8)','rgba(0,230,118,.8)','rgba(255,171,0,.8)'];

  const tCtx = document.getElementById('typeChart').getContext('2d');
  if (typeChart) typeChart.destroy();
  typeChart = new Chart(tCtx, {
    type:'doughnut',
    data:{ labels:typeLabels, datasets:[{ data:typeVals, backgroundColor:typeColors.slice(0,typeLabels.length), borderWidth:0, hoverOffset:4 }] },
    options:{ cutout:'76%', maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{...tooltipCfg} } }
  });

  const lgnd = document.getElementById('typeLegend');
  lgnd.innerHTML = typeLabels.map((l,i)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="width:8px;height:8px;border-radius:50%;background:${typeColors[i]||'#8b8fb8'}"></div>
        <span style="font-size:11px;color:var(--txt2)">${l}</span>
      </div>
      <span style="font-size:11px;color:var(--txt3)">${typeVals[i]}</span>
    </div>`).join('');

  const missCols = cols.filter(c=>(c.null_pct||c.missing_pct||0)>0).slice(0,14);
  const missLabels = missCols.map(c=>c.name||c.column||'?');
  const missVals   = missCols.map(c=>+(c.null_pct||c.missing_pct||0).toFixed(1));

  const mCtx = document.getElementById('missingChart').getContext('2d');
  if (missingChart) missingChart.destroy();
  const gMiss = mCtx.createLinearGradient(600,0,0,0);
  gMiss.addColorStop(0,'rgba(255,23,68,.7)'); gMiss.addColorStop(1,'rgba(255,171,0,.5)');

  missingChart = new Chart(mCtx, {
    type:'bar',
    data:{
      labels: missLabels.length ? missLabels : ['No missing values'],
      datasets:[{ label:'Missing %', data: missVals.length ? missVals : [0],
        backgroundColor: gMiss, borderRadius:4, borderSkipped:false }]
    },
    options:{
      indexAxis:'y', maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{...tooltipCfg} },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#4a4e7a',font:{size:10}}, max:100 },
        y:{ grid:{display:false}, ticks:{color:'#8b8fb8',font:{size:10}} }
      }
    }
  });

  const tbody = document.getElementById('colBody');
  if (!cols.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No column data available</p></div></td></tr>`;
    return;
  }
  const typeColor = t => {
    if (t?.includes('int')||t?.includes('float')) return 'var(--blue)';
    if (t?.includes('date')||t?.includes('time'))  return 'var(--teal)';
    if (t?.includes('bool'))                        return 'var(--green)';
    return 'var(--purple)';
  };
  tbody.innerHTML = cols.map(c => {
    const nullPct = +(c.null_pct||c.missing_pct||0).toFixed(1);
    const pctColor = nullPct > 50 ? 'var(--red)' : nullPct > 20 ? 'var(--amber)' : 'var(--txt2)';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;">
          <span class="tbl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg></span>
          <span style="color:var(--txt1);font-weight:500">${c.name||c.column||'—'}</span>
        </div>
      </td>
      <td><span style="font-size:10px;font-family:monospace;color:${typeColor(c.dtype||c.type)};background:rgba(124,77,255,.1);padding:2px 6px;border-radius:4px">${c.dtype||c.type||'—'}</span></td>
      <td><span style="color:${pctColor}">${c.null_count||0}</span></td>
      <td>${c.unique_count||c.unique||'—'}</td>
      <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--txt2);font-size:11px">${c.top_value||c.sample||'—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="progress-track" style="flex:1"><div class="progress-fill prog-amber" style="width:${Math.min(nullPct,100)}%"></div></div>
          <span style="font-size:10px;color:${pctColor};min-width:32px">${nullPct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

initScans();
})();

(function(){
  if (!document.getElementById('compChart')) return;
Chart.defaults.color = '#4a4e7a';
Chart.defaults.borderColor = 'rgba(255,255,255,.04)';

const tooltipCfg = {
  backgroundColor:'#191b38', borderColor:'rgba(255,255,255,.08)',
  borderWidth:1, padding:10, titleColor:'#e8eaf6', bodyColor:'#8b8fb8', cornerRadius:8
};

let compChart = null;

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data)||!data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r=>`<option value="${r.id}">${r.filename}</option>`).join('');
  loadEval();
}

async function loadEval() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;
  const data = await apiFetch(`/api/evaluation/${id}`);
  if (!data||data.error) return;

  document.getElementById('winnerBadge').textContent = data.winner ? `Winner: ${data.winner}` : '';
  document.getElementById('trainSz').textContent = (data.train_size||0).toLocaleString();
  document.getElementById('testSz').textContent  = (data.test_size||0).toLocaleString();

  const models   = data.models || [];
  const winner   = models.find(m => m.winner) || models[0] || {};
  const baseline = models.find(m => m.model_name?.toLowerCase().includes('baseline')) || {};

  const acc  = winner.accuracy  || 0;
  const f1   = winner.f1        || 0;
  const prec = winner.precision || 0;
  const rec  = winner.recall    || 0;

  document.getElementById('kpiAcc').textContent  = acc  ? acc.toFixed(1)+'%'  : '—';
  document.getElementById('kpiF1').textContent   = f1   ? f1.toFixed(1)+'%'   : '—';
  document.getElementById('kpiPrec').textContent = prec ? prec.toFixed(1)+'%' : '—';
  document.getElementById('kpiRec').textContent  = rec  ? rec.toFixed(1)+'%'  : '—';

  const total  = data.total_logs || 100;
  const susp   = Math.round(total * (prec/100 || .5));
  const normal = total - susp;
  const tp     = Math.round(susp  * (rec/100  || .5));
  const fn     = susp - tp;
  const fp     = Math.round(normal * (1 - prec/100 || .5));
  const tn     = normal - fp;

  document.getElementById('valTP').textContent = tp  > 0 ? tp  : '—';
  document.getElementById('valFP').textContent = fp >= 0 ? fp  : '—';
  document.getElementById('valFN').textContent = fn >= 0 ? fn  : '—';
  document.getElementById('valTN').textContent = tn >= 0 ? tn  : '—';

  const namedModels = models.filter(m => !m.model_name?.toLowerCase().includes('baseline')).slice(0,3);
  const metrics = ['accuracy','f1','precision','recall'];
  const colors  = ['rgba(124,77,255,.8)','rgba(224,64,251,.8)','rgba(68,138,255,.8)'];

  const ctx = document.getElementById('compChart').getContext('2d');
  if (compChart) compChart.destroy();
  compChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: metrics.map(m=>m.charAt(0).toUpperCase()+m.slice(1)),
      datasets: namedModels.map((m,i)=>({
        label: m.model_name||`Model ${i+1}`,
        data:  metrics.map(k => +(m[k]||0).toFixed(2)),
        backgroundColor: colors[i]||'rgba(124,77,255,.5)',
        borderRadius: 4,
        borderSkipped: false,
      }))
    },
    options:{
      maintainAspectRatio:false,
      plugins:{ legend:{ display:true, labels:{color:'#8b8fb8',font:{size:11},boxWidth:10}}, tooltip:{...tooltipCfg} },
      scales:{
        x:{ grid:{display:false}, ticks:{color:'#8b8fb8',font:{size:11}} },
        y:{ grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#4a4e7a',font:{size:10}}, max:100, beginAtZero:true }
      }
    }
  });

  const tbody = document.getElementById('baselineBody');
  const metricRows = [
    { name:'Accuracy',  cur: acc,  base: baseline.accuracy  || Math.max(susp,normal)/total*100 },
    { name:'F1 Score',  cur: f1,   base: baseline.f1        || 0 },
    { name:'Precision', cur: prec, base: baseline.precision || 0 },
    { name:'Recall',    cur: rec,  base: baseline.recall    || 0 },
  ];
  tbody.innerHTML = metricRows.map(r => {
    const delta = r.cur - r.base;
    const color = delta >= 0 ? 'var(--green)' : 'var(--red)';
    const sign  = delta >= 0 ? '+' : '';
    return `<tr>
      <td style="font-weight:500;color:var(--txt1)">${r.name}</td>
      <td>${r.base.toFixed(1)}%</td>
      <td><strong style="color:var(--txt1)">${r.cur.toFixed(1)}%</strong></td>
      <td><span style="font-weight:600;color:${color}">${sign}${delta.toFixed(1)}%</span></td>
    </tr>`;
  }).join('');
}

initScans();
})();

(function(){
  if (!document.getElementById('featureChart')) return;
Chart.defaults.color = '#4a4e7a';
Chart.defaults.borderColor = 'rgba(255,255,255,.04)';

let featureChart = null;
let expandedIdx  = null;
let shapData     = null;
let entries      = [];

const tooltipDefaults = {
  backgroundColor:'#191b38', borderColor:'rgba(255,255,255,.08)',
  borderWidth:1, padding:10, titleColor:'#e8eaf6',
  bodyColor:'#8b8fb8', cornerRadius:8
};

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data) || !data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r => `<option value="${r.id}">${r.filename}</option>`).join('');
  loadExplain();
}

async function loadExplain() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;

  const rec = await apiFetch(`/api/history/${id}`);
  if (!rec || rec.error) return;

  const s = rec.summary || {};
  shapData = s.shap || {};
  entries  = s.suspicious_table || [];

  document.getElementById('modelLabel').textContent = s.model_name ? `Model: ${s.model_name}` : '';
  document.getElementById('entryCount').textContent = `${entries.length} entries`;

  const summaryCard = document.getElementById('shapSummaryCard');
  const summaryImg  = document.getElementById('shapSummaryImg');
  if (shapData.summary_chart) {
    summaryImg.src        = `data:image/png;base64,${shapData.summary_chart}`;
    summaryCard.style.display = '';
  } else {
    summaryCard.style.display = 'none';
  }

  const importance = shapData.feature_importance || {};
  const labels = Object.keys(importance).sort((a,b) => importance[b]-importance[a]).slice(0,12);
  const vals   = labels.map(l => +importance[l].toFixed(4));

  const ctx = document.getElementById('featureChart').getContext('2d');
  if (featureChart) featureChart.destroy();

  const grad = ctx.createLinearGradient(0,0,600,0);
  grad.addColorStop(0,'rgba(124,77,255,.9)');
  grad.addColorStop(1,'rgba(224,64,251,.7)');

  featureChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'SHAP Importance',
        data: vals,
        backgroundColor: grad,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend:{display:false}, tooltip:{...tooltipDefaults} },
      scales: {
        x: { grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#4a4e7a',font:{size:10}} },
        y: { grid:{display:false}, ticks:{color:'#8b8fb8',font:{size:11}} }
      }
    }
  });

  renderEntries();
}

const riskColor = r => ({ critical:'#ff6b8a', high:'#ffab00', medium:'#00e5ff', low:'#00e676' })[r] || '#8b8fb8';

function renderEntries() {
  const tbody = document.getElementById('shapBody');
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No suspicious entries</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = entries.slice(0,50).map((e,i) => {
    const ip  = e.ip || e.source_ip || '—';
    const svc = e.service || '—';
    const rsn = e.rule_reason || '—';
    const risk = (e.rule_severity || 'medium').toLowerCase();
    return `<tr id="erow-${i}">
      <td style="color:var(--txt3)">${i+1}</td>
      <td><code style="font-size:11px;color:var(--teal)">${ip}</code></td>
      <td style="color:var(--txt2)">${svc}</td>
      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--txt2)">${rsn}</td>
      <td><span style="font-size:11px;font-weight:600;color:${riskColor(risk)}">${risk.charAt(0).toUpperCase()+risk.slice(1)}</span></td>
      <td>
        <button class="action-btn" onclick="toggleShapDetail(${i})">
          <svg id="chevron-${i}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function toggleShapDetail(idx) {
  document.querySelectorAll('.shap-detail-row').forEach(r => r.remove());
  document.querySelectorAll('[id^="chevron-"]').forEach(c => {
    c.setAttribute('points','6 9 12 15 18 9');
  });

  if (expandedIdx === idx) { expandedIdx = null; return; }
  expandedIdx = idx;

  const entry       = entries[idx] || {};
  const recExp      = (shapData.record_explanations || []).find(r => r.record_index === idx) || {};
  const waterfallB64 = recExp.waterfall_chart || '';
  const perEntry    = (shapData.per_entry_shap || [])[idx] || {};
  const featureVals = perEntry;

  const row = document.getElementById(`erow-${idx}`);
  if (!row) return;

  const chev = document.getElementById(`chevron-${idx}`);
  if (chev) chev.setAttribute('points','18 15 12 9 6 15');

  const waterfallHtml = waterfallB64
    ? `<div style="margin-bottom:14px;">
         <div style="font-size:10px;color:var(--purple);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
           Waterfall Chart — matplotlib
         </div>
         <img src="data:image/png;base64,${waterfallB64}"
              style="width:100%;border-radius:8px;display:block" alt="SHAP Waterfall">
       </div>`
    : '';

  const tr = document.createElement('tr');
  tr.className = 'shap-detail-row';
  tr.innerHTML = `<td colspan="6" style="padding:0;background:var(--card2)">
    <div style="padding:16px 20px;">
      <div style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
        Per-Entry SHAP Values — Entry ${idx+1}
      </div>
      ${waterfallHtml}
      <div style="height:160px"><canvas id="shapEntryChart-${idx}"></canvas></div>
      <div style="margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;" id="shapEntryMeta-${idx}"></div>
    </div>
  </td>`;
  row.after(tr);

  const featureNames = Object.keys(featureVals).filter(k => typeof featureVals[k] === 'number');
  const shapVals     = featureNames.map(k => +featureVals[k].toFixed(4));
  const colors       = shapVals.map(v => v >= 0 ? 'rgba(255,23,68,.7)' : 'rgba(0,230,118,.7)');

  if (featureNames.length) {
    const ctx2 = document.getElementById(`shapEntryChart-${idx}`).getContext('2d');
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: featureNames,
        datasets: [{
          label: 'SHAP Value',
          data: shapVals,
          backgroundColor: colors,
          borderRadius: 3,
          borderSkipped: false,
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend:{display:false}, tooltip:{...tooltipDefaults} },
        scales: {
          x: { grid:{display:false}, ticks:{color:'#8b8fb8',font:{size:10}} },
          y: { grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#4a4e7a',font:{size:10}} }
        }
      }
    });
  }

  const meta = document.getElementById(`shapEntryMeta-${idx}`);
  const fields = [['IP',entry.ip||'—'],['Service',entry.service||'—'],['Status',entry.status||'—'],
                  ['Username',entry.username||entry.user||'—'],['Risk',entry.risk_level||'—'],['Rule',entry.rule_reason||'—']];
  meta.innerHTML = fields.map(([k,v])=>`
    <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;">
      <div style="font-size:10px;color:var(--txt3);margin-bottom:2px">${k}</div>
      <div style="font-size:12px;color:var(--txt1);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</div>
    </div>`).join('');
}

initScans();
})();

(function(){
  if (!document.getElementById('historyBody')) return;
let allRows = [];
let selected = new Set();
let expanded = null;

const statusPill = s => {
  const map = { 'Open':'pill-open','In Progress':'pill-progress','Resolved':'pill-resolved','Closed':'pill-closed' };
  return `<span class="pill ${map[s]||'pill-open'}">${s||'Open'}</span>`;
};
const priorityPill = p => {
  const map = { 'Critical':'pill-critical','High':'pill-high','Medium':'pill-medium','Low':'pill-low' };
  return `<span class="pill ${map[p]||'pill-medium'}">${p||'Medium'}</span>`;
};
const riskColor = v => v > 75 ? 'var(--red)' : v > 50 ? 'var(--amber)' : v > 25 ? 'var(--teal)' : 'var(--green)';

async function loadHistory() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data)) return;
  allRows = data;
  renderTable(data);
}

function renderTable(rows) {
  const tbody = document.getElementById('historyBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4"/></svg><p>No scans found</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const s    = r.summary || {};
    const risk = s.risk_score || 0;
    return `<tr class="hist-row" data-id="${r.id}">
      <td><input type="checkbox" class="row-cb" data-id="${r.id}" onchange="onCheck(this)"></td>
      <td style="color:var(--txt3)">${r.id}</td>
      <td>
        <div style="display:flex;align-items:center;">
          <span class="tbl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></span>
          <span style="color:var(--txt1);font-weight:500">${r.filename}</span>
        </div>
      </td>
      <td>${(r.scanned_at||'').slice(0,16).replace('T',' ')}</td>
      <td>${(s.total_logs||0).toLocaleString()}</td>
      <td><span style="color:${(s.suspicious_events||0)>0?'var(--red)':'var(--green)'};font-weight:600">${s.suspicious_events||0}</span></td>
      <td><span style="color:${riskColor(risk)};font-weight:600">${typeof risk==='number'?risk.toFixed(1):risk}</span></td>
      <td>${priorityPill(r.priority)}</td>
      <td>${statusPill(r.case_status)}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="action-btn" title="Expand" onclick="toggleExpand(event,${r.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <a class="action-btn" title="PDF" href="/api/report/${r.id}" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </a>
          <a class="action-btn" title="Excel" href="/api/export/excel/${r.id}" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button class="action-btn" title="Delete" onclick="deleteRow(event,${r.id})" style="color:rgba(255,23,68,.5)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function toggleExpand(e, id) {
  e.stopPropagation();
  const clickedRow = e.currentTarget.closest('tr');
  if (expanded === id) {
    document.querySelectorAll('.expand-row').forEach(r => r.remove());
    expanded = null; return;
  }
  document.querySelectorAll('.expand-row').forEach(r => r.remove());
  expanded = id;

  const tpl = document.getElementById('expandTpl').content.cloneNode(true);
  const tr  = tpl.querySelector('tr');
  const rec = allRows.find(r => r.id === id);
  if (!rec) return;

  tr.querySelector('.expand-pdf').href   = `/api/report/${id}`;
  tr.querySelector('.expand-excel').href = `/api/export/excel/${id}`;
  tr.querySelector('.expand-status-sel').value   = rec.case_status || 'Open';
  tr.querySelector('.expand-priority-sel').value = rec.priority    || 'Medium';
  tr.querySelector('.expand-assignee').value = rec.assigned_to !== 'Unassigned' ? rec.assigned_to : '';

  clickedRow.after(tr);

  const tlEl   = document.querySelector('.expand-timeline');
  const tlData = await apiFetch(`/api/case/${id}/timeline`);
  if (tlData.success && tlData.data.length) {
    tlEl.innerHTML = tlData.data.map(ev => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-body">
          <div class="timeline-event">${ev.old_status} → ${ev.new_status}</div>
          ${ev.analyst_note ? `<div class="timeline-note">${ev.analyst_note}</div>` : ''}
          <div class="timeline-time">${(ev.changed_at||'').replace('T',' ')} · ${ev.changed_by}</div>
        </div>
      </div>`).join('');
  } else {
    tlEl.innerHTML = '<p style="font-size:11px;color:var(--txt3)">No timeline events yet.</p>';
  }

  document.querySelector('.expand-save-btn').onclick = async () => {
    const newStatus = document.querySelector('.expand-status-sel').value;
    const note      = document.querySelector('.expand-note-input').value || '';
    const res = await apiFetch(`/api/case/${id}/status`, {
      method:'PUT', body: JSON.stringify({ new_status: newStatus, note })
    });
    if (res.success) { toast('Status updated'); loadHistory(); }
    else toast('Error: ' + (res.error||'unknown'));
  };

  document.querySelector('.expand-assign-btn').onclick = async () => {
    const assignee = document.querySelector('.expand-assignee').value;
    const priority = document.querySelector('.expand-priority-sel').value;
    const res = await apiFetch(`/api/case/${id}/assign`, {
      method:'PUT', body: JSON.stringify({ assigned_to: assignee||'Unassigned', priority })
    });
    if (res.success) { toast('Assigned'); loadHistory(); }
    else toast('Error: ' + (res.error||'unknown'));
  };
}

async function deleteRow(e, id) {
  e.stopPropagation();
  if (!confirm('Delete this scan record?')) return;
  await apiFetch(`/api/history/${id}`, { method:'DELETE' });
  toast('Deleted');
  allRows = allRows.filter(r => r.id !== id);
  renderTable(allRows);
}

function filterTable() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  renderTable(allRows.filter(r => r.filename.toLowerCase().includes(q)));
}

function onCheck(cb) {
  const id = parseInt(cb.dataset.id);
  cb.checked ? selected.add(id) : selected.delete(id);
  document.getElementById('selCount').textContent = selected.size ? `${selected.size} selected` : '';
  document.getElementById('compareBtn').disabled = selected.size !== 2;
}

function toggleAll(cb) {
  document.querySelectorAll('.row-cb').forEach(c => {
    c.checked = cb.checked;
    const id  = parseInt(c.dataset.id);
    cb.checked ? selected.add(id) : selected.delete(id);
  });
  document.getElementById('selCount').textContent = selected.size ? `${selected.size} selected` : '';
  document.getElementById('compareBtn').disabled = selected.size !== 2;
}

async function openCompare() {
  const ids = [...selected];
  if (ids.length !== 2) return;
  const data = await apiFetch(`/api/compare?id1=${ids[0]}&id2=${ids[1]}`);
  if (!data.scan1) { toast('Compare failed'); return; }
  const fmt = s => `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:14px;">
      <div style="font-size:13px;font-weight:600;color:var(--txt1);margin-bottom:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.filename}</div>
      ${[['Total Logs',(s.total_logs||0).toLocaleString()],['Suspicious',s.suspicious_events||0],
         ['Risk Score',s.risk_score?.toFixed(1)||'—'],['Accuracy',(s.model_accuracy?.toFixed(1)||'—')+'%'],
         ['F1',(s.model_f1?.toFixed(1)||'—')+'%'],['Model',s.model_name||'—']].map(([k,v])=>`
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;gap:12px">
          <span style="font-size:11px;color:var(--txt3)">${k}</span>
          <span style="font-size:11px;font-weight:600;color:var(--txt1)">${v}</span>
        </div>`).join('')}
    </div>`;
  document.getElementById('compareContent').innerHTML = fmt(data.scan1) + fmt(data.scan2);
  document.getElementById('compareModal').classList.add('open');
}

loadHistory();
})();

(function(){
  if (!document.getElementById('kpiTotal')) return;
Chart.defaults.color = '#4a4e7a';
Chart.defaults.borderColor = 'rgba(255,255,255,.04)';

const tooltipPlugin = {
  backgroundColor: '#191b38',
  borderColor: 'rgba(255,255,255,.08)',
  borderWidth: 1,
  padding: 10,
  titleColor: '#e8eaf6',
  bodyColor: '#8b8fb8',
  cornerRadius: 8,
};

let donutChart, trendChart, severityChart;

async function loadDashboard() {
  const history = await apiFetch('/api/history');
  if (!Array.isArray(history) || !history.length) return;

  const latest = history[0];
  const s = latest.summary || {};

  document.getElementById('kpiTotal').textContent   = (s.total_logs || 0).toLocaleString();
  document.getElementById('kpiSusp').textContent    = (s.suspicious_events || 0).toLocaleString();
  document.getElementById('kpiAcc').textContent     = s.model_accuracy ? s.model_accuracy.toFixed(1) + '%' : '—';

  const soar = await apiFetch('/api/soar/stats');
  if (soar.success) {
    document.getElementById('kpiResolved').textContent = soar.data.resolved || 0;
  }

  if (history.length > 1) {
    const prev = history[1].summary || {};
    const deltaTotal = (s.total_logs||0) - (prev.total_logs||0);
    if (deltaTotal !== 0) {
      const el = document.getElementById('kpiTotalDelta');
      el.style.display = '';
      el.className = 'kpi-delta ' + (deltaTotal > 0 ? 'up' : 'down');
      el.querySelector('span').textContent = Math.abs(deltaTotal).toLocaleString();
    }
    const deltaSusp = (s.suspicious_events||0) - (prev.suspicious_events||0);
    if (deltaSusp !== 0) {
      const el = document.getElementById('kpiSuspDelta');
      el.style.display = '';
      el.className = 'kpi-delta ' + (deltaSusp > 0 ? 'down' : 'up');
      el.querySelector('span').textContent = Math.abs(deltaSusp).toLocaleString();
    }
  }

  const alerts = s.alerts || [];
  const sevCount = { Critical:0, High:0, Medium:0, Low:0 };
  alerts.forEach(a => {
    const sev = a.severity || 'Low';
    sevCount[sev] = (sevCount[sev]||0) + 1;
  });
  const total = Object.values(sevCount).reduce((a,b)=>a+b,0);
  document.getElementById('donutTotal').textContent = total;

  const donutCtx = document.getElementById('donutChart').getContext('2d');
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Critical','High','Medium','Low'],
      datasets: [{
        data: [sevCount.Critical, sevCount.High, sevCount.Medium, sevCount.Low],
        backgroundColor: ['rgba(255,23,68,.8)','rgba(255,171,0,.8)','rgba(0,229,255,.8)','rgba(0,230,118,.8)'],
        borderWidth: 0,
        hoverOffset: 4,
      }]
    },
    options: {
      cutout: '78%',
      plugins: { legend:{display:false}, tooltip:{...tooltipPlugin} },
      maintainAspectRatio: false,
    }
  });

  const colors = { Critical:'#ff6b8a', High:'#ffab00', Medium:'#00e5ff', Low:'#00e676' };
  const lgnd = document.getElementById('donutLegend');
  lgnd.innerHTML = '';
  ['Critical','High','Medium','Low'].forEach(sev => {
    const pct = total ? Math.round(sevCount[sev]/total*100) : 0;
    lgnd.innerHTML += `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:7px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${colors[sev]}"></div>
          <span style="font-size:11px;color:var(--txt2)">${sev}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex:1;margin:0 10px;">
          <div class="progress-track" style="flex:1">
            <div class="progress-fill prog-${sev==='Critical'?'amber':sev==='High'?'amber':sev==='Medium'?'blue':'teal'}" style="width:${pct}%"></div>
          </div>
        </div>
        <span style="font-size:11px;color:var(--txt3);min-width:26px;text-align:right">${sevCount[sev]}</span>
      </div>`;
  });

  const trendData = history.slice(0,7).reverse();
  const labels    = trendData.map(r => r.scanned_at ? r.scanned_at.slice(5,10) : '');
  const suspArr   = trendData.map(r => r.summary?.suspicious_events || 0);
  const critArr   = trendData.map(r => (r.summary?.alerts||[]).filter(a=>a.severity==='Critical').length);

  const trendCtx = document.getElementById('trendChart').getContext('2d');
  if (trendChart) trendChart.destroy();

  const gradPurple = trendCtx.createLinearGradient(0,0,0,220);
  gradPurple.addColorStop(0,'rgba(124,77,255,.35)');
  gradPurple.addColorStop(1,'rgba(124,77,255,0)');
  const gradPink = trendCtx.createLinearGradient(0,0,0,220);
  gradPink.addColorStop(0,'rgba(224,64,251,.25)');
  gradPink.addColorStop(1,'rgba(224,64,251,0)');

  trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Suspicious', data:suspArr, borderColor:'var(--purple)', backgroundColor:gradPurple,
          tension:.4, fill:true, pointRadius:3, pointBorderColor:'#0d0e1a', pointBorderWidth:2 },
        { label:'Critical',   data:critArr, borderColor:'var(--pink)',   backgroundColor:gradPink,
          tension:.4, fill:true, pointRadius:3, pointBorderColor:'#0d0e1a', pointBorderWidth:2 },
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend:{display:false}, tooltip:{...tooltipPlugin} },
      scales: {
        x: { grid:{ color:'rgba(255,255,255,.04)' }, ticks:{ color:'#4a4e7a', font:{size:10} } },
        y: { grid:{ color:'rgba(255,255,255,.04)' }, ticks:{ color:'#4a4e7a', font:{size:10} }, beginAtZero:true },
      }
    }
  });

  const rows = (s.suspicious_table || []).slice(0,8);
  const tbody = document.getElementById('riskTable');
  if (rows.length) {
    const riskColor = { critical:'#ff6b8a', high:'#ffab00', medium:'#00e5ff', low:'#00e676' };
    tbody.innerHTML = rows.map(r => {
      const ip      = r.ip || r.source_ip || '—';
      const src     = r.service || r.source || '—';
      const risk    = (r.risk_level || 'medium').toLowerCase();
      const alertCt = (s.alerts||[]).filter(a=>(a.ip||'')===ip).length;
      return `<tr>
        <td><span class="tbl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>${ip}</td>
        <td>${src}</td>
        <td><span style="font-size:11px;font-weight:600;color:${riskColor[risk]||'#8b8fb8'}">${risk.charAt(0).toUpperCase()+risk.slice(1)}</span></td>
        <td>${alertCt}</td>
        <td><button class="action-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button></td>
      </tr>`;
    }).join('');
  }

  const metrics = [
    { label:'F1 Score',  val: s.model_f1       || 0, cls:'prog-purple' },
    { label:'Precision', val: s.model_precision || 0, cls:'prog-blue'   },
    { label:'Recall',    val: s.model_recall    || 0, cls:'prog-teal'   },
    { label:'Accuracy',  val: s.model_accuracy  || 0, cls:'prog-amber'  },
  ];
  const perfEl = document.getElementById('perfMetrics');
  perfEl.innerHTML = metrics.map(m => `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:11px;color:var(--txt2)">${m.label}</span>
        <span style="font-size:11px;font-weight:600;color:var(--txt1)">${m.val.toFixed(1)}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill ${m.cls}" style="width:${Math.min(m.val,100)}%"></div></div>
    </div>`).join('');

  const sevCtx = document.getElementById('severityChart').getContext('2d');
  if (severityChart) severityChart.destroy();
  severityChart = new Chart(sevCtx, {
    type: 'doughnut',
    data: {
      labels: ['Critical','High','Medium','Low'],
      datasets: [{
        data: [sevCount.Critical, sevCount.High, sevCount.Medium, sevCount.Low],
        backgroundColor: ['rgba(255,23,68,.8)','rgba(255,171,0,.8)','rgba(0,229,255,.8)','rgba(0,230,118,.8)'],
        borderWidth: 0, hoverOffset: 4,
      }]
    },
    options: {
      cutout:'70%',
      plugins:{ legend:{ display:true, position:'right',
        labels:{ color:'#8b8fb8', font:{size:11}, boxWidth:10, padding:10 }},
        tooltip:{...tooltipPlugin} },
      maintainAspectRatio: false,
    }
  });
}

document.getElementById('fileInput').addEventListener('change', function() {
  if (this.files[0]) uploadFile(this.files[0]);
});

async function uploadFile(file) {
  const overlay = document.getElementById('progressOverlay');
  overlay.style.display = 'flex';
  document.getElementById('progressMsg').textContent = `Analyzing ${file.name}…`;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res  = await fetch('/analyze', { method:'POST', body:fd });
    const data = await res.json();
    if (data.error) { toast('Error: ' + data.error); }
    else { toast('Analysis complete — dashboard updated'); loadDashboard(); }
  } catch(e) { toast('Upload failed: ' + e.message); }
  finally { overlay.style.display = 'none'; }
}

const dz = document.getElementById('dropzone');
document.addEventListener('dragover', e => { e.preventDefault(); dz.style.display='flex'; });
document.addEventListener('dragleave', e => { if (!e.relatedTarget) dz.style.display='none'; });
document.addEventListener('drop', e => {
  e.preventDefault(); dz.style.display='none';
  const f = e.dataTransfer.files[0];
  if (f) uploadFile(f);
});

loadDashboard();
})();

(function(){
  if (!document.getElementById('ipList')) return;
Chart.defaults.color = '#4a4e7a';

let allIPs = [];
let selectedIP = null;

const riskCls   = r => ({ critical:'pill-critical', high:'pill-high', medium:'pill-medium', low:'pill-low' })[r]||'pill-low';
const riskColor = r => ({ critical:'#ff6b8a', high:'#ffab00', medium:'#00e5ff', low:'#00e676' })[r]||'#8b8fb8';

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data)||!data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r=>`<option value="${r.id}">${r.filename}</option>`).join('');
  loadIPs();
}

async function loadIPs() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;
  const data = await apiFetch(`/api/ip-analytics/${id}`);
  if (!data||data.error) return;
  allIPs = data.ips || [];
  renderIPList(allIPs);
  if (allIPs.length) selectIP(allIPs[0]);
}

function filterIPs() {
  const q = document.getElementById('ipSearch').value.toLowerCase();
  renderIPList(allIPs.filter(ip => ip.ip.toLowerCase().includes(q)));
}

function renderIPList(ips) {
  const el = document.getElementById('ipList');
  if (!ips.length) {
    el.innerHTML = '<div class="empty-state"><p>No IPs</p></div>';
    return;
  }
  el.innerHTML = ips.map(ip => `
    <div class="ip-row ${selectedIP===ip.ip?'active':''}" id="ipr-${ip.ip.replace(/\./g,'-')}" onclick="selectIP_byId('${ip.ip}')">
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--txt1);font-family:monospace">${ip.ip}</div>
        <div style="font-size:10px;color:var(--txt3);margin-top:1px">${ip.count} events · ${ip.fail} failures</div>
      </div>
      <span class="pill ${riskCls(ip.risk)}">${(ip.risk||'low').charAt(0).toUpperCase()+(ip.risk||'low').slice(1)}</span>
    </div>`).join('');
}

function selectIP_byId(ip) {
  const rec = allIPs.find(r => r.ip === ip);
  if (rec) selectIP(rec);
}

function selectIP(ip) {
  selectedIP = ip.ip;
  renderIPList(allIPs.filter(r =>
    document.getElementById('ipSearch').value
      ? r.ip.includes(document.getElementById('ipSearch').value)
      : true
  ));
  renderDetail(ip);
}

function renderDetail(ip) {
  const rc       = riskColor(ip.risk);
  const failPct  = ip.count ? Math.round(ip.fail/ip.count*100) : 0;
  const detail   = document.getElementById('ipDetail');

  const gaugeStyle = `background:conic-gradient(${rc} ${failPct*3.6}deg, rgba(255,255,255,.07) 0deg)`;

  detail.innerHTML = `
    <div class="card" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
      <div class="gauge-ring" style="${gaugeStyle}">
        <div style="width:70px;height:70px;border-radius:50%;background:var(--card);display:flex;align-items:center;justify-content:center;flex-direction:column;">
          <span style="font-size:18px;font-weight:700;color:${rc}">${failPct}%</span>
          <span style="font-size:9px;color:var(--txt3)">fail rate</span>
        </div>
      </div>
      <div style="flex:1;min-width:160px;">
        <div style="font-size:18px;font-weight:700;color:var(--txt1);font-family:monospace;margin-bottom:6px">${ip.ip}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span class="pill ${riskCls(ip.risk)}">${(ip.risk||'low').charAt(0).toUpperCase()+(ip.risk||'low').slice(1)} Risk</span>
          <span style="font-size:11px;color:var(--txt2)">${ip.count} total events</span>
          <span style="font-size:11px;color:var(--red)">${ip.fail} failures</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${[['Usernames',(ip.usernames||[]).join(', ')||'—'],['Services',(ip.services||[]).join(', ')||'—']].map(([k,v])=>`
          <div style="background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">
            <div style="font-size:10px;color:var(--txt3);margin-bottom:3px">${k}</div>
            <div style="font-size:12px;color:var(--txt1);font-weight:500;word-break:break-all">${v}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Status Breakdown</div></div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${Object.entries(ip.statuses||{}).map(([status,count])=>{
          const pct = ip.count ? Math.round(count/ip.count*100) : 0;
          const cl  = status.includes('fail')||status.includes('deny') ? 'prog-amber' : 'prog-teal';
          return `<div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:11px;color:var(--txt2);text-transform:capitalize">${status}</span>
              <span style="font-size:11px;font-weight:600;color:var(--txt1)">${count} <span style="color:var(--txt3)">(${pct}%)</span></span>
            </div>
            <div class="progress-track"><div class="progress-fill ${cl}" style="width:${pct}%"></div></div>
          </div>`;
        }).join('')||'<p style="font-size:12px;color:var(--txt3)">No status data</p>'}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Detection Reasons</div></div>
      ${(ip.reasons||[]).length
        ? `<div style="display:flex;flex-direction:column;gap:8px;">
            ${ip.reasons.map(r=>`
              <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:var(--card2);border-radius:8px;border:1px solid var(--border);">
                <div style="width:6px;height:6px;border-radius:50%;background:var(--red);flex-shrink:0;margin-top:5px;"></div>
                <span style="font-size:12px;color:var(--txt2)">${r}</span>
              </div>`).join('')}
           </div>`
        : '<p style="font-size:12px;color:var(--txt3)">No specific rules triggered</p>'}
    </div>`;
}

initScans();
})();

(function(){
  if (!document.getElementById('mapContainer')) return;
let map = null;
let markers = [];

function initMap() {
  map = L.map('mapContainer', { zoomControl: true, attributionControl: false }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18
  }).addTo(map);
}

function markerColor(risk) {
  return { critical:'#ff1744', high:'#ffab00', medium:'#00e5ff', low:'#00e676' }[risk] || '#8b8fb8';
}

function abuseColor(score) {
  if (score > 75) return '#ff6b8a';
  if (score > 50) return '#ff7043';
  if (score > 25) return '#ffab00';
  return '#00e676';
}

function riskPill(r) {
  const cls = { critical:'pill-critical', high:'pill-high', medium:'pill-medium', low:'pill-low' }[r] || 'pill-low';
  return `<span class="pill ${cls}">${r?.charAt(0).toUpperCase()+r?.slice(1)||'Low'}</span>`;
}

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data) || !data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r => `<option value="${r.id}">${r.filename}</option>`).join('');
  loadMap();
}

async function loadMap() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;

  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const data = await apiFetch(`/api/geo/${id}`);
  if (!data || data.error) return;

  const ips = data.ips || [];
  document.getElementById('ipCount').textContent = `${ips.length} unique IPs`;

  ips.forEach(ip => {
    if (!ip.lat || !ip.lon) return;
    const color = markerColor(ip.risk || 'low');
    const icon = L.divIcon({
      html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};border:2px solid rgba(255,255,255,.3)"></div>`,
      className: '', iconSize: [12,12], iconAnchor: [6,6]
    });
    const m = L.marker([ip.lat, ip.lon], { icon }).addTo(map);
    m.bindPopup(`
      <div style="min-width:160px">
        <div style="font-weight:600;margin-bottom:6px">${ip.ip}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#8b8fb8">Country</span><span>${ip.country||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#8b8fb8">City</span><span>${ip.city||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#8b8fb8">Alerts</span><span>${ip.count||0}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#8b8fb8">Risk</span><span style="color:${color};font-weight:600">${(ip.risk||'low').charAt(0).toUpperCase()+(ip.risk||'low').slice(1)}</span></div>
      </div>`);
    markers.push(m);
  });

  if (markers.length) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(.2));
  }

  const tbody = document.getElementById('geoBody');
  if (!ips.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg><p>No geo data for this scan</p></div></td></tr>`;
    return;
  }

  const mitreMap = data.mitre_map || {};
  tbody.innerHTML = ips.map(ip => {
    const score    = ip.abuse_score || 0;
    const aColor   = abuseColor(score);
    const techs    = (mitreMap[ip.ip] || []).slice(0,2).join(', ') || '—';
    return `<tr>
      <td><code style="font-size:11px;color:var(--teal)">${ip.ip}</code></td>
      <td>${ip.country||'—'}</td>
      <td style="color:var(--txt2)">${ip.city||'—'}</td>
      <td>
        <span class="abuse-badge" style="background:${aColor}22;color:${aColor}">${score}</span>
        <div class="progress-track" style="margin-top:4px;width:60px"><div class="progress-fill" style="background:${aColor};width:${Math.min(score,100)}%"></div></div>
      </td>
      <td>${ip.total_reports||0}</td>
      <td>${riskPill(ip.risk||'low')}</td>
      <td style="font-size:11px;color:var(--txt2)">${techs}</td>
    </tr>`;
  }).join('');
}

initMap();
initScans();
})();

(function(){
  if (!document.getElementById('statTotal')) return;
let socket;
let stats = { total:0, suspicious:0, normal:0 };

function updateStats() {
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statSusp').textContent  = stats.suspicious;
  document.getElementById('statClean').textContent = stats.normal;
}

function appendResult(r) {
  document.getElementById('streamEmpty').style.display = 'none';
  const stream = document.getElementById('resultsStream');
  const div = document.createElement('div');
  div.className = `result-row ${r.suspicious ? 'susp' : 'clean'}`;
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="flex:1;overflow:hidden;">
        <code style="font-size:10.5px;color:var(--txt2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${r.line||''}</code>
        ${r.ip && r.ip!=='—' ? `<span style="font-size:10px;color:var(--teal);margin-top:2px;display:inline-block">${r.ip}</span>` : ''}
        ${r.reason && r.reason!=='طبيعي' ? `<span style="font-size:10px;color:var(--amber);margin-left:8px">${r.reason}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="pill ${r.suspicious?'pill-critical':'pill-resolved'}">${r.suspicious?'Suspicious':'Clean'}</span>
        <span style="font-size:10px;color:var(--txt3)">${r.timestamp||''}</span>
      </div>
    </div>`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
  stats.total++;
  r.suspicious ? stats.suspicious++ : stats.normal++;
  updateStats();
}

function initSocket() {
  try {
    socket = io();
    socket.on('connect', () => {
      document.getElementById('liveStatus').textContent = 'Connected';
      document.getElementById('liveDot').style.background = 'var(--green)';
    });
    socket.on('disconnect', () => {
      document.getElementById('liveStatus').textContent = 'Disconnected';
      document.getElementById('liveDot').style.background = 'var(--red)';
    });
    socket.on('line_result', appendResult);
    socket.on('bulk_done', d => {
      toast(`Done — ${d.total} lines: ${d.suspicious} suspicious, ${d.normal} clean`);
    });
  } catch(e) {
    document.getElementById('liveStatus').textContent = 'WebSocket unavailable';
    document.getElementById('liveDot').style.background = 'var(--amber)';
  }
}

function analyzeLine() {
  const line = document.getElementById('singleLine').value.trim();
  if (!line) return;
  if (socket && socket.connected) {
    socket.emit('analyze_line', { line });
  } else {
    toast('Not connected to server');
  }
  document.getElementById('singleLine').value = '';
}

function analyzeBulk() {
  const text = document.getElementById('logInput').value.trim();
  if (!text) { toast('Enter some log lines first'); return; }
  if (socket && socket.connected) {
    socket.emit('analyze_bulk', { text });
  } else {
    toast('Not connected to server');
  }
}

function clearAll() {
  document.getElementById('logInput').value = '';
}

function clearResults() {
  const stream = document.getElementById('resultsStream');
  stream.innerHTML = '<div class="empty-state" id="streamEmpty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><p>Results will appear here in real-time</p></div>';
  stats = { total:0, suspicious:0, normal:0 };
  updateStats();
}

initSocket();
})();

(function(){
  if (!document.getElementById('pillarIngest')) return;
let allScans    = [];
let fbSelMap    = {};

const statusPill = s => {
  const m = { 'Open':'pill-open','In Progress':'pill-progress','Resolved':'pill-resolved','Closed':'pill-closed' };
  return `<span class="pill ${m[s]||'pill-open'}">${s||'Open'}</span>`;
};
const priPill = p => {
  const m = { 'Critical':'pill-critical','High':'pill-high','Medium':'pill-medium','Low':'pill-low' };
  return `<span class="pill ${m[p]||'pill-medium'}">${p||'Medium'}</span>`;
};
const abuseColor = n => n > 75 ? '#ff6b8a' : n > 50 ? '#ff7043' : n > 25 ? '#ffab00' : '#00e676';

async function loadAll() {
  await Promise.all([loadPillars(), loadCases(), loadFbScans(), loadFbStats()]);
}

async function loadPillars() {
  const [soar, history] = await Promise.all([
    apiFetch('/api/soar/stats'),
    apiFetch('/api/history'),
  ]);

  let totalLogs = 0, totalThreats = 0;
  if (Array.isArray(history)) {
    allScans = history;
    history.forEach(r => {
      totalLogs    += r.summary?.total_logs       || 0;
      totalThreats += r.summary?.suspicious_events || 0;
    });
  }

  document.getElementById('pillarIngest').textContent  = totalLogs.toLocaleString();
  document.getElementById('pillarDetect').textContent  = totalThreats.toLocaleString();

  if (soar.success) {
    document.getElementById('pillarRespond').textContent = soar.data.open || 0;
    document.getElementById('pillarLearn').textContent   = soar.data.total_feedback || 0;
  }
}

async function loadCases() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data)) return;
  allScans = data;
  document.getElementById('caseCountLabel').textContent = `${data.length} scans`;

  const tbody = document.getElementById('caseBody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No scans yet</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.slice(0,15).map(r => `
    <tr>
      <td style="max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        <span style="font-size:11px;color:var(--txt1);font-weight:500">${r.filename}</span>
      </td>
      <td>${priPill(r.priority)}</td>
      <td>
        <select class="select-sm" onchange="changeStatus(${r.id}, this.value)" style="font-size:10px;padding:3px 6px;">
          ${['Open','In Progress','Resolved','Closed'].map(s=>
            `<option ${(r.case_status||'Open')===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td style="font-size:11px;color:var(--txt3);max-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.assigned_to||'—'}</td>
      <td>
        <button class="action-btn" title="Timeline" onclick="openTimeline(${r.id},'${r.filename.replace(/'/g,"\\'")}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4"/></svg>
        </button>
      </td>
    </tr>`).join('');
}

async function changeStatus(scanId, newStatus) {
  const res = await apiFetch(`/api/case/${scanId}/status`, {
    method:'PUT', body: JSON.stringify({ new_status: newStatus, changed_by:'Analyst' })
  });
  if (res.success) { toast(`Case #${scanId} → ${newStatus}`); loadPillars(); }
  else toast('Error: ' + (res.error||'unknown'));
}

async function openTimeline(scanId, filename) {
  document.getElementById('tlModalTitle').textContent = `Timeline — ${filename}`;
  document.getElementById('tlModalBody').innerHTML = '<p style="color:var(--txt3);font-size:12px;padding:8px 0">Loading…</p>';
  document.getElementById('tlModal').classList.add('open');

  const res = await apiFetch(`/api/case/${scanId}/timeline`);
  const body = document.getElementById('tlModalBody');
  if (!res.success || !res.data.length) {
    body.innerHTML = '<p style="color:var(--txt3);font-size:12px;padding:8px 0">No timeline events yet.</p>';
    return;
  }
  body.innerHTML = res.data.map(ev => `
    <div class="tl-modal-item">
      <div class="tl-modal-dot"></div>
      <div style="flex:1">
        <div style="font-size:12px;color:var(--txt1);font-weight:500">${ev.old_status} → ${ev.new_status}</div>
        ${ev.analyst_note ? `<div style="font-size:11px;color:var(--txt2);margin-top:2px">${ev.analyst_note}</div>` : ''}
        <div style="font-size:10px;color:var(--txt3);margin-top:3px">${(ev.changed_at||'').replace('T',' ')} · ${ev.changed_by}</div>
      </div>
    </div>`).join('');
}

async function enrichIPs() {
  const id = document.getElementById('tiScanId').value.trim();
  if (!id) { toast('Enter a scan ID first'); return; }

  document.getElementById('tiLoading').style.display = 'block';
  document.getElementById('tiBody').innerHTML = '';

  const res = await apiFetch(`/api/threat-intel/${id}`);
  document.getElementById('tiLoading').style.display = 'none';

  const tbody = document.getElementById('tiBody');
  if (!res.success || !res.data.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:20px 0"><p>${res.error||'No IPs found'}</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = res.data.map(ip => {
    const score = ip.abuse_score || 0;
    const ac    = abuseColor(score);
    const risk  = score > 75 ? 'Critical' : score > 50 ? 'High' : score > 25 ? 'Medium' : 'Low';
    const rCls  = { Critical:'pill-critical', High:'pill-high', Medium:'pill-medium', Low:'pill-low' }[risk];
    return `<tr>
      <td><code style="font-size:11px;color:var(--teal)">${ip.ip}</code></td>
      <td>
        <span class="abuse-num" style="background:${ac}22;color:${ac}">${score}</span>
      </td>
      <td style="font-size:11px">${ip.country_code||'—'}</td>
      <td style="font-size:10px;color:var(--txt3);max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ip.isp||'—'}</td>
      <td><span class="pill ${rCls}">${risk}</span></td>
    </tr>`;
  }).join('');
}

async function loadFbScans() {
  const sel = document.getElementById('fbScanSel');
  if (!allScans.length) {
    const data = await apiFetch('/api/history');
    if (Array.isArray(data)) allScans = data;
  }
  if (!allScans.length) return;
  sel.innerHTML = allScans.slice(0,10).map(r =>
    `<option value="${r.id}">${r.filename.slice(0,22)}</option>`
  ).join('');
  loadFeedbackEntries();
}

async function loadFeedbackEntries() {
  const scanId = document.getElementById('fbScanSel').value;
  if (!scanId) return;

  const rec = await apiFetch(`/api/history/${scanId}`);
  if (!rec || rec.error) return;

  const entries = (rec.summary?.suspicious_table || []).slice(0, 8);
  const el      = document.getElementById('fbEntries');

  if (!entries.length) {
    el.innerHTML = '<div class="empty-state" style="padding:20px 0"><p>No suspicious entries</p></div>';
    return;
  }

  el.innerHTML = entries.map((e, i) => {
    const ip      = e.ip || e.source_ip || '—';
    const aiSaid  = 'suspicious';
    const selKey  = `${scanId}-${i}`;
    const sel     = fbSelMap[selKey];
    return `<div style="padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:9px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <code style="font-size:11px;color:var(--teal)">${ip}</code>
        <span class="pill pill-critical" style="font-size:9px">AI: suspicious</span>
      </div>
      <div style="font-size:10px;color:var(--txt3);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.rule_reason||'—'}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <button class="fb-btn fb-correct ${sel==='suspicious'?'selected':''}"
          onclick="submitFeedback('${scanId}',${i},'suspicious','suspicious',this)">Correct</button>
        <button class="fb-btn fb-wrong ${sel==='normal'?'selected':''}"
          onclick="submitFeedback('${scanId}',${i},'suspicious','normal',this)">Wrong</button>
        <input class="input-sm" style="flex:1;font-size:10px;padding:4px 8px" placeholder="Note…" id="note-${scanId}-${i}">
      </div>
    </div>`;
  }).join('');
}

async function submitFeedback(scanId, idx, aiPred, correctLabel, btn) {
  const note   = document.getElementById(`note-${scanId}-${idx}`)?.value || '';
  const selKey = `${scanId}-${idx}`;
  fbSelMap[selKey] = correctLabel;

  const parent = btn.closest('div[style]');
  parent.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const res = await apiFetch('/api/feedback', {
    method:'POST',
    body: JSON.stringify({ scan_id:+scanId, entry_index:idx, ai_prediction:aiPred, correct_label:correctLabel, note })
  });
  if (res.success) { toast('Feedback saved'); loadFbStats(); }
  else toast('Error: ' + (res.error||'unknown'));
}

async function loadFbStats() {
  const res = await apiFetch('/api/feedback/stats');
  if (!res.success) return;
  const d = res.data;

  const total = d.total || 0;
  const pct   = Math.min(total / 10 * 100, 100);
  document.getElementById('fbProgressBar').style.width  = pct + '%';
  document.getElementById('fbProgressLabel').textContent = `${total} / 10`;

  if (total > 0) {
    document.getElementById('fbStats').style.display = 'block';
    document.getElementById('fbStatsGrid').innerHTML = [
      ['Total',    total],
      ['Correct',  `${d.correct} (${d.accuracy_rate}%)`],
      ['False Pos', d.false_positives],
      ['False Neg', d.false_negatives],
    ].map(([k,v])=>`
      <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;">
        <div style="font-size:10px;color:var(--txt3);margin-bottom:2px">${k}</div>
        <div style="font-size:13px;font-weight:600;color:var(--txt1)">${v}</div>
      </div>`).join('');
  }
  document.getElementById('pillarLearn').textContent = total;
}

async function retrainModel() {
  const btn = document.getElementById('retrainBtn');
  btn.disabled = true;
  btn.textContent = 'Retraining…';

  const res = await apiFetch('/api/model/retrain', { method:'POST' });
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Retrain Model`;

  const box = document.getElementById('retrainResult');
  box.style.display = 'block';

  if (!res.success) {
    const need = res.data?.needed || 10;
    const cur  = res.data?.current || 0;
    box.innerHTML = `
      <div style="font-size:12px;color:var(--amber);font-weight:500;margin-bottom:4px">Not enough feedback</div>
      <div style="font-size:11px;color:var(--txt2)">Need ${need} records — you have ${cur}.</div>`;
    return;
  }

  const d = res.data;
  box.innerHTML = `
    <div style="font-size:12px;font-weight:600;color:var(--green);margin-bottom:10px">Retrain complete</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      ${[
        ['New Accuracy', d.new_accuracy+'%'],
        ['New F1',       d.new_f1+'%'],
        ['Improvement',  (d.improvement>=0?'+':'')+d.improvement+'%'],
        ['Samples',      d.samples_used],
      ].map(([k,v])=>`
        <div style="background:var(--card);border:1px solid var(--border);border-radius:7px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--txt3)">${k}</div>
          <div style="font-size:14px;font-weight:700;color:${k==='Improvement'?(d.improvement>=0?'var(--green)':'var(--red)'):'var(--txt1)'}">${v}</div>
        </div>`).join('')}
    </div>`;
  toast('Model retrained successfully');
}

loadAll();
})();

(function(){
  if (!document.getElementById('areaChart')) return;
Chart.defaults.color = '#4a4e7a';
Chart.defaults.borderColor = 'rgba(255,255,255,.04)';

let areaChart  = null;
let tlData     = null;
let activePeriod = 'all';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const tooltipCfg = {
  backgroundColor:'#191b38', borderColor:'rgba(255,255,255,.08)',
  borderWidth:1, padding:10, titleColor:'#e8eaf6', bodyColor:'#8b8fb8', cornerRadius:8
};

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data) || !data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r => `<option value="${r.id}">${r.filename}</option>`).join('');
  loadTimeline();
}

async function loadTimeline() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;
  tlData = await apiFetch(`/api/timeline/${id}`);
  if (!tlData || tlData.error) { toast('No timeline data for this scan'); return; }
  render();
}

function setPeriod(p, btn) {
  activePeriod = p;
  document.querySelectorAll('#periodBtns button').forEach(b => b.classList.remove('active-period'));
  btn.classList.add('active-period');
  render();
}

function render() {
  if (!tlData) return;
  renderAreaChart();
  renderHeatmap();
  renderEvents();
}

function renderAreaChart() {
  const daily  = tlData.daily || {};
  let allDays  = Object.keys(daily).sort();

  const now = new Date();
  if (activePeriod === 'day') {
    const cutoff = new Date(now - 86400000).toISOString().slice(0,10);
    allDays = allDays.filter(d => d >= cutoff);
  } else if (activePeriod === 'week') {
    const cutoff = new Date(now - 7*86400000).toISOString().slice(0,10);
    allDays = allDays.filter(d => d >= cutoff);
  } else if (activePeriod === 'month') {
    const cutoff = new Date(now - 30*86400000).toISOString().slice(0,10);
    allDays = allDays.filter(d => d >= cutoff);
  }

  const suspArr = allDays.map(d => daily[d] || 0);
  const critArr = suspArr.map(v => Math.round(v * 0.2));

  const ctx = document.getElementById('areaChart').getContext('2d');
  if (areaChart) areaChart.destroy();

  const gPurple = ctx.createLinearGradient(0,0,0,240);
  gPurple.addColorStop(0,'rgba(124,77,255,.4)'); gPurple.addColorStop(1,'rgba(124,77,255,0)');
  const gPink = ctx.createLinearGradient(0,0,0,240);
  gPink.addColorStop(0,'rgba(224,64,251,.3)'); gPink.addColorStop(1,'rgba(224,64,251,0)');

  areaChart = new Chart(ctx, {
    type:'line',
    data:{
      labels: allDays.map(d=>d.slice(5)),
      datasets:[
        { label:'Suspicious', data:suspArr, borderColor:'var(--purple)', backgroundColor:gPurple,
          tension:.4, fill:true, pointRadius:3, pointBorderColor:'#0d0e1a', pointBorderWidth:2 },
        { label:'Critical',   data:critArr, borderColor:'var(--pink)',   backgroundColor:gPink,
          tension:.4, fill:true, pointRadius:3, pointBorderColor:'#0d0e1a', pointBorderWidth:2 },
      ]
    },
    options:{
      maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{...tooltipCfg} },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#4a4e7a',font:{size:10}} },
        y:{ grid:{color:'rgba(255,255,255,.04)'}, ticks:{color:'#4a4e7a',font:{size:10}}, beginAtZero:true }
      }
    }
  });
}

function renderHeatmap() {
  const hourly = tlData.hourly || {};
  const peak   = tlData.peak_hour || '—';
  document.getElementById('peakHour').textContent = `Peak hour: ${peak}:00`;

  const grid = Array.from({length:7},()=>Array(24).fill(0));
  (tlData.timeline || []).forEach(ev => {
    const d = new Date(ev.time);
    if (!isNaN(d)) {
      grid[d.getDay()][d.getHours()]++;
    }
  });

  const maxVal = Math.max(...grid.flat(), 1);
  const heatEl = document.getElementById('heatmap');
  heatEl.innerHTML = '';

  grid.forEach((row, dayIdx) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'heat-row';
    rowEl.innerHTML = `<div class="heat-label">${DAYS[dayIdx]}</div>`;
    row.forEach((val, hr) => {
      const intensity = val / maxVal;
      const alpha     = 0.05 + intensity * 0.85;
      const cell      = document.createElement('div');
      cell.className  = 'heat-cell';
      cell.style.background = `rgba(124,77,255,${alpha.toFixed(2)})`;
      cell.dataset.tip = `${DAYS[dayIdx]} ${String(hr).padStart(2,'0')}:00 — ${val} events`;
      rowEl.appendChild(cell);
    });
    heatEl.appendChild(rowEl);
  });

  const labelsEl = document.getElementById('hourLabels');
  labelsEl.innerHTML = `<div style="width:52px;flex-shrink:0"></div>` +
    Array.from({length:24},(_,h) =>
      `<div style="flex:1;font-size:9px;color:var(--txt3);text-align:center">${h%4===0?String(h).padStart(2,'0'):''}</div>`
    ).join('');
}

function renderEvents() {
  const events = tlData.timeline || [];
  document.getElementById('eventCount').textContent = `${events.length} events`;
  const tbody = document.getElementById('eventBody');
  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No timestamped events in this scan</p></div></td></tr>`;
    return;
  }
  const statusColor = s => {
    const l = (s||'').toLowerCase();
    if (l.includes('fail')||l.includes('denied')) return 'var(--red)';
    if (l.includes('accept')||l.includes('success')) return 'var(--green)';
    return 'var(--txt2)';
  };
  tbody.innerHTML = events.slice(0,200).map(e=>`
    <tr>
      <td><code style="font-size:10.5px;color:var(--txt3)">${e.time||'—'}</code></td>
      <td><code style="font-size:11px;color:var(--teal)">${e.ip||'—'}</code></td>
      <td style="color:var(--txt2)">${e.username||'—'}</td>
      <td style="color:var(--txt2)">${e.service||'—'}</td>
      <td><span style="font-size:11px;font-weight:500;color:${statusColor(e.status)}">${e.status||'—'}</span></td>
      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--txt3);font-size:11px">${e.reason||'—'}</td>
    </tr>`).join('');
}

initScans();
})();