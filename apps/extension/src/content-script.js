// BrainForge Meet Assistant - Content Script
// Injected into Google Meet pages

console.log('BrainForge Meet Assistant loaded');

let isRecording = false;
let recognition = null;
let transcript = '';
let panelVisible = false;
const API_URL = 'http://localhost:4000/api';

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
  rec.lang = 'id-ID'; // Indonesian by default, can be made configurable

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

function toggleRecording() {
  if (!recognition) {
    recognition = initRecognition();
    if (!recognition) {
      alert('Speech Recognition not supported in this browser');
      return;
    }
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
    // Get stored settings
    const settings = await chrome.storage.sync.get(['apiUrl', 'teamId', 'provider', 'model']);
    const apiUrl = settings.apiUrl || API_URL;
    const teamId = settings.teamId;
    const provider = settings.provider || 'COPILOT';
    const model = settings.model || 'gpt-4o';

    if (!teamId) {
      alert('Please configure BrainForge extension first');
      return;
    }

    // Create temporary meeting
    const meetResponse = await fetch(`${apiUrl}/teams/${teamId}/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        title: `Meet Recording - ${new Date().toLocaleString('id-ID')}`,
        description: 'Recording from Google Meet via BrainForge extension',
        transcript: transcript.trim(),
      }),
    });

    if (!meetResponse.ok) throw new Error('Failed to create meeting');
    const meetData = await meetResponse.json();
    const meetingId = meetData.data.id;

    // Summarize via API
    const summaryResponse = await fetch(`${apiUrl}/teams/${teamId}/meetings/${meetingId}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({ provider, model }),
    });

    if (!summaryResponse.ok) throw new Error('Failed to summarize');
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
    updatePanelStatus(`Error: ${error.message}`, 'error');
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

async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['authToken'], (result) => {
      resolve(result.authToken || '');
    });
  });
}

// Create a button to show/hide panel (injected to Meet call controls)
function addPanelToggleButton() {
  // Wait for Meet UI to load
  const interval = setInterval(() => {
    // Look for the call controls container
    const controlsContainer = document.querySelector('[role="toolbar"]') || document.querySelector('[data-tooltip="Settings"]')?.closest('[role="toolbar"]');
    
    if (controlsContainer && !document.getElementById('brainforge-toggle-meet')) {
      clearInterval(interval);
      
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'brainforge-toggle-meet';
      toggleBtn.className = 'brainforge-meet-btn';
      toggleBtn.setAttribute('data-tooltip', 'BrainForge Assistant');
      toggleBtn.innerHTML = '🧠';
      toggleBtn.addEventListener('click', () => {
        createPanel();
        togglePanelVisibility();
      });
      
      // Try to append to controls
      const meetControlsButton = controlsContainer.querySelector('button[data-tooltip*="More"]') || controlsContainer.querySelector('button:last-child');
      if (meetControlsButton && meetControlsButton.parentElement) {
        meetControlsButton.parentElement.insertBefore(toggleBtn, meetControlsButton);
      }
    }
  }, 1000);

  // Clear interval after 10 seconds
  setTimeout(() => clearInterval(interval), 10000);
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
