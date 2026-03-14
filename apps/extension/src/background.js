// Background Service Worker for BrainForge Meet Extension

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openMeetingsPage') {
    const meetingId = request.meetingId;
    chrome.storage.sync.get(['appUrl'], (result) => {
      const appUrl = (result.appUrl || 'http://localhost:3000').replace(/\/$/, '');
      chrome.tabs.create({
        url: `${appUrl}/meetings?meetingId=${meetingId}`,
      });
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
    chrome.action.openPopup();
  }
});

// Keep service worker alive
setInterval(() => {
  chrome.storage.sync.get(['apiUrl'], () => {
    // This keeps the service worker alive
  });
}, 60000);
