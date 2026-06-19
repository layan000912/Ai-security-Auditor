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
