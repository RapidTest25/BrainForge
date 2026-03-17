// BrainForge Meet Assistant - Content Script
// Injected into Google Meet pages

console.log('BrainForge Meet Assistant loaded');

let isRecording = false;
let recognition = null;
let transcript = '';
let panelVisible = false;
const API_URL = 'http://localhost:4000/api';

async function getSettings(keys) {
  return chrome.storage.sync.get(keys);
}

// Initialize Speech Recognition
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error('Speech Recognition not supported');
    return null;
  }

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'id-ID';

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
    updatePanelTranscript(transcript + interimTranscript);
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
  if (document.getElementById('brainforge-panel')) return;

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
  attachPanelEventListeners();
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
  if (!recognition) {
    recognition = initRecognition();
    if (!recognition) {
      alert('Speech Recognition not supported in this browser');
      return;
    }
  }

  const settings = await getSettings(['language']);
  if (settings.language) {
    recognition.lang = settings.language;
  }

  isRecording = !isRecording;
  const btn = document.getElementById('brainforge-record-btn');

  if (isRecording) {
    transcript = '';
    recognition.start();
    btn.textContent = 'Stop Capture';
    btn.classList.add('recording');
    document.getElementById('brainforge-summarize-btn').disabled = false;
  } else {
    recognition.stop();
    btn.textContent = 'Start Capture';
    btn.classList.remove('recording');
  }
}

function updatePanelStatus(status, type = 'info') {
  const statusEl = document.getElementById('brainforge-status');
  statusEl.textContent = status;
  statusEl.className = `status status-${type}`;
}

function updatePanelTranscript(text) {
  const transcriptEl = document.getElementById('brainforge-transcript-text');
  transcriptEl.textContent = text;
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
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

    const meetResponse = await fetch(`${apiUrl}/teams/${teamId}/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: `Meet Recording - ${new Date().toLocaleString('id-ID')}`,
        description: 'Recording from Google Meet via BrainForge extension',
        transcript: transcript.trim(),
        status: 'COMPLETED',
      }),
    });

    if (!meetResponse.ok) {
      const err = await meetResponse.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to create meeting');
    }
    const meetData = await meetResponse.json();
    const meetingId = meetData.data.id;

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
  const panel = document.getElementById('brainforge-panel');
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
  mountToggleButtonToToolbar();

  const observer = new MutationObserver(() => {
    mountToggleButtonToToolbar();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addPanelToggleButton);
} else {
  addPanelToggleButton();
}

// Create panel button in Meet call controls
createPanel();
showPanelInitially();
