// BrainForge Meet Assistant - Content Script
// Injected into Google Meet pages

console.log('BrainForge Meet Assistant loaded');

let isRecording = false;
let recognition = null;
let transcript = '';
let panelVisible = false;
let activeMeetingId = null;
let syncIntervalId = null;
let lastSyncedTranscript = '';
let transcriptRenderTimeoutId = null;
let latestTranscriptPreview = '';
let lastRenderedTranscript = '';
let mountRetryIntervalId = null;
let mountVisibilityHandlerAttached = false;
const API_URL = 'http://localhost:4000/api';
const TRANSCRIPT_RENDER_INTERVAL_MS = 450;
const TOOLBAR_MOUNT_RETRY_MS = 1500;
const TOOLBAR_MOUNT_MAX_ATTEMPTS = 40;

async function getSettings(keys) {
  return chrome.storage.sync.get(keys);
}

function clearSyncLoop() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

function getApiConfig(settings) {
  return {
    apiUrl: settings.apiUrl || API_URL,
    teamId: settings.teamId,
    authToken: settings.authToken,
  };
}

async function createMeetingForRecording(settings) {
  const { apiUrl, teamId, authToken } = getApiConfig(settings);

  if (!authToken || !teamId) {
    throw new Error('Connect extension to BrainForge Meetings first');
  }

  const meetResponse = await fetch(`${apiUrl}/teams/${teamId}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      title: `Meet Recording - ${new Date().toLocaleString('id-ID')}`,
      description: 'Live recording from Google Meet via BrainForge extension',
      meetLink: window.location.href,
      transcript: '',
      status: 'IN_PROGRESS',
    }),
  });

  if (!meetResponse.ok) {
    const err = await meetResponse.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create live meeting');
  }

  const meetData = await meetResponse.json();
  activeMeetingId = meetData?.data?.id || null;
  return activeMeetingId;
}

async function syncTranscriptToMeeting({ final = false } = {}) {
  if (!activeMeetingId || !transcript.trim()) return;

  if (!final && transcript.trim() === lastSyncedTranscript) {
    return;
  }

  const settings = await getSettings(['apiUrl', 'teamId', 'authToken']);
  const { apiUrl, teamId, authToken } = getApiConfig(settings);

  if (!authToken || !teamId) return;

  const response = await fetch(`${apiUrl}/teams/${teamId}/meetings/${activeMeetingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      transcript: transcript.trim(),
      status: final ? 'COMPLETED' : 'IN_PROGRESS',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to sync transcript');
  }

  lastSyncedTranscript = transcript.trim();
}

function startSyncLoop() {
  clearSyncLoop();
  syncIntervalId = setInterval(() => {
    syncTranscriptToMeeting().catch((error) => {
      console.error('Transcript sync error:', error);
    });
  }, 8000);
}

function flushTranscriptPreview() {
  transcriptRenderTimeoutId = null;
  const transcriptEl = document.getElementById('brainforge-transcript-text');
  if (!transcriptEl) return;

  if (latestTranscriptPreview === lastRenderedTranscript) {
    return;
  }

  const nearBottom =
    transcriptEl.scrollHeight - transcriptEl.scrollTop - transcriptEl.clientHeight < 28;

  transcriptEl.textContent = latestTranscriptPreview;
  lastRenderedTranscript = latestTranscriptPreview;

  if (nearBottom) {
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }
}

function queueTranscriptPreview(nextText) {
  latestTranscriptPreview = nextText;
  if (transcriptRenderTimeoutId) return;

  transcriptRenderTimeoutId = setTimeout(() => {
    flushTranscriptPreview();
  }, TRANSCRIPT_RENDER_INTERVAL_MS);
}

// Initialize Speech Recognition
function initRecognition(options = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error('Speech Recognition not supported');
    return null;
  }

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = options.interimResults !== false;
  rec.lang = options.language || 'id-ID';

  rec.onstart = () => {
    console.log('[🎤] Recording started');
    updatePanelStatus('Recording...', 'recording');
  };

  rec.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        transcript += t + ' ';
      } else {
        interimTranscript += t;
      }
    }
    queueTranscriptPreview(transcript + interimTranscript);
  };

  rec.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error !== 'no-speech') {
      updatePanelStatus(`Error: ${event.error}`, 'error');
    }
  };

  rec.onend = () => {
    console.log('[⏹️] Recording ended');
    if (isRecording) {
      rec.start(); // Auto-restart if still recording
    }
  };

  return rec;
}

