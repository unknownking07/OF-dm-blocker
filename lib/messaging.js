(function (root) {
  root.__ofblock = root.__ofblock || {};

  function send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        resolve({ error: e && e.message ? e.message : String(e) });
      }
    });
  }

  function broadcastToTabs(msg) {
    if (!chrome.tabs || !chrome.tabs.query) return;
    chrome.tabs.query(
      { url: ["https://x.com/messages/*", "https://twitter.com/messages/*"] },
      (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, msg, () => {
            void chrome.runtime.lastError;
          });
        });
      }
    );
  }

  root.__ofblock.messaging = { send, broadcastToTabs };
})(typeof globalThis !== "undefined" ? globalThis : self);
