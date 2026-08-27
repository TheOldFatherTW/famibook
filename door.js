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
  const backdropInput = document.getElementById("backdrop-input");
  const stageBg = document.getElementById("stage-bg");
  const homeHead = document.getElementById("home-head");
  const shelfBack = document.getElementById("shelf-back");
  let settingsWrap = null;
  let settingsCatch = null;
  let backdropUrl = "";
  const GEAR =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 3.8l.6-1.3h3.6l.6 1.3 1.6.7 1.4-.5 2.5 2.5-.5 1.4.7 1.6 1.3.6v3.6l-1.3.6-.7 1.6.5 1.4-2.5 2.5-1.4-.5-1.6.7-.6 1.3h-3.6l-.6-1.3-1.6-.7-1.4.5-2.5-2.5.5-1.4-.7-1.6-1.3-.6v-3.6l1.3-.6.7-1.6-.5-1.4L6.6 4l1.4.5 1.6-.7z" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linejoin="round"/><circle cx="12" cy="11.9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const CAMERA =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8" width="17" height="11.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 8l1.4-2.4h5.2L16 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.6" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  const SCENE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 16.2l4.2-4.6 3 3.2 2.2-2.4 3.6 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="9" cy="9.2" r="1.3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const PERSON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.4" r="3.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6.2 18.6c.9-3.3 3.2-5 5.8-5s4.9 1.7 5.8 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  let key = "";
  let busy = false;
  let lastShelf = null;
  let cwd = "";
  let parentCwd = "";
  let offset = 0;
  const LIMIT = 40;
  const FIRST = 12;
  const THUMB_CAP = 6;
  const THUMB_CACHE = "famibook-thumbs-v3";
  const SHELF_STORE = "famibook.shelf.v1.";
  let thumbGen = 0;
  let thumbActive = 0;
  const thumbWait = [];
  const blobUrls = [];
  const memThumbs = {};
  const shelfSnaps = {};
  let shelfGen = 0;
  let prefetchOnce = false;
  let loadingMore = false;
  let total = 0;
  let catalog = {};
  let isGm = false;
  let hostView = true;
  let hostTab = "title";
  let hostQuery = "";
  let waitBusy = false;
  let waitTimer = 0;
  try {
    if (localStorage.getItem("famibook.hostView") === "0") hostView = false;
  } catch (e) {}
  const MODES = [
    ["title", "書籍"],
    ["manga", "漫畫"],
  ];
  const HEART =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20C10.5 18.4 7.3 15.8 5.4 11.9C4 9.1 5.2 6 8.4 6c1.8 0 3 1.1 3.6 2.2C12.6 7.1 13.8 6 15.6 6c3.2 0 4.4 3.1 3 5.9C16.7 15.8 13.5 18.4 12 20Z"/></svg>';
  const FOLDER_MARK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v10H4z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

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

  function hostOn() {
    return !!(isGm && hostView);
  }

  function paintHostChrome() {
    const cover = document.querySelector("#cab-hud .cab-cover");
    if (cover) cover.classList.toggle("is-holo", hostOn());
    const idRow = document.querySelector('.settings-entry[data-job="identity"]');
    if (idRow) {
      idRow.hidden = !isGm;
      idRow.classList.toggle("is-host", hostOn());
    }
  }

  function layoutStage() {
    if (!stageBg || !hall || stageBg.hidden) return;
    const hallBox = hall.getBoundingClientRect();
    const tags = document.getElementById("tag-board");
    const startBox = tags && !tags.hidden ? tags.getBoundingClientRect() : (feed ? feed.getBoundingClientRect() : null);
    const endBox = feed ? feed.getBoundingClientRect() : startBox;
    const start = startBox ? Math.max(0, startBox.top - hallBox.top) : 180;
    const end = endBox ? Math.max(start + 24, endBox.top - hallBox.top) : start + 80;
    const fade = "linear-gradient(to bottom, #000 0, #000 " + Math.round(start) + "px, transparent " + Math.round(end) + "px)";
    stageBg.style.height = Math.round(end) + "px";
    stageBg.style.webkitMaskImage = fade;
    stageBg.style.maskImage = fade;
    if (backdropUrl) tuneNameOnBackdrop(backdropUrl);
  }

  function paintStage(reader) {
    if (!stageBg || !hall) return;
    if (reader && reader.has_backdrop && reader.id) {
      backdropUrl = window.FamiGate.origin() + "/backdrop?person=" + encodeURIComponent(reader.id) + "&k=" + encodeURIComponent(key) + "&r=" + (reader.backdrop_rev || 0);
      hall.classList.add("has-backdrop");
      if (readerName) {
        readerName.classList.remove("is-on-light");
        readerName.classList.add("is-on-dark");
      }
      stageBg.style.backgroundImage = "url(" + backdropUrl + ")";
      stageBg.hidden = false;
      requestAnimationFrame(layoutStage);
    } else {
      backdropUrl = "";
      hall.classList.remove("has-backdrop");
      if (readerName) readerName.classList.remove("is-on-light", "is-on-dark");
      stageBg.hidden = true;
      stageBg.style.backgroundImage = "";
    }
  }

  function lumaBehindName(img, stage, nameEl) {
    const stageBox = stage.getBoundingClientRect();
    const nameBox = nameEl.getBoundingClientRect();
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (stageBox.width < 8 || nameBox.height < 4 || !iw || !ih) return null;
    const scale = Math.max(stageBox.width / iw, stageBox.height / ih);
    const ox = (stageBox.width - iw * scale) / 2;
    const pad = 10;
    const sx = (nameBox.left - stageBox.left - ox - pad) / scale;
    const sy = (nameBox.top - stageBox.top - pad) / scale;
    const sw = (nameBox.width + pad * 2) / scale;
    const sh = (nameBox.height + pad * 2) / scale;
    const x = Math.max(0, Math.min(iw - 1, sx));
    const y = Math.max(0, Math.min(ih - 1, sy));
    const w = Math.max(1, Math.min(iw - x, sw));
    const h = Math.max(1, Math.min(ih - y, sh));
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 12;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    try {
      ctx.drawImage(img, x, y, w, h, 0, 0, 24, 12);
      const data = ctx.getImageData(0, 0, 24, 12).data;
      let sum = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        sum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      }
      return sum / n;
    } catch (err) {
      return null;
    }
  }

  function tuneNameOnBackdrop(url) {
    if (!readerName || !stageBg || stageBg.hidden || !url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      if (url !== backdropUrl) return;
      const luma = lumaBehindName(img, stageBg, readerName);
      const light = luma != null && luma >= 0.65;
      readerName.classList.toggle("is-on-light", light);
      readerName.classList.toggle("is-on-dark", !light);
    };
    img.src = url;
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

  function showWaitCard(title) {
    const mask = document.getElementById("waitMask");
    const head = document.getElementById("waitTitle");
    const pct = document.getElementById("waitPct");
    if (head) head.textContent = title || "更換背景中";
    if (pct) pct.textContent = "0%";
    if (mask) mask.hidden = false;
  }

  function setWaitPct(n) {
    const pct = document.getElementById("waitPct");
    if (pct) pct.textContent = Math.max(0, Math.min(100, Math.round(n))) + "%";
  }

  function hideWaitCard() {
    const mask = document.getElementById("waitMask");
    if (mask) mask.hidden = true;
    if (waitTimer) {
      window.clearInterval(waitTimer);
      waitTimer = 0;
    }
  }

  function tickWait() {
    const pct = document.getElementById("waitPct");
    const n = parseInt((pct && pct.textContent) || "0", 10) || 0;
    if (n < 90) setWaitPct(n + 1);
  }

  function postFile(url, body, onPct) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr);
        else reject(new Error("fail"));
      };
      xhr.onerror = function () { reject(new Error("net")); };
      if (xhr.upload) {
        xhr.upload.onprogress = function (ev) {
          if (ev.lengthComputable && ev.total) onPct(Math.round((ev.loaded / ev.total) * 100));
        };
      }
      xhr.send(body);
    });
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
    function gearRow(svg, label, job, onClick) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "settings-entry";
      row.setAttribute("role", "menuitem");
      row.dataset.job = job;
      row.appendChild(jobBadge(svg));
      const text = document.createElement("span");
      text.textContent = label;
      row.appendChild(text);
      row.addEventListener("click", function () {
        if (row.classList.contains("is-run") || row.disabled) return;
        closeSettings();
        onClick();
      });
      return row;
    }
    menu.appendChild(gearRow(CAMERA, "更換頭像", "cover", function () {
      if (coverInput) coverInput.click();
    }));
    menu.appendChild(gearRow(SCENE, "更換背景", "backdrop", function () {
      if (backdropInput) backdropInput.click();
    }));
    const idRow = gearRow(PERSON, "切換身分", "identity", function () {
      if (!isGm) return;
      hostView = !hostView;
      try { localStorage.setItem("famibook.hostView", hostView ? "1" : "0"); } catch (e) {}
      if (!hostOn()) {
        if (hostTab === "jobs" || hostTab === "research") hostTab = "title";
        if (window.FamiHost && window.FamiHost.clearSelect) window.FamiHost.clearSelect();
      }
      paintHostChrome();
      paintBack();
      loadShelf(true);
    });
    idRow.hidden = true;
    menu.appendChild(idRow);
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
      } else {
        faceImg.src = "./face-default.jpg?v=2";
      }
      faceImg.hidden = false;
    }
    cabHud.hidden = false;
    if (homeHead) homeHead.hidden = false;
    const settings = ensureSettings();
    const host = cabHud.querySelector(".cab-wrap");
    if (host && settings.parentNode !== host) host.appendChild(settings);
    settings.hidden = false;
    paintStage(reader);
    paintHostChrome();
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
    if (!item || item.kind === "folder" || item.kind === "org" || item.kind === "job") return "";
    if (item.finished) return "已閱讀";
    if (item.progress == null) return "未閱讀";
    const pages = Number(item.page_count) || 0;
    if (pages <= 0) return "未閱讀";
    const pct = Math.max(1, Math.min(100, Math.round((Number(item.progress) + 1) / pages * 100)));
    return pct + "%";
  }

  function epLabel(item) {
    if (!item) return "";
    const a = item.volume;
    if (a == null || a === "") return "";
    const b = item.volume_end;
    if (item.kind === "folder" && b != null && b !== "" && Number(b) !== Number(a)) {
      return String(a) + "-" + String(b);
    }
    return String(a);
  }

  let prefetchCtl = null;
  let readerOpen = false;
  let readerStaySeq = 0;
  let readerReadyTimer = 0;
  let hintTimer = 0;
  let bridgeBackAt = 0;

  function tileNode(item) {
    if (!feed || !item || !item.id) return null;
    const tiles = feed.querySelectorAll(".tile");
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].dataset.id === item.id) return tiles[i];
    }
    return null;
  }

  function tileCover(item) {
    const tile = tileNode(item);
    if (!tile) return "";
    const img = tile.querySelector("img");
    if (img && (img.currentSrc || img.src)) return img.currentSrc || img.src;
    return "";
  }

  function sizeBridgeCover(coverEl, item) {
    if (!coverEl) return;
    coverEl.style.width = "";
    coverEl.style.height = "";
    const tile = tileNode(item);
    if (!tile) return;
    const box = tile.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return;
    coverEl.style.width = Math.round(box.width) + "px";
    coverEl.style.height = Math.round(box.height) + "px";
  }

  function readingUrl(item, extra) {
    const q = new URLSearchParams();
    q.set("book", item.id);
    q.set("k", key);
    const end = (extra && extra.end) || (item.finished ? "1" : "");
    if (end) q.set("end", end);
    return "./read.html?" + q.toString() + "#k=" + encodeURIComponent(key);
  }

  function rememberReading(item, cover) {
    try {
      sessionStorage.setItem("famibook.reading", JSON.stringify({
        book: item.id,
        k: key,
        end: item.finished ? "1" : "",
        cover: cover || "",
      }));
    } catch (e) {}
  }

  function stayOverlayUrl(n) {
    const raw = (location.hash || "").replace(/^#/, "").replace(/&?stay=\d+/g, "").replace(/&$/, "");
    return location.pathname + location.search + "#" + (raw ? raw + "&stay=" + n : "stay=" + n);
  }

  function cleanOverlayUrl() {
    const raw = (location.hash || "").replace(/^#/, "").replace(/&?stay=\d+/g, "").replace(/&$/, "");
    return location.pathname + location.search + (raw ? "#" + raw : "");
  }

  function padOverlay() {
    if (!readerOpen) return;
    try {
      readerStaySeq += 1;
      history.pushState({ famiReader: 1, n: readerStaySeq }, "", stayOverlayUrl(readerStaySeq));
      readerStaySeq += 1;
      history.pushState({ famiReader: 1, n: readerStaySeq }, "", stayOverlayUrl(readerStaySeq));
    } catch (e) {}
  }

  function closeReader() {
    const layer = document.getElementById("reader-layer");
    const frame = document.getElementById("reader-frame");
    readerOpen = false;
    document.documentElement.classList.remove("is-reading");
    if (layer) {
      layer.hidden = true;
      layer.classList.remove("is-live");
    }
    if (frame) {
      try { frame.src = "about:blank"; } catch (e) {}
    }
    try { sessionStorage.removeItem("famibook.reading"); } catch (e) {}
    try { history.replaceState({}, "", cleanOverlayUrl()); } catch (e) {}
    window.clearTimeout(readerReadyTimer);
    window.clearTimeout(hintTimer);
  }

  function showReaderLive() {
    const layer = document.getElementById("reader-layer");
    if (!layer || !readerOpen) return;
    layer.classList.add("is-live");
    window.clearTimeout(readerReadyTimer);
    window.clearTimeout(hintTimer);
    const hint = document.getElementById("reader-hint");
    if (hint) hint.hidden = true;
  }

  function prefetchReader(item) {
    if (!item || !item.id || !key) return;
    const origin = window.FamiGate.origin();
    if (!origin) return;
    if (prefetchCtl && prefetchCtl._book === item.id) return;
    if (prefetchCtl) prefetchCtl.abort();
    prefetchCtl = new AbortController();
    prefetchCtl._book = item.id;
    const signal = prefetchCtl.signal;
    const bid = encodeURIComponent(item.id);
    const tok = encodeURIComponent(key);
    [
      "./read.html",
      "./read.css?v=14",
      origin + "/static/reader.js?v=25",
      origin + "/static/css/global.css?v=20",
      origin + "/static/css/read.css?v=20",
      origin + "/static/css/navImage.css?v=20",
      origin + "/static/css/navMenu.css?v=20",
      origin + "/static/css/config.css?v=20",
      origin + "/static/css/mybook.css?v=20",
    ].forEach(function (url) {
      fetch(url, { signal: signal, mode: "cors", credentials: "omit" }).catch(function () {});
    });
    const auth = "?book=" + bid + "&k=" + tok;
    Promise.all([
      fetch(origin + "/api/book" + auth, { signal: signal, mode: "cors" }).then(function (r) { return r.json(); }),
      fetch(origin + "/api/prefs" + auth, { signal: signal, mode: "cors" }).then(function (r) { return r.json(); }).catch(function () { return {}; }),
    ]).then(function (pair) {
      const book = pair[0] || {};
      const prefs = pair[1] || {};
      const leaves = book.leaves || [];
      if (!leaves.length) return;
      const posKey = book.positionKey || item.id;
      let idx = 0;
      if (prefs.finished && prefs.finished[posKey]) {
        idx = Math.max(0, leaves.length - 1);
      } else {
        const saved = prefs.positions && prefs.positions[posKey];
        if (Number.isFinite(saved)) idx = Math.max(0, Math.min(saved, leaves.length - 1));
      }
      [leaves[idx], leaves[idx + 1], leaves[idx - 1]].forEach(function (leaf) {
        if (!leaf || !leaf.src) return;
        const im = new Image();
        im.decoding = "async";
        im.src = origin + "/pages/" + encodeURIComponent(leaf.src) + "?book=" + bid + "&k=" + tok;
      });
    }).catch(function () {});
  }

  function openReader(item, opts) {
    if (!item || item.kind === "folder") return;
    const layer = document.getElementById("reader-layer");
    const frame = document.getElementById("reader-frame");
    const coverEl = document.getElementById("reader-bridge-cover");
    const hint = document.getElementById("reader-hint");
    const bridge = document.getElementById("reader-bridge");
    if (!layer || !frame) {
      location.replace(readingUrl(item, opts));
      return;
    }
    let cover = (opts && opts.cover) || tileCover(item);
    if (!cover && item.has_cover) cover = thumbUrl(item);
    if (coverEl) {
      if (cover) {
        coverEl.hidden = false;
        coverEl.src = cover;
        sizeBridgeCover(coverEl, item);
      } else {
        coverEl.removeAttribute("src");
        coverEl.hidden = true;
        coverEl.style.width = "";
        coverEl.style.height = "";
      }
    }
    if (bridge) bridge.classList.toggle("has-cover", !!cover);
    window.clearTimeout(hintTimer);
    if (hint) hint.hidden = false;
    rememberReading(item, cover);
    document.documentElement.classList.add("is-reading");
    layer.hidden = false;
    layer.classList.remove("is-live");
    const wasOpen = readerOpen;
    readerOpen = true;
    if (!wasOpen) padOverlay();
    prefetchReader(item);
    const url = readingUrl(item, opts);
    try {
      if (frame.getAttribute("src") === url && frame.contentWindow) {
        frame.contentWindow.location.replace(url);
      } else {
        frame.src = url;
      }
    } catch (e) {
      frame.src = url;
    }
    window.clearTimeout(readerReadyTimer);
    readerReadyTimer = window.setTimeout(showReaderLive, 15000);
  }

  function openSaved(data) {
    if (!data || !data.book) return;
    openReader({
      id: data.book,
      finished: data.end === "1",
      has_cover: !!data.cover,
    }, { end: data.end, cover: data.cover });
  }

  function canOpenReader(item) {
    if (!item || item.kind === "folder" || item.kind === "org" || item.kind === "job") return false;
    if (item.has_pages === true || item.readable === true) return true;
    if (hostOn()) return false;
    return true;
  }

  function thumbUrl(item) {
    const bid = item.cover_book || item.id;
    return window.FamiGate.origin() + "/thumb?book=" + encodeURIComponent(bid)
      + "&k=" + encodeURIComponent(key) + "&r=" + (item.cover_rev || 0);
  }

  function thumbKey(item) {
    const base = location.origin || "https://famibook.local";
    return base + "/famibook-t/" + encodeURIComponent(item.id) + "/" + (item.cover_rev || 0);
  }

  function thumbsBusy() {
    return thumbActive > 0 || thumbWait.length > 0;
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
    const mem = memThumbs[cacheKey];
    if (mem) {
      img.classList.add("is-ready");
      showBlob(img, mem);
      return;
    }
    readCachedThumb(cacheKey).then(function (cached) {
      if (gen !== thumbGen) return;
      if (cached) {
        memThumbs[cacheKey] = cached;
        if (!img.isConnected) return;
        img.classList.add("is-ready");
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
            memThumbs[cacheKey] = blob;
            writeCachedThumb(cacheKey, blob);
            if (gen !== thumbGen || !img.isConnected) {
              if (done) done();
              return;
            }
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

  function warmupThumb(item) {
    if (!item || !item.has_cover) return;
    const cacheKey = thumbKey(item);
    if (memThumbs[cacheKey]) return;
    const url = thumbUrl(item);
    function start(done) {
      fetch(url, { mode: "cors", credentials: "omit" })
        .then(function (res) {
          if (!res.ok) throw new Error("bad");
          return res.blob();
        })
        .then(function (blob) {
          memThumbs[cacheKey] = blob;
          writeCachedThumb(cacheKey, blob);
          if (done) done();
        })
        .catch(function () {
          if (done) done();
        });
    }
    thumbWait.push(start);
    pumpThumbs();
  }

  function watchThumb(img, item, eager) {
    const url = thumbUrl(item);
    const cacheKey = thumbKey(item);
    img.dataset.thumbUrl = url;
    img.dataset.thumbKey = cacheKey;
    if (eager || memThumbs[cacheKey] || !window.IntersectionObserver) {
      if (img.dataset.thumbBound) return;
      img.dataset.thumbBound = "1";
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
    if (item.kind === "folder" || item.kind === "org") btn.dataset.kind = item.kind;
    if (item.pinned) btn.classList.add("is-pinned");
    const img = document.createElement("img");
    img.alt = item.title || "";
    img.decoding = "async";
    if (index < FIRST) img.loading = "eager";
    btn.appendChild(img);
    if (item.has_cover) watchThumb(img, item, index < FIRST);
    else if (item.kind === "org") {
      const mark = document.createElement("span");
      mark.className = "tile-plus";
      mark.innerHTML = FOLDER_MARK;
      btn.appendChild(mark);
    }
    const shield = document.createElement("span");
    shield.className = "tile-shield";
    btn.appendChild(shield);
    if (item.favorite) {
      const heart = document.createElement("span");
      heart.className = "tile-heart";
      heart.innerHTML = HEART;
      btn.appendChild(heart);
    }
    const epText = epLabel(item);
    if (epText) {
      const ep = document.createElement("span");
      ep.className = "tile-ep";
      ep.textContent = epText;
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
    if (window.FamiHost && window.FamiHost.bindTile) {
      window.FamiHost.bindTile(btn, item);
    }
    btn.addEventListener("pointerdown", function (ev) {
      if (ev.button && ev.button !== 0) return;
      const current = catalog[btn.dataset.id] || item;
      if (!canOpenReader(current)) return;
      if (window.FamiHost && window.FamiHost.isSelect && window.FamiHost.isSelect()) return;
      prefetchReader(current);
    });
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      const current = catalog[btn.dataset.id] || item;
      if (current.kind === "folder" || current.kind === "org") {
        cwd = current.id;
        loadShelf(true);
        return;
      }
      if (current.kind === "job") return;
      if (hostOn() && window.FamiHost && window.FamiHost.onTileClick && window.FamiHost.onTileClick(current)) {
        return;
      }
      if (!canOpenReader(current)) return;
      openReader(current);
    });
    return btn;
  }

  function paintBack() {
    const inFolder = !!cwd;
    const modeBar = document.getElementById("mode-bar");
    if (tagBoard) tagBoard.hidden = false;
    if (modeBar) modeBar.hidden = false;
    if (shelfBack) shelfBack.hidden = !inFolder;
    paintHostChrome();
    layoutStage();
  }

  function pickTab(tab) {
    hostTab = tab === "all" ? "title" : (tab || "title");
    cwd = "";
    parentCwd = "";
    hostQuery = "";
    const bar = document.getElementById("mode-bar");
    if (bar) {
      bar.querySelectorAll(".mode-btn").forEach(function (el) {
        el.classList.toggle("is-on", el.dataset.mode === hostTab);
      });
    }
    if (window.FamiHost && window.FamiHost.clearSelect) window.FamiHost.clearSelect();
    loadShelf(true);
  }

  function ensureModes() {
    const bar = document.getElementById("mode-bar");
    if (!bar || bar.dataset.ready) return;
    bar.dataset.ready = "1";
    const heart = document.createElement("button");
    heart.type = "button";
    heart.className = "mode-btn" + (hostTab === "fav" ? " is-on" : "");
    heart.dataset.mode = "fav";
    heart.textContent = "最愛";
    heart.addEventListener("click", function () { pickTab("fav"); });
    bar.appendChild(heart);
    MODES.forEach(function (pair) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-btn" + (hostTab === pair[0] ? " is-on" : "");
      btn.dataset.mode = pair[0];
      btn.textContent = pair[1];
      btn.addEventListener("click", function () {
        pickTab(pair[0]);
      });
      bar.appendChild(btn);
    });
  }

  function viewKey() {
    return (hostTab || "title") + "|" + (cwd || "") + "|" + (hostQuery || "");
  }

  function feedBookTiles() {
    return feed ? feed.querySelectorAll(".tile:not(.tile-add)") : [];
  }

  function itemStamp(it) {
    if (!it) return "";
    return String(it.id) + ":" + String(it.cover_rev || 0) + ":" + (it.favorite ? "1" : "0") + ":" + (it.pinned ? "1" : "0") + ":" + (it.kind || "");
  }

  function sameHead(fresh) {
    const tiles = feedBookTiles();
    if (!fresh || !fresh.length) return tiles.length === 0;
    if (tiles.length < fresh.length) return false;
    for (let i = 0; i < fresh.length; i += 1) {
      const id = tiles[i].dataset.id;
      if (itemStamp(catalog[id]) !== itemStamp(fresh[i])) return false;
    }
    return true;
  }

  function paintedItems() {
    return Array.prototype.map.call(feedBookTiles(), function (el) {
      return catalog[el.dataset.id];
    }).filter(Boolean);
  }

  function readJsonSnap(k) {
    if (shelfSnaps[k] && shelfSnaps[k].items && shelfSnaps[k].items.length) {
      return shelfSnaps[k];
    }
    try {
      const raw = localStorage.getItem(SHELF_STORE + k);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.items && parsed.items.length) {
        shelfSnaps[k] = parsed;
        return parsed;
      }
    } catch (e) {}
    return null;
  }

  function writeJsonSnap(k, data) {
    const snap = {
      items: (data.items || []).slice(),
      total: data.total || 0,
      parent: data.parent || "",
      cwd: data.cwd || "",
      offset: data.offset || (data.items || []).length,
    };
    shelfSnaps[k] = snap;
    try {
      localStorage.setItem(SHELF_STORE + k, JSON.stringify({
        items: snap.items.slice(0, 80),
        total: snap.total,
        parent: snap.parent,
        cwd: snap.cwd,
        offset: snap.offset,
      }));
    } catch (e) {}
  }

  function rememberSnap() {
    writeJsonSnap(viewKey(), {
      items: paintedItems(),
      total: total,
      parent: parentCwd,
      cwd: cwd,
      offset: offset,
    });
  }

  function paintFromCache(k) {
    const snap = readJsonSnap(k);
    if (!snap || !snap.items || !snap.items.length) return false;
    resetFeed();
    snap.items.forEach(function (it, i) {
      feed.appendChild(tileEl(it, i));
    });
    offset = snap.items.length;
    total = snap.total || offset;
    if (snap.parent != null) parentCwd = snap.parent;
    paintProgress();
    paintBack();
    layoutStage();
    if (window.FamiHost && window.FamiHost.afterPaint) window.FamiHost.afterPaint();
    return true;
  }

  function prefetchOtherTabs() {
    if (cwd || prefetchOnce) return;
    prefetchOnce = true;
    const tabs = hostOn() ? ["title", "research", "manga", "fav"] : ["title", "manga", "fav"];
    tabs.forEach(function (tab) {
      if (tab === hostTab) return;
      const path = hostOn()
        ? "/api/host/shelf?offset=0&limit=" + LIMIT + "&tab=" + encodeURIComponent(tab)
        : "/api/shelf?view=list&offset=0&limit=" + LIMIT + "&tab=" + encodeURIComponent(tab);
      window.FamiGate.api(path, key, { timeout: 20000 }).then(function (x) {
        if (!x || !x.j || !x.j.items) return;
        writeJsonSnap(tab + "|", {
          items: x.j.items,
          total: x.j.total || 0,
          parent: x.j.parent || "",
          cwd: "",
          offset: (x.j.items || []).length,
        });
        (x.j.items || []).slice(0, FIRST).forEach(warmupThumb);
      }).catch(function () {});
    });
  }

  function resetFeed() {
    offset = 0;
    if (feed) feed.innerHTML = "";
    resetThumbs();
    catalog = {};
    paintBack();
  }

  async function loadShelf(reset) {
    if (!feed) return;
    if (busy && !reset) return;
    const gen = ++shelfGen;
    if (reset && window.FamiHost && window.FamiHost.clearSelect) window.FamiHost.clearSelect();
    if (hostTab === "all") hostTab = "title";
    if (reset) paintFromCache(viewKey()) || resetFeed();
    if (hostOn() && hostTab === "jobs") {
      loadingMore = false;
      total = 1;
      offset = Math.max(1, feedBookTiles().length);
      if (window.FamiHost && window.FamiHost.loadJobs) {
        return window.FamiHost.loadJobs(!feedBookTiles().length);
      }
      return;
    }
    loadingMore = true;
    const reqOffset = reset ? 0 : offset;
    const folder = cwd ? "&cwd=" + encodeURIComponent(cwd) : "";
    const tabQ = "&tab=" + encodeURIComponent(hostTab || "title");
    const q = hostOn() && hostQuery ? "&q=" + encodeURIComponent(hostQuery) : "";
    const path = hostOn()
      ? "/api/host/shelf?offset=" + reqOffset + "&limit=" + LIMIT + folder + tabQ + q
      : "/api/shelf?view=list&offset=" + reqOffset + "&limit=" + LIMIT + folder + tabQ;
    try {
      const x = await window.FamiGate.api(path, key, { timeout: 20000 });
      if (gen !== shelfGen) return;
      if (!x.res.ok || !x.j) return;
      const fresh = x.j.items || [];
      lastShelf = x.j;
      total = x.j.total || 0;
      parentCwd = x.j.parent || "";
      cwd = x.j.cwd || cwd;
      if (reset && sameHead(fresh)) {
        fresh.forEach(function (it) { catalog[it.id] = it; });
        if (offset < fresh.length) offset = fresh.length;
        paintProgress();
        paintBack();
        rememberSnap();
        layoutStage();
        window.setTimeout(prefetchOtherTabs, 700);
        if (window.FamiHost && window.FamiHost.afterPaint) window.FamiHost.afterPaint();
        return;
      }
      if (reset) resetFeed();
      paintBack();
      const start = offset;
      fresh.forEach(function (it, i) { feed.appendChild(tileEl(it, start + i)); });
      offset += fresh.length;
      paintProgress();
      rememberSnap();
      if (window.FamiHost && window.FamiHost.afterPaint) window.FamiHost.afterPaint();
      layoutStage();
      if (reset) window.setTimeout(prefetchOtherTabs, 700);
    } finally {
      if (gen === shelfGen) loadingMore = false;
    }
  }

  window.addEventListener("scroll", () => {
    if (loadingMore || offset >= total) return;
    if (thumbsBusy()) return;
    if (window.innerHeight + window.scrollY > document.body.offsetHeight - 600) {
      loadShelf(false);
    }
  });
  window.addEventListener("resize", layoutStage);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", layoutStage);

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
      isGm = !!(x.j.gm || (x.j.reader && x.j.reader.gm));
      renderMe(x.j.reader);
      ensureModes();
      paintHostChrome();
      if (window.FamiHost) window.FamiHost.attach(key);
      setBoot(false, "");
      if (statusEl) statusEl.textContent = "";
      cwd = "";
      parentCwd = "";
      const pending = window.__famiPendingRead;
      window.__famiPendingRead = null;
      if (pending && pending.book) openSaved(pending);
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

  if (backdropInput) backdropInput.addEventListener("change", async () => {
    const file = backdropInput.files && backdropInput.files[0];
    if (!file || waitBusy) {
      backdropInput.value = "";
      return;
    }
    waitBusy = true;
    showWaitCard("更換背景中");
    waitTimer = window.setInterval(tickWait, 280);
    const entry = document.querySelector('.settings-entry[data-job="backdrop"]');
    setJobRun(entry, true);
    setCabRun(true);
    try {
      const fd = new FormData();
      fd.append("backdrop", file);
      await postFile(
        window.FamiGate.origin() + "/api/backdrop?k=" + encodeURIComponent(key),
        fd,
        function (n) {
          if (waitTimer) {
            window.clearInterval(waitTimer);
            waitTimer = 0;
          }
          setWaitPct(n);
        }
      );
      setWaitPct(100);
      const door = await window.FamiGate.api("/api/door", key, { timeout: 15000 });
      if (door.j && door.j.reader) renderMe(door.j.reader);
    } finally {
      hideWaitCard();
      setJobRun(entry, false);
      setCabRun(false);
      waitBusy = false;
      backdropInput.value = "";
    }
  });

  if (shelfBack) shelfBack.addEventListener("click", function (ev) {
    ev.preventDefault();
    cwd = parentCwd || "";
    loadShelf(true);
  });

  const readerBack = document.getElementById("reader-back");
  if (readerBack) {
    readerBack.addEventListener("pointerup", function (ev) {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      ev.preventDefault();
      if (Date.now() - bridgeBackAt < 400) return;
      bridgeBackAt = Date.now();
      closeReader();
    });
    readerBack.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (Date.now() - bridgeBackAt < 400) return;
      bridgeBackAt = Date.now();
      closeReader();
    });
  }

  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    const kind = ev.data && ev.data.fami;
    if (kind === "close-reader") closeReader();
    else if (kind === "reader-ready") showReaderLive();
    else if (kind === "reader-loading" && readerOpen) {
      const layer = document.getElementById("reader-layer");
      if (layer) layer.classList.remove("is-live");
    }
  });
  window.addEventListener("popstate", function () {
    if (readerOpen) {
      padOverlay();
      return;
    }
    if (/stay=\d+/.test(location.hash || "")) {
      try { history.replaceState({}, "", cleanOverlayUrl()); } catch (e) {}
    }
  });

  scrubLegacySettings();

  window.FamiShelf = {
    reload: () => loadShelf(true),
    key: () => key,
    cwd: () => cwd,
    tab: () => hostTab,
    catalog: () => catalog,
    hostOn: hostOn,
    resetFeed: resetFeed,
    remember: rememberSnap,
    openSaved: openSaved,
    closeReader: closeReader,
    appendTile: function (item, index) {
      if (!feed) return null;
      const el = tileEl(item, index || 0);
      feed.appendChild(el);
      return el;
    },
    pickTab: pickTab,
    closeSettings: closeSettings,
    setKind: function (kind) { hostTab = kind === "all" ? "title" : (kind || "title"); },
    setTab: function (tab) {
      hostTab = tab === "all" ? "title" : (tab || "title");
      const bar = document.getElementById("mode-bar");
      if (bar) {
        bar.querySelectorAll(".mode-btn").forEach(function (el) {
          el.classList.toggle("is-on", el.dataset.mode === hostTab);
        });
      }
    },
    setQuery: function (q) { hostQuery = q || ""; },
    setCabRun: setCabRun,
  };

  boot();
})();
