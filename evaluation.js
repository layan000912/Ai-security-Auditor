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
