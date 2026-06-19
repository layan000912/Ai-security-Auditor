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
