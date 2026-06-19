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
