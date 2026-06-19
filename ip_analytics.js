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
