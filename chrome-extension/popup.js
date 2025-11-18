// Memoria Extension Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const openAppBtn = document.getElementById('openAppBtn');
  
  if (openAppBtn) {
    openAppBtn.addEventListener('click', () => {
      // Open Memoria app in a new tab
      chrome.tabs.create({ url: 'http://localhost:5173' });
    });
  }
});
