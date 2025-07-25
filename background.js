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

  // Add a small delay to let Chrome finish any initial tab setup
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    // Re-fetch tab info to get the most current state
    const currentTab = await chrome.tabs.get(newTab.id);

    // Skip processing if this looks like a restored tab or system tab
    if (shouldSkipTabProcessing(currentTab)) {
      return;
    }

    const items = await chrome.storage.sync.get({
      position: 'right',
      language: 'en'
    });
    const { position: positionSetting } = items;

    if (positionSetting === 'end') {
      // For 'end' position, move to the rightmost position
      try {
        await chrome.tabs.move(currentTab.id, { index: -1 });
      } catch (error) {
        if (!error.message.includes("No tab with id") && !error.message.includes("Cannot move a tab")) {
          console.error(`Failed to move tab ${currentTab.id} to end:`, error);
        }
      }
      return;
    }

    let sourceTab = null;
    if (currentTab.openerTabId) {
      try {
        sourceTab = await chrome.tabs.get(currentTab.openerTabId);
        if (sourceTab && sourceTab.windowId !== currentTab.windowId) {
          sourceTab = null;
        }
      } catch (error) {
        sourceTab = null;
      }
    }

    if (!sourceTab) {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        windowId: currentTab.windowId
      });
      sourceTab = activeTab;
    }

    if (sourceTab && sourceTab.id !== currentTab.id) {
      await moveTabSafely(currentTab, sourceTab, positionSetting);
    }
  } catch (error) {
    // If we can't get the tab, it might have been closed already
    if (!error.message.includes("No tab with id")) {
      console.error(`Error processing new tab ${newTab.id}:`, error);
    }
  }
});

// Tab close behavior listener
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    // Get the close tab behavior setting
    const { closeTabBehavior = 'left' } = await chrome.storage.sync.get('closeTabBehavior');

    // Skip if using browser default (right)
    if (closeTabBehavior === 'right') {
      return;
    }

    // Don't interfere if the whole window is closing
    if (removeInfo.isWindowClosing) {
      return;
    }

    await handleTabClose(tabId, removeInfo.windowId, closeTabBehavior);
  } catch (error) {
    console.error('Error handling tab close:', error);
  }
});

/**
 * Determines if we should skip processing a tab to avoid interfering with browser operations
 * @param {chrome.tabs.Tab} tab - The tab to check
 * @returns {boolean} - True if we should skip processing this tab
 */
function shouldSkipTabProcessing(tab) {
  // Skip if tab has a specific URL that suggests it's being restored
  if (tab.url && tab.url !== 'chrome://newtab/' && !tab.openerTabId) {
    return true;
  }

  // Skip chrome:// URLs (except newtab)
  if (tab.url && tab.url.startsWith('chrome://') && tab.url !== 'chrome://newtab/') {
    return true;
  }

  // Skip extension pages
  if (tab.url && (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://'))) {
    return true;
  }

  // Skip if tab is pinned (usually system or important tabs)
  if (tab.pinned) {
    return true;
  }

  return false;
}

/**
 * Handles tab close behavior based on user settings
 * @param {number} closedTabId - ID of the closed tab
 * @param {number} windowId - ID of the window containing the closed tab
 * @param {string} behavior - Close behavior setting ('left', 'smart')
 */
async function handleTabClose(closedTabId, windowId, behavior) {
  try {
    // Get all tabs in the window
    const tabs = await chrome.tabs.query({ windowId: windowId });

    if (tabs.length === 0) {
      return; // No tabs left
    }

    // Find the currently active tab
    const activeTab = tabs.find(tab => tab.active);
    if (!activeTab) {
      return; // No active tab found
    }

    // If the active tab is not the one we just closed, don't interfere
    // (This means Chrome already switched to another tab)
    if (activeTab.id === closedTabId) {
      return; // This shouldn't happen, but just in case
    }

    let targetTab = null;

    if (behavior === 'smart') {
      targetTab = await findSmartTargetTab(tabs, activeTab);
    } else if (behavior === 'left') {
      targetTab = findLeftTab(tabs, activeTab);
    }

    if (targetTab && targetTab.id !== activeTab.id) {
      await chrome.tabs.update(targetTab.id, { active: true });
    }
  } catch (error) {
    console.error('Error in handleTabClose:', error);
  }
}

/**
 * Finds the target tab for smart switching
 * Priority: Parent tab → Left tab → Right tab
 * @param {Array} tabs - All tabs in the window
 * @param {Object} activeTab - Currently active tab
 * @returns {Object|null} - Target tab to switch to
 */
async function findSmartTargetTab(tabs, activeTab) {
  // Try to find parent tab (opener)
  if (activeTab.openerTabId) {
    const parentTab = tabs.find(tab => tab.id === activeTab.openerTabId);
    if (parentTab) {
      return parentTab;
    }
  }

  // Fall back to left tab
  const leftTab = findLeftTab(tabs, activeTab);
  if (leftTab) {
    return leftTab;
  }

  // Fall back to right tab
  return findRightTab(tabs, activeTab);
}

/**
 * Finds the tab to the left of the active tab
 * @param {Array} tabs - All tabs in the window
 * @param {Object} activeTab - Currently active tab
 * @returns {Object|null} - Left tab or null if none exists
 */
function findLeftTab(tabs, activeTab) {
  // Sort tabs by index
  const sortedTabs = tabs.sort((a, b) => a.index - b.index);
  const activeIndex = sortedTabs.findIndex(tab => tab.id === activeTab.id);

  if (activeIndex > 0) {
    return sortedTabs[activeIndex - 1];
  }

  return null;
}

/**
 * Finds the tab to the right of the active tab
 * @param {Array} tabs - All tabs in the window
 * @param {Object} activeTab - Currently active tab
 * @returns {Object|null} - Right tab or null if none exists
 */
function findRightTab(tabs, activeTab) {
  // Sort tabs by index
  const sortedTabs = tabs.sort((a, b) => a.index - b.index);
  const activeIndex = sortedTabs.findIndex(tab => tab.id === activeTab.id);

  if (activeIndex < sortedTabs.length - 1) {
    return sortedTabs[activeIndex + 1];
  }

  return null;
}

/**
 * Safely moves a tab to the target position
 * Uses the original simple logic that worked before
 * @param {chrome.tabs.Tab} newTab - The tab to move
 * @param {chrome.tabs.Tab} sourceTab - The reference tab for positioning
 * @param {string} positionSetting - The position setting ('right', 'left', 'start')
 */
async function moveTabSafely(newTab, sourceTab, positionSetting) {
  try {
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
      await chrome.tabs.move(newTab.id, { index: targetIndex });
    }
  } catch (error) {
    if (!error.message.includes("No tab with id") && !error.message.includes("Cannot move a tab")) {
      console.error(`Failed to move tab ${newTab.id} to index ${targetIndex}:`, error);
    }
  }
}



// Listener for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-new-tab-far-right") {
    try {
      const newTab = await chrome.tabs.create({}); // Create a new tab
      if (newTab && newTab.id !== undefined) {
        // Move it to the far right (this should work regardless of groups)
        await chrome.tabs.move(newTab.id, { index: -1 });
      }
    } catch (error) {
      console.error("Failed to create or move new tab to far right for command:", error);
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