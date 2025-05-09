// Combined message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'changeLanguage') {
    chrome.storage.sync.set({ language: request.language }, () => {
      sendResponse({ success: true });
    });
    return true; // Indicates that the response will be sent asynchronously
  }
  
  if (request.action === 'reloadLanguage') {
    chrome.i18n.getAcceptLanguages(languages => {
      chrome.i18n.getUILanguage();
      sendResponse({ success: true });
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});

chrome.tabs.onCreated.addListener(async (newTab) => {
  if (newTab.id === undefined) {
    console.error("New tab created without an ID.");
    return;
  }

  const items = await chrome.storage.sync.get({
    position: 'right', 
    language: 'en'
  });
  const { position: positionSetting } = items;

  if (positionSetting === 'end') {
    return;
  }

  let sourceTab = null;
  if (newTab.openerTabId) {
    try {
      sourceTab = await chrome.tabs.get(newTab.openerTabId);
      if (sourceTab && sourceTab.windowId !== newTab.windowId) {
        sourceTab = null;
      }
    } catch (error) {
      sourceTab = null;
    }
  }

  if (!sourceTab) {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      windowId: newTab.windowId
    });
    sourceTab = activeTab;
  }

  if (sourceTab) {
    let targetIndex = -1;
    switch (positionSetting) {
      case 'right':
        targetIndex = sourceTab.index + 1;
        break;
      case 'left':
        targetIndex = sourceTab.index;
        break;
      case 'start':
        targetIndex = 0;
        break;
    }

    if (targetIndex !== -1 && newTab.index !== targetIndex) {
      try {
        await chrome.tabs.move(newTab.id, { index: targetIndex });
      } catch (error) {
        if (!error.message.includes("No tab with id") && !error.message.includes("Cannot move a tab")) {
            console.error(`Failed to move tab ${newTab.id} to index ${targetIndex}:`, error);
        }
      }
    }
  } else {
    // console.warn for new tab
  }
});

// Listener for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-new-tab-far-right") {
    const newTab = await chrome.tabs.create({}); // Create a new tab
    if (newTab && newTab.id !== undefined) {
      try {
        await chrome.tabs.move(newTab.id, { index: -1 }); // Move it to the far right
      } catch (error) {
        console.error("Failed to move new tab to far right for command:", error);
      }
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.enable();
  chrome.action.setIcon({
    path: {
      16: "images/icon16.png",
      32: "images/icon32.png",
      48: "images/icon48.png",
      128: "images/icon128.png"
    }
  });
  chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
  });
});