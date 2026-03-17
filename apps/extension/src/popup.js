const DEFAULT_API_URL = 'http://localhost:4000/api';
const DEFAULT_APP_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', init);

function el(id) {
  return document.getElementById(id);
}

function normalizeBaseUrl(input) {
  const raw = (input || '').trim().replace(/\/$/, '');
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
  msgEl.className = type ? `message message-${type}` : 'message';

  if (text) {
    setTimeout(() => {
      msgEl.textContent = '';
      msgEl.className = 'message';
    }, 3200);
  }
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

  el('provider').value = stored.provider || 'COPILOT';
  el('model').value = stored.model || 'gpt-4o';
  el('language').value = stored.language || 'id-ID';

  el('openMeetingsBtn').addEventListener('click', openMeetingsPage);
  el('openMeetBtn').addEventListener('click', openGoogleMeet);
  el('saveBtn').addEventListener('click', saveDefaults);
  el('refreshBtn').addEventListener('click', refreshSync);
  el('logoutBtn').addEventListener('click', disconnectExtension);

  if (stored.authToken) {
    await hydrateWorkspaceState(
      stored.authToken,
      stored.apiUrl || DEFAULT_API_URL,
      stored.teamId || '',
    );
  } else {
    setDisconnectedState();
  }
}

function setWorkspaceMeta({ email, name, teamName, appUrl, apiUrl, connected }) {
  el('accountEmail').textContent = email || 'Waiting for website sync';
  el('teamName').textContent = teamName || 'No team selected';
  el('connectionMode').textContent = connected ? 'Synced from website' : 'Needs website sync';
  el('workspaceApp').textContent = normalizeBaseUrl(appUrl || DEFAULT_APP_URL) || DEFAULT_APP_URL;
  el('workspaceApi').textContent = normalizeApiUrl(apiUrl || DEFAULT_API_URL) || DEFAULT_API_URL;

  const title = connected
    ? `Connected as ${name || email || 'BrainForge user'}`
    : 'Open BrainForge Meetings to sync this extension';

  el('accountState').textContent = title;
  el('accountState').className = connected
    ? 'account-state account-state-on'
    : 'account-state account-state-off';
  el('logoutBtn').disabled = !connected;
}

function setDisconnectedState() {
  setWorkspaceMeta({
    email: '',
    name: '',
    teamName: '',
    appUrl: DEFAULT_APP_URL,
    apiUrl: DEFAULT_API_URL,
    connected: false,
  });
}

async function hydrateWorkspaceState(authToken, apiUrlInput, selectedTeamId) {
  try {
    const apiUrl = normalizeApiUrl(apiUrlInput || DEFAULT_API_URL);

    const [meRes, teamsRes, stored] = await Promise.all([
      fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Invalid session');
        return json;
      }),
      fetch(`${apiUrl}/teams`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load teams');
        return json;
      }),
      chrome.storage.sync.get(['appUrl']),
    ]);

    const user = meRes.data;
    const teams = teamsRes.data || [];
    const selectedTeam =
      teams.find((team) => team.id === selectedTeamId) ||
      teams.find((team) => team.id === user.activeTeamId) ||
      teams[0] ||
      null;

    await chrome.storage.sync.set({
      apiUrl,
      teamId: selectedTeam?.id || '',
      user,
    });

    setWorkspaceMeta({
      email: user?.email,
      name: user?.name,
      teamName: selectedTeam?.name || '',
      appUrl: stored.appUrl || DEFAULT_APP_URL,
      apiUrl,
      connected: true,
    });
  } catch (error) {
    console.error(error);
    await chrome.storage.sync.remove(['authToken', 'refreshToken', 'teamId', 'user']);
    setDisconnectedState();
    showMessage(
      'Website session not found. Open BrainForge Meetings and reconnect the extension.',
      'error',
    );
  }
}

async function saveDefaults() {
  await chrome.storage.sync.set({
    provider: el('provider').value,
    model: el('model').value.trim() || 'gpt-4o',
    language: el('language').value,
  });

  showMessage('Meeting defaults saved', 'success');
}

async function refreshSync() {
  const stored = await chrome.storage.sync.get(['authToken', 'apiUrl', 'teamId']);

  if (!stored.authToken) {
    setDisconnectedState();
    showMessage('No synced website session yet. Open BrainForge Meetings first.', 'error');
    return;
  }

  await hydrateWorkspaceState(
    stored.authToken,
    stored.apiUrl || DEFAULT_API_URL,
    stored.teamId || '',
  );
  showMessage('Extension sync refreshed', 'success');
}

async function disconnectExtension() {
  if (!confirm('Disconnect the local extension session from this browser?')) return;

  await chrome.storage.sync.remove(['authToken', 'refreshToken', 'teamId', 'user']);
  setDisconnectedState();
  showMessage('Extension disconnected from the local session', 'success');
}

async function openMeetingsPage() {
  const stored = await chrome.storage.sync.get(['appUrl']);
  const appUrl = normalizeBaseUrl(stored.appUrl || DEFAULT_APP_URL) || DEFAULT_APP_URL;

  chrome.tabs.create({ url: `${appUrl}/meetings` });
}

function openGoogleMeet() {
  chrome.tabs.create({ url: 'https://meet.google.com' });
}
