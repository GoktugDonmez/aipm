// Content script for ChatGPT Button Extension
console.log('ChatGPT Button Extension loaded');

// Configuration
const BUTTON_CONFIG = {
  // Only Save button, always below message
  buttons: [
    {
      id: 'save-button', 
      text: 'Save',
      icon: 'save',
      className: 'chatgpt-btn save-btn',
      action: 'save'
    }
  ]
};

// Utility functions
function createButton(buttonConfig, messageElement) {
  const button = document.createElement('button');
  button.id = buttonConfig.id;
  button.className = buttonConfig.className;
  button.setAttribute('data-action', buttonConfig.action);
  button.setAttribute('aria-label', buttonConfig.text);
  
  // Add SVG icon instead of text
  const icon = createSaveIcon();
  button.appendChild(icon);
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleButtonClick(buttonConfig.action, messageElement);
  });
  
  return button;
}

function createSaveIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  
  // Create a simple save/download icon (similar to OpenAI's style)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M8 2v8m0 0l-2-2m2 2l2-2m-6 4h8a2 2 0 002-2V4a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z');
  
  svg.appendChild(path);
  return svg;
}

function handleButtonClick(action, messageElement) {
  const messageText = getMessageText(messageElement);
  
  switch(action) {
    case 'copy':
      copyToClipboard(messageText);
      showNotification('Copied to clipboard!');
      break;
    case 'save':
      saveMessage(messageText);
      showNotification('Message saved!');
      break;
    case 'share':
      shareMessage(messageText);
      showNotification('Share dialog opened!');
      break;
    default:
      console.log('Unknown action:', action);
  }
}

function getMessageText(messageElement) {
  // Try different selectors for ChatGPT message content
  const selectors = [
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="assistant"] .prose',
    '[data-message-author-role="assistant"] > div:last-child',
    '.group\\/conversation-turn .markdown',
    '.group\\/conversation-turn .prose'
  ];
  
  for (const selector of selectors) {
    const content = messageElement.querySelector(selector);
    if (content) {
      return content.textContent || content.innerText || '';
    }
  }
  
  // Fallback: get all text content from the message element
  return messageElement.textContent || messageElement.innerText || '';
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
}

