(function () {
    if (window.__API_INTERCEPTOR_INSTALLED__) return
    window.__API_INTERCEPTOR_INSTALLED__ = true
    
    
    let ENABLED = true
    /** @type {Array<any>} */
    let RULES = []
    
    
    const log = (kind, data) => {
    const detail = { ts: Date.now(), kind, ...data }
    window.dispatchEvent(new CustomEvent('AI_LOG', { detail }))
    }
    
    
    // Parse a match string which may be a literal substring or /regex/flags
    function makeMatcher(match) {
    const str = String(match)
    if (str.startsWith('/') && str.lastIndexOf('/') > 0) {
    const last = str.lastIndexOf('/')
    const body = str.slice(1, last)
    const flags = str.slice(last + 1)
    try { const rx = new RegExp(body, flags); return (url) => rx.test(url) } catch {}
    }
    return (url) => url.includes(str)
    }
    
    
    function replaceUrlByPattern(url, pattern, to) {
    const str = String(pattern)
    if (str.startsWith('/') && str.lastIndexOf('/') > 0) {
    const last = str.lastIndexOf('/')
    const body = str.slice(1, last)
    const flags = str.slice(last + 1)
    try { const rx = new RegExp(body, flags); return url.replace(rx, to) } catch { return url }
    }
    // simple substring replacement
    return url.split(str).join(to)
    }
    
    
    async function buildRequest(input, init) {
    let url = typeof input === 'string' ? input : input.url
    let reqInit = init ? { ...init } : {}
    
    
    // Normalize headers to be mutable
    const headers = new Headers((typeof input !== 'string' && input.headers) || init?.headers || {})
    
    
    for (const r of RULES) {
    if (!ENABLED || !r.enabled) continue
    const match = makeMatcher(r.match)
    if (!match(url)) continue
    
    
    if (r.type === 'block') {
    // Return a synthetic blocked response
    return { blocked: true, response: new Response('', { status: 403, statusText: 'Blocked by API Interceptor' }) }
    }
    
    
    if (r.type === 'rewrite' && r.rewriteTo) {
    const newUrl = replaceUrlByPattern(url, r.match, r.rewriteTo)
    url = newUrl
    }
    
    
    if (r.type === 'headers' && r.headers) {
    for (const [k, v] of Object.entries(r.headers)) {
    if (v === null || v === undefined) headers.delete(k)
    else headers.set(k, String(v))
    }
    }
    
    
    if (r.type === 'mock') {
    const resHeaders = new Headers({ 'content-type': 'application/json', ...(r.responseHeaders || {}) })
    const body = JSON.stringify(r.mock ?? {})
    const response = new Response(body, { status: Number(r.status || 200), headers: resHeaders })
    log('mocked', { url, rule: r })
    return { mocked: true, response }
    }
    }
    
    
    reqInit.headers = headers
    return { url, init: reqInit }
    }
    
    
    const _fetch = window.fetch.bind(window)
    window.fetch = async function (input, init) {
    try {
    const built = await buildRequest(input, init)
    if (built.blocked || built.mocked) return built.response
    const res = await _fetch(built.url ?? input, built.init ?? init)
    
    
    // TODO: future: response rewrite rules
    log('fetched', { url: built.url ?? (typeof input === 'string' ? input : input.url), status: res.status })
    return res
    } catch (err) {
    log('error', { message: String(err) })
    throw err
    }
    }
    
    
    // Receive rules from the content script
    window.addEventListener('AI_RULES_UPDATE', (e) => {
    const { enabled, rules } = e.detail || {}
    ENABLED = !!enabled
    RULES = Array.isArray(rules) ? rules : []
    log('rules_update', { count: RULES.length, enabled: ENABLED })
    })
    
    
    log('installed', {})
    })()