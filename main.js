

'use strict';

function showToast(msg, type = 'info', duration = 4000) {
  const el = document.getElementById('toast');
  if (!el) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.className = `toast ${type} show`;

  const iconEl = document.getElementById('toastIcon');
  const msgEl  = document.getElementById('toastMsg');
  if (iconEl) iconEl.textContent = icons[type] || 'ℹ️';
  if (msgEl)  msgEl.textContent  = msg;
  else        el.textContent     = msg;

  
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

function animateCount(el, target, suffix = '', duration = 900) {
  const startTime  = performance.now();
  const isFloat    = String(target).includes('.');

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    
    const ease     = 1 - Math.pow(1 - progress, 3);
    const value    = isFloat
      ? (target * ease).toFixed(1)
      : Math.round(target * ease);
    el.textContent = value + suffix;
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function startClock() {
  const el = document.getElementById('headerClock');
  if (!el) return;

  function tick() {
    el.textContent = new Date().toLocaleTimeString('ar-SA', { hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadHistorySelect(selectId, onSelect, autoLoad = true) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  try {
    const data = await fetchJSON('/api/history');
    sel.innerHTML = '<option value="">— اختر تحليلاً —</option>';

    data.forEach(r => {
      const o = document.createElement('option');
      o.value       = r.id;
      o.textContent = `#${r.id} — ${r.filename} (${r.scanned_at.slice(0, 10)})`;
      sel.appendChild(o);
    });

    
    const urlId = new URLSearchParams(location.search).get('id');
    if (urlId) {
      sel.value = urlId;
      onSelect(urlId);
      return;
    }

    
    if (autoLoad && data.length > 0) {
      sel.value = data[0].id;
      onSelect(data[0].id);
    }
  } catch (e) {
    sel.innerHTML = '<option>فشل تحميل السجل</option>';
  }
}

function setupDragDrop(zoneId, onDrop) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) onDrop(file);
  });
}

function exportPDF(recordId) {
  if (!recordId) { showToast('لا يوجد تحليل محفوظ', 'error'); return; }
  showToast('جاري توليد التقرير...', 'info');
  const a = document.createElement('a');
  a.href     = `/api/report/${recordId}`;
  a.download = `security_report_${recordId}.pdf`;
  a.click();
}

function chartDefaults() {
  return {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#cde8ef', font: { family: 'Share Tech Mono', size: 11 } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#527888', font: { family: 'Share Tech Mono', size: 10 } },
        grid:  { color: 'rgba(14, 61, 82, .5)' },
      },
      y: {
        ticks: { color: '#527888', font: { family: 'Share Tech Mono', size: 10 } },
        grid:  { color: 'rgba(14, 61, 82, .5)' },
      },
    },
  };
}

document.addEventListener('DOMContentLoaded', startClock);
