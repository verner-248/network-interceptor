// content/clickListener.js
document.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "capture_requests" });
  });
  