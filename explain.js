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
    const risk = (e.risk_level || 'medium').toLowerCase();
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

  const entry      = entries[idx] || {};
  const perEntry   = (shapData.per_entry_shap || [])[idx] || {};
  const featureVals = perEntry;

  const row = document.getElementById(`erow-${idx}`);
  if (!row) return;

  const chev = document.getElementById(`chevron-${idx}`);
  if (chev) chev.setAttribute('points','18 15 12 9 6 15');

  const tr = document.createElement('tr');
  tr.className = 'shap-detail-row';
  tr.innerHTML = `<td colspan="6" style="padding:0;background:var(--card2)">
    <div style="padding:16px 20px;">
      <div style="font-size:11px;font-weight:600;color:var(--txt3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
        Per-Entry SHAP Values — Entry ${idx+1}
      </div>
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
