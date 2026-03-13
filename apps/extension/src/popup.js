// Popup script - configuration UI

document.addEventListener('DOMContentLoaded', loadSettings);

function loadSettings() {
  chrome.storage.sync.get(
    ['apiUrl', 'teamId', 'authToken', 'provider', 'model', 'language'],
    (result) => {
      document.getElementById('apiUrl').value = result.apiUrl || 'http://localhost:4000/api';
      document.getElementById('teamId').value = result.teamId || '';
      document.getElementById('authToken').value = result.authToken || '';
      document.getElementById('provider').value = result.provider || 'COPILOT';
      document.getElementById('model').value = result.model || 'gpt-4o';
      document.getElementById('language').value = result.language || 'id-ID';
    }
  );
}

document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('clearBtn').addEventListener('click', clearSettings);

function saveSettings() {
  const settings = {
    apiUrl: document.getElementById('apiUrl').value || 'http://localhost:4000/api',
    teamId: document.getElementById('teamId').value,
    authToken: document.getElementById('authToken').value,
    provider: document.getElementById('provider').value,
    model: document.getElementById('model').value,
    language: document.getElementById('language').value,
  };

  if (!settings.teamId || !settings.authToken) {
    showMessage('❌ Team ID and Auth Token are required', 'error');
    return;
  }

  chrome.storage.sync.set(settings, () => {
    showMessage('✅ Settings saved successfully!', 'success');
  });
}

function clearSettings() {
  if (confirm('Are you sure? This will clear all settings.')) {
    chrome.storage.sync.clear(() => {
      document.getElementById('apiUrl').value = 'http://localhost:4000/api';
      document.getElementById('teamId').value = '';
      document.getElementById('authToken').value = '';
      document.getElementById('model').value = 'gpt-4o';
      showMessage('✅ Settings cleared', 'success');
    });
  }
}

function showMessage(text, type) {
  const msgEl = document.getElementById('message');
  msgEl.textContent = text;
  msgEl.className = `message message-${type}`;
  setTimeout(() => {
    msgEl.textContent = '';
    msgEl.className = 'message';
  }, 3000);
}
