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
  const gearBtn = document.getElementById("gear-btn");
  const coverInput = document.getElementById("cover-input");
  const modeAll = document.getElementById("mode-all");
  const modeList = document.getElementById("mode-list");
  const modeFind = document.getElementById("mode-find");

  let key = "";
  let busy = false;
  let lastShelf = null;
  let filterTags = [];
  let mode = "list";
  let cwd = "";
  let offset = 0;
  const LIMIT = 40;
  const FIRST = 12;
  const THUMB_CAP = 6;
  const THUMB_CACHE = "famibook-thumbs-v1";
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
  }

  function paintProgress() {
    if (!feed) return;
    feed.querySelectorAll(".tile").forEach(function (el) {
      const item = catalog[el.dataset.id];
      const barWrap = el.querySelector(".tile-progress");
      const bar = el.querySelector(".tile-progress > span");
      if (!item || item.kind === "folder" || !barWrap || !bar) {
        if (barWrap) barWrap.hidden = true;
        return;
      }
      const pages = Number(item.page_count) || 0;
      const pos = item.progress;
      if (pages > 0 && pos != null && pos > 0) {
        barWrap.hidden = false;
        bar.style.width = Math.max(2, Math.min(100, ((Number(pos) + 1) / pages) * 100)) + "%";
      } else {
        barWrap.hidden = true;
      }
    });
  }

  function openReader(item) {
    if (!item || item.kind === "folder") return;
    const token = key;
    location.href = "./read.html?book=" + encodeURIComponent(item.id)
      + "&k=" + encodeURIComponent(token)
      + "#k=" + encodeURIComponent(token);
  }

  function thumbUrl(item) {
    return window.FamiGate.origin() + "/thumb?book=" + encodeURIComponent(item.id) + "&k=" + encodeURIComponent(key);
  }

  function thumbKey(item) {
    const base = location.origin || "https://famibook.local";
    return base + "/famibook-t/" + encodeURIComponent(item.id);
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
    const bar = document.createElement("div");
    bar.className = "tile-progress";
    const fill = document.createElement("span");
    fill.style.width = "0%";
    bar.appendChild(fill);
    btn.appendChild(bar);
    const pages = Number(item.page_count) || 0;
    const pos = item.progress;
    if (item.kind !== "folder" && pages > 0 && pos != null && pos > 0) {
      bar.hidden = false;
      fill.style.width = Math.max(2, Math.min(100, ((Number(pos) + 1) / pages) * 100)) + "%";
    } else {
      bar.hidden = true;
    }
    const cap = document.createElement("span");
    cap.className = "tile-label";
    cap.textContent = item.title || "";
    btn.appendChild(cap);
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
    if (modeFind) modeFind.classList.toggle("is-on", false);
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
    const tags = filterTags.length ? "&tags=" + encodeURIComponent(filterTags.join(",")) : "";
    const view = mode === "list" ? "list" : "all";
    const folder = mode === "list" && cwd ? "&cwd=" + encodeURIComponent(cwd) : "";
    try {
      const x = await window.FamiGate.api(
        "/api/shelf?view=" + view + "&offset=" + offset + "&limit=" + LIMIT + tags + folder,
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

  if (gearBtn) gearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById("gear-menu");
    if (!menu) return;
    if (menu.parentNode !== document.body) document.body.appendChild(menu);
    menu.hidden = !menu.hidden;
    const r = gearBtn.getBoundingClientRect();
    menu.style.left = Math.max(12, r.right - 200) + "px";
    menu.style.top = r.bottom + 8 + "px";
  });
  const actCover = document.getElementById("act-cover");
  if (actCover) actCover.addEventListener("click", () => {
    const menu = document.getElementById("gear-menu");
    if (menu) menu.hidden = true;
    if (coverInput) coverInput.click();
  });
  const actClear = document.getElementById("act-clear");
  if (actClear) actClear.addEventListener("click", async () => {
    const menu = document.getElementById("gear-menu");
    if (menu) menu.hidden = true;
    if (!confirm("清掉你的標籤和看到第幾頁？書還在。")) return;
    await window.FamiGate.api("/api/me/clear", key, { method: "POST", timeout: 15000 });
    loadShelf(true);
  });
  if (coverInput) coverInput.addEventListener("change", async () => {
    const file = coverInput.files && coverInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("cover", file);
    await fetch(window.FamiGate.origin() + "/api/cover?k=" + encodeURIComponent(key), { method: "POST", body: fd });
    const door = await window.FamiGate.api("/api/door", key, { timeout: 15000 });
    if (door.j && door.j.reader) renderMe(door.j.reader);
  });

  if (modeAll) modeAll.addEventListener("click", function () {
    filterTags = [];
    cwd = "";
    mode = "all";
    loadShelf(true);
  });
  if (modeList) modeList.addEventListener("click", function () {
    filterTags = [];
    cwd = "";
    mode = "list";
    loadShelf(true);
  });

  window.FamiShelf = {
    reload: () => loadShelf(true),
    setFilter: (ids) => {
      filterTags = ids || [];
      cwd = "";
      mode = "all";
      loadShelf(true);
    },
    key: () => key,
    setCabRun: setCabRun,
  };

  boot();
})();
