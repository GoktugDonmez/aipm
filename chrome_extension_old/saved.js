// Saved Messages Page Script

let allMessages = [];
let filteredMessages = [];

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Saved messages page loaded');
  
  await loadSavedMessages();
  setupEventListeners();
  setupSearch();
});

async function loadSavedMessages() {
  try {
    const result = await chrome.storage.local.get(['savedMessages']);
    allMessages = result.savedMessages || [];
    
    const emptyState = document.getElementById('emptyState');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (allMessages.length === 0) {
      emptyState.style.display = 'block';
      messagesContainer.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      messagesContainer.style.display = 'block';
      
      // Sort messages by timestamp (newest first)
      allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Initially show all messages
      filteredMessages = [...allMessages];
      renderMessages();
    }
  } catch (error) {
    console.error('Error loading saved messages:', error);
    showError('Failed to load saved messages');
  }
}

function renderMessages() {
  const messagesContainer = document.getElementById('messagesContainer');
  
  // Clear existing messages
  messagesContainer.innerHTML = '';
  
  // Create message cards
  filteredMessages.forEach((message, index) => {
    const messageCard = createMessageCard(message, index);
    messagesContainer.appendChild(messageCard);
  });
}

function createMessageCard(message, index) {
  const card = document.createElement('div');
  card.className = 'message-card';
  card.setAttribute('data-index', index);
  
  const date = new Date(message.timestamp);
  const formattedDate = date.toLocaleString();
  
  // Create copy icon
  const copyIcon = createCopyIcon();
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn copy';
  copyBtn.setAttribute('data-action', 'copy');
  copyBtn.setAttribute('data-index', index);
  copyBtn.appendChild(copyIcon);
  copyBtn.appendChild(document.createTextNode(' Copy'));
  
  // Create delete icon
  const deleteIcon = createDeleteIcon();
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn delete';
  deleteBtn.setAttribute('data-action', 'delete');
  deleteBtn.setAttribute('data-index', index);
  deleteBtn.appendChild(deleteIcon);
  deleteBtn.appendChild(document.createTextNode(' Delete'));
  
  // Create message header
  const header = document.createElement('div');
  header.className = 'message-header';
  
  const dateDiv = document.createElement('div');
  dateDiv.className = 'message-date';
  dateDiv.textContent = formattedDate;
  
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'message-actions';
  actionsDiv.appendChild(copyBtn);
  actionsDiv.appendChild(deleteBtn);
  
  header.appendChild(dateDiv);
  header.appendChild(actionsDiv);
  
  // Create message content
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = message.text;
  
  // Create message URL if exists
  let urlDiv = null;
  if (message.url) {
    urlDiv = document.createElement('div');
    urlDiv.className = 'message-url';
    urlDiv.innerHTML = `Source: <a href="${message.url}" target="_blank">${new URL(message.url).pathname}</a>`;
  }
  
  // Assemble the card
  card.appendChild(header);
  card.appendChild(content);
  if (urlDiv) card.appendChild(urlDiv);
  
  return card;
}

function createCopyIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  
  // Create two overlapping rectangles for copy icon
  const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect1.setAttribute('x', '2');
  rect1.setAttribute('y', '2');
  rect1.setAttribute('width', '8');
  rect1.setAttribute('height', '8');
  rect1.setAttribute('rx', '1');
  
  const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect2.setAttribute('x', '6');
  rect2.setAttribute('y', '6');
  rect2.setAttribute('width', '8');
  rect2.setAttribute('height', '8');
  rect2.setAttribute('rx', '1');
  
  svg.appendChild(rect1);
  svg.appendChild(rect2);
  return svg;
}

function createDeleteIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  
  // Create trash can icon
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M2 4h12M5 4V2a1 1 0 011-1h4a1 1 0 011 1v2m3 0v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4h12zM8 7v6M5 10h6');
  
  svg.appendChild(path);
  return svg;
}

