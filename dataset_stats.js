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
