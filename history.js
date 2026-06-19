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
