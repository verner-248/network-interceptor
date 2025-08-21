(function () {
    // Inject the in-page hook so it runs with the page's JS context
    const s = document.createElement('script')
    s.src = chrome.runtime.getURL('content/inpageHook.js')
    s.type = 'text/javascript'
    s.setAttribute('data-origin', 'api-interceptor')
    ;(document.documentElement || document.head).appendChild(s)
    
    
    // Send current rules to the page
    async function pushRules() {
    const { ai_rules = [], ai_enabled = true } = await chrome.storage.local.get(["ai_rules", "ai_enabled"])
    window.dispatchEvent(new CustomEvent('AI_RULES_UPDATE', { detail: { enabled: ai_enabled, rules: ai_rules } }))
    }
    
    
    // Listen to storage changes and push updates
    chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.ai_rules || changes.ai_enabled) pushRules()
    })
    
    
    // Receive logs from the page and forward to background (optional)
    window.addEventListener('AI_LOG', (e) => {
    chrome.runtime.sendMessage({ type: 'AI_LOG', payload: e.detail })
    })
    
    
    // Initial push once DOM is ready
    if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pushRules)
    } else {
    pushRules()
    }
    })()