let socket;
let stats = { total:0, suspicious:0, normal:0 };

function updateStats() {
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statSusp').textContent  = stats.suspicious;
  document.getElementById('statClean').textContent = stats.normal;
}

function appendResult(r) {
  document.getElementById('streamEmpty').style.display = 'none';
  const stream = document.getElementById('resultsStream');
  const div = document.createElement('div');
  div.className = `result-row ${r.suspicious ? 'susp' : 'clean'}`;
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="flex:1;overflow:hidden;">
        <code style="font-size:10.5px;color:var(--txt2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">${r.line||''}</code>
        ${r.ip && r.ip!=='—' ? `<span style="font-size:10px;color:var(--teal);margin-top:2px;display:inline-block">${r.ip}</span>` : ''}
        ${r.reason && r.reason!=='طبيعي' ? `<span style="font-size:10px;color:var(--amber);margin-left:8px">${r.reason}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="pill ${r.suspicious?'pill-critical':'pill-resolved'}">${r.suspicious?'Suspicious':'Clean'}</span>
        <span style="font-size:10px;color:var(--txt3)">${r.timestamp||''}</span>
      </div>
    </div>`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
  stats.total++;
  r.suspicious ? stats.suspicious++ : stats.normal++;
  updateStats();
}

function initSocket() {
  try {
    socket = io();
    socket.on('connect', () => {
      document.getElementById('liveStatus').textContent = 'Connected';
      document.getElementById('liveDot').style.background = 'var(--green)';
    });
    socket.on('disconnect', () => {
      document.getElementById('liveStatus').textContent = 'Disconnected';
      document.getElementById('liveDot').style.background = 'var(--red)';
    });
    socket.on('line_result', appendResult);
    socket.on('bulk_done', d => {
      toast(`Done — ${d.total} lines: ${d.suspicious} suspicious, ${d.normal} clean`);
    });
  } catch(e) {
    document.getElementById('liveStatus').textContent = 'WebSocket unavailable';
    document.getElementById('liveDot').style.background = 'var(--amber)';
  }
}

function analyzeLine() {
  const line = document.getElementById('singleLine').value.trim();
  if (!line) return;
  if (socket && socket.connected) {
    socket.emit('analyze_line', { line });
  } else {
    toast('Not connected to server');
  }
  document.getElementById('singleLine').value = '';
}

function analyzeBulk() {
  const text = document.getElementById('logInput').value.trim();
  if (!text) { toast('Enter some log lines first'); return; }
  if (socket && socket.connected) {
    socket.emit('analyze_bulk', { text });
  } else {
    toast('Not connected to server');
  }
}

function clearAll() {
  document.getElementById('logInput').value = '';
}

function clearResults() {
  const stream = document.getElementById('resultsStream');
  stream.innerHTML = '<div class="empty-state" id="streamEmpty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><p>Results will appear here in real-time</p></div>';
  stats = { total:0, suspicious:0, normal:0 };
  updateStats();
}

initSocket();
