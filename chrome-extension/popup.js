// Popup script for extension UI

document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn');
  const sendBtn = document.getElementById('sendBtn');
  const statusDiv = document.getElementById('status');

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }

  // Extract QA pairs from current tab
  extractBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url?.includes('chat.openai.com')) {
      showStatus('Please open a ChatGPT conversation page', 'error');
      return;
    }

    try {
      chrome.tabs.sendMessage(tab.id, { action: 'extractQAPairs' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
          return;
        }

        if (response.success) {
          const count = response.qaPairs.length;
          showStatus(`Found ${count} QA pair${count !== 1 ? 's' : ''}`, 'success');
          sendBtn.disabled = false;
          
          // Store in extension storage
          chrome.storage.local.set({
            'memoriaQAPairs': {
              qaPairs: response.qaPairs,
              title: response.title,
              url: response.url,
              timestamp: Date.now(),
            }
          });
        } else {
          showStatus('No QA pairs found', 'error');
        }
      });
    } catch (error) {
      showStatus('Error extracting QA pairs', 'error');
      console.error(error);
    }
  });

  // Send to Memoria app
  sendBtn.addEventListener('click', async () => {
    chrome.storage.local.get(['memoriaQAPairs'], async (result) => {
      if (!result.memoriaQAPairs) {
        showStatus('No QA pairs to send', 'error');
        return;
      }

      // Try to send to local app (if running)
      // In production, this would send to your app's API
      try {
        const response = await fetch('http://localhost:5173/api/extension/qa-pairs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result.memoriaQAPairs),
        });

        if (response.ok) {
          showStatus('Sent to Memoria successfully!', 'success');
          chrome.storage.local.remove(['memoriaQAPairs']);
          sendBtn.disabled = true;
        } else {
          showStatus('App not running or connection failed', 'error');
        }
      } catch (error) {
        // App not running - show instructions
        showStatus('App not running. Open Memoria app first.', 'info');
        console.error('Failed to send to app:', error);
      }
    });
  });
});

