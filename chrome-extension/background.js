// Background service worker for Memoria extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Memoria extension installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getQAPairs') {
    chrome.storage.local.get(['memoriaQAPairs'], (result) => {
      sendResponse(result.memoriaQAPairs || null);
    });
    return true; // Keep channel open
  }
  
  if (request.action === 'clearQAPairs') {
    chrome.storage.local.remove(['memoriaQAPairs'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

