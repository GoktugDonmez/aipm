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

// --- Strategy Interface ---
class PlatformStrategy {
  constructor() {
    this.name = 'BaseStrategy';
  }

  /**
   * Checks if the current URL matches this strategy
   */
  matches(url) {
    return false;
  }

  /**
   * Returns a list of assistant message elements that should have the save button
   */
  getAssistantMessages() {
    return [];
  }

  /**
   * Given an assistant message element, find the corresponding user question text
   */
  getQuestionText(assistantElement) {
    return '';
  }

  /**
   * Given an assistant message element, extract the answer text
   */
  getAnswerText(assistantElement) {
    return '';
  }

  /**
   * Where to insert the button relative to the assistant message element
   */
  injectButton(assistantElement, button) {
    assistantElement.appendChild(button);
  }
  
  /**
   * Get conversation ID/Index if possible
   */
  getConversationInfo(assistantElement) {
    return { conversationIndex: -1 };
  }
}

// --- ChatGPT Strategy ---
class ChatGPTStrategy extends PlatformStrategy {
  constructor() {
    super();
    this.name = 'ChatGPT';
  }

  matches(url) {
    return url.includes('chat.openai.com') || url.includes('chatgpt.com');
  }

  getAssistantMessages() {
    return Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
  }

  getQuestionText(assistantElement) {
    // Logic from original content.js
    let questionElement = null;
    const allMessages = document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]');
    let assistantIndex = -1;

    for (let i = 0; i < allMessages.length; i++) {
      if (allMessages[i].contains(assistantElement) || 
          assistantElement.contains(allMessages[i]) ||
          allMessages[i] === assistantElement) {
        assistantIndex = i;
        break;
      }
    }

    if (assistantIndex > 0) {
      for (let i = assistantIndex - 1; i >= 0; i--) {
        const msg = allMessages[i];
        if (msg.getAttribute('data-message-author-role') === 'user') {
          questionElement = msg;
          break;
        }
      }
    }

    if (questionElement) {
      return questionElement.textContent || questionElement.innerText || '';
    }
    return '';
  }

  getAnswerText(assistantElement) {
    const answerSelectors = [
      '.markdown',
      '.prose',
      '[class*="markdown"]',
      '[class*="prose"]'
    ];
    
    for (const selector of answerSelectors) {
      const content = assistantElement.querySelector(selector);
      if (content) {
        return content.textContent || content.innerText || '';
      }
    }
    return assistantElement.textContent || assistantElement.innerText || '';
  }

  injectButton(assistantElement, button) {
    // Try to find the action bar or footer of the message
    const actionBar = assistantElement.querySelector('.text-gray-400.flex.self-end.lg\\:self-center') || 
                      assistantElement.querySelector('[role="group"]') ||
                      assistantElement.parentElement.querySelector('[role="group"]'); // Sometimes it's in the parent wrapper
    
    if (actionBar) {
        // Check if we should insert before or append
        actionBar.appendChild(button);
    } else {
        // Fallback
        assistantElement.appendChild(button);
    }
  }
  
  getConversationInfo(assistantElement) {
      // Simple counting for index
      const allAssistants = document.querySelectorAll('[data-message-author-role="assistant"]');
      let index = -1;
      for(let i=0; i<allAssistants.length; i++) {
          if(allAssistants[i] === assistantElement || allAssistants[i].contains(assistantElement)) {
              index = i;
              break;
          }
      }
      return { conversationIndex: index };
  }
}

// --- Gemini Strategy ---
class GeminiStrategy extends PlatformStrategy {
  constructor() {
    super();
    this.name = 'Gemini';
  }

  matches(url) {
    return url.includes('gemini.google.com');
  }

  getAssistantMessages() {
    // Based on gemini-testing.html: <model-response>
    return Array.from(document.querySelectorAll('model-response'));
  }

  getQuestionText(assistantElement) {
    // Gemini structure:
    // <div class="conversation-container">
    //   <user-query>...</user-query>
    //   <model-response>...</model-response>
    // </div>
    
    const container = assistantElement.closest('.conversation-container');
    if (container) {
        const userQuery = container.querySelector('user-query');
        if (userQuery) {
            // Extract text from .query-text-line
            const textLine = userQuery.querySelector('.query-text-line');
            if (textLine) return textLine.textContent;
            return userQuery.textContent;
        }
    }
    
    // Fallback: Look for previous sibling element that is a user-query
    let prev = assistantElement.previousElementSibling;
    while(prev) {
        if (prev.tagName.toLowerCase() === 'user-query') {
             const textLine = prev.querySelector('.query-text-line');
             if (textLine) return textLine.textContent;
             return prev.textContent;
        }
        prev = prev.previousElementSibling;
    }

    return '';
  }

