# Memoria Chrome Extension

Chrome extension to export ChatGPT conversations to Memoria.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension icon should appear in your toolbar

## Usage

1. Navigate to a ChatGPT conversation: https://chat.openai.com
2. Click the Memoria extension icon in your toolbar
3. Click "Extract QA Pairs" to scan the current conversation
4. Click "Send to App" to send the data to Memoria (make sure Memoria is running)

## Alternative: Floating Button

The extension also injects a floating button on ChatGPT pages. Click it to export the current conversation directly.

## Development

The extension uses:
- Content script (`content.js`) - runs on ChatGPT pages to extract QA pairs
- Background worker (`background.js`) - handles storage and messaging
- Popup (`popup.html/js`) - UI for manual export

## Note

This is a basic MVP implementation. The ChatGPT selectors may need updating if ChatGPT changes their UI structure.