function setupEventListeners() {
  // Export all button
  document.getElementById('exportBtn').addEventListener('click', exportAllMessages);
  
  // Clear all button
  document.getElementById('clearAllBtn').addEventListener('click', clearAllMessages);
  
  // Message action buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('action-btn')) {
      const action = e.target.getAttribute('data-action');
      const index = parseInt(e.target.getAttribute('data-index'));
      
      if (action === 'copy') {
        copyMessage(index);
      } else if (action === 'delete') {
        deleteMessage(index);
      }
    }
  });
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === '') {
      filteredMessages = [...allMessages];
      clearSearch.style.display = 'none';
    } else {
      filteredMessages = allMessages.filter(message => 
        message.text.toLowerCase().includes(query)
      );
      clearSearch.style.display = 'block';
    }
    
    renderMessages();
    
    // Show/hide empty state based on filtered results
    const emptyState = document.getElementById('emptyState');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (filteredMessages.length === 0 && allMessages.length > 0) {
      emptyState.style.display = 'block';
      emptyState.querySelector('h2').textContent = 'No results found';
      emptyState.querySelector('p').textContent = `No messages match "${query}"`;
      messagesContainer.style.display = 'none';
    } else if (filteredMessages.length > 0) {
      emptyState.style.display = 'none';
      messagesContainer.style.display = 'block';
    }
  });
  
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.style.display = 'none';
    filteredMessages = [...allMessages];
    renderMessages();
    
    const emptyState = document.getElementById('emptyState');
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (allMessages.length === 0) {
      emptyState.style.display = 'block';
      emptyState.querySelector('h2').textContent = 'No saved messages';
      emptyState.querySelector('p').textContent = 'Messages you save from ChatGPT will appear here';
      messagesContainer.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      messagesContainer.style.display = 'block';
    }
  });
}

async function copyMessage(index) {
  try {
    const result = await chrome.storage.local.get(['savedMessages']);
    const savedMessages = result.savedMessages || [];
    
    if (index >= 0 && index < savedMessages.length) {
      const message = savedMessages[index];
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message.text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = message.text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      showNotification('Message copied to clipboard');
    }
  } catch (error) {
    console.error('Error copying message:', error);
    showError('Failed to copy message');
  }
}

async function deleteMessage(index) {
  try {
    const result = await chrome.storage.local.get(['savedMessages']);
    const savedMessages = result.savedMessages || [];
    
    if (index >= 0 && index < savedMessages.length) {
      if (confirm('Are you sure you want to delete this message?')) {
        savedMessages.splice(index, 1);
        
        await chrome.storage.local.set({ savedMessages });
        await loadSavedMessages(); // Reload the page
        
        showNotification('Message deleted');
      }
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    showError('Failed to delete message');
  }
}

async function exportAllMessages() {
  try {
    const result = await chrome.storage.local.get(['savedMessages']);
    const savedMessages = result.savedMessages || [];
    
    if (savedMessages.length === 0) {
      showNotification('No messages to export');
      return;
    }
    
    // Create export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalMessages: savedMessages.length,
      messages: savedMessages.map(msg => ({
        text: msg.text,
        timestamp: msg.timestamp,
        url: msg.url
      }))
    };
    
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-messages-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Messages exported successfully');
  } catch (error) {
    console.error('Error exporting messages:', error);
    showError('Failed to export messages');
  }
}

async function clearAllMessages() {
  try {
    if (confirm('Are you sure you want to delete ALL saved messages? This action cannot be undone.')) {
      await chrome.storage.local.remove(['savedMessages']);
      await loadSavedMessages(); // Reload the page
      showNotification('All messages cleared');
    }
  } catch (error) {
    console.error('Error clearing messages:', error);
    showError('Failed to clear messages');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10a37f;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showError(message) {
  // Create error notification
  const notification = document.createElement('div');
  notification.className = 'notification error';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc2626;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Export functions for potential use
window.SavedMessages = {
  loadSavedMessages,
  copyMessage,
  deleteMessage,
  exportAllMessages,
  clearAllMessages
};
