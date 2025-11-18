// Bridge script that runs on Memoria app (localhost) to sync data from chrome.storage.local to localStorage
// This allows the extension to communicate with the Memoria app across different domains

console.log('Memoria Bridge loaded on', window.location.href);

// Poll chrome.storage.local for extension data and sync to localStorage
function syncExtensionData() {
  try {
    // Check if extension context is still valid
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      console.warn('Extension context invalidated - bridge will retry on next poll');
      return;
    }
    
    // Check if we're in the extension context
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['memoriaExtensionData'], (result) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          // Handle extension context invalidated error gracefully
          if (error.message && error.message.includes('invalidated')) {
            console.warn('Extension context invalidated - will retry on next poll');
            return;
          }
          console.error('Error reading chrome.storage:', error);
          return;
        }
        
        const data = result.memoriaExtensionData;
        if (data) {
          console.log('Found extension data in chrome.storage, syncing to localStorage:', data);
          
          // Write to localStorage so ExtensionDataReceiver can pick it up
          try {
            localStorage.setItem('memoriaExtensionData', JSON.stringify(data));
            console.log('Successfully synced extension data to localStorage');
            
            // Clear from chrome.storage after syncing (to avoid re-processing)
            chrome.storage.local.remove('memoriaExtensionData', () => {
              if (chrome.runtime.lastError) {
                const error = chrome.runtime.lastError;
                if (error.message && error.message.includes('invalidated')) {
                  console.warn('Extension context invalidated while clearing storage');
                } else {
                  console.warn('Could not clear chrome.storage:', error);
                }
              } else {
                console.log('Cleared extension data from chrome.storage');
              }
            });
          } catch (e) {
            console.error('Error writing to localStorage:', e);
          }
        }
      });
    } else {
      console.warn('chrome.storage is not available in this context');
    }
  } catch (error) {
    console.error('Error in memoria-bridge:', error);
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Poll every 2 seconds (same as ExtensionDataReceiver)
    setInterval(syncExtensionData, 2000);
    // Also sync immediately
    syncExtensionData();
  });
} else {
  // Poll every 2 seconds (same as ExtensionDataReceiver)
  setInterval(syncExtensionData, 2000);
  // Also sync immediately
  syncExtensionData();
}

// Listen for storage changes (more efficient than polling)
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged && chrome.runtime && chrome.runtime.id) {
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.memoriaExtensionData) {
        console.log('Extension data changed in chrome.storage, syncing immediately...');
        syncExtensionData();
      }
    });
  } catch (error) {
    console.warn('Could not set up storage change listener:', error);
  }
}
