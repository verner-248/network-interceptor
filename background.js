(() => {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.storage.local.get(["ai_enabled", "ai_rules"], ({ ai_enabled, ai_rules }) => {
        const updates = {};
        if (typeof ai_enabled === "undefined") updates.ai_enabled = true;
        if (!Array.isArray(ai_rules)) updates.ai_rules = [];
        if (Object.keys(updates).length) chrome.storage.local.set(updates);
      });
    });
  
    // Capture ALL requests
    chrome.webRequest.onCompleted.addListener(
      (details) => {
        const payload = {
          method: details.method,
          url: details.url,
          statusCode: details.statusCode,
        };
  
        // Send to any open dashboard(s)
        chrome.runtime.sendMessage({ type: "API_REQUEST", payload });
      },
      { urls: ["<all_urls>"] }
    );
  
    // Optional: log messages from content scripts
    chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
      if (msg && msg.type === "AI_LOG") {
        console.log("[API-INT]", msg.payload);
      }
    });
  })();
  