function saveMessage(text) {
  // Save to Chrome storage
  chrome.storage.local.get(['savedMessages'], (result) => {
    const savedMessages = result.savedMessages || [];
    const newMessage = {
      id: Date.now(),
      text: text,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    savedMessages.push(newMessage);
    
    chrome.storage.local.set({ savedMessages: savedMessages }, () => {
      console.log('Message saved:', newMessage);
    });
  });
}

function shareMessage(text) {
  if (navigator.share) {
    navigator.share({
      title: 'ChatGPT Response',
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      url: window.location.href
    });
  } else {
    // Fallback: copy to clipboard with share message
    copyToClipboard(text);
  }
}

function showNotification(message) {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.className = 'chatgpt-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10a37f;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

function addButtonsToMessage(messageElement) {
  // Check if buttons already exist
  if (messageElement.querySelector('.chatgpt-btn')) {
    return;
  }
  
  // Add a small delay to ensure ChatGPT has finished rendering
  setTimeout(() => {
    // Check again if buttons were added during the delay
    if (!messageElement.querySelector('.chatgpt-btn')) {
      addButtonsBelowMessage(messageElement);
    }
  }, 500);
}

function findActionBar(messageElement) {
  // Common selectors for ChatGPT's bottom action bars
  const actionBarSelectors = [
    '[data-testid="conversation-turn-3"] button', // ChatGPT's action buttons
    '.group\\/conversation-turn .flex.items-center.justify-between', // Bottom flex container
    '[data-message-author-role="assistant"] .flex.items-center.gap-2', // Flex container with buttons
    '.group\\/conversation-turn .flex.items-center.gap-2', // Alternative flex container
    '[data-message-author-role="assistant"] .flex.items-center.justify-between', // Justify between container
    '.group\\/conversation-turn .flex.items-center.justify-between', // Alternative justify container
    '[data-message-author-role="assistant"] > div:last-child .flex', // Last child flex
    '.group\\/conversation-turn > div:last-child .flex', // Alternative last child flex
    // More specific selectors for ChatGPT's UI
    'button[aria-label*="Copy"]', // Copy button area
    'button[aria-label*="copy"]', // Alternative copy button
    '.flex.items-center.gap-2 button', // Generic button group
    '.flex.items-center.justify-between button' // Alternative button group
  ];
  
  for (const selector of actionBarSelectors) {
    const element = messageElement.querySelector(selector);
    if (element) {
      // Find the parent container that holds the buttons
      let container = element.closest('.flex.items-center') || 
                     element.closest('.flex') ||
                     element.parentElement;
      
      // Make sure it's not too far up in the DOM
      if (container && messageElement.contains(container)) {
        return container;
      }
    }
  }
  
  return null;
}

function addButtonsToActionBar(actionBar, messageElement) {
  // Create button wrapper
  const buttonWrapper = document.createElement('div');
  buttonWrapper.className = 'chatgpt-button-wrapper action-bar-integrated';
  
  // Add buttons
  BUTTON_CONFIG.buttons.forEach(buttonConfig => {
    const button = createButton(buttonConfig, messageElement);
    buttonWrapper.appendChild(button);
  });
  
  // Insert buttons into the action bar
  actionBar.appendChild(buttonWrapper);
}

function addButtonsBelowMessage(messageElement) {
  // Find the message content container (the actual text/content area)
  let contentContainer = messageElement.querySelector('[data-message-author-role="assistant"] .markdown');
  
  if (!contentContainer) {
    // Try alternative content selectors
    const contentSelectors = [
      '[data-message-author-role="assistant"] .prose',
      '[data-message-author-role="assistant"] > div:last-child',
      '.group\\/conversation-turn .markdown',
      '.group\\/conversation-turn .prose',
      '[data-message-author-role="assistant"] [class*="markdown"]',
      '[data-message-author-role="assistant"] [class*="prose"]'
    ];
    
    for (const selector of contentSelectors) {
      contentContainer = messageElement.querySelector(selector);
      if (contentContainer) break;
    }
  }
  
  // If we found the content container, place button after it
  if (contentContainer) {
    // Find the parent that contains the content
    let parentContainer = contentContainer.parentElement;
    
    // Keep going up until we find a suitable container
    while (parentContainer && !parentContainer.querySelector('[data-message-author-role="assistant"]')) {
      parentContainer = parentContainer.parentElement;
    }
    
    if (parentContainer) {
      // Create button wrapper
      const buttonWrapper = document.createElement('div');
      buttonWrapper.className = 'chatgpt-button-wrapper below-message';
      
      // Add buttons
      BUTTON_CONFIG.buttons.forEach(buttonConfig => {
        const button = createButton(buttonConfig, messageElement);
        buttonWrapper.appendChild(button);
      });
      
      // Insert after the content container
      parentContainer.insertBefore(buttonWrapper, contentContainer.nextSibling);
      return;
    }
  }
  
  // Fallback: append to the message element itself
  const buttonWrapper = document.createElement('div');
  buttonWrapper.className = 'chatgpt-button-wrapper below-message';
  
  // Add buttons
  BUTTON_CONFIG.buttons.forEach(buttonConfig => {
    const button = createButton(buttonConfig, messageElement);
    buttonWrapper.appendChild(button);
  });
  
  messageElement.appendChild(buttonWrapper);
}

function findAndProcessMessages() {
  // Look for ChatGPT message elements
  const messageSelectors = [
    '[data-message-author-role="assistant"]',
    '.group\\/conversation-turn',
    '[class*="group/conversation"]',
    '[class*="conversation-turn"]'
  ];
  
  let foundMessages = new Set();
  
  messageSelectors.forEach(selector => {
    const messages = document.querySelectorAll(selector);
    messages.forEach(message => {
      if (!foundMessages.has(message)) {
        foundMessages.add(message);
        addButtonsToMessage(message);
      }
    });
  });
}

// Mutation observer to watch for new messages
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;
  
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node or its children contain ChatGPT messages
          const hasAssistantMessage = node.querySelector && (
            node.querySelector('[data-message-author-role="assistant"]') ||
            node.querySelector('.group\\/conversation-turn') ||
            node.querySelector('[class*="group/conversation"]') ||
            node.querySelector('[class*="conversation-turn"]') ||
            node.matches('[data-message-author-role="assistant"]') ||
            node.matches('.group\\/conversation-turn') ||
            node.matches('[class*="group/conversation"]') ||
            node.matches('[class*="conversation-turn"]')
          );
          
          if (hasAssistantMessage) {
            shouldProcess = true;
          }
        }
      });
    }
  });
  
  if (shouldProcess) {
    // Debounce the processing
    clearTimeout(window.chatgptButtonTimeout);
    window.chatgptButtonTimeout = setTimeout(findAndProcessMessages, 500);
  }
});

// Start observing when DOM is ready
function initializeExtension() {
  console.log('Initializing ChatGPT Button Extension');
  
  // Process existing messages
  findAndProcessMessages();
  
  // Start observing for new messages
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('ChatGPT Button Extension initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Handle page navigation (for SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      findAndProcessMessages();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });
