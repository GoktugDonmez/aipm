// Minimalist Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved messages count
  await updateSavedCount();
  
  // Set up event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // View saved messages button
  document.getElementById('viewSavedBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('saved.html') });
  });
}

async function updateSavedCount() {
  try {
    const result = await chrome.storage.local.get(['savedMessages']);
    const savedMessages = result.savedMessages || [];
    const count = savedMessages.length;
    
    document.querySelector('.count-number').textContent = count;
    document.querySelector('.count-label').textContent = count === 1 ? 'message saved' : 'messages saved';
  } catch (error) {
    console.error('Error updating saved count:', error);
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateSavedCount') {
    updateSavedCount();
  }
});
