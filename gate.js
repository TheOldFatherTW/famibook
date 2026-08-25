(function () {
  const KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;
  const origin = () => String(window.VAULT_ORIGIN || "").replace(/\/$/, "");

  function api(path, key, opts) {
    const url = origin() + path + (path.indexOf("?") >= 0 ? "&" : "?") + "k=" + encodeURIComponent(key);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 8000);
    return fetch(url, Object.assign({ signal: ctrl.signal }, opts || {}))
      .then((res) => res.json().then((j) => ({ res: res, j: j })).catch(() => ({ res: res, j: null })))
      .finally(() => clearTimeout(t));
  }

  function savePersonal(token) {
    try { localStorage.setItem("famibook.viewKey", token); } catch (e) {}
    try {
      const path = location.pathname.replace(/[^/]+$/, "") || "/";
      document.cookie = "famibook.viewKey=" + encodeURIComponent(token) + "; path=" + path + "; max-age=31536000; SameSite=Lax";
    } catch (e) {}
  }

  function pinKey(token) {
    if (typeof navigator.standalone === "boolean" && !navigator.standalone) {
      const pin = location.pathname + "?k=" + encodeURIComponent(token) + "#k=" + encodeURIComponent(token);
      if (location.pathname + location.search + location.hash !== pin) {
        history.replaceState({}, "", pin);
      }
    }
  }

  function currentKey() {
    const q = new URLSearchParams(location.search).get("k") || "";
    let h = "";
    try {
      const raw = (location.hash || "").replace(/^#/, "");
      h = raw.indexOf("k=") === 0 ? decodeURIComponent((raw.slice(2).split("&")[0] || "").replace(/\+/g, " ")) : (new URLSearchParams(raw).get("k") || "");
    } catch (e) {}
    let stored = "";
    try { stored = localStorage.getItem("famibook.viewKey") || ""; } catch (e) {}
    let cookie = "";
    try {
      const m = document.cookie.match(/(?:^|; )famibook\.viewKey=([^;]*)/);
      cookie = m ? decodeURIComponent(m[1]) : "";
    } catch (e) {}
    const fromUrl = KEY_RE.test(q) ? q : KEY_RE.test(h) ? h : "";
    return fromUrl || (KEY_RE.test(stored) ? stored : "") || (KEY_RE.test(cookie) ? cookie : "");
  }

  function blockWebChrome() {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("selectstart", (e) => {
      if (e.target && e.target.closest && e.target.closest("input, textarea")) return;
      e.preventDefault();
    });
    document.addEventListener("gesturestart", (e) => e.preventDefault());
  }

  function bindKeyboard() {
    const vv = window.visualViewport;
    if (!vv) return;
    function apply() {
      const kb = Math.max(0, window.innerHeight - vv.height);
      document.documentElement.style.setProperty("--kb", kb + "px");
      document.documentElement.classList.toggle("kb-up", kb > 80);
    }
    vv.addEventListener("resize", apply);
    apply();
  }

  function needsSafari() {
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
    return ios && !safari && !window.navigator.standalone;
  }

  window.FamiGate = {
    KEY_RE: KEY_RE,
    origin: origin,
    api: api,
    savePersonal: savePersonal,
    pinKey: pinKey,
    currentKey: currentKey,
    blockWebChrome: blockWebChrome,
    bindKeyboard: bindKeyboard,
    needsSafari: needsSafari,
  };
})();
