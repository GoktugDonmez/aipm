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
  svg.style.cssText = 'width: 16px; height: 16px; color: inherit;';
  
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
  // Check if buttons already exist in the message or its conversation turn
  const conversationTurn = messageElement.closest('[data-testid*="conversation-turn"]') ||
                          messageElement.closest('.group\\/conversation-turn') ||
                          messageElement.closest('[class*="conversation-turn"]');
  const searchScope = conversationTurn || messageElement;
  
  // Check if Memoria button already exists (more reliable check)
  if (searchScope.querySelector('.memoria-btn[data-memoria-button="true"]')) {
    console.log('Memoria button already exists, skipping');
    return;
  }
  
  // Remove any buttons that were incorrectly placed (below message)
  const incorrectButtons = searchScope.querySelectorAll('.memoria-button-wrapper.below-message, .memoria-btn:not([data-memoria-button="true"])');
  incorrectButtons.forEach(btn => {
    console.log('Removing incorrectly placed button:', btn);
    btn.remove();
  });
  
  // Wait for the action bar to be available
  // ChatGPT's action buttons appear after the message is fully rendered
  waitForActionBar(messageElement, 0, 10); // Try up to 10 times with increasing delays
}

function waitForActionBar(messageElement, attempt, maxAttempts) {
  if (attempt >= maxAttempts) {
    console.log('Action bar not found after', maxAttempts, 'attempts, giving up');
    return;
  }
  
  // Start with a longer delay for first attempt (message might still be generating)
  // Then use shorter delays for retries
  const delay = attempt === 0 ? 1500 : 500 + (attempt * 200); // 1500ms first, then 700ms, 900ms, etc.
  
  setTimeout(() => {
    const conversationTurn = messageElement.closest('[data-testid*="conversation-turn"]') ||
                            messageElement.closest('.group\\/conversation-turn') ||
                            messageElement.closest('[class*="conversation-turn"]');
    const searchScope = conversationTurn || messageElement;
    
    // Check if button already exists
    if (searchScope.querySelector('.memoria-btn[data-memoria-button="true"]')) {
      console.log('Memoria button already exists, skipping');
      return;
    }
    
    // Check if action bar exists (look for ellipsis button or action buttons)
    const hasActionBar = searchScope.querySelector('button[aria-haspopup="menu"]') ||
                        searchScope.querySelector('button[data-testid="copy-turn-action-button"]') ||
                        searchScope.querySelector('button[aria-label="Copier"]') ||
                        searchScope.querySelector('button[aria-label="Copy"]');
    
    if (hasActionBar) {
      // Action bar is available, try to add button
      console.log('Action bar found, attempting to add button (attempt', attempt + 1, ')');
      addButtonsToActionBar(messageElement);
      
      // Verify button was added correctly (in action bar, not below message)
      setTimeout(() => {
        const addedButton = searchScope.querySelector('.memoria-btn[data-memoria-button="true"]');
        if (addedButton) {
          // Check if it's in the wrong place (below message wrapper)
          const isInWrapper = addedButton.closest('.memoria-button-wrapper.below-message');
          if (isInWrapper) {
            console.log('Button was added in wrong place, removing and retrying');
            addedButton.remove();
            waitForActionBar(messageElement, attempt + 1, maxAttempts);
          } else {
            console.log('Button successfully added to action bar');
          }
        } else {
          // Button wasn't added, retry
          console.log('Button was not added, retrying');
          waitForActionBar(messageElement, attempt + 1, maxAttempts);
        }
      }, 200);
    } else {
      // Action bar not ready yet, retry
      console.log('Action bar not ready yet, retrying in', delay, 'ms (attempt', attempt + 1, ')');
      waitForActionBar(messageElement, attempt + 1, maxAttempts);
    }
  }, delay);
}

