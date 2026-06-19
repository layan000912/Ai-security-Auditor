let map = null;
let markers = [];

function initMap() {
  map = L.map('mapContainer', { zoomControl: true, attributionControl: false }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18
  }).addTo(map);
}

function markerColor(risk) {
  return { critical:'#ff1744', high:'#ffab00', medium:'#00e5ff', low:'#00e676' }[risk] || '#8b8fb8';
}

function abuseColor(score) {
  if (score > 75) return '#ff6b8a';
  if (score > 50) return '#ff7043';
  if (score > 25) return '#ffab00';
  return '#00e676';
}

function riskPill(r) {
  const cls = { critical:'pill-critical', high:'pill-high', medium:'pill-medium', low:'pill-low' }[r] || 'pill-low';
  return `<span class="pill ${cls}">${r?.charAt(0).toUpperCase()+r?.slice(1)||'Low'}</span>`;
}

async function initScans() {
  const data = await apiFetch('/api/history');
  if (!Array.isArray(data) || !data.length) return;
  const sel = document.getElementById('scanSel');
  sel.innerHTML = data.map(r => `<option value="${r.id}">${r.filename}</option>`).join('');
  loadMap();
}

async function loadMap() {
  const id = document.getElementById('scanSel').value;
  if (!id) return;

  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const data = await apiFetch(`/api/geo/${id}`);
  if (!data || data.error) return;

  const ips = data.ips || [];
  document.getElementById('ipCount').textContent = `${ips.length} unique IPs`;

  ips.forEach(ip => {
    if (!ip.lat || !ip.lon) return;
    const color = markerColor(ip.risk || 'low');
    const icon = L.divIcon({
      html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};border:2px solid rgba(255,255,255,.3)"></div>`,
      className: '', iconSize: [12,12], iconAnchor: [6,6]
    });
    const m = L.marker([ip.lat, ip.lon], { icon }).addTo(map);
    m.bindPopup(`
      <div style="min-width:160px">
        <div style="font-weight:600;margin-bottom:6px">${ip.ip}</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#8b8fb8">Country</span><span>${ip.country||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#8b8fb8">City</span><span>${ip.city||'—'}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#8b8fb8">Alerts</span><span>${ip.count||0}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#8b8fb8">Risk</span><span style="color:${color};font-weight:600">${(ip.risk||'low').charAt(0).toUpperCase()+(ip.risk||'low').slice(1)}</span></div>
      </div>`);
    markers.push(m);
  });

  if (markers.length) {
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(.2));
  }

  const tbody = document.getElementById('geoBody');
  if (!ips.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg><p>No geo data for this scan</p></div></td></tr>`;
    return;
  }

  const mitreMap = data.mitre_map || {};
  tbody.innerHTML = ips.map(ip => {
    const score    = ip.abuse_score || 0;
    const aColor   = abuseColor(score);
    const techs    = (mitreMap[ip.ip] || []).slice(0,2).join(', ') || '—';
    return `<tr>
      <td><code style="font-size:11px;color:var(--teal)">${ip.ip}</code></td>
      <td>${ip.country||'—'}</td>
      <td style="color:var(--txt2)">${ip.city||'—'}</td>
      <td>
        <span class="abuse-badge" style="background:${aColor}22;color:${aColor}">${score}</span>
        <div class="progress-track" style="margin-top:4px;width:60px"><div class="progress-fill" style="background:${aColor};width:${Math.min(score,100)}%"></div></div>
      </td>
      <td>${ip.total_reports||0}</td>
      <td>${riskPill(ip.risk||'low')}</td>
      <td style="font-size:11px;color:var(--txt2)">${techs}</td>
    </tr>`;
  }).join('');
}

initMap();
initScans();
