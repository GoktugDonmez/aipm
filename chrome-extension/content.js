// Content script for ChatGPT.com
// Scrapes QA pairs from the current conversation

(function() {
  'use strict';

  // Function to extract QA pairs from ChatGPT conversation
  function extractQAPairs() {
    const pairs = [];
    
    // ChatGPT uses specific selectors - these may need updating if ChatGPT changes their UI
    // Look for message containers
    const messageContainers = document.querySelectorAll('[data-message-author-role]');
    
    let currentQuestion = null;
    
    messageContainers.forEach((container) => {
      const role = container.getAttribute('data-message-author-role');
      const textContent = container.textContent?.trim() || '';
      
      if (role === 'user') {
        // If we have a previous question without an answer, save it with empty answer
        if (currentQuestion) {
          pairs.push({
            question: currentQuestion.text,
            answer: '',
            questionId: currentQuestion.id || `q-${Date.now()}`,
            answerId: '',
          });
        }
        currentQuestion = {
          text: textContent,
          id: container.id || `user-${Date.now()}`,
        };
      } else if (role === 'assistant' && currentQuestion) {
        // Found answer to current question
        pairs.push({
          question: currentQuestion.text,
          answer: textContent,
          questionId: currentQuestion.id || `q-${Date.now()}`,
          answerId: container.id || `a-${Date.now()}`,
        });
        currentQuestion = null;
      }
    });
    
    // Handle case where last message is a question without answer
    if (currentQuestion) {
      pairs.push({
        question: currentQuestion.text,
        answer: '',
        questionId: currentQuestion.id || `q-${Date.now()}`,
        answerId: '',
      });
    }
    
    return pairs;
  }

  // Function to get conversation title
  function getConversationTitle() {
    // ChatGPT title selector - may need updating
    const titleElement = document.querySelector('h1') || 
                        document.querySelector('[data-testid="conversation-title"]') ||
                        document.querySelector('title');
    return titleElement?.textContent?.trim() || 'Untitled Conversation';
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractQAPairs') {
      const pairs = extractQAPairs();
      const title = getConversationTitle();
      
      sendResponse({
        success: true,
        qaPairs: pairs,
        title: title,
        url: window.location.href,
      });
      
      return true; // Keep channel open for async response
    }
    
    if (request.action === 'sendToApp') {
      const pairs = extractQAPairs();
      const title = getConversationTitle();
      
      // Store in chrome.storage for the app to read
      chrome.storage.local.set({
        'memoriaQAPairs': {
          qaPairs: pairs,
          title: title,
          url: window.location.href,
          timestamp: Date.now(),
        }
      }, () => {
        sendResponse({ success: true });
      });
      
      return true;
    }
  });

  // Inject a button into ChatGPT UI (optional - can be done via popup instead)
  function injectExportButton() {
    // Check if button already exists
    if (document.getElementById('memoria-export-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'memoria-export-btn';
    button.textContent = '📚 Export to Memoria';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      padding: 10px 20px;
      background: var(--accent-9, #3b82f6);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    button.addEventListener('click', () => {
      const pairs = extractQAPairs();
      const title = getConversationTitle();
      
      const data = {
        qaPairs: pairs,
        title: title,
        url: window.location.href,
        timestamp: Date.now(),
      };
      
      // Store in chrome.storage for extension popup
      chrome.storage.local.set({
        'memoriaQAPairs': data
      });
      
      // Also store in localStorage for the app to read
      try {
        localStorage.setItem('memoriaExtensionData', JSON.stringify(data));
        button.textContent = '✓ Exported!';
        setTimeout(() => {
          button.textContent = '📚 Export to Memoria';
        }, 2000);
      } catch (error) {
        console.error('Failed to write to localStorage:', error);
        button.textContent = '⚠ Try popup';
      }
    });
    
    document.body.appendChild(button);
  }

  // Wait for page to load, then inject button
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectExportButton);
  } else {
    injectExportButton();
  }
})();

