(function () {
  const hall = document.getElementById("hall");
  const statusEl = document.getElementById("status");
  const invitePanel = document.getElementById("invite-panel");
  const goBtn = document.getElementById("invite-go");
  const nameForm = document.getElementById("invite-name-form");
  const nameInput = document.getElementById("invite-name");
  const nameErr = document.getElementById("invite-name-err");
  const waitEl = document.getElementById("invite-wait");
  const waitBar = document.getElementById("invite-wait-bar");
  const safariNote = document.getElementById("invite-safari");
  const homeInstall = document.getElementById("home-install");
  const feed = document.getElementById("feed");
  const tagBoard = document.getElementById("tag-board");
  const cabHud = document.getElementById("cab-hud");
  const faceImg = document.getElementById("face-img");
  const readerName = document.getElementById("reader-name");
  const coverInput = document.getElementById("cover-input");
  const modeAll = document.getElementById("mode-all");
  const modeList = document.getElementById("mode-list");
  let settingsWrap = null;
  let settingsCatch = null;
  const GEAR =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 3.8l.6-1.3h3.6l.6 1.3 1.6.7 1.4-.5 2.5 2.5-.5 1.4.7 1.6 1.3.6v3.6l-1.3.6-.7 1.6.5 1.4-2.5 2.5-1.4-.5-1.6.7-.6 1.3h-3.6l-.6-1.3-1.6-.7-1.4.5-2.5-2.5.5-1.4-.7-1.6-1.3-.6v-3.6l1.3-.6.7-1.6-.5-1.4L6.6 4l1.4.5 1.6-.7z" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round"/><circle cx="12" cy="11.9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const CAMERA =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8" width="17" height="11.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 8l1.4-2.4h5.2L16 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.6" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';

  let key = "";
  let busy = false;
  let lastShelf = null;
  let mode = "list";
  let cwd = "";
  let offset = 0;
  const LIMIT = 40;
  const FIRST = 12;
  const THUMB_CAP = 6;
  const THUMB_CACHE = "famibook-thumbs-v2";
  let thumbGen = 0;
  let thumbActive = 0;
  const thumbWait = [];
  const blobUrls = [];
  let loadingMore = false;
  let total = 0;
  let catalog = {};

  function setBoot(on, text) {
    if (!hall) return;
    hall.classList.toggle("is-booting", !!on);
    hall.classList.toggle("with-feed", true);
    if (statusEl && text != null) statusEl.textContent = text;
  }

  function setCabRun(on) {
    const cover = document.querySelector("#cab-hud .cab-cover");
    if (cover) cover.classList.toggle("is-run", !!on);
  }

  function insButton(className, svg, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ins-icon " + className;
    btn.setAttribute("aria-label", label);
    btn.title = label;
    const ring = document.createElement("span");
    ring.className = "ins-ring";
    const face = document.createElement("span");
    face.className = "ins-face";
    face.innerHTML = svg;
    btn.appendChild(ring);
    btn.appendChild(face);
    return btn;
  }

  function jobBadge(svg) {
    const badge = document.createElement("span");
    badge.className = "ins-icon job-icon";
    badge.setAttribute("aria-hidden", "true");
    const ring = document.createElement("span");
    ring.className = "ins-ring";
    const face = document.createElement("span");
    face.className = "ins-face";
    face.innerHTML = svg;
    badge.appendChild(ring);
    badge.appendChild(face);
    return badge;
  }

  function setJobRun(entry, on) {
    if (!entry) return;
    entry.classList.toggle("is-run", !!on);
    entry.disabled = !!on;
    entry.setAttribute("aria-disabled", on ? "true" : "false");
    const badge = entry.querySelector(".ins-icon");
    if (badge) badge.classList.toggle("is-run", !!on);
  }

  function scrubLegacySettings() {
    const staleBtn = document.getElementById("gear-btn");
    if (staleBtn) staleBtn.remove();
    document.querySelectorAll(".gear-menu, #gear-menu").forEach(function (n) {
      n.remove();
    });
    Array.prototype.slice.call(document.querySelectorAll("button")).forEach(function (b) {
      if ((b.textContent || "").indexOf("清掉我的紀錄") >= 0) b.remove();
    });
  }

  function closeSettings() {
    const wrap = settingsWrap || document.getElementById("album-settings");
    if (!wrap) return;
    const menu = wrap.querySelector(".settings-menu") || document.querySelector(".settings-menu");
    const toggle = wrap.querySelector(".settings-toggle");
    if (menu) {
      menu.hidden = true;
      if (menu.parentNode !== wrap) wrap.appendChild(menu);
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.classList.remove("is-live");
    }
    if (settingsCatch) settingsCatch.hidden = true;
    document.documentElement.classList.remove("settings-open");
  }

  function ensureSettingsCatch() {
    if (settingsCatch && settingsCatch.isConnected) return settingsCatch;
    const catcher = document.createElement("div");
    catcher.className = "settings-catch";
    catcher.hidden = true;
    catcher.addEventListener("pointerdown", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    });
    catcher.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      closeSettings();
    });
    document.body.appendChild(catcher);
    settingsCatch = catcher;
    return catcher;
  }

  function placeSettingsMenu(toggle, menu) {
    if (!toggle || !menu || menu.hidden) return;
    const box = toggle.getBoundingClientRect();
    const pad = 10;
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const vo = vv ? vv.offsetTop : 0;
    const vl = vv ? vv.offsetLeft : 0;
    const mw = menu.offsetWidth || 220;
    const mh = menu.offsetHeight || 200;
    let left = box.right - mw;
    if (left < vl + pad) left = vl + pad;
    if (left + mw > vl + vw - pad) left = Math.max(vl + pad, vl + vw - mw - pad);
    let top = box.bottom + 8;
    if (top + mh > vo + vh - pad) top = box.top - mh - 8;
    if (top < vo + pad) top = vo + pad;
    menu.style.position = "fixed";
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    menu.style.left = Math.round(left) + "px";
    menu.style.top = Math.round(top) + "px";
  }

  function openSettingsMenu(toggle, menu) {
    const catcher = ensureSettingsCatch();
    catcher.hidden = false;
    document.body.appendChild(catcher);
    document.body.appendChild(menu);
    menu.hidden = false;
    document.documentElement.classList.add("settings-open");
    requestAnimationFrame(function () {
      placeSettingsMenu(toggle, menu);
    });
  }

  function ensureSettings() {
    scrubLegacySettings();
    const host = document.querySelector("#cab-hud .cab-wrap");
    const existing = document.getElementById("album-settings");
    if (settingsWrap && settingsWrap.isConnected) {
      if (host && settingsWrap.parentNode !== host) host.appendChild(settingsWrap);
      return settingsWrap;
    }
    settingsWrap = existing && existing.isConnected ? existing : document.createElement("div");
    const wrap = settingsWrap;
    wrap.id = "album-settings";
    wrap.className = "album-settings";
    wrap.hidden = true;
    wrap.innerHTML = "";
    const toggle = insButton("settings-toggle", GEAR, "設定");
    toggle.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.className = "settings-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.addEventListener("pointerdown", function (ev) {
      ev.stopPropagation();
    });
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "settings-entry";
    btn.setAttribute("role", "menuitem");
    btn.dataset.job = "cover";
    btn.appendChild(jobBadge(CAMERA));
    const text = document.createElement("span");
    text.textContent = "更換頭像";
    btn.appendChild(text);
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-run") || btn.disabled) return;
      closeSettings();
      if (coverInput) coverInput.click();
    });
    menu.appendChild(btn);
    toggle.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      const open = menu.hidden;
      if (open) openSettingsMenu(toggle, menu);
      else closeSettings();
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("is-live", open);
    });
    wrap.appendChild(toggle);
    wrap.appendChild(menu);
    if (host) host.appendChild(wrap);
    else document.body.appendChild(wrap);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeSettings();
    });
    window.addEventListener("resize", function () {
      placeSettingsMenu(toggle, menu);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () {
        placeSettingsMenu(toggle, menu);
      });
    }
    return wrap;
  }

  function showInvite() {
    if (!hall) return;
    hall.classList.add("is-invite");
    hall.classList.remove("is-booting");
    if (invitePanel) invitePanel.hidden = false;
    if (window.FamiGate.needsSafari()) {
      if (safariNote) safariNote.hidden = false;
      if (goBtn) goBtn.hidden = true;
    }
  }

  function hideInvite() {
    if (hall) hall.classList.remove("is-invite");
    if (invitePanel) invitePanel.hidden = true;
  }

  function startWait() {
    goBtn.hidden = true;
    nameForm.hidden = true;
    waitEl.hidden = false;
    if (window.Lissajous) window.Lissajous.mountBar(waitBar);
  }

  function renderMe(reader) {
    if (!reader || !cabHud) return;
    if (readerName) readerName.textContent = reader.display_name || "";
    if (faceImg) {
      if (reader.has_cover) {
        faceImg.src = window.FamiGate.origin() + "/cover?person=" + encodeURIComponent(reader.id) + "&k=" + encodeURIComponent(key) + "&r=" + (reader.cover_rev || 0);
        faceImg.hidden = false;
      } else {
        faceImg.hidden = true;
      }
    }
    cabHud.hidden = false;
    const settings = ensureSettings();
    const host = cabHud.querySelector(".cab-wrap");
    if (host && settings.parentNode !== host) host.appendChild(settings);
    settings.hidden = false;
  }

  function paintProgress() {
    if (!feed) return;
    feed.querySelectorAll(".tile").forEach(function (el) {
      const item = catalog[el.dataset.id];
      const pct = el.querySelector(".tile-pct");
      if (!pct) return;
      const label = readLabel(item);
      if (!label) {
        pct.hidden = true;
        pct.textContent = "";
        return;
      }
      pct.hidden = false;
      pct.textContent = label;
    });
  }

  function readLabel(item) {
    if (!item || item.kind === "folder") return "";
    if (item.finished) return "已閱讀";
    if (item.progress == null) return "未閱讀";
    const pages = Number(item.page_count) || 0;
    if (pages <= 0) return "未閱讀";
    const pct = Math.max(1, Math.min(100, Math.round((Number(item.progress) + 1) / pages * 100)));
    return pct + "%";
  }

  function openReader(item) {
    if (!item || item.kind === "folder") return;
    const token = key;
    const end = item.finished ? "&end=1" : "";
    location.href = "./read.html?book=" + encodeURIComponent(item.id)
      + "&k=" + encodeURIComponent(token)
      + end
      + "#k=" + encodeURIComponent(token);
  }

  function thumbUrl(item) {
    return window.FamiGate.origin() + "/thumb?book=" + encodeURIComponent(item.id)
      + "&k=" + encodeURIComponent(key) + "&r=" + (item.cover_rev || 0);
  }

  function thumbKey(item) {
    const base = location.origin || "https://famibook.local";
    return base + "/famibook-t/" + encodeURIComponent(item.id) + "/" + (item.cover_rev || 0);
  }

  function resetThumbs() {
    thumbGen += 1;
    if (window.thumbObserver) {
      window.thumbObserver.disconnect();
      window.thumbObserver = null;
    }
    thumbWait.length = 0;
    blobUrls.forEach(function (u) {
      try { URL.revokeObjectURL(u); } catch (e) {}
    });
    blobUrls.length = 0;
  }

  function pumpThumbs() {
    while (thumbActive < THUMB_CAP && thumbWait.length) {
      const job = thumbWait.shift();
      thumbActive += 1;
      job(function () {
        thumbActive -= 1;
        pumpThumbs();
      });
    }
  }

  function readCachedThumb(cacheKey) {
    if (!window.caches) return Promise.resolve(null);
    return caches.open(THUMB_CACHE).then(function (cache) {
      return cache.match(cacheKey);
    }).then(function (res) {
      return res ? res.blob() : null;
    }).catch(function () {
      return null;
    });
  }

  function writeCachedThumb(cacheKey, blob) {
    if (!blob || !cacheKey || !window.caches) return;
    caches.open(THUMB_CACHE).then(function (cache) {
      return cache.put(cacheKey, new Response(blob, { headers: { "Content-Type": blob.type || "image/jpeg" } }));
    }).catch(function () {});
  }

  function showBlob(img, blob, onReady) {
    const obj = URL.createObjectURL(blob);
    blobUrls.push(obj);
    function done() {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onErr);
      img.classList.add("is-on");
      if (onReady) onReady();
    }
    function onLoad() { done(); }
    function onErr() { done(); }
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onErr);
    img.src = obj;
  }

  function bindThumb(img, url, cacheKey, gen) {
    readCachedThumb(cacheKey).then(function (cached) {
      if (gen !== thumbGen || !img.isConnected) return;
      if (cached) {
        showBlob(img, cached);
        return;
      }
      function start(done) {
        fetch(url, { mode: "cors", credentials: "omit" })
          .then(function (res) {
            if (!res.ok) throw new Error("bad");
            return res.blob();
          })
          .then(function (blob) {
            if (gen !== thumbGen || !img.isConnected) {
              if (done) done();
              return;
            }
            writeCachedThumb(cacheKey, blob);
            showBlob(img, blob, done);
          })
          .catch(function () {
            if (gen !== thumbGen || !img.isConnected) {
              if (done) done();
              return;
            }
            img.classList.add("is-on");
            img.src = url;
            if (done) done();
          });
      }
      thumbWait.push(start);
      pumpThumbs();
    });
  }

  function watchThumb(img, item, eager) {
    const url = thumbUrl(item);
    const cacheKey = thumbKey(item);
    img.dataset.thumbUrl = url;
    img.dataset.thumbKey = cacheKey;
    if (eager || !window.IntersectionObserver) {
      bindThumb(img, url, cacheKey, thumbGen);
      return;
    }
    if (!window.thumbObserver) {
      window.thumbObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            const node = en.target;
            window.thumbObserver.unobserve(node);
            if (node.dataset.thumbBound) return;
            node.dataset.thumbBound = "1";
            bindThumb(node, node.dataset.thumbUrl, node.dataset.thumbKey, thumbGen);
          });
        },
        { rootMargin: "240px 0px" }
      );
    }
    window.thumbObserver.observe(img);
  }

  function tileEl(item, index) {
    catalog[item.id] = item;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.dataset.id = item.id;
    if (item.kind === "folder") btn.dataset.kind = "folder";
    const img = document.createElement("img");
    img.alt = item.title || "";
    img.decoding = "async";
    btn.appendChild(img);
    if (item.has_cover) watchThumb(img, item, index < FIRST);
    const shield = document.createElement("span");
    shield.className = "tile-shield";
    btn.appendChild(shield);
    if (item.kind !== "folder" && item.volume != null && item.volume !== "") {
      const ep = document.createElement("span");
      ep.className = "tile-ep";
      ep.textContent = String(item.volume);
      btn.appendChild(ep);
    }
    const pct = document.createElement("span");
    pct.className = "tile-pct";
    const label = readLabel(item);
    if (label) {
      pct.textContent = label;
    } else {
      pct.hidden = true;
    }
    btn.appendChild(pct);
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (item.kind === "folder") {
        cwd = item.id;
        mode = "list";
        loadShelf(true);
        return;
      }
      openReader(item);
    });
    return btn;
  }

  function updateModeButtons() {
    if (modeAll) modeAll.classList.toggle("is-on", mode === "all");
    if (modeList) modeList.classList.toggle("is-on", mode === "list");
  }

  async function loadShelf(reset) {
    if (!feed) return;
    if (busy && !reset) return;
    if (reset) {
      offset = 0;
      resetThumbs();
      feed.innerHTML = "";
      catalog = {};
      updateModeButtons();
    }
    loadingMore = true;
    const view = mode === "list" ? "list" : "all";
    const folder = mode === "list" && cwd ? "&cwd=" + encodeURIComponent(cwd) : "";
    try {
      const x = await window.FamiGate.api(
        "/api/shelf?view=" + view + "&offset=" + offset + "&limit=" + LIMIT + folder,
        key,
        { timeout: 20000 }
      );
      if (!x.res.ok || !x.j) return;
      lastShelf = x.j;
      total = x.j.total || 0;
      const start = offset;
      (x.j.items || []).forEach((it, i) => feed.appendChild(tileEl(it, start + i)));
      offset += (x.j.items || []).length;
      paintProgress();
    } finally {
      loadingMore = false;
    }
  }

  window.addEventListener("scroll", () => {
    if (loadingMore || offset >= total) return;
    if (window.innerHeight + window.scrollY > document.body.offsetHeight - 600) {
      loadShelf(false);
    }
  });

  async function boot() {
    window.FamiGate.blockWebChrome();
    window.FamiGate.bindKeyboard();
    setBoot(true, "正在連接書櫃…");
    key = window.FAMILY_VIEW_KEY || window.FamiGate.currentKey();
    if (window.FAMILY_FORCE_INVITE) {
      key = window.FAMILY_URL_KEY || "";
    }
    if (!window.FamiGate.origin()) {
      statusEl.textContent = "維護中,請5分鐘後再試";
      return;
    }
    try {
      await window.FamiGate.api("/api/public", "", { timeout: 8000 }).catch(() => null);
      if (!key) {
        setBoot(false);
        if (window.FAMILY_FORCE_INVITE || window.FAMILY_URL_KEY) {
          showInvite();
          if (statusEl) statusEl.textContent = "";
        } else if (statusEl) {
          statusEl.textContent = "請用邀請連結打開";
        }
        return;
      }
      const x = await window.FamiGate.api("/api/door", key, { timeout: 20000 });
      if (!x.res.ok || !x.j) {
        statusEl.textContent = "維護中,請5分鐘後再試";
        return;
      }
      if (x.j.kind === "invite") {
        setBoot(false);
        showInvite();
        statusEl.textContent = "";
        return;
      }
      hideInvite();
      const blobs = document.querySelector(".blobs");
      if (blobs) blobs.hidden = true;
      window.FamiGate.savePersonal(key);
      window.FamiGate.pinKey(key);
      renderMe(x.j.reader);
      if (tagBoard) tagBoard.hidden = false;
      setBoot(false, "");
      if (statusEl) statusEl.textContent = "";
      mode = "list";
      cwd = "";
      await loadShelf(true);
      if (typeof navigator.standalone === "boolean" && !navigator.standalone) {
        const seen = localStorage.getItem("famibook.installed");
        if (!seen && homeInstall) homeInstall.hidden = false;
      }
    } catch (e) {
      if (lastShelf) return;
      statusEl.textContent = "維護中,請5分鐘後再試";
    }
  }

  if (goBtn) goBtn.addEventListener("click", () => {
    if (busy) return;
    if (window.FamiGate.needsSafari()) return;
    goBtn.hidden = true;
    if (!nameForm || !nameInput) return;
    nameForm.hidden = false;
    nameInput.readOnly = true;
    nameInput.addEventListener("touchend", function once(ev) {
      if (Math.hypot(ev.changedTouches[0].clientX - (this._x || 0), ev.changedTouches[0].clientY - (this._y || 0)) > 12) return;
      nameInput.readOnly = false;
      nameInput.focus();
    });
    nameInput.addEventListener("touchstart", function (ev) {
      this._x = ev.touches[0].clientX;
      this._y = ev.touches[0].clientY;
    });
    setTimeout(() => {
      nameInput.readOnly = false;
      nameInput.focus();
    }, 50);
  });

  if (nameForm) nameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const inviteKey = window.FAMILY_URL_KEY || window.FamiGate.currentKey();
    if (!inviteKey) {
      if (nameErr) nameErr.textContent = "請用邀請連結打開";
      return;
    }
    busy = true;
    startWait();
    const name = (nameInput.value || "").trim();
    try {
      const x = await window.FamiGate.api("/api/invite/name", inviteKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
        timeout: 20000,
      });
      if (!x.res.ok || !x.j || !x.j.token) {
        nameErr.textContent = (x.j && x.j.error) || "請再試一次";
        waitEl.hidden = true;
        nameForm.hidden = false;
        busy = false;
        return;
      }
      window.FamiGate.savePersonal(x.j.token);
      location.href = "./index.html?k=" + encodeURIComponent(x.j.token) + "#k=" + encodeURIComponent(x.j.token);
    } catch (err) {
      nameErr.textContent = "家裡還沒開";
      waitEl.hidden = true;
      nameForm.hidden = false;
      busy = false;
    }
  });

  const homeInstalled = document.getElementById("home-installed");
  if (homeInstalled) homeInstalled.addEventListener("click", () => {
    try { localStorage.setItem("famibook.installed", "1"); } catch (e) {}
    if (homeInstall) homeInstall.hidden = true;
  });

  if (coverInput) coverInput.addEventListener("change", async () => {
    const file = coverInput.files && coverInput.files[0];
    if (!file) return;
    const entry = document.querySelector('.settings-entry[data-job="cover"]');
    setJobRun(entry, true);
    setCabRun(true);
    try {
      const fd = new FormData();
      fd.append("cover", file);
      await fetch(window.FamiGate.origin() + "/api/cover?k=" + encodeURIComponent(key), { method: "POST", body: fd });
      const door = await window.FamiGate.api("/api/door", key, { timeout: 15000 });
      if (door.j && door.j.reader) renderMe(door.j.reader);
    } finally {
      setJobRun(entry, false);
      setCabRun(false);
      coverInput.value = "";
    }
  });

  if (modeAll) modeAll.addEventListener("click", function () {
    cwd = "";
    mode = "all";
    loadShelf(true);
  });
  if (modeList) modeList.addEventListener("click", function () {
    cwd = "";
    mode = "list";
    loadShelf(true);
  });

  scrubLegacySettings();

  window.FamiShelf = {
    reload: () => loadShelf(true),
    key: () => key,
    setCabRun: setCabRun,
  };

  boot();
})();