  getAnswerText(assistantElement) {
    // Inside <model-response>, there is usually the text content
    const responseContainer = assistantElement.querySelector('response-container');
    if (responseContainer) {
        return responseContainer.textContent || responseContainer.innerText || '';
    }
    return assistantElement.textContent || assistantElement.innerText || '';
  }

  injectButton(assistantElement, button) {
    // Inject into the bottom of the response or a specific action bar if found
    const responseContainer = assistantElement.querySelector('response-container');
    if (responseContainer) {
        // Create a wrapper for our button to make it look nice
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';
        wrapper.style.marginBottom = '4px';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'flex-end'; // Align right like other tools
        wrapper.appendChild(button);
        
        // Try to find the action bar to insert before
        // The action bar usually contains the thumbs up/down icons.
        // We look for the last div element which is usually the action bar.
        const children = Array.from(responseContainer.children);
        const actionBar = children.reverse().find(child => 
            child.tagName === 'DIV' && 
            // Check for specific action bar indicators (thumbs up/down)
            (child.querySelector('[data-mat-icon-name="thumb_up"]') || 
             child.querySelector('[data-mat-icon-name="thumb_down"]') ||
             child.querySelector('mat-icon[fonticon="thumb_up"]') ||
             child.querySelector('mat-icon[fonticon="thumb_down"]'))
        );

        if (actionBar) {
            responseContainer.insertBefore(wrapper, actionBar);
        } else {
            responseContainer.appendChild(wrapper);
        }
    } else {
        assistantElement.appendChild(button);
    }
  }
  
  getConversationInfo(assistantElement) {
      const all = document.querySelectorAll('model-response');
      let index = -1;
      for(let i=0; i<all.length; i++) {
          if(all[i] === assistantElement) {
              index = i;
              break;
          }
      }
      return { conversationIndex: index };
  }
}

// --- Claude Strategy ---
class ClaudeStrategy extends PlatformStrategy {
  constructor() {
    super();
    this.name = 'Claude';
  }

  matches(url) {
    return url.includes('claude.ai');
  }

  getAssistantMessages() {
    // Based on claude-testing.html: .font-claude-response
    const elements = Array.from(document.querySelectorAll('.font-claude-response'));
    
    // Filter out elements that are not actual messages (e.g. model selector, input area)
    return elements.filter(el => {
      // Exclude if inside model selector
      if (el.closest('[data-testid="model-selector-dropdown"]')) return false;
      // Exclude if inside chat input
      if (el.closest('[data-testid="chat-input"]')) return false;
      if (el.closest('[data-testid="chat-input-grid-area"]')) return false;
      
      return true;
    });
  }

  getQuestionText(assistantElement) {
    // Claude structure is a flat list of messages usually.
    // We need to find the "User" message that precedes this "Assistant" message.
    
    // Strategy: Get all messages in the document order
    const allUser = Array.from(document.querySelectorAll('[data-testid="user-message"]'));
    
    // Find the user message that is physically before this element in the DOM
    let bestUserMsg = null;
    
    for (const userMsg of allUser) {
        if (userMsg.compareDocumentPosition(assistantElement) & Node.DOCUMENT_POSITION_FOLLOWING) {
            // userMsg is before assistantElement
            bestUserMsg = userMsg; // Keep updating, the last one we find is the closest one before
        } else {
            // userMsg is after assistantElement, stop searching
            break;
        }
    }
    
    if (bestUserMsg) {
        return bestUserMsg.textContent || bestUserMsg.innerText || '';
    }
    
    return '';
  }

  getAnswerText(assistantElement) {
    return assistantElement.textContent || assistantElement.innerText || '';
  }

  injectButton(assistantElement, button) {
    // Claude messages are inside .font-claude-response
    // We can append to the bottom of this div
    
    const wrapper = document.createElement('div');
    wrapper.style.marginTop = '12px';
    wrapper.style.paddingTop = '8px';
    wrapper.style.borderTop = '1px solid rgba(0,0,0,0.1)';
    wrapper.appendChild(button);
    
    assistantElement.appendChild(wrapper);
  }
  
  getConversationInfo(assistantElement) {
      const all = document.querySelectorAll('.font-claude-response');
      const index = Array.from(all).indexOf(assistantElement);
      return { conversationIndex: index };
  }
}


// --- Main Logic ---

let currentStrategy = null;

function detectStrategy() {
  const url = window.location.href;
  const strategies = [
    new ChatGPTStrategy(),
    new GeminiStrategy(),
    new ClaudeStrategy()
  ];

  for (const strategy of strategies) {
    if (strategy.matches(url)) {
      console.log(`Memoria: Detected platform ${strategy.name}`);
      return strategy;
    }
  }
  return null;
}

function processMessages() {
  if (!currentStrategy) return;

  const assistantMessages = currentStrategy.getAssistantMessages();
  
  assistantMessages.forEach(msgElement => {
    // Check if button already exists
    if (msgElement.querySelector('.memoria-btn')) return;
    
    // Create button
    const button = createButton(BUTTON_CONFIG.buttons[0], msgElement);
    
    // Inject button
    currentStrategy.injectButton(msgElement, button);
  });
}

// --- Shared Utility Functions (from original) ---

function createButton(buttonConfig, messageElement) {
  const button = document.createElement('button');
  button.id = buttonConfig.id;
  button.className = buttonConfig.className;
  button.setAttribute('data-action', buttonConfig.action);
  button.setAttribute('aria-label', buttonConfig.text);
  
  // Add SVG icon
  const icon = createSaveIcon();
  button.appendChild(icon);
  
  // Add text label for clarity (optional, but good for new platforms)
  const span = document.createElement('span');
  span.textContent = ' Save';
  span.style.marginLeft = '4px';
  button.appendChild(span);
  
  // Style the button to look decent on all platforms
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.padding = '4px 8px';
  button.style.borderRadius = '4px';
  button.style.border = '1px solid #ccc';
  button.style.background = 'white';
  button.style.cursor = 'pointer';
  button.style.fontSize = '12px';
  button.style.color = '#333';
  button.style.marginTop = '4px';
  
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
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 2v12l4-2 4 2V2M4 2h8M4 2l4 2 4-2');
  
  svg.appendChild(path);
  return svg;
}

function handleButtonClick(action, messageElement) {
  if (action === 'save' && currentStrategy) {
    saveToMemoria(messageElement);
  }
}

function saveToMemoria(assistantElement) {
  const question = currentStrategy.getQuestionText(assistantElement);
  const answer = currentStrategy.getAnswerText(assistantElement);
  const { conversationIndex } = currentStrategy.getConversationInfo(assistantElement);
  
  if (!question || !answer) {
    alert('Could not extract question or answer. Please try again.');
    return;
  }

  // Format data to match ExtensionDataReceiver interface
  const data = {
    qaPairs: [{
      question: question.trim(),
      answer: answer.trim(),
      questionId: `q-${Date.now()}`, // Generate a temp ID
      answerId: `a-${Date.now()}`,   // Generate a temp ID
      conversationIndex
    }],
    title: document.title || currentStrategy.name + ' Chat',
    url: window.location.href,
    platform: currentStrategy.name.toLowerCase(), // 'chatgpt', 'gemini', 'claude'
    timestamp: Date.now(),
    // Try to extract session ID from URL for grouping
    chatgptSessionId: extractSessionId(window.location.href)
  };

  console.log('Saving to Memoria:', data);
  
  // Check if extension context is valid
  if (!chrome.runtime?.id) {
    alert('The extension has been updated. Please refresh the page to use the new version.');
    return;
  }

  // Save to chrome storage using the key expected by memoria-bridge.js
  try {
    chrome.storage.local.set({ memoriaExtensionData: data }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        alert('Error saving: Please refresh the page.');
        return;
      }

      // Show success feedback
      const btn = assistantElement.querySelector('.memoria-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.textContent = 'Saved!';
        btn.style.color = 'green';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.color = '#333';
        }, 2000);
      }
    });
  } catch (e) {
    console.error('Save failed:', e);
    alert('The extension has been updated. Please refresh the page.');
  }
}

function extractSessionId(url) {
  // Try to extract UUID from URL
  const match = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

// --- Initialization ---

function init() {
  currentStrategy = detectStrategy();
  if (currentStrategy) {
    // Run initially
    processMessages();
    
    // Run on mutation (dynamic content loading)
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }
      
      if (shouldProcess) {
        // Debounce slightly
        setTimeout(processMessages, 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also run periodically just in case
    setInterval(processMessages, 2000);
  }
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
