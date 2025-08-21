(function () {
    const $ = (sel) => document.querySelector(sel);
  
    const $type = $("#ruleType");
    const $match = $("#match");
    const $rewriteTo = $("#rewriteTo");
    const $headersJson = $("#headersJson");
    const $mockJson = $("#mockJson");
    const $mockStatus = $("#mockStatus");
    const $mockHeaders = $("#mockHeaders");
    const $rules = $("#rules");
    const $enabled = $("#enabledToggle");
  
    const $rewriteFields = $("#rewriteFields");
    const $headersFields = $("#headersFields");
    const $mockFields = $("#mockFields");
  
    const uid = () => Math.random().toString(36).slice(2);
  
    function renderRule(r) {
      const el = document.createElement("div");
      el.className = "rule";
      el.innerHTML = `
        <div class="row" style="justify-content: space-between">
          <div>
            <span class="tag">${r.type}</span>
            <span class="mono">${escapeHtml(r.match)}</span>
          </div>
          <div class="row">
            <label class="row" style="gap:6px"><span class="muted">on</span>
              <input data-id="${r.id}" class="toggle" type="checkbox" ${
        r.enabled ? "checked" : ""
      }/>
            </label>
            <button data-id="${r.id}" class="delete">Delete</button>
          </div>
        </div>
        ${
          r.type === "rewrite"
            ? `<div class="muted">→ <span class="mono">${escapeHtml(
                r.rewriteTo || ""
              )}</span></div>`
            : ""
        }
        ${
          r.type === "headers"
            ? `<div class="muted">headers: <span class="mono">${escapeHtml(
                JSON.stringify(r.headers || {})
              )}</span></div>`
            : ""
        }
        ${
          r.type === "mock"
            ? `<div class="muted">mock: <span class="mono">${escapeHtml(
                JSON.stringify(r.mock || {})
              )}</span></div>`
            : ""
        }
      `;
      return el;
    }
  
    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, (c) => {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }
  
    document.addEventListener("DOMContentLoaded", () => {
      function showFields() {
        const t = $type.value;
        $rewriteFields.style.display = t === "rewrite" ? "block" : "none";
        $headersFields.style.display = t === "headers" ? "block" : "none";
        $mockFields.style.display = t === "mock" ? "block" : "none";
      }
  
      async function sync() {
        const { ai_rules = [], ai_enabled = true } = await chrome.storage.local.get([
          "ai_rules",
          "ai_enabled",
        ]);
        $rules.innerHTML = "";
        for (const r of ai_rules) $rules.appendChild(renderRule(r));
        $enabled.checked = !!ai_enabled;
      }
  
      $type.addEventListener("change", showFields);
  
      document.addEventListener("click", async (e) => {
        const t = e.target;
  
        if (t.matches("#addRule")) {
          const type = $type.value;
          const match = $match.value.trim();
          if (!match) return alert("Match pattern is required");
  
          const rule = { id: uid(), enabled: true, type, match };
  
          if (type === "rewrite") {
            rule.rewriteTo = $rewriteTo.value.trim();
            if (!rule.rewriteTo) return alert("Rewrite to is required");
          } else if (type === "headers") {
            try {
              rule.headers = JSON.parse($headersJson.value || "{}");
            } catch {
              return alert("Invalid headers JSON");
            }
          } else if (type === "mock") {
            try {
              rule.mock = JSON.parse($mockJson.value || "{}");
            } catch {
              return alert("Invalid mock JSON");
            }
            rule.status = Number($mockStatus.value || "200");
            try {
              rule.responseHeaders = $mockHeaders.value
                ? JSON.parse($mockHeaders.value)
                : {};
            } catch {
              return alert("Invalid response headers JSON");
            }
          }
  
          const { ai_rules = [] } = await chrome.storage.local.get(["ai_rules"]);
          ai_rules.push(rule);
          await chrome.storage.local.set({ ai_rules });
          await sync();
          $match.value =
            $rewriteTo.value =
            $headersJson.value =
            $mockJson.value =
            $mockStatus.value =
            $mockHeaders.value =
              "";
        }
  
        if (t.matches(".delete")) {
          const id = t.getAttribute("data-id");
          const { ai_rules = [] } = await chrome.storage.local.get(["ai_rules"]);
          const next = ai_rules.filter((r) => r.id !== id);
          await chrome.storage.local.set({ ai_rules: next });
          await sync();
        }
  
        if (t.matches(".toggle")) {
          const id = t.getAttribute("data-id");
          const { ai_rules = [] } = await chrome.storage.local.get(["ai_rules"]);
          const next = ai_rules.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          );
          await chrome.storage.local.set({ ai_rules: next });
          await sync();
        }
  
        if (t.matches("#exportBtn")) {
          const { ai_rules = [] } = await chrome.storage.local.get(["ai_rules"]);
          const blob = new Blob([JSON.stringify(ai_rules, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "api-interceptor-rules.json";
          a.click();
          URL.revokeObjectURL(url);
        }
  
        if (t.matches("#importBtn")) {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/json";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const text = await file.text();
            try {
              const rules = JSON.parse(text);
              if (!Array.isArray(rules))
                throw new Error("Invalid file: expected an array");
              await chrome.storage.local.set({ ai_rules: rules });
              await sync();
            } catch (e) {
              alert("Import failed: " + e.message);
            }
          };
          input.click();
        }
  
        if (t.matches("#clearBtn")) {
          await chrome.storage.local.set({ ai_rules: [] });
          await sync();
        }
      });
  
      $enabled.addEventListener("change", async (e) => {
        await chrome.storage.local.set({ ai_enabled: e.target.checked });
        await sync();
      });
  
      sync();
      showFields();
    });
  })();
  