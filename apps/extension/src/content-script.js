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
        <h3>🧠 BrainForge Meet</h3>
        <button id="brainforge-close" aria-label="Close">✕</button>
      </div>
      
      <div id="brainforge-controls">
        <button id="brainforge-record-btn" class="btn btn-primary">🎤 Start Recording</button>
        <button id="brainforge-summarize-btn" class="btn btn-secondary" disabled>✨ Summarize</button>
      </div>

      <div id="brainforge-status"></div>

      <div id="brainforge-transcript-section">
        <h4>📝 Transcript</h4>
        <div id="brainforge-transcript-text" class="transcript-box"></div>
      </div>

      <div id="brainforge-summary-section" style="display: none;">
        <h4>✨ AI Summary</h4>
        <div id="brainforge-summary-text" class="summary-box"></div>
        <button id="brainforge-save-btn" class="btn btn-success">💾 Save to BrainForge</button>
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
    btn.textContent = '⏹️ Stop Recording';
    btn.classList.add('recording');
    document.getElementById('brainforge-summarize-btn').disabled = false;
  } else {
    recognition.stop();
    btn.textContent = '🎤 Start Recording';
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
  summarizeBtn.textContent = '⏳ Summarizing...';
  updatePanelStatus('Generating AI summary...', 'progress');

  try {
    const settings = await getSettings(['apiUrl', 'teamId', 'provider', 'model', 'authToken']);
    const apiUrl = settings.apiUrl || API_URL;
    const teamId = settings.teamId;
    const provider = settings.provider || 'COPILOT';
    const model = settings.model || 'gpt-4o';
    const authToken = settings.authToken;

    if (!authToken) {
      alert('Please login to BrainForge extension first');
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = '✨ Summarize';
      return;
    }

    if (!teamId) {
      alert('Please choose team in extension settings first');
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = '✨ Summarize';
      return;
    }

    const meetResponse = await fetch(`${apiUrl}/teams/${teamId}/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
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

    const summaryResponse = await fetch(`${apiUrl}/teams/${teamId}/meetings/${meetingId}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ provider, model }),
    });

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
    summarizeBtn.textContent = '✨ Summarize';
  } catch (error) {
    console.error('Summary error:', error);
    updatePanelStatus(`Error: ${error?.message || 'Unknown error'}`, 'error');
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = '✨ Summarize';
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
  btn.innerHTML = '🧠';
  btn.addEventListener('click', () => {
    createPanel();
    togglePanelVisibility();
  });
  return btn;
}

// Create a button to show/hide panel (injected to Meet call controls)
function addPanelToggleButton() {
  const interval = setInterval(() => {
    if (document.getElementById('brainforge-toggle-meet')) {
      clearInterval(interval);
      return;
    }

    for (const selector of MEET_TOOLBAR_SELECTORS) {
      const container = document.querySelector(selector);
      if (!container) continue;

      const toggleBtn = createToggleButton();
      const refBtn =
        container.querySelector('button[data-tooltip*="More"]') ||
        container.querySelector('button[aria-label*="More"]') ||
        container.querySelector('button:last-child');

      if (refBtn && refBtn.parentElement) {
        refBtn.parentElement.insertBefore(toggleBtn, refBtn);
      } else {
        container.appendChild(toggleBtn);
      }
      clearInterval(interval);
      return;
    }
  }, 1000);

  // Fallback: after 8 seconds use a persistent floating button
  setTimeout(() => {
    clearInterval(interval);
    if (!document.getElementById('brainforge-toggle-meet')) {
      const floatBtn = createToggleButton();
      floatBtn.classList.add('brainforge-meet-btn-float');
      document.body.appendChild(floatBtn);
    }
  }, 8000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addPanelToggleButton);
} else {
  addPanelToggleButton();
}

// Create panel button in Meet call controls
createPanel();
document.getElementById('brainforge-panel').classList.add('hidden');

