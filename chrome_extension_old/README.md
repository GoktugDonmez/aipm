# ChatGPT Button Extension

A Chrome extension that adds custom buttons next to ChatGPT answer bubbles, allowing you to copy, save, and share responses easily.

## Features

- **📋 Copy Button**: Copy ChatGPT responses to clipboard with one click
- **💾 Save Button**: Save responses for later reference (stored locally)
- **🔗 Share Button**: Share responses using the native share API
- **💾 Saved Messages**: View and manage all saved responses
- **⚙️ Settings**: Customize notification preferences and behavior
- **🌙 Dark Mode**: Automatic dark mode support

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. **Download or Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** and select the folder containing the extension files
5. **Pin the extension** to your toolbar for easy access

### Method 2: Package and Install

1. **Package the extension**:
   - Go to `chrome://extensions/`
   - Click "Pack extension" in developer mode
   - Select the extension folder
   - This will create a `.crx` file

2. **Install the packaged extension**:
   - Drag and drop the `.crx` file into Chrome
   - Or go to `chrome://extensions/` and enable developer mode, then drag the `.crx` file

## Usage

1. **Navigate to ChatGPT**: Go to [chat.openai.com](https://chat.openai.com) or [chatgpt.com](https://chatgpt.com)
2. **Start a conversation**: Ask ChatGPT a question
3. **Look for buttons**: After ChatGPT responds, you'll see three buttons appear below the response:
   - **📋 Copy**: Copies the response text to your clipboard
   - **💾 Save**: Saves the response for later viewing
   - **🔗 Share**: Opens the native share dialog (if available)

4. **View saved messages**: Click the extension icon and select "View Saved Messages" to see all your saved responses

## File Structure

```
chrome_extension/
├── manifest.json          # Extension configuration
├── content.js             # Main content script
├── content.css            # Button styling
├── popup.html             # Extension popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── saved.html             # Saved messages page
├── saved.css              # Saved messages styling
├── saved.js               # Saved messages functionality
├── icons/                 # Extension icons (placeholder)
└── README.md              # This file
```

## How It Works

1. **Content Script Injection**: The extension injects a content script into ChatGPT pages
2. **DOM Monitoring**: Uses a MutationObserver to detect new ChatGPT responses
3. **Button Injection**: Automatically adds buttons to each assistant response
4. **Local Storage**: Saves messages using Chrome's local storage API
5. **Cross-page Communication**: Uses Chrome's messaging API for popup communication

## Customization

### Adding New Buttons

Edit the `BUTTON_CONFIG` object in `content.js`:

```javascript
const BUTTON_CONFIG = {
  buttons: [
    {
      id: 'your-button-id',
      text: 'Your Button Text',
      className: 'chatgpt-btn your-button-class',
      action: 'yourAction'
    }
  ]
};
```

Then add the corresponding action handler in the `handleButtonClick` function.

### Styling

- **Button styles**: Modify `content.css`
- **Popup styles**: Modify `popup.css`
- **Saved messages styles**: Modify `saved.css`

## Permissions

This extension requires the following permissions:

- `activeTab`: To interact with the current ChatGPT tab
- `storage`: To save messages locally
- `host_permissions`: To run on ChatGPT domains

## Browser Compatibility

- **Chrome**: Full support (Manifest V3)
- **Edge**: Should work (Chromium-based)
- **Firefox**: Would require Manifest V2 conversion

## Troubleshooting

### Buttons Not Appearing

1. **Refresh the page**: Sometimes the extension needs a page refresh to activate
2. **Check the console**: Open Developer Tools (F12) and look for any error messages
3. **Verify permissions**: Ensure the extension has permission to run on ChatGPT
4. **Update the extension**: Reload the extension in `chrome://extensions/`

### Messages Not Saving

1. **Check storage**: Open Developer Tools → Application → Storage → Local Storage
2. **Clear storage**: Try clearing the extension's storage and saving again
3. **Check permissions**: Ensure the extension has storage permissions

### Styling Issues

1. **Clear cache**: Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check CSS conflicts**: The extension styles might conflict with ChatGPT's CSS
3. **Update selectors**: ChatGPT's DOM structure might have changed

## Development

### Local Development

1. **Make changes** to the extension files
2. **Reload the extension** in `chrome://extensions/`
3. **Refresh ChatGPT** to see changes

### Testing

1. **Test on different ChatGPT layouts**: The extension should work across different ChatGPT interfaces
2. **Test edge cases**: Empty responses, very long responses, special characters
3. **Test browser compatibility**: Different Chrome versions, incognito mode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have suggestions:

1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Contact the maintainer

## Version History

- **v1.0.0**: Initial release with copy, save, and share functionality