// Create and inject the panel UI
function createPanel() {
  const existingPanel = document.getElementById('brainforge-panel');
  if (existingPanel) return existingPanel;

  const panel = document.createElement('div');
  panel.id = 'brainforge-panel';
  panel.innerHTML = `
    <div id="brainforge-panel-container">
      <div id="brainforge-header">
        <div class="brainforge-header-copy">
          <div class="brainforge-eyebrow">BrainForge Extension</div>
          <h3>Meeting Assistant</h3>
          <p>Capture the call, generate an AI summary, and sync it back to BrainForge.</p>
        </div>
        <button id="brainforge-close" aria-label="Close">✕</button>
      </div>
      
      <div id="brainforge-controls">
        <div class="brainforge-button-row">
          <button id="brainforge-record-btn" class="btn btn-primary">Start Capture</button>
          <button id="brainforge-summarize-btn" class="btn btn-secondary" disabled>Generate Summary</button>
        </div>
        <p class="brainforge-control-hint">Use this as your in-call assistant. The extension pushes transcripts and summaries back into the Meetings page.</p>
      </div>

      <div id="brainforge-status" class="status status-info">Ready to capture this meeting.</div>

      <div id="brainforge-transcript-section">
        <div class="brainforge-section-head">
          <div>
            <h4>Transcript</h4>
            <p>Live capture from the current meeting</p>
          </div>
        </div>
        <div id="brainforge-transcript-text" class="transcript-box"></div>
      </div>

      <div id="brainforge-summary-section" style="display: none;">
        <div class="brainforge-section-head">
          <div>
            <h4>AI Summary</h4>
            <p>Generated highlights, decisions, and next actions</p>
          </div>
        </div>
        <div id="brainforge-summary-text" class="summary-box"></div>
        <button id="brainforge-save-btn" class="btn btn-success">Open in BrainForge</button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  panel.classList.add('hidden');
  panelVisible = false;
  attachPanelEventListeners();
  return panel;
}

function attachPanelEventListeners() {
  const recordBtn = document.getElementById('brainforge-record-btn');
  const closeBtn = document.getElementById('brainforge-close');
  const summarizeBtn = document.getElementById('brainforge-summarize-btn');
  const saveBtn = document.getElementById('brainforge-save-btn');

  recordBtn.addEventListener('click', toggleRecording);
  closeBtn.addEventListener('click', () => togglePanelVisibility());
  summarizeBtn.addEventListener('click', summarizeTranscript);
  if (saveBtn) {
    saveBtn.addEventListener('click', saveToMeetingsPage);
  }
}

async function toggleRecording() {
  const settings = await getSettings([
    'language',
    'apiUrl',
    'teamId',
    'authToken',
    'performanceMode',
  ]);
  const useInterimTranscript = (settings.performanceMode || 'LIGHTWEIGHT') !== 'LIGHTWEIGHT';

  if (!recognition) {
    recognition = initRecognition({
      language: settings.language,
      interimResults: useInterimTranscript,
    });
    if (!recognition) {
      alert('Speech Recognition not supported in this browser');
      return;
    }
  }

  if (settings.language) {
    recognition.lang = settings.language;
  }
  recognition.interimResults = useInterimTranscript;

  isRecording = !isRecording;
  const btn = document.getElementById('brainforge-record-btn');

  if (isRecording) {
    try {
      transcript = '';
      lastSyncedTranscript = '';
      latestTranscriptPreview = '';
      lastRenderedTranscript = '';
      queueTranscriptPreview('');
      await createMeetingForRecording(settings);
      startSyncLoop();
      updatePanelStatus('Recording live and syncing transcript...', 'recording');
    } catch (error) {
      isRecording = false;
      updatePanelStatus(`Error: ${error?.message || 'Failed to start recording'}`, 'error');
      alert('Open BrainForge Meetings first so extension can sync this recording.');
      return;
    }

    recognition.start();
    btn.textContent = 'Stop Capture';
    btn.classList.add('recording');
    document.getElementById('brainforge-summarize-btn').disabled = false;
  } else {
    clearSyncLoop();
    recognition.stop();
    queueTranscriptPreview(transcript);
    syncTranscriptToMeeting({ final: true }).catch((error) => {
      console.error('Final transcript sync error:', error);
    });
    btn.textContent = 'Start Capture';
    btn.classList.remove('recording');
    updatePanelStatus('Recording stopped. Transcript synced.', 'success');
  }
}

function updatePanelStatus(status, type = 'info') {
  const statusEl = document.getElementById('brainforge-status');
  if (!statusEl) return;
  statusEl.textContent = status;
  statusEl.className = `status status-${type}`;
}

function updatePanelTranscript(text) {
  queueTranscriptPreview(text);
}

async function summarizeTranscript() {
  if (!transcript.trim()) {
    alert('No transcript to summarize');
    return;
  }

  const summarizeBtn = document.getElementById('brainforge-summarize-btn');
  summarizeBtn.disabled = true;
  summarizeBtn.textContent = 'Generating...';
  updatePanelStatus('Generating AI summary...', 'progress');

  try {
    const settings = await getSettings(['apiUrl', 'teamId', 'provider', 'model', 'authToken']);
    const apiUrl = settings.apiUrl || API_URL;
    const teamId = settings.teamId;
    const provider = settings.provider || 'COPILOT';
    const model = settings.model || 'gpt-4o';
    const authToken = settings.authToken;

    if (!authToken) {
      alert('Open BrainForge Meetings first so the website can sync this extension session.');
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = 'Generate Summary';
      return;
    }

    if (!teamId) {
      alert(
        'Reconnect the extension from the BrainForge Meetings page so it knows which team to use.',
      );
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = 'Generate Summary';
      return;
    }

    let meetingId = activeMeetingId;

    if (meetingId) {
      await syncTranscriptToMeeting({ final: true });
    } else {
      const meetResponse = await fetch(`${apiUrl}/teams/${teamId}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: `Meet Recording - ${new Date().toLocaleString('id-ID')}`,
          description: 'Recording from Google Meet via BrainForge extension',
          meetLink: window.location.href,
          transcript: transcript.trim(),
          status: 'COMPLETED',
        }),
      });

      if (!meetResponse.ok) {
        const err = await meetResponse.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Failed to create meeting');
      }
      const meetData = await meetResponse.json();
      meetingId = meetData.data.id;
      activeMeetingId = meetingId;
    }

    const summaryResponse = await fetch(
      `${apiUrl}/teams/${teamId}/meetings/${meetingId}/summarize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ provider, model }),
      },
    );

    if (!summaryResponse.ok) {
      const err = await summaryResponse.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to summarize');
    }
    const summaryData = await summaryResponse.json();
    const summary = summaryData.data.summary;

    // Display summary
    document.getElementById('brainforge-summary-section').style.display = 'block';
    document.getElementById('brainforge-summary-text').textContent = summary;
    document.getElementById('brainforge-save-btn').dataset.meetingId = meetingId;

    updatePanelStatus('Summary complete!', 'success');
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = 'Generate Summary';
  } catch (error) {
    console.error('Summary error:', error);
    updatePanelStatus(`Error: ${error?.message || 'Unknown error'}`, 'error');
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = 'Generate Summary';
  }
}

async function saveToMeetingsPage() {
  const meetingId = document.getElementById('brainforge-save-btn').dataset.meetingId;
  if (!meetingId) {
    alert('No meeting to save');
    return;
  }

  // Message to open BrainForge meetings page
  chrome.runtime.sendMessage({
    action: 'openMeetingsPage',
    meetingId: meetingId,
  });

  alert('Opening BrainForge Meetings page...');
}

function togglePanelVisibility() {
  const panel = createPanel();
  if (!panel) return;
  panelVisible = !panelVisible;
  panel.classList.toggle('hidden', !panelVisible);
}

function showPanelInitially() {
  const panel = document.getElementById('brainforge-panel');
  if (!panel) return;
  panelVisible = true;
  panel.classList.remove('hidden');
}

// Selectors to try for Google Meet toolbar injection
const MEET_TOOLBAR_SELECTORS = [
  '[role="toolbar"]',
  '[jsname="A7sL1e"]',
  '.T4LgNb',
  '[data-fps-request-screencast-cap]',
  '[data-call-ended="false"]',
];

function createToggleButton() {
  const btn = document.createElement('button');
  btn.id = 'brainforge-toggle-meet';
  btn.className = 'brainforge-meet-btn';
  btn.setAttribute('title', 'BrainForge Meet Assistant');
  btn.setAttribute('aria-label', 'BrainForge Meet Assistant');
  btn.innerHTML = '<span class="brainforge-meet-btn-mark">BF</span>';
  btn.addEventListener('click', () => {
    createPanel();
    togglePanelVisibility();
  });
  return btn;
}

function ensureFloatingToggleButton() {
  const existing = document.getElementById('brainforge-toggle-meet');
  if (existing) {
    existing.classList.add('brainforge-meet-btn-float');
    return existing;
  }

  const floatBtn = createToggleButton();
  floatBtn.classList.add('brainforge-meet-btn-float');
  document.body.appendChild(floatBtn);
  return floatBtn;
}

function mountToggleButtonToToolbar() {
  const toggleBtn = document.getElementById('brainforge-toggle-meet') || createToggleButton();

  for (const selector of MEET_TOOLBAR_SELECTORS) {
    const container = document.querySelector(selector);
    if (!container) continue;

    const refBtn =
      container.querySelector('button[data-tooltip*="More"]') ||
      container.querySelector('button[aria-label*="More"]') ||
      container.querySelector('button:last-child');

    toggleBtn.classList.remove('brainforge-meet-btn-float');

    if (refBtn && refBtn.parentElement) {
      refBtn.parentElement.insertBefore(toggleBtn, refBtn);
    } else {
      container.appendChild(toggleBtn);
    }

    return true;
  }

  return false;
}

// Create a button to show/hide panel and keep trying toolbar mount for Meet dynamic DOM
function addPanelToggleButton() {
  ensureFloatingToggleButton();
  let attempts = 0;

  const tryMount = () => {
    attempts += 1;
    const mounted = mountToggleButtonToToolbar();
    if (mounted || attempts >= TOOLBAR_MOUNT_MAX_ATTEMPTS) {
      if (mountRetryIntervalId) {
        clearInterval(mountRetryIntervalId);
        mountRetryIntervalId = null;
      }
    }
  };

  tryMount();

  if (!mountRetryIntervalId) {
    mountRetryIntervalId = setInterval(tryMount, TOOLBAR_MOUNT_RETRY_MS);
  }

  if (!mountVisibilityHandlerAttached) {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        mountToggleButtonToToolbar();
      }
    });
    mountVisibilityHandlerAttached = true;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addPanelToggleButton);
} else {
  addPanelToggleButton();
}

// Create panel button in Meet call controls
// Panel is created lazily on first button click.
