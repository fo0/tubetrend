// Open TubeTrend in a new tab when the extension icon is clicked.
// If a TubeTrend tab already exists, focus it instead of opening a duplicate.
chrome.action.onClicked.addListener(async () => {
  const extensionUrl = chrome.runtime.getURL("index.html");
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => tab.url && tab.url.startsWith(extensionUrl));

  if (existing && existing.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId !== undefined) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: extensionUrl });
  }
});
