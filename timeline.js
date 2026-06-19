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
