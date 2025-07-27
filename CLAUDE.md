# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TabMagnet is a Chrome extension (Manifest V3) that manages new tab positioning and tab close behavior with multilingual support. It's a browser extension that doesn't require traditional build tools - it runs directly in Chrome.

## Development Commands

This is a Chrome extension project with no build system. Development involves:

```bash
# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"  
# 3. Click "Load unpacked"
# 4. Select this repository directory

# Test extension locally
# No specific test runner - manual testing in Chrome

# No linting/formatting commands defined
# No package.json or build scripts
```

## Architecture

### Core Components

**background.js** - Service worker that handles:
- Tab creation events (`chrome.tabs.onCreated`) 
- Tab positioning logic based on user settings
- Tab close behavior (`chrome.tabs.onRemoved`)
- Language change messaging
- Keyboard shortcut handling (`chrome.commands.onCommand`)

**options.js/options.html/options.css** - Options page that provides:
- New tab position settings (right/left/start/end)
- Tab close behavior settings (left/right/smart)
- Language selection (en/zh_CN/ja)
- Chrome shortcuts customization links

### Key Features

1. **Tab Positioning**: Moves new tabs relative to current tab or to absolute positions
2. **Tab Close Behavior**: Controls which tab becomes active when closing tabs
3. **Smart Tab Filtering**: Avoids interfering with browser operations (chrome:// URLs, pinned tabs, etc.)
4. **Group Preservation**: Maintains Chrome tab groups when moving tabs
5. **Internationalization**: Uses Chrome i18n API with `_locales/` directory structure

### Extension Permissions

- `tabs`: Required for tab manipulation
- `storage`: For syncing user preferences
- `commands`: For keyboard shortcuts

### Message Flow

```
User Action → Options Page → chrome.storage.sync → Background Script → Chrome APIs
Language Change → options.js → background.js → chrome.storage.sync
```

### Important Implementation Details

- Uses `shouldSkipTabProcessing()` to avoid interfering with restored tabs, chrome:// URLs, and pinned tabs
- Implements safe tab movement with error handling for edge cases
- Language loading uses cache-busting for immediate UI updates
- Platform detection for Mac vs PC keyboard shortcuts
- Smart tab close behavior tries parent tab → left tab → right tab priority

## Testing

Manual testing required in Chrome:
1. Load unpacked extension
2. Test tab creation in different positions
3. Test tab close behavior with different settings  
4. Test language switching
5. Test keyboard shortcuts (Alt+Shift+2)

## Localization

Add new languages by:
1. Creating `_locales/{language_code}/messages.json`
2. Adding language option to `options.html` select element
3. Messages follow Chrome extension i18n format with `message` property