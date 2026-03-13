// Background Service Worker for BrainForge Meet Extension

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openMeetingsPage') {
    const meetingId = request.meetingId;
    
    // Open BrainForge meetings page in a new tab
    chrome.tabs.create({
      url: `http://localhost:3000/meetings?meetingId=${meetingId}`,
    });
  }
});

// Context menu for easy access
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'brainforge-config',
    title: 'BrainForge Settings',
    contexts: ['action'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'brainforge-config') {
    chrome.runtime.openOptionsPage();
  }
});

// Keep service worker alive
setInterval(() => {
  chrome.storage.sync.get(['apiUrl'], () => {
    // This keeps the service worker alive
  });
}, 60000);
