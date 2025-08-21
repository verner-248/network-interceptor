const tbody = document.getElementById("requests");

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "API_REQUEST") {
    const { method, url, statusCode } = msg.payload;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${method}</td>
      <td class="url" title="${url}">${url}</td>
      <td>${statusCode || "-"}</td>
    `;
    tbody.prepend(tr); // add latest on top
  }
});
