const API_BASE = '/__ditto__/api';
const SSE_URL = '/__ditto__/events';

let eventSource = null;
let autoScroll = true;
let editingIndex = -1; // -1 = creating new, >= 0 = editing existing

// --- SSE Connection ---

function connectSSE() {
  if (eventSource) eventSource.close();

  eventSource = new EventSource(SSE_URL);
  const status = document.getElementById('connection-status');

  eventSource.onopen = () => {
    status.textContent = 'Connected';
    status.className = 'status connected';
  };

  eventSource.onmessage = (e) => {
    const event = JSON.parse(e.data);
    addLogEntry(event);
  };

  eventSource.onerror = () => {
    status.textContent = 'Disconnected';
    status.className = 'status disconnected';
    setTimeout(connectSSE, 3000);
  };
}

// --- Request Log ---

function addLogEntry(event) {
  const container = document.getElementById('log-container');
  const empty = document.getElementById('log-empty');
  const body = document.getElementById('log-body');

  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    empty.classList.add('hidden');
  }

  const typeLower = event.type.toLowerCase();
  const methodLower = event.method.toLowerCase();

  // Main row
  const row = document.createElement('tr');
  row.className = 'log-row';
  row.innerHTML = `
    <td>${event.timestamp}</td>
    <td><span class="type-badge type-${typeLower}">${event.type}</span></td>
    <td class="method-${methodLower}">${event.method}</td>
    <td title="${event.path}">${event.path}</td>
    <td>${event.status || '-'}</td>
    <td>${event.duration_ms}ms</td>
    <td>${event.type === 'PROXY' ? '<button class="btn-save-mock" title="Save as mock">Save</button>' : ''}</td>
  `;

  // Detail row (expandable)
  const detailRow = document.createElement('tr');
  detailRow.className = 'log-detail';

  let prettyBody = '';
  try {
    prettyBody = JSON.stringify(JSON.parse(event.response_body), null, 2);
  } catch {
    prettyBody = event.response_body || '(no body)';
  }

  detailRow.innerHTML = `
    <td colspan="7">
      <div class="log-detail-content">
        <div class="log-detail-header">
          <span>Response Body</span>
        </div>
        <pre>${escapeHtml(prettyBody)}</pre>
      </div>
    </td>
  `;

  // Toggle detail on row click
  row.addEventListener('click', (e) => {
    if (e.target.closest('.btn-save-mock')) return;
    row.classList.toggle('expanded');
    detailRow.classList.toggle('show');
  });

  // Save as mock button
  const saveBtn = row.querySelector('.btn-save-mock');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditorForNewMock(event.method, event.path, event.status, event.response_body);
    });
  }

  body.appendChild(row);
  body.appendChild(detailRow);

  if (autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

function clearLog() {
  const body = document.getElementById('log-body');
  const container = document.getElementById('log-container');
  const empty = document.getElementById('log-empty');

  body.innerHTML = '';
  container.classList.add('hidden');
  empty.classList.remove('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Mocks ---

async function loadMocks() {
  try {
    const res = await fetch(`${API_BASE}/mocks`);
    const data = await res.json();
    renderMocks(data.mocks);
    renderConnectURLs(data.info);
    updateFooter(data.info);
    document.getElementById('target-input').value = data.info.target || '';
  } catch (err) {
    console.error('Failed to load mocks:', err);
  }
}

function renderMocks(mocks) {
  const list = document.getElementById('mock-list');
  const count = document.getElementById('mock-count');

  count.textContent = mocks.length;
  list.innerHTML = '';

  mocks.forEach((mock, index) => {
    const li = document.createElement('li');
    li.className = `mock-item${mock.enabled ? '' : ' disabled'}`;

    const methodLower = mock.method.toLowerCase();

    li.innerHTML = `
      <label class="toggle" onclick="event.stopPropagation()">
        <input type="checkbox" ${mock.enabled ? 'checked' : ''}
               onchange="toggleMock(${index})">
        <span class="slider"></span>
      </label>
      <span class="method method-${methodLower}">${mock.method}</span>
      <span class="path" title="${mock.path}" onclick="openEditorForExisting(${index})">${mock.path}</span>
      <div class="mock-actions">
        <button class="mock-action-btn" onclick="openEditorForExisting(${index})" title="Edit">&#9998;</button>
        <button class="mock-action-btn delete" onclick="deleteMock(${index})" title="Delete">&#10005;</button>
      </div>
    `;

    list.appendChild(li);
  });
}

async function toggleMock(index) {
  try {
    await fetch(`${API_BASE}/mocks/${index}/toggle`, { method: 'POST' });
    await loadMocks();
  } catch (err) {
    console.error('Failed to toggle mock:', err);
  }
}

async function reloadMocks() {
  try {
    await fetch(`${API_BASE}/mocks/reload`, { method: 'POST' });
    await loadMocks();
  } catch (err) {
    console.error('Failed to reload mocks:', err);
  }
}

async function deleteMock(index) {
  if (!confirm('Delete this mock? The JSON file will be removed.')) return;
  try {
    await fetch(`${API_BASE}/mocks/${index}`, { method: 'DELETE' });
    await loadMocks();
  } catch (err) {
    console.error('Failed to delete mock:', err);
  }
}

// --- Mock Editor Modal ---

function openEditorForNewMock(method, path, status, responseBody) {
  editingIndex = -1;
  document.getElementById('modal-title').textContent = 'Save as Mock';
  document.getElementById('edit-method').value = method || 'GET';
  document.getElementById('edit-path').value = path || '';
  document.getElementById('edit-status').value = status || 200;
  document.getElementById('edit-delay').value = 0;

  let prettyBody = '';
  try {
    prettyBody = JSON.stringify(JSON.parse(responseBody), null, 2);
  } catch {
    prettyBody = responseBody || '{}';
  }
  document.getElementById('edit-body').value = prettyBody;

  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function openEditorForExisting(index) {
  try {
    const res = await fetch(`${API_BASE}/mocks`);
    const data = await res.json();
    const mock = data.mocks[index];
    if (!mock) return;

    editingIndex = index;
    document.getElementById('modal-title').textContent = 'Edit Mock';
    document.getElementById('edit-method').value = mock.method;
    document.getElementById('edit-path').value = mock.path;
    document.getElementById('edit-status').value = mock.status;
    document.getElementById('edit-delay').value = mock.delay_ms || 0;

    let prettyBody = '';
    try {
      prettyBody = JSON.stringify(mock.body, null, 2);
    } catch {
      prettyBody = JSON.stringify(mock.body);
    }
    document.getElementById('edit-body').value = prettyBody;

    document.getElementById('modal-overlay').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load mock for editing:', err);
  }
}

function closeModal(event) {
  if (event && event.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

async function saveMock() {
  const method = document.getElementById('edit-method').value;
  const path = document.getElementById('edit-path').value;
  const status = parseInt(document.getElementById('edit-status').value) || 200;
  const delayMs = parseInt(document.getElementById('edit-delay').value) || 0;
  const bodyText = document.getElementById('edit-body').value;

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch (err) {
    alert('Invalid JSON in response body: ' + err.message);
    return;
  }

  const mock = { method, path, status, body, delay_ms: delayMs };

  try {
    if (editingIndex >= 0) {
      await fetch(`${API_BASE}/mocks/${editingIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mock),
      });
    } else {
      await fetch(`${API_BASE}/mocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mock),
      });
    }
    closeModal();
    await loadMocks();
  } catch (err) {
    console.error('Failed to save mock:', err);
    alert('Failed to save mock: ' + err.message);
  }
}

// --- Target URL ---

async function updateTarget() {
  const input = document.getElementById('target-input');
  const url = input.value.trim();
  if (!url) return;

  try {
    const res = await fetch(`${API_BASE}/target`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: url }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert('Failed to set target: ' + text);
      return;
    }
    await loadMocks(); // refresh info
  } catch (err) {
    console.error('Failed to update target:', err);
  }
}

// --- Connection URLs ---

function renderConnectURLs(info) {
  if (!info) return;
  const container = document.getElementById('connect-urls');
  const scheme = info.https ? 'https' : 'http';

  const urls = [
    { label: 'Android emulator', url: `${scheme}://10.0.2.2:${info.port}` },
    { label: 'iOS simulator', url: `${scheme}://localhost:${info.port}` },
  ];

  if (info.local_ips && info.local_ips.length > 0) {
    urls.push({
      label: 'Physical device',
      url: `${scheme}://${info.local_ips[0]}:${info.port}`
    });
  }

  container.innerHTML = urls.map(({ label, url }) => `
    <div class="connect-row">
      <span class="connect-label">${label}</span>
      <span class="connect-url" onclick="copyURL(this)" title="Click to copy">${url}</span>
    </div>
  `).join('');
}

function copyURL(el) {
  navigator.clipboard.writeText(el.textContent).then(() => {
    el.classList.add('copied');
    const original = el.textContent;
    el.textContent = 'Copied!';
    setTimeout(() => {
      el.textContent = original;
      el.classList.remove('copied');
    }, 1200);
  });
}

// --- Footer ---

function updateFooter(info) {
  if (!info) return;
  const el = document.getElementById('footer-info');
  let parts = [`Port: ${info.port}`];
  if (info.target) parts.push(`Target: ${info.target}`);
  if (info.https) parts.push('HTTPS');
  parts.push(`Mocks dir: ${info.mocks_dir}`);
  el.textContent = parts.join('  |  ');
}

// --- Keyboard shortcuts ---

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// --- Init ---

connectSSE();
loadMocks();
