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
  const shelfBack = document.getElementById("shelf-back");
  let settingsWrap = null;
  let settingsCatch = null;
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
  let hostTab = "all";
  try {
    if (localStorage.getItem("famibook.hostView") === "0") hostView = false;
  } catch (e) {}
  const MODES = [
    ["all", "所有"],
    ["research", "研究"],
    ["title", "書籍"],
    ["manga", "漫畫"],
    ["jobs", "工作"],
  ];
  const HEART =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 20s-6.7-4.2-8.6-8.1C2.2 9.1 3.4 6 6.6 6c1.8 0 3 1.1 3.6 2.2C10.8 7.1 12 6 13.8 6c3.2 0 4.4 3.1 3 5.9-1.9 3.9-8.6 8.1-8.6 8.1z"/></svg>';
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
    if (hostOn()) armFoilSense();
    else stopFoilSense();
  }

  let foilLive = false;
  let foilArmed = false;
  let foilRaf = 0;
  const foilOri = { beta: 45, gamma: 0, alpha: 0 };
  const foilMot = { x: 0, y: 0, z: 0 };

  function foilCover() {
    return document.querySelector("#cab-hud .cab-cover");
  }

  function paintFoil() {
    foilRaf = 0;
    const cover = foilCover();
    if (!cover || !cover.classList.contains("is-holo")) return;
    const g = Math.max(-50, Math.min(50, foilOri.gamma));
    const b = Math.max(-50, Math.min(50, foilOri.beta - 45));
    cover.style.setProperty("--foil-hx", (50 + g * 1.4).toFixed(1) + "%");
    cover.style.setProperty("--foil-hy", (32 + b * 1.1).toFixed(1) + "%");
    cover.style.setProperty("--foil-rx", (-b * 0.28).toFixed(2) + "deg");
    cover.style.setProperty("--foil-ry", (g * 0.34).toFixed(2) + "deg");
  }

  function queueFoil() {
    if (!foilRaf) foilRaf = window.requestAnimationFrame(paintFoil);
  }

  function onFoilOri(ev) {
    if (ev.beta == null && ev.gamma == null) return;
    foilOri.beta = ev.beta || 0;
    foilOri.gamma = ev.gamma || 0;
    foilOri.alpha = ev.alpha || 0;
    queueFoil();
  }

  function onFoilMot(ev) {
    const acc = ev.acceleration || ev.accelerationIncludingGravity;
    if (!acc) return;
    foilMot.x = acc.x || 0;
    foilMot.y = acc.y || 0;
    foilMot.z = acc.z || 0;
    queueFoil();
  }

  function startFoilSense() {
    if (foilLive || !hostOn()) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    foilLive = true;
    window.addEventListener("deviceorientation", onFoilOri, true);
    window.addEventListener("devicemotion", onFoilMot, true);
    queueFoil();
  }

  function stopFoilSense() {
    foilLive = false;
    window.removeEventListener("deviceorientation", onFoilOri, true);
    window.removeEventListener("devicemotion", onFoilMot, true);
    if (foilRaf) {
      window.cancelAnimationFrame(foilRaf);
      foilRaf = 0;
    }
    const cover = foilCover();
    if (cover) {
      cover.style.removeProperty("--foil-x");
      cover.style.removeProperty("--foil-y");
      cover.style.removeProperty("--foil-hx");
      cover.style.removeProperty("--foil-hy");
      cover.style.removeProperty("--foil-rx");
      cover.style.removeProperty("--foil-ry");
      cover.style.removeProperty("--foil-a");
    }
  }

  function armFoilSense() {
    if (foilLive) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function ask() {
      const ori = window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission;
      const mot = window.DeviceMotionEvent && DeviceMotionEvent.requestPermission;
      const go = function () { startFoilSense(); };
      if (typeof ori === "function") {
        ori.call(DeviceOrientationEvent).then(function (state) {
          if (state === "granted") go();
        }).catch(function () {});
      } else {
        go();
      }
      if (typeof mot === "function") {
        mot.call(DeviceMotionEvent).catch(function () {});
      }
    }
    if (foilArmed) {
      ask();
      return;
    }
    foilArmed = true;
    document.addEventListener("pointerdown", function once() {
      document.removeEventListener("pointerdown", once, true);
      ask();
    }, true);
    ask();
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
  }

  function paintStage(reader) {
    if (!stageBg) return;
    if (reader && reader.has_backdrop && reader.id) {
      stageBg.style.backgroundImage = "url(" + window.FamiGate.origin() + "/backdrop?person=" + encodeURIComponent(reader.id) + "&k=" + encodeURIComponent(key) + "&r=" + (reader.backdrop_rev || 0) + ")";
      stageBg.hidden = false;
      requestAnimationFrame(layoutStage);
    } else {
      stageBg.hidden = true;
      stageBg.style.backgroundImage = "";
    }
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
      if (!hostOn() && window.FamiHost && window.FamiHost.clearSelect) window.FamiHost.clearSelect();
      paintHostChrome();
      if (hostOn()) armFoilSense();
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
    if (window.FamiHost && window.FamiHost.bindTile && hostOn()) {
      window.FamiHost.bindTile(btn, item);
    }
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (item.kind === "folder" || item.kind === "org") {
        cwd = item.id;
        loadShelf(true);
        return;
      }
      if (item.kind === "job") return;
      if (!item.has_pages) return;
      openReader(item);
    });
    return btn;
  }

  function paintBack() {
    const inFolder = !!cwd;
    const modeBar = document.getElementById("mode-bar");
    if (hostOn()) {
      if (tagBoard) tagBoard.hidden = false;
      if (modeBar) modeBar.hidden = false;
      if (shelfBack) shelfBack.hidden = !inFolder;
      paintHostChrome();
      layoutStage();
      return;
    }
    if (tagBoard) tagBoard.hidden = !inFolder;
    if (modeBar) modeBar.hidden = true;
    if (shelfBack) shelfBack.hidden = !inFolder;
    paintHostChrome();
    layoutStage();
  }

  function ensureModes() {
    const bar = document.getElementById("mode-bar");
    if (!bar || bar.dataset.ready) return;
    bar.dataset.ready = "1";
    MODES.forEach(function (pair) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-btn" + (hostTab === pair[0] ? " is-on" : "");
      btn.dataset.mode = pair[0];
      btn.textContent = pair[1];
      btn.addEventListener("click", function () {
        hostTab = pair[0];
        cwd = "";
        parentCwd = "";
        bar.querySelectorAll(".mode-btn").forEach(function (el) {
          el.classList.toggle("is-on", el.dataset.mode === hostTab);
        });
        if (window.FamiHost && window.FamiHost.clearSelect) window.FamiHost.clearSelect();
        loadShelf(true);
      });
      bar.appendChild(btn);
    });
  }

  function viewKey() {
    return (hostOn() ? (hostTab || "all") : "list") + "|" + (cwd || "");
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
    if (hostOn() && window.FamiHost && window.FamiHost.afterPaint) window.FamiHost.afterPaint();
    return true;
  }

  function prefetchOtherTabs() {
    if (!hostOn() || cwd || prefetchOnce) return;
    prefetchOnce = true;
    ["all", "research", "title", "manga"].forEach(function (tab) {
      if (tab === hostTab) return;
      const path = "/api/host/shelf?offset=0&limit=" + LIMIT + "&tab=" + encodeURIComponent(tab);
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
    const tab = hostOn() ? "&tab=" + encodeURIComponent(hostTab || "all") : "";
    const path = hostOn()
      ? "/api/host/shelf?offset=" + reqOffset + "&limit=" + LIMIT + folder + tab
      : "/api/shelf?view=list&offset=" + reqOffset + "&limit=" + LIMIT + folder;
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
        return;
      }
      if (reset) resetFeed();
      paintBack();
      const start = offset;
      fresh.forEach(function (it, i) { feed.appendChild(tileEl(it, start + i)); });
      offset += fresh.length;
      paintProgress();
      rememberSnap();
      if (hostOn() && window.FamiHost && window.FamiHost.afterPaint) window.FamiHost.afterPaint();
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
      if (isGm) ensureModes();
      paintHostChrome();
      if (isGm && window.FamiHost) window.FamiHost.attach(key);
      setBoot(false, "");
      if (statusEl) statusEl.textContent = "";
      cwd = "";
      parentCwd = "";
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
    if (!file) return;
    const entry = document.querySelector('.settings-entry[data-job="backdrop"]');
    setJobRun(entry, true);
    setCabRun(true);
    try {
      const fd = new FormData();
      fd.append("backdrop", file);
      await fetch(window.FamiGate.origin() + "/api/backdrop?k=" + encodeURIComponent(key), { method: "POST", body: fd });
      const door = await window.FamiGate.api("/api/door", key, { timeout: 15000 });
      if (door.j && door.j.reader) renderMe(door.j.reader);
    } finally {
      setJobRun(entry, false);
      setCabRun(false);
      backdropInput.value = "";
    }
  });

  if (shelfBack) shelfBack.addEventListener("click", function (ev) {
    ev.preventDefault();
    cwd = parentCwd || "";
    loadShelf(true);
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
    appendTile: function (item, index) {
      if (!feed) return null;
      const el = tileEl(item, index || 0);
      feed.appendChild(el);
      return el;
    },
    setKind: function (kind) { hostTab = kind || "all"; },
    setTab: function (tab) { hostTab = tab || "all"; },
    setCabRun: setCabRun,
  };

  boot();
})();
