# Memoria Chrome Extension

A Chrome extension that adds a "Save to Memoria" button below each ChatGPT assistant answer, allowing you to quickly save question-answer interactions to your Memoria knowledge base.

## Features

- **One-click save**: Save ChatGPT interactions (question + answer) to Memoria
- **Automatic detection**: Automatically detects new ChatGPT messages and adds buttons
- **Minimalistic UI**: Clean, unobtrusive button design that matches Memoria's aesthetic
- **Success notifications**: Visual feedback when interactions are saved
- **Quick access**: Extension popup opens Memoria app directly

## Installation

### Load as Unpacked Extension (Development)

1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable Developer Mode** by toggling the switch in the top-right corner
3. **Click "Load unpacked"** and select the `chrome-extension` folder
4. **Pin the extension** to your toolbar for easy access

## Usage

1. **Navigate to ChatGPT**: Go to [chat.openai.com](https://chat.openai.com) or [chatgpt.com](https://chatgpt.com)
2. **Start a conversation**: Ask ChatGPT a question
3. **Save interactions**: After ChatGPT responds, you'll see a "Save to Memoria" button below the answer
4. **Click the button**: The interaction (question + answer) will be saved to localStorage
5. **Open Memoria**: Click the extension icon and select "Open Memoria App" to view your saved interactions
6. **Import in Memoria**: The Memoria app will automatically detect and offer to import the saved interaction

## How It Works

1. **Content Script Injection**: The extension injects a content script into ChatGPT pages
2. **DOM Monitoring**: Uses a MutationObserver to detect new ChatGPT assistant messages
3. **Button Injection**: Automatically adds a save button below each assistant response
4. **Data Extraction**: Extracts both the user's question and the assistant's answer
5. **Local Storage**: Saves the interaction to `localStorage` in a format that Memoria can import
6. **App Integration**: The Memoria app polls `localStorage` and automatically imports new interactions

## Data Format

The extension saves data to `localStorage` with the key `memoriaExtensionData`:

```javascript
{
  qaPairs: [{
    question: string,
    answer: string,
    questionId: string,
    answerId: string
  }],
  title: string,
  url: string,
  timestamp: number
}
```

## Requirements

- **Memoria App**: The Memoria app must be running at `http://localhost:5173` (development) or your production URL
- **Chrome Browser**: Chrome or Chromium-based browser (Edge, Brave, etc.)
- **ChatGPT Access**: Active access to chat.openai.com or chatgpt.com

## Troubleshooting

### Button Not Appearing

1. **Refresh the page**: Sometimes the extension needs a page refresh to activate
2. **Check the console**: Open Developer Tools (F12) and look for any error messages
3. **Verify permissions**: Ensure the extension has permission to run on ChatGPT
4. **Reload the extension**: Go to `chrome://extensions/` and click the reload icon

### Interactions Not Saving

1. **Check localStorage**: Open Developer Tools → Application → Local Storage → chat.openai.com
2. **Look for `memoriaExtensionData`**: Verify the data is being saved
3. **Check console errors**: Look for any JavaScript errors in the console

### Memoria App Not Detecting Data

1. **Verify app is running**: Make sure Memoria is running at `http://localhost:5173`
2. **Check ExtensionDataReceiver**: The app should automatically poll `localStorage` every 2 seconds
3. **Refresh the app**: Try refreshing the Memoria app page
4. **Check data format**: Verify the data in `localStorage` matches the expected format

## Development

### File Structure

```
chrome-extension/
├── manifest.json      # Extension configuration
├── content.js         # Content script (button injection & data extraction)
├── content.css        # Button styling
├── popup.html         # Extension popup UI
├── popup.js           # Popup functionality
├── popup.css          # Popup styling
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

### Making Changes

1. **Edit files** in the `chrome-extension` directory
2. **Reload the extension** in `chrome://extensions/`
3. **Refresh ChatGPT** to see changes

## Permissions

This extension requires the following permissions:

- `activeTab`: To interact with the current ChatGPT tab
- `storage`: To save data locally (though we use localStorage, not chrome.storage)
- `host_permissions`: To run on ChatGPT domains

## Browser Compatibility

- **Chrome**: Full support (Manifest V3)
- **Edge**: Should work (Chromium-based)
- **Firefox**: Would require Manifest V2 conversion

## License

This project is part of the Memoria application.