function addButtonsToActionBar(messageElement) {
  console.log('Looking for action bar for message element:', messageElement);
  
  // Strategy 1: Find the ellipsis button (More actions) associated with this message
  let ellipsisButton = null;
  const ellipsisSelectors = [
    'button[aria-label="Plus d\'actions"]',
    'button[aria-label="More actions"]',
    'button[aria-haspopup="menu"][aria-label*="actions" i]',
    'button[aria-haspopup="menu"][aria-label*="Plus" i]',
    'button[aria-haspopup="menu"]', // Generic fallback
  ];
  
  // First, try to find within the message element's conversation turn
  let conversationTurn = messageElement.closest('[data-testid*="conversation-turn"]') ||
                         messageElement.closest('.group\\/conversation-turn') ||
                         messageElement.closest('[class*="conversation-turn"]');
  
  if (!conversationTurn) {
    // Try to find by going up the DOM tree
    let parent = messageElement.parentElement;
    let depth = 0;
    while (parent && depth < 10) {
      if (parent.querySelector && (
          parent.querySelector('[data-testid*="conversation-turn"]') ||
          parent.classList.contains('group/conversation-turn') ||
          parent.className.includes('conversation-turn')
        )) {
        conversationTurn = parent;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // Search for ellipsis button in the conversation turn or message element
  const searchScope = conversationTurn || messageElement;
  
  for (const selector of ellipsisSelectors) {
    try {
      ellipsisButton = searchScope.querySelector(selector);
      if (ellipsisButton) {
        console.log('Found ellipsis button in scope:', ellipsisButton);
        break;
      }
    } catch (e) {
      // Ignore selector errors
    }
  }
  
  // If not found in scope, try finding all ellipsis buttons and pick the closest one
  if (!ellipsisButton && conversationTurn) {
    try {
      const allEllipsisButtons = document.querySelectorAll('button[aria-haspopup="menu"]');
      // Find the ellipsis button that's closest to this conversation turn
      for (const btn of allEllipsisButtons) {
        if (conversationTurn.contains(btn) || btn.closest('[data-testid*="conversation-turn"]') === conversationTurn) {
          ellipsisButton = btn;
          console.log('Found ellipsis button by proximity:', ellipsisButton);
          break;
        }
      }
    } catch (e) {
      console.warn('Error finding ellipsis buttons:', e);
    }
  }
  
  // If we found the ellipsis button, find its action bar container
  // The action bar is the div with classes like "flex flex-wrap items-center gap-y-4 p-1"
  if (ellipsisButton) {
    // Look for the parent div that has flex-wrap and items-center classes (the action bar container)
    let container = ellipsisButton.parentElement;
    let attempts = 0;
    
    while (container && attempts < 8) {
      const classList = container.className || '';
      // Check if this is the action bar container (has flex-wrap and items-center)
      const hasFlexWrap = classList.includes('flex-wrap') || classList.includes('flex') && classList.includes('items-center');
      const hasGap = classList.includes('gap');
      
      if (hasFlexWrap || (hasGap && container.querySelectorAll('button').length >= 2)) {
        // This is the action bar container
        console.log('Found action bar container:', container, 'classes:', classList);
        
        // Check if button already exists in this container
        if (container.querySelector('.memoria-btn[data-memoria-button="true"]')) {
          console.log('Memoria button already exists in this container, skipping');
          return;
        }
        
        const button = createButton(BUTTON_CONFIG.buttons[0], messageElement);
        // Mark with data attribute for reliable detection
        button.setAttribute('data-memoria-button', 'true');
        // Style to match ChatGPT's action buttons but with white color
        button.className = 'memoria-btn memoria-action-bar-btn hover:bg-token-bg-secondary rounded-lg touch:w-10 flex h-8 w-8 items-center justify-center';
        button.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: white;
        `;
        
        // Insert directly before the ellipsis button (no wrapper)
        container.insertBefore(button, ellipsisButton);
        console.log('Added Memoria button to action bar before ellipsis');
        return;
      }
      container = container.parentElement;
      attempts++;
    }
    
    // Fallback: if we found ellipsis but couldn't find the exact container, use its direct parent
    if (ellipsisButton.parentElement) {
      // Check if button already exists
      if (ellipsisButton.parentElement.querySelector('.memoria-btn[data-memoria-button="true"]')) {
        console.log('Memoria button already exists in ellipsis parent, skipping');
        return;
      }
      
      console.log('Using ellipsis direct parent as container');
      const button = createButton(BUTTON_CONFIG.buttons[0], messageElement);
      button.setAttribute('data-memoria-button', 'true');
      button.className = 'memoria-btn memoria-action-bar-btn hover:bg-token-bg-secondary rounded-lg touch:w-10 flex h-8 w-8 items-center justify-center';
      button.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        color: white;
      `;
      ellipsisButton.parentElement.insertBefore(button, ellipsisButton);
      console.log('Added Memoria button before ellipsis in direct parent');
      return;
    }
  }
  
  // Strategy 2: Find any action button and locate the action bar
  const actionButtonSelectors = [
    'button[data-testid="copy-turn-action-button"]',
    'button[aria-label="Copier"]',
    'button[aria-label="Copy"]',
    'button[aria-label*="Copier" i]',
    'button[aria-label*="Copy" i]',
  ];
  
  for (const selector of actionButtonSelectors) {
    try {
      const actionButton = searchScope.querySelector(selector);
      if (actionButton) {
        console.log('Found action button:', actionButton);
        // Find the container with multiple buttons
        let container = actionButton.parentElement;
        let attempts = 0;
        
        while (container && attempts < 5) {
          const buttons = container.querySelectorAll('button');
          if (buttons.length >= 3) {
            // Check if button already exists
            if (container.querySelector('.memoria-btn[data-memoria-button="true"]')) {
              console.log('Memoria button already exists in action bar, skipping');
              return;
            }
            
            // This looks like the action bar
            console.log('Found action bar via action button:', container);
            
            const button = createButton(BUTTON_CONFIG.buttons[0], messageElement);
            button.setAttribute('data-memoria-button', 'true');
            // Style to match ChatGPT's action buttons but with white color
            button.className = 'memoria-btn memoria-action-bar-btn hover:bg-token-bg-secondary rounded-lg touch:w-10 flex h-8 w-8 items-center justify-center';
            button.style.cssText = `
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              padding: 0;
              border: none;
              background: transparent;
              border-radius: 6px;
              cursor: pointer;
              color: white;
            `;
            
            // Try to insert before ellipsis, otherwise at the end
            const ellipsis = container.querySelector('button[aria-haspopup="menu"]');
            if (ellipsis) {
              container.insertBefore(button, ellipsis);
            } else {
              container.appendChild(button);
            }
            console.log('Added Memoria button to action bar');
            return;
          }
          container = container.parentElement;
          attempts++;
        }
      }
    } catch (e) {
      console.warn('Error with action button selector:', selector, e);
    }
  }
  
  // Don't use fallback - if action bar doesn't exist, wait and retry
  // This prevents buttons from appearing in wrong places
  console.log('Could not find action bar, will retry later');
  // Don't call addButtonsBelowMessage - we only want buttons in the action bar
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
    try {
      const messages = document.querySelectorAll(selector);
      messages.forEach(message => {
        // First check if button already exists in this message's conversation turn
        const conversationTurn = message.closest('[data-testid*="conversation-turn"]') ||
                                message.closest('.group\\/conversation-turn') ||
                                message.closest('[class*="conversation-turn"]');
        const searchScope = conversationTurn || message;
        
        // Skip if button already exists
        if (searchScope.querySelector('.memoria-btn[data-memoria-button="true"]')) {
          return; // Skip this message
        }
        
        // Use a unique identifier for each message to avoid duplicates
        let messageId = message.getAttribute('data-message-id') || 
                       message.id || 
                       message.getAttribute('data-testid');
        
        // If no ID, create one from the message content hash
        if (!messageId) {
          const textContent = message.textContent || '';
          const contentHash = btoa(textContent.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
          messageId = `msg-${contentHash}`;
        }
        
        if (!foundMessages.has(messageId)) {
          foundMessages.add(messageId);
          addButtonsToMessage(message);
        }
      });
    } catch (e) {
      console.warn('Error processing messages with selector:', selector, e);
    }
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
