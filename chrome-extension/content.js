// Content script for Memoria Chrome Extension
console.log('Memoria Extension loaded');

// Configuration
const BUTTON_CONFIG = {
  buttons: [
    {
      id: 'memoria-save-button',
      text: 'Save to Memoria',
      icon: 'save',
      className: 'memoria-btn save-btn',
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
  
  // Add SVG icon
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
  
  // Save icon (bookmark/disk style)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 2v12l4-2 4 2V2M4 2h8M4 2l4 2 4-2');
  
  svg.appendChild(path);
  return svg;
}

function handleButtonClick(action, messageElement) {
  switch(action) {
    case 'save':
      saveToMemoria(messageElement);
      break;
    default:
      console.log('Unknown action:', action);
  }
}

/**
 * Extract question and answer from ChatGPT conversation
 */
function extractQuestionAnswer(assistantMessageElement) {
  console.log('Starting extraction from assistant message element');
  
  // Get the assistant's answer
  const answerSelectors = [
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="assistant"] .prose',
    '.group\\/conversation-turn [data-message-author-role="assistant"] .markdown',
    '.group\\/conversation-turn [data-message-author-role="assistant"] .prose',
    '[data-message-author-role="assistant"] [class*="markdown"]',
    '[data-message-author-role="assistant"] [class*="prose"]'
  ];
  
  let answerText = '';
  for (const selector of answerSelectors) {
    try {
      const content = assistantMessageElement.querySelector(selector);
      if (content) {
        answerText = content.textContent || content.innerText || '';
        if (answerText.trim().length > 0) {
          console.log('Found answer using selector:', selector);
          break;
        }
      }
    } catch (e) {
      console.warn('Error with answer selector:', selector, e);
    }
  }
  
  // Fallback: get all text content from assistant message
  if (!answerText || answerText.trim().length === 0) {
    answerText = assistantMessageElement.textContent || assistantMessageElement.innerText || '';
    console.log('Using fallback for answer extraction');
  }
  
  console.log('Answer extracted, length:', answerText.length);
  
  // Find the previous user message (question)
  // Strategy 1: Find all user messages and get the one just before this assistant message
  let questionText = '';
  let questionElement = null;
  
  // Get all messages in order to find the conversation index
  const allMessages = document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]');
  let assistantIndex = -1;
  let conversationIndex = -1;
  
  // Find the index of the current assistant message
  for (let i = 0; i < allMessages.length; i++) {
    if (allMessages[i].contains(assistantMessageElement) || 
        assistantMessageElement.contains(allMessages[i]) ||
        allMessages[i] === assistantMessageElement) {
      assistantIndex = i;
      break;
    }
  }
  
  // Calculate conversation index (QA pair index)
  // Each QA pair consists of a user message followed by an assistant message
  // So the conversation index is the number of assistant messages before this one
  if (assistantIndex >= 0) {
    let assistantCount = 0;
    for (let i = 0; i < assistantIndex; i++) {
      if (allMessages[i].getAttribute('data-message-author-role') === 'assistant') {
        assistantCount++;
      }
    }
    conversationIndex = assistantCount;
    console.log('Conversation index (QA pair order):', conversationIndex);
  }
  
  // If we found the assistant message, look backwards for the user message
  if (assistantIndex > 0) {
    for (let i = assistantIndex - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (msg.getAttribute('data-message-author-role') === 'user') {
        questionElement = msg;
        console.log('Found user message before assistant message');
        break;
      }
    }
  }
  
  // Strategy 2: Find conversation turn and look for user message
  if (!questionElement) {
    const conversationTurn = assistantMessageElement.closest('[data-testid*="conversation-turn"]') ||
                           assistantMessageElement.closest('.group\\/conversation-turn') ||
                           assistantMessageElement.closest('[class*="conversation-turn"]') ||
                           assistantMessageElement.parentElement;
    
    if (conversationTurn) {
      // Look for user message in the same turn
      const userMessage = conversationTurn.querySelector('[data-message-author-role="user"]');
      if (userMessage) {
        questionElement = userMessage;
        console.log('Found user message in same turn');
      } else {
        // Look for previous sibling turn
        let prevSibling = conversationTurn.previousElementSibling;
        let attempts = 0;
        while (prevSibling && attempts < 10) {
          const userMsg = prevSibling.querySelector('[data-message-author-role="user"]');
          if (userMsg) {
            questionElement = userMsg;
            console.log('Found user message in previous sibling');
            break;
          }
          prevSibling = prevSibling.previousElementSibling;
          attempts++;
        }
      }
    }
  }
  
  // Strategy 3: Find all conversation turns and get the one before this assistant message
  if (!questionElement) {
    const allTurns = document.querySelectorAll('[data-testid*="conversation-turn"], .group\\/conversation-turn, [class*="conversation-turn"]');
    for (let i = 0; i < allTurns.length; i++) {
      if (allTurns[i].contains(assistantMessageElement)) {
        // Found the turn containing this assistant message, look for previous turn with user message
        for (let j = i - 1; j >= 0; j--) {
          const userMsg = allTurns[j].querySelector('[data-message-author-role="user"]');
          if (userMsg) {
            questionElement = userMsg;
            console.log('Found user message in previous turn');
            break;
          }
        }
        break;
      }
    }
  }
  
  // Extract question text
  if (questionElement) {
    const questionSelectors = [
      '.markdown',
      '.prose',
      '[class*="markdown"]',
      '[class*="prose"]'
    ];
    
    for (const selector of questionSelectors) {
      try {
        const content = questionElement.querySelector(selector);
        if (content) {
          questionText = content.textContent || content.innerText || '';
          if (questionText.trim().length > 0) {
            console.log('Found question using selector:', selector);
            break;
          }
        }
      } catch (e) {
        console.warn('Error with selector:', selector, e);
      }
    }
    
    // Try to get last div child if other selectors didn't work
    if (!questionText || questionText.trim().length === 0) {
      try {
        const divs = questionElement.querySelectorAll('div');
        if (divs.length > 0) {
          const lastDiv = divs[divs.length - 1];
          questionText = lastDiv.textContent || lastDiv.innerText || '';
          if (questionText.trim().length > 0) {
            console.log('Found question using last div child');
          }
        }
      } catch (e) {
        console.warn('Error getting last div:', e);
      }
    }
    
    if (!questionText || questionText.trim().length === 0) {
      questionText = questionElement.textContent || questionElement.innerText || '';
      console.log('Using fallback for question extraction');
    }
  } else {
    console.warn('Could not find question element');
  }
  
  console.log('Question extracted, length:', questionText.length);
  
  // Try to extract real message IDs from ChatGPT DOM
  // ChatGPT stores message IDs in data attributes or in the element structure
  let questionId = null;
  let answerId = null;
  
  // Try to find message IDs in data attributes
  if (questionElement) {
    // Try various selectors for message ID
    const questionIdSelectors = [
      '[data-message-id]',
      '[data-id]',
      '[id*="message"]',
    ];
    
    for (const selector of questionIdSelectors) {
      const idElement = questionElement.querySelector(selector) || questionElement.closest(selector);
      if (idElement) {
        questionId = idElement.getAttribute('data-message-id') || 
                    idElement.getAttribute('data-id') || 
                    idElement.id;
        if (questionId) break;
      }
    }
    
    // If not found, try to get from parent elements
    if (!questionId) {
      let parent = questionElement.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        questionId = parent.getAttribute('data-message-id') || 
                    parent.getAttribute('data-id') || 
                    parent.id;
        if (questionId) break;
        parent = parent.parentElement;
        depth++;
      }
    }
  }
  
  // Try to find answer message ID
  const answerIdSelectors = [
    '[data-message-id]',
    '[data-id]',
    '[id*="message"]',
  ];
  
  for (const selector of answerIdSelectors) {
    const idElement = assistantMessageElement.querySelector(selector) || assistantMessageElement.closest(selector);
    if (idElement) {
      answerId = idElement.getAttribute('data-message-id') || 
                 idElement.getAttribute('data-id') || 
                 idElement.id;
      if (answerId) break;
    }
  }
  
  // If not found, try to get from parent elements
  if (!answerId) {
    let parent = assistantMessageElement.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      answerId = parent.getAttribute('data-message-id') || 
                 parent.getAttribute('data-id') || 
                 parent.id;
      if (answerId) break;
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Fallback: generate stable IDs based on content hash + conversationIndex
  // This ensures the same message always gets the same ID
  if (!questionId) {
    const questionHash = btoa(questionText.trim().substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    questionId = `q-hash-${conversationIndex >= 0 ? conversationIndex : 'unknown'}-${questionHash}`;
  }
  
  if (!answerId) {
    const answerHash = btoa(answerText.trim().substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    answerId = `a-hash-${conversationIndex >= 0 ? conversationIndex : 'unknown'}-${answerHash}`;
  }
  
  console.log('Message IDs extracted:', { questionId, answerId, conversationIndex });
  
  return {
    question: questionText.trim(),
    answer: answerText.trim(),
    questionId,
    answerId,
    conversationIndex: conversationIndex >= 0 ? conversationIndex : null // Order in the conversation
  };
}

/**
 * Save QA pair to Memoria via localStorage
 */
function saveToMemoria(assistantMessageElement) {
  let notificationShown = false; // Track if we've already shown a notification
  
  const showNotificationOnce = (message, type) => {
    if (!notificationShown) {
      notificationShown = true;
      showNotification(message, type);
    }
  };
  
  try {
    console.log('Extracting QA pair from message element...');
    const qaPair = extractQuestionAnswer(assistantMessageElement);
    
    console.log('Extracted QA pair:', {
      questionLength: qaPair.question.length,
      answerLength: qaPair.answer.length,
      questionPreview: qaPair.question.substring(0, 50),
      answerPreview: qaPair.answer.substring(0, 50)
    });
    
    if (!qaPair.question || !qaPair.answer) {
      const missing = [];
      if (!qaPair.question) missing.push('question');
      if (!qaPair.answer) missing.push('answer');
      console.error('Missing data:', missing);
      showNotificationOnce(`Could not extract ${missing.join(' and ')}`, 'error');
      return;
    }
    
    if (qaPair.question.trim().length === 0 || qaPair.answer.trim().length === 0) {
      console.error('Empty question or answer after trim');
      showNotificationOnce('Question or answer is empty', 'error');
      return;
    }
    
    // Extract ChatGPT conversation ID from URL
    // URLs can be:
    // - https://chat.openai.com/c/[conversation-id]
    // - https://chatgpt.com/c/[conversation-id]
    // - https://chat.openai.com/?model=... (new format, no ID in URL)
    let chatgptSessionId = null;
    
    // Try to extract from URL path
    const urlMatch = window.location.href.match(/\/c\/([a-f0-9-]+)/);
    if (urlMatch) {
      chatgptSessionId = urlMatch[1];
    } else {
      // Try to get from localStorage (ChatGPT stores conversation ID there)
      try {
        // ChatGPT stores conversation data in localStorage with keys like "conversation-{id}"
        const keys = Object.keys(localStorage);
        const convKey = keys.find(key => key.startsWith('conversation-') || key.includes('conversation'));
        if (convKey) {
          // Extract ID from key or get from stored data
          const match = convKey.match(/conversation[_-]?([a-f0-9-]+)/i);
          if (match) {
            chatgptSessionId = match[1];
          } else {
            // Try to parse the stored conversation data
            try {
              const convData = JSON.parse(localStorage.getItem(convKey) || '{}');
              if (convData.id) {
                chatgptSessionId = convData.id;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      } catch (e) {
        console.warn('Could not access localStorage for conversation ID:', e);
      }
    }
    
    // Fallback: use a hash of the URL as session ID (for same-page grouping)
    if (!chatgptSessionId) {
      // Create a stable hash from the URL
      const urlHash = window.location.href.split('?')[0]; // Remove query params
      chatgptSessionId = `url-${btoa(urlHash).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
    }
    
    console.log('ChatGPT Session ID extracted:', chatgptSessionId, 'from URL:', window.location.href);
    
    // Create data object matching ExtensionDataReceiver format
    const data = {
      qaPairs: [{
        question: qaPair.question.trim(),
        answer: qaPair.answer.trim(),
        questionId: qaPair.questionId,
        answerId: qaPair.answerId,
        conversationIndex: qaPair.conversationIndex // Include order in conversation
      }],
      title: qaPair.question.trim().length > 50 
        ? qaPair.question.trim().substring(0, 50) + '...'
        : qaPair.question.trim(),
      url: window.location.href,
      chatgptSessionId: chatgptSessionId, // Include ChatGPT session ID for grouping
      timestamp: Date.now()
    };
    
    console.log('Data to save with session ID:', data);
    
    // Save to chrome.storage.local (shared across all extension contexts)
    try {
      // Check if extension context is still valid
      if (!chrome.runtime || !chrome.runtime.id) {
        console.error('Extension context invalidated');
        showNotificationOnce('Extension reloaded. Please refresh the page.', 'error');
        return;
      }
      
      chrome.storage.local.set({ memoriaExtensionData: data }, () => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          console.error('Chrome storage error:', error);
          
          // Handle extension context invalidated error
          if (error.message && error.message.includes('invalidated')) {
            // Try to save to localStorage as fallback
            try {
              localStorage.setItem('memoriaExtensionData', JSON.stringify(data));
              console.log('Saved to localStorage as fallback');
              // Show success if fallback worked
              showNotificationOnce('Saved to Memoria!', 'success');
            } catch (e) {
              console.warn('Could not save to localStorage:', e);
              // Only show error if both methods failed
              showNotificationOnce('Extension reloaded. Please refresh the page.', 'error');
            }
          } else {
            // Try localStorage as fallback
            try {
              localStorage.setItem('memoriaExtensionData', JSON.stringify(data));
              console.log('Saved to localStorage as fallback');
              showNotificationOnce('Saved to Memoria!', 'success');
            } catch (e) {
              console.error('Both storage methods failed:', e);
              showNotificationOnce('Storage error: ' + error.message, 'error');
            }
          }
          return;
        }
        
        // Success! Data was saved to chrome.storage.local
        console.log('Successfully saved to chrome.storage.local');
        showNotificationOnce('Saved to Memoria!', 'success');
        
        // Also save to localStorage as backup (for same-domain access)
        try {
          localStorage.setItem('memoriaExtensionData', JSON.stringify(data));
        } catch (e) {
          console.warn('Could not save to localStorage (backup):', e);
          // Don't show error here, main save already succeeded
        }
      });
    } catch (storageError) {
      console.error('Storage error:', storageError);
      // Try localStorage as fallback
      try {
        localStorage.setItem('memoriaExtensionData', JSON.stringify(data));
        console.log('Saved to localStorage as fallback');
        showNotificationOnce('Saved to Memoria!', 'success');
      } catch (e) {
        console.error('Both storage methods failed:', e);
        showNotificationOnce('Storage error: ' + storageError.message, 'error');
      }
    }
    
  } catch (error) {
    console.error('Error saving to Memoria:', error);
    console.error('Error stack:', error.stack);
    // Only show error if we haven't already shown a notification
    if (!notificationShown) {
      showNotification('Error: ' + error.message, 'error');
    }
  }
}

function showNotification(message, type = 'success') {
  // Remove existing notification if any
  const existing = document.querySelector('.memoria-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = 'memoria-notification';
  notification.textContent = message;
  
  const bgColor = type === 'success' ? '#10a37f' : '#ef4444';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: memoriaSlideIn 0.3s ease-out;
    pointer-events: none;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'memoriaSlideOut 0.3s ease-in forwards';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

function addButtonsToMessage(messageElement) {
  // Check if buttons already exist
  if (messageElement.querySelector('.memoria-btn')) {
    return;
  }
  
  // Add a small delay to ensure ChatGPT has finished rendering
  setTimeout(() => {
    // Check again if buttons were added during the delay
    if (!messageElement.querySelector('.memoria-btn')) {
      addButtonsBelowMessage(messageElement);
    }
  }, 500);
}

function addButtonsBelowMessage(messageElement) {
  // Find the message content container
  let contentContainer = messageElement.querySelector('[data-message-author-role="assistant"] .markdown');
  
  if (!contentContainer) {
    const contentSelectors = [
      '[data-message-author-role="assistant"] .prose',
      '.group\\/conversation-turn .markdown',
      '.group\\/conversation-turn .prose',
      '[data-message-author-role="assistant"] [class*="markdown"]',
      '[data-message-author-role="assistant"] [class*="prose"]'
    ];
    
    for (const selector of contentSelectors) {
      try {
        contentContainer = messageElement.querySelector(selector);
        if (contentContainer) break;
      } catch (e) {
        console.warn('Error with selector:', selector, e);
      }
    }
  }
  
  // If we found the content container, place button after it
  if (contentContainer) {
    let parentContainer = contentContainer.parentElement;
    
    // Keep going up until we find a suitable container
    while (parentContainer && !parentContainer.querySelector('[data-message-author-role="assistant"]')) {
      parentContainer = parentContainer.parentElement;
    }
    
    if (parentContainer) {
      const buttonWrapper = document.createElement('div');
      buttonWrapper.className = 'memoria-button-wrapper below-message';
      
      BUTTON_CONFIG.buttons.forEach(buttonConfig => {
        const button = createButton(buttonConfig, messageElement);
        buttonWrapper.appendChild(button);
      });
      
      parentContainer.insertBefore(buttonWrapper, contentContainer.nextSibling);
      return;
    }
  }
  
  // Fallback: append to the message element itself
  const buttonWrapper = document.createElement('div');
  buttonWrapper.className = 'memoria-button-wrapper below-message';
  
  BUTTON_CONFIG.buttons.forEach(buttonConfig => {
    const button = createButton(buttonConfig, messageElement);
    buttonWrapper.appendChild(button);
  });
  
  messageElement.appendChild(buttonWrapper);
}

function findAndProcessMessages() {
  // Look for ChatGPT assistant message elements
  const messageSelectors = [
    '[data-message-author-role="assistant"]',
    '.group\\/conversation-turn [data-message-author-role="assistant"]',
    '[class*="group/conversation"] [data-message-author-role="assistant"]',
    '[class*="conversation-turn"] [data-message-author-role="assistant"]'
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
    clearTimeout(window.memoriaExtensionTimeout);
    window.memoriaExtensionTimeout = setTimeout(findAndProcessMessages, 500);
  }
});

// Start observing when DOM is ready
function initializeExtension() {
  console.log('Initializing Memoria Extension');
  
  // Process existing messages
  findAndProcessMessages();
  
  // Start observing for new messages
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('Memoria Extension initialized successfully');
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
