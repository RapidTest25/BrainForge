// Popup script - login + configuration

const DEFAULT_API_URL = 'http://localhost:4000/api';
const DEFAULT_APP_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', init);

function el(id) {
  return document.getElementById(id);
}

function normalizeBaseUrl(input) {
  const raw = (input || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  return raw;
}

function normalizeApiUrl(input) {
  const raw = normalizeBaseUrl(input);
  if (!raw) return '';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

function showMessage(text, type) {
  const msgEl = el('message');
  msgEl.textContent = text;
  msgEl.className = `message message-${type}`;
  setTimeout(() => {
    msgEl.textContent = '';
    msgEl.className = 'message';
  }, 3500);
}

async function init() {
  const stored = await chrome.storage.sync.get([
    'apiUrl',
    'appUrl',
    'teamId',
    'provider',
    'model',
    'language',
    'authToken',
    'refreshToken',
    'user',
  ]);

  el('apiUrl').value = stored.apiUrl || DEFAULT_API_URL;
  el('appUrl').value = stored.appUrl || DEFAULT_APP_URL;
  el('provider').value = stored.provider || 'COPILOT';
  el('model').value = stored.model || 'gpt-4o';
  el('language').value = stored.language || 'id-ID';

  el('saveBtn').addEventListener('click', saveSettings);
  el('clearBtn').addEventListener('click', clearSettings);
  el('loginBtn').addEventListener('click', login);
  el('logoutBtn').addEventListener('click', logout);

  if (stored.authToken) {
    await hydrateUserAndTeams(stored.authToken, stored.apiUrl || DEFAULT_API_URL, stored.teamId || '');
  } else {
    setLoggedOutState();
  }
}

function setLoggedOutState() {
  el('accountState').textContent = 'Not logged in';
  el('accountState').className = 'account-state account-state-off';
  el('logoutBtn').disabled = true;
  el('teamSelect').innerHTML = '<option value="">Login dulu untuk memuat team...</option>';
}

function setLoggedInState(user) {
  el('accountState').textContent = `Logged in as ${user.name} (${user.email})`;
  el('accountState').className = 'account-state account-state-on';
  el('logoutBtn').disabled = false;
}

async function apiFetch(path, options = {}) {
  const stored = await chrome.storage.sync.get(['apiUrl', 'authToken']);
  const apiUrl = normalizeApiUrl(stored.apiUrl || DEFAULT_API_URL);
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (stored.authToken) headers.Authorization = `Bearer ${stored.authToken}`;

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || json?.error || 'Request failed');
  }
  return json;
}

async function hydrateUserAndTeams(authToken, apiUrlInput, selectedTeamId) {
  try {
    const apiUrl = normalizeApiUrl(apiUrlInput || DEFAULT_API_URL);
    const [meRes, teamRes] = await Promise.all([
      fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || 'Invalid session');
        return j;
      }),
      fetch(`${apiUrl}/teams`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || 'Failed to load teams');
        return j;
      }),
    ]);

    const user = meRes.data;
    const teams = teamRes.data || [];

    setLoggedInState(user);
    const select = el('teamSelect');
    select.innerHTML = '';

    if (!teams.length) {
      select.innerHTML = '<option value="">No teams found</option>';
    } else {
      teams.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        select.appendChild(opt);
      });
      const effectiveTeamId = selectedTeamId && teams.some((t) => t.id === selectedTeamId)
        ? selectedTeamId
        : teams[0].id;
      select.value = effectiveTeamId;
      await chrome.storage.sync.set({ teamId: effectiveTeamId, user });
    }
  } catch (err) {
    console.error(err);
    await chrome.storage.sync.remove(['authToken', 'refreshToken', 'teamId', 'user']);
    setLoggedOutState();
    showMessage('Session invalid. Please login again.', 'error');
  }
}

async function login() {
  const email = el('loginEmail').value.trim();
  const password = el('loginPassword').value;
  const apiUrl = normalizeApiUrl(el('apiUrl').value || DEFAULT_API_URL);

  if (!email || !password) {
    showMessage('Email dan password wajib diisi', 'error');
    return;
  }

  try {
    el('loginBtn').disabled = true;
    el('loginBtn').textContent = 'Logging in...';

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await response.json();
    if (!response.ok || !json?.success) {
      throw new Error(json?.error?.message || 'Login failed');
    }

    const authToken = json.data?.tokens?.accessToken;
    const refreshToken = json.data?.tokens?.refreshToken;
    if (!authToken) {
      throw new Error('No access token returned');
    }

    await chrome.storage.sync.set({
      apiUrl,
      appUrl: normalizeBaseUrl(el('appUrl').value || DEFAULT_APP_URL),
      authToken,
      refreshToken,
      provider: el('provider').value,
      model: el('model').value,
      language: el('language').value,
    });

    await hydrateUserAndTeams(authToken, apiUrl, '');
    el('loginPassword').value = '';
    showMessage('Login berhasil', 'success');
  } catch (err) {
    console.error(err);
    showMessage(err.message || 'Login gagal', 'error');
  } finally {
    el('loginBtn').disabled = false;
    el('loginBtn').textContent = 'Login';
  }
}

async function logout() {
  try {
    const stored = await chrome.storage.sync.get(['refreshToken']);
    if (stored.refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      }).catch(() => null);
    }
  } finally {
    await chrome.storage.sync.remove(['authToken', 'refreshToken', 'teamId', 'user']);
    setLoggedOutState();
    showMessage('Logged out', 'success');
  }
}

async function saveSettings() {
  const apiUrl = normalizeApiUrl(el('apiUrl').value || DEFAULT_API_URL);
  const appUrl = normalizeBaseUrl(el('appUrl').value || DEFAULT_APP_URL);
  const teamId = el('teamSelect').value;

  if (!apiUrl || !appUrl) {
    showMessage('API URL dan App URL harus valid', 'error');
    return;
  }

  const stored = await chrome.storage.sync.get(['authToken']);
  if (!stored.authToken) {
    showMessage('Login dulu sebelum menyimpan konfigurasi', 'error');
    return;
  }

  if (!teamId) {
    showMessage('Pilih team terlebih dahulu', 'error');
    return;
  }

  await chrome.storage.sync.set({
    apiUrl,
    appUrl,
    teamId,
    provider: el('provider').value,
    model: el('model').value,
    language: el('language').value,
  });

  showMessage('Konfigurasi disimpan', 'success');
}

async function clearSettings() {
  if (!confirm('Clear settings dan logout extension?')) return;

  await chrome.storage.sync.clear();
  el('apiUrl').value = DEFAULT_API_URL;
  el('appUrl').value = DEFAULT_APP_URL;
  el('provider').value = 'COPILOT';
  el('model').value = 'gpt-4o';
  el('language').value = 'id-ID';
  el('loginEmail').value = '';
  el('loginPassword').value = '';
  setLoggedOutState();
  showMessage('Settings dibersihkan', 'success');
}
