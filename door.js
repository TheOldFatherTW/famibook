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

  let key = "";
  let busy = false;
  let lastShelf = null;
  let filterTags = [];
  let mode = "all";
  let offset = 0;
  const LIMIT = 40;
  let loadingMore = false;
  let total = 0;

  function setBoot(on, text) {
    if (!hall) return;
    hall.classList.toggle("is-booting", !!on);
    hall.classList.toggle("with-feed", true);
    if (statusEl && text != null) statusEl.textContent = text;
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

  function tileEl(item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.dataset.id = item.id;
    const img = document.createElement("img");
    img.alt = item.title || "";
    img.src = window.FamiGate.origin() + "/thumb?book=" + encodeURIComponent(item.id) + "&k=" + encodeURIComponent(key);
    btn.appendChild(img);
    if (item.progress != null) {
      const bar = document.createElement("div");
      bar.className = "tile-progress";
      const fill = document.createElement("span");
      const pct = item.page_count ? Math.min(100, Math.round((item.progress / Math.max(item.page_count, 1)) * 100)) : 8;
      fill.style.width = Math.max(8, pct) + "%";
      bar.appendChild(fill);
      btn.appendChild(bar);
    }
    const cap = document.createElement("span");
    cap.className = "tile-label";
    cap.textContent = item.progress != null ? "看到 " + (item.progress + 1) : "";
    if (cap.textContent) btn.appendChild(cap);
    let hold = 0;
    let timer = 0;
    btn.addEventListener("pointerdown", () => {
      hold = Date.now();
      timer = setTimeout(() => {
        timer = 0;
        window.FamiTags.openBook(item);
      }, 520);
    });
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = 0;
    };
    btn.addEventListener("pointerup", cancel);
    btn.addEventListener("pointercancel", cancel);
    btn.addEventListener("click", (e) => {
      if (Date.now() - hold > 480) {
        e.preventDefault();
        return;
      }
      openReader(item.id);
    });
    return btn;
  }

  function openReader(bookId) {
    const url = window.FamiGate.origin() + "/read/?book=" + encodeURIComponent(bookId) + "&k=" + encodeURIComponent(key);
    location.href = url;
  }

  async function loadShelf(reset) {
    if (!feed) return;
    if (busy && !reset) return;
    if (reset) {
      offset = 0;
      feed.innerHTML = "";
    }
    loadingMore = true;
    const tags = filterTags.length ? "&tags=" + encodeURIComponent(filterTags.join(",")) : "";
    try {
      const x = await window.FamiGate.api("/api/shelf?offset=" + offset + "&limit=" + LIMIT + tags, key, { timeout: 20000 });
      if (!x.res.ok || !x.j) return;
      lastShelf = x.j;
      total = x.j.total || 0;
      (x.j.items || []).forEach((it) => feed.appendChild(tileEl(it)));
      offset += (x.j.items || []).length;
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

  window.FamiShelf = {
    reload: () => loadShelf(true),
    setFilter: (ids) => {
      filterTags = ids || [];
      mode = filterTags.length ? "list" : "all";
      document.getElementById("mode-all").classList.toggle("is-on", mode === "all");
      document.getElementById("mode-list").classList.toggle("is-on", mode === "list");
      loadShelf(true);
    },
    openReader: openReader,
    key: () => key,
  };

  boot();
})();
