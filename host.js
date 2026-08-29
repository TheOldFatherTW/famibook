(function () {
  const PLUS =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const TRASH =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V6.8A1.8 1.8 0 0 1 9.8 5h4.4A1.8 1.8 0 0 1 16 6.8V8M5 8h14M9 11v7M12 11v7M15 11v7M7 8l.8 12.2A1.6 1.6 0 0 0 9.4 22h5.2a1.6 1.6 0 0 0 1.6-1.8L17 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const FOLDER =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v10H4z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const HEART =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20C10.5 18.4 7.3 15.8 5.4 11.9C4 9.1 5.2 6 8.4 6c1.8 0 3 1.1 3.6 2.2C12.6 7.1 13.8 6 15.6 6c3.2 0 4.4 3.1 3 5.9C16.7 15.8 13.5 18.4 12 20Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  const CAMERA =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="8" width="17" height="11.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 8l1.4-2.4h5.2L16 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.6" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  const TEXT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10v15H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 8h5M9.5 12h5M9.5 16h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const DESK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="11" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 19h8M12 16v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const PAUSE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3v12H8zM13 6h3v12h-3z" fill="currentColor"/></svg>';
  const PLAY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l12 6-12 6z" fill="currentColor"/></svg>';
  const MAG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.2 15.2L20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const WORK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="12" height="15" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 4.5h6v2.2H9z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 11h6M9 14.5h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const REPORT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h8l3 3v12H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 4.5v3h3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 12h5M9.5 15.5h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const JOB_LABEL = {
    capture: "截取",
    series: "全套截取",
    generate: "文字",
    generate_research: "日常研究",
    generate_guide: "遊戲攻略",
    generate_steam: "遊戲研究",
    pdf: "PDF",
    cover: "封面",
    private_favorites: "擷取私藏",
  };

  let key = "";
  let attached = false;
  let selected = new Set();
  let selectMode = false;
  let actItem = null;
  let askFn = null;
  let form = null;
  let jobTimer = 0;
  let maskDown = null;
  let orgSnap = { folders: [], favorites: [] };
  let noteTimer = 0;
  let jobsBusy = false;
  let coverBusy = false;
  let coverWaitTimer = 0;

  function api(path, opts) {
    return window.FamiGate.api(path, key, Object.assign({ timeout: 20000 }, opts || {}));
  }

  function post(path, body, extra) {
    return api(path, Object.assign({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }, extra || {}));
  }

  function demandOk(x, fallback) {
    if (x && x.res && x.res.ok) return x;
    var msg = fallback || "做不到";
    if (x && x.j && x.j.error) msg = String(x.j.error);
    throw new Error(msg);
  }

  function cwd() {
    return (window.FamiShelf && window.FamiShelf.cwd && window.FamiShelf.cwd()) || "";
  }

  function tab() {
    return (window.FamiShelf && window.FamiShelf.tab && window.FamiShelf.tab()) || "all";
  }

  function catalog() {
    return (window.FamiShelf && window.FamiShelf.catalog && window.FamiShelf.catalog()) || {};
  }

  function reload() {
    if (window.FamiShelf && window.FamiShelf.reload) window.FamiShelf.reload();
  }

  function isJobs() {
    return tab() === "jobs";
  }

  function isDesktop() {
    return window.matchMedia("(pointer: fine)").matches && !/iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  }

  function isHost() {
    return !!(window.FamiShelf && window.FamiShelf.hostOn && window.FamiShelf.hostOn());
  }

  function closeSettings() {
    if (window.FamiShelf && window.FamiShelf.closeSettings) {
      window.FamiShelf.closeSettings();
      return;
    }
    const wrap = document.getElementById("album-settings");
    const menu = (wrap && wrap.querySelector(".settings-menu")) || document.querySelector(".settings-menu:not(#plus-menu)");
    const toggle = wrap && wrap.querySelector(".settings-toggle");
    if (menu) {
      menu.hidden = true;
      if (wrap && menu.parentNode !== wrap) wrap.appendChild(menu);
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.classList.remove("is-live");
    }
    document.documentElement.classList.remove("settings-open");
    const catcher = document.querySelector(".settings-catch");
    if (catcher) catcher.hidden = true;
  }

  function gearBtn(svg, label, job, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "settings-entry";
    btn.setAttribute("role", "menuitem");
    btn.dataset.job = job;
    btn.dataset.hostAdv = "1";
    const badge = document.createElement("span");
    badge.className = "ins-icon job-icon";
    badge.innerHTML = '<span class="ins-ring"></span><span class="ins-face">' + svg + "</span>";
    btn.appendChild(badge);
    const text = document.createElement("span");
    text.textContent = label;
    btn.appendChild(text);
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-run") || btn.disabled) return;
      closeSettings();
      onClick();
    });
    return btn;
  }

  function pickedItems() {
    const cat = catalog();
    const out = [];
    selected.forEach(function (id) {
      if (cat[id]) out.push(cat[id]);
    });
    return out;
  }

  function pagedBooks() {
    return pickedItems().filter(function (it) {
      return it && it.has_pages && it.kind !== "org" && it.kind !== "job";
    });
  }

  function gearMenu() {
    const wrap = document.getElementById("album-settings");
    const nested = wrap && wrap.querySelector(".settings-menu");
    if (nested) return nested;
    return document.querySelector(".settings-menu:not(#plus-menu)");
  }

  function syncGear() {
    const menu = gearMenu();
    if (!menu) return;
    menu.querySelectorAll("[data-host-adv]").forEach(function (n) { n.remove(); });
    if (!isHost()) return;
    const head = [];
    head.push(gearBtn(MAG, "找書", "find", openFind));
    head.push(gearBtn(WORK, "工作佇列", "jobs", function () {
      if (window.FamiShelf && window.FamiShelf.pickTab) window.FamiShelf.pickTab("jobs");
    }));
    head.push(gearBtn(REPORT, "研究報告", "research", function () {
      if (window.FamiShelf && window.FamiShelf.pickTab) window.FamiShelf.pickTab("research");
    }));
    const first = menu.firstChild;
    head.forEach(function (row) { menu.insertBefore(row, first); });
    paintHostGearIcons();
    const books = pickedItems().filter(function (it) {
      return it && it.kind !== "org" && it.kind !== "job";
    });
    // 封存：單本「這本…」操作卡、匯出 PDF、拍封面。enqueue("pdf"/"cover") 與工人仍在。
    const paged = pagedBooks();
    if (paged.length > 1) {
      menu.appendChild(gearBtn(TEXT, "文字", "text", function () {
        paged.forEach(function (it) { enqueue("generate", it.id, it.title); });
      }));
    }
    if (isDesktop() && books.length) {
      menu.appendChild(gearBtn(DESK, "在電腦開", "open", function () {
        books.forEach(function (it) { enqueue("open_folder", it.id, it.title); });
      }));
    }
  }

  function insButton(className, svg, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ins-icon " + className;
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.innerHTML = '<span class="ins-ring"></span><span class="ins-face">' + svg + "</span>";
    return btn;
  }

  function showRail(on) {
    const rail = document.getElementById("photo-rail");
    if (rail) rail.hidden = !on;
    document.documentElement.classList.toggle("has-rail", !!on);
    if (rail) {
      const host = isHost();
      const heart = rail.querySelector(".rail-heart");
      const folder = rail.querySelector(".rail-folder");
      const trash = rail.querySelector(".rail-trash");
      const cover = rail.querySelector(".rail-cover");
      if (heart) heart.hidden = isJobs();
      if (folder) {
        folder.hidden = !host || isJobs();
        folder.classList.toggle("is-off", !folderOk());
      }
      if (cover) {
        cover.hidden = !host || isJobs();
        cover.classList.toggle("is-off", !coverOk());
      }
      if (trash) trash.hidden = !host;
    }
  }

  function folderOk() {
    const items = pickedItems();
    const folders = items.filter(function (it) { return it && it.kind === "org"; });
    const books = items.filter(function (it) { return it && it.kind !== "job" && it.kind !== "org"; });
    if (folders.length >= 2 && !books.length) return false;
    return books.length > 0 || folders.length === 1;
  }

  function coverOk() {
    return pickedItems().some(function (it) {
      return it && it.kind !== "job" && it.kind !== "org";
    });
  }

  function flashNote(text) {
    const mask = document.getElementById("askMask");
    const p = document.getElementById("askText");
    const actions = mask && mask.querySelector(".ask-actions");
    if (!mask || !p) return;
    askFn = null;
    p.textContent = text;
    if (actions) actions.hidden = true;
    mask.classList.add("is-note");
    mask.classList.remove("is-out");
    mask.hidden = false;
    if (noteTimer) window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(function () {
      mask.classList.add("is-out");
      noteTimer = window.setTimeout(function () {
        if (!mask.classList.contains("is-note")) return;
        mask.hidden = true;
        mask.classList.remove("is-note", "is-out");
        if (actions) actions.hidden = false;
        noteTimer = 0;
      }, 280);
    }, 1600);
  }

  function setCoverWaitPct(n) {
    const pct = document.getElementById("waitPct");
    if (pct) pct.textContent = Math.max(0, Math.min(100, Math.round(n))) + "%";
  }

  function showCoverWait() {
    const mask = document.getElementById("waitMask");
    const head = document.getElementById("waitTitle");
    if (head) head.textContent = "更換封面中";
    setCoverWaitPct(0);
    if (mask) mask.hidden = false;
    if (coverWaitTimer) window.clearInterval(coverWaitTimer);
    coverWaitTimer = window.setInterval(function () {
      const pct = document.getElementById("waitPct");
      const n = parseInt((pct && pct.textContent) || "0", 10) || 0;
      if (n < 90) setCoverWaitPct(n + 1);
    }, 280);
  }

  function hideCoverWait() {
    const mask = document.getElementById("waitMask");
    if (mask) mask.hidden = true;
    if (coverWaitTimer) {
      window.clearInterval(coverWaitTimer);
      coverWaitTimer = 0;
    }
  }

  function postCoverFile(url, body, onPct) {
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

  function bindBookCoverInput() {
    const input = document.getElementById("book-cover-input");
    if (!input || input.dataset.ready) return;
    input.dataset.ready = "1";
    input.addEventListener("change", function () {
      const file = input.files && input.files[0];
      input.value = "";
      if (file) uploadBookCovers(file);
    });
  }

  function uploadBookCovers(file) {
    if (coverBusy || !file) return;
    const books = pickedItems().filter(function (it) {
      return it && it.kind !== "job" && it.kind !== "org";
    });
    if (!books.length) return;
    coverBusy = true;
    showCoverWait();
    const btn = document.querySelector(".rail-cover");
    if (btn) btn.classList.add("is-run");
    let chain = Promise.resolve();
    books.forEach(function (it) {
      chain = chain.then(function () {
        const fd = new FormData();
        fd.append("cover", file, file.name || "cover.jpg");
        return postCoverFile(
          window.FamiGate.origin() + "/api/host/cover?k=" + encodeURIComponent(key)
            + "&book=" + encodeURIComponent(it.id),
          fd,
          setCoverWaitPct
        );
      });
    });
    chain.then(function () {
      setCoverWaitPct(100);
      reload();
    }).catch(function () {
      flashNote("這張圖沒辦法當封面");
    }).finally(function () {
      hideCoverWait();
      coverBusy = false;
      if (btn) btn.classList.remove("is-run");
    });
  }

  function ensureRail() {
    const rail = document.getElementById("photo-rail");
    if (!rail || rail.dataset.ready) return rail;
    rail.dataset.ready = "1";
    const trash = insButton("rail-trash", TRASH, "丟掉");
    trash.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      confirmTrash();
    });
    const folder = insButton("rail-folder", FOLDER, "資料夾");
    folder.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!folderOk()) {
        flashNote("資料夾間無法合併");
        return;
      }
      openFolderSheet();
    });
    const cover = insButton("rail-cover", CAMERA, "換封面");
    cover.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!isHost() || isJobs()) return;
      if (!coverOk()) {
        flashNote("請先選一本書");
        return;
      }
      const input = document.getElementById("book-cover-input");
      if (!input) return;
      input.value = "";
      input.click();
    });
    const heart = insButton("rail-heart", HEART, "愛心");
    heart.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      toggleHeart();
    });
    rail.appendChild(trash);
    rail.appendChild(folder);
    rail.appendChild(cover);
    rail.appendChild(heart);
    return rail;
  }

  function bindMask(mask, closeFn) {
    if (!mask || mask.dataset.hostMask) return;
    mask.dataset.hostMask = "1";
    mask.addEventListener("pointerdown", function (ev) {
      maskDown = ev.target === mask;
    });
    mask.addEventListener("pointerup", function (ev) {
      if (maskDown && ev.target === mask) closeFn();
      maskDown = null;
    });
  }

  function bindSheets() {
    const findMask = document.getElementById("findMask");
    const actMask = document.getElementById("actMask");
    const findClose = document.getElementById("findClose");
    const actClose = document.getElementById("actClose");
    const askNo = document.getElementById("askNo");
    const askYes = document.getElementById("askYes");
    bindMask(findMask, closeFind);
    bindMask(actMask, closeAct);
    if (findClose) findClose.addEventListener("click", closeFind);
    if (actClose) actClose.addEventListener("click", closeAct);
    if (askNo) askNo.addEventListener("click", closeAsk);
    if (askYes) askYes.addEventListener("click", function () {
      const fn = askFn;
      closeAsk();
      if (fn) fn();
    });
  }

  function closeFind() {
    const mask = document.getElementById("findMask");
    if (mask) mask.hidden = true;
  }

  function openActTitle(text) {
    const title = document.getElementById("actTitle");
    if (title) title.textContent = text;
  }

  function openActBody() {
    const mask = document.getElementById("actMask");
    const body = document.getElementById("actBody");
    if (!mask || !body) return null;
    body.innerHTML = "";
    mask.hidden = false;
    return body;
  }

  function closeAct() {
    const mask = document.getElementById("actMask");
    if (mask) mask.hidden = true;
    actItem = null;
    form = null;
  }

  function openAsk(text, fn) {
    askFn = fn;
    const mask = document.getElementById("askMask");
    const p = document.getElementById("askText");
    const actions = mask && mask.querySelector(".ask-actions");
    if (noteTimer) {
      window.clearTimeout(noteTimer);
      noteTimer = 0;
    }
    if (p) p.textContent = text;
    if (actions) actions.hidden = false;
    if (mask) {
      mask.classList.remove("is-note", "is-out");
      mask.hidden = false;
    }
  }

  function closeAsk() {
    const mask = document.getElementById("askMask");
    if (mask) mask.hidden = true;
    askFn = null;
  }

  function addConfirm(body, fn, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-apply";
    btn.innerHTML = '<span class="tag-apply-face">' + (label || "確認") + "</span>";
    btn.addEventListener("click", fn);
    body.appendChild(btn);
  }

  function addToggle(body, spec) {
    const key = spec.key;
    if (form.data[key] === undefined) form.data[key] = !!spec.on;
    const lab = document.createElement("label");
    lab.className = "ask-skip";
    const name = document.createElement("span");
    name.textContent = spec.label || "";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("role", "switch");
    input.checked = !!form.data[key];
    const sw = document.createElement("span");
    sw.className = "ask-sw";
    lab.appendChild(name);
    lab.appendChild(input);
    lab.appendChild(sw);
    input.addEventListener("change", function () {
      form.data[key] = !!input.checked;
    });
    body.appendChild(lab);
    return input;
  }

  function chipRow(pairs, current, onPick) {
    const row = document.createElement("div");
    row.className = "tag-row";
    pairs.forEach(function (pair) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip" + (current === pair[0] ? " is-on" : "");
      chip.textContent = pair[1];
      chip.addEventListener("click", function () { onPick(pair[0], pair[1]); });
      row.appendChild(chip);
    });
    return row;
  }

  function plusMenuEl() {
    let menu = document.getElementById("plus-menu");
    if (menu) return menu;
    menu = document.createElement("div");
    menu.id = "plus-menu";
    menu.className = "settings-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.addEventListener("pointerdown", function (ev) {
      ev.stopPropagation();
    });
    document.body.appendChild(menu);
    return menu;
  }

  function closePlus() {
    const menu = document.getElementById("plus-menu");
    if (menu) menu.hidden = true;
  }

  function openPlus() {
    const menu = plusMenuEl();
    if (!menu.hidden) {
      closePlus();
      closeSettings();
      return;
    }
    closeSettings();
    form = null;
    actItem = { kind: "plus" };
    menu.innerHTML = "";
    [
      [TEXT, "截取書籍", "capture"],
      [TEXT, "擷取私藏", "private"],
      [REPORT, "日常研究", "research"],
      [WORK, "遊戲攻略", "guide"],
      [DESK, "遊戲研究", "steam"],
    ].forEach(function (row) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-entry";
      btn.setAttribute("role", "menuitem");
      const badge = document.createElement("span");
      badge.className = "ins-icon job-icon";
      badge.innerHTML = '<span class="ins-ring"></span><span class="ins-face">' + row[0] + "</span>";
      btn.appendChild(badge);
      const text = document.createElement("span");
      text.textContent = row[1];
      btn.appendChild(text);
      btn.addEventListener("click", function () {
        closePlus();
        closeSettings();
        startForm(row[2]);
      });
      menu.appendChild(btn);
    });
    const tile = document.querySelector("#feed .tile-add");
    document.body.appendChild(menu);
    menu.hidden = false;
    document.documentElement.classList.add("settings-open");
    if (window.FamiShelf && window.FamiShelf.showCatch) window.FamiShelf.showCatch();
    requestAnimationFrame(function () {
      if (window.FamiShelf && window.FamiShelf.placeMenu && tile) {
        window.FamiShelf.placeMenu(tile, menu);
      }
    });
  }

  function openFind() {
    const mask = document.getElementById("findMask");
    const body = document.getElementById("findBody");
    const title = mask && mask.querySelector(".batch-tag-head p");
    if (!mask || !body) return;
    if (title) title.textContent = "找書";
    body.innerHTML = "";
    const pending = { tab: tab() === "jobs" || tab() === "all" ? "title" : (tab() || "title"), q: "" };
    body.appendChild(chipRow(
      [["fav", "愛心"], ["title", "書籍"], ["manga", "漫畫"], ["research", "研究報告"]],
      pending.tab,
      function (kind) {
        pending.tab = kind;
        body.querySelectorAll(".tag-chip").forEach(function (el) {
          el.classList.toggle("is-on", el.textContent && (
            (kind === "fav" && el.textContent === "愛心") ||
            (kind === "research" && el.textContent === "研究報告") ||
            (kind === "title" && el.textContent === "書籍") ||
            (kind === "manga" && el.textContent === "漫畫")
          ));
        });
      }
    ));
    const row = document.createElement("div");
    row.className = "apple-row";
    const input = document.createElement("input");
    input.autocomplete = "off";
    input.setAttribute("aria-label", "書名");
    row.appendChild(input);
    body.appendChild(row);
    addConfirm(body, function () {
      pending.q = input.value || "";
      closeFind();
      if (window.FamiShelf && window.FamiShelf.setQuery) window.FamiShelf.setQuery(pending.q);
      if (window.FamiShelf && window.FamiShelf.setTab) window.FamiShelf.setTab(pending.tab);
      const bar = document.getElementById("mode-bar");
      if (bar) {
        bar.querySelectorAll(".mode-btn").forEach(function (el) {
          el.classList.toggle("is-on", el.dataset.mode === pending.tab);
        });
      }
      reload();
    }, "找書");
    mask.hidden = false;
    setTimeout(function () { input.focus(); }, 50);
  }

  function enterSelect(id) {
    selectMode = true;
    if (id) selected.add(id);
    paintPicks();
  }

  function togglePick(id) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    selectMode = selected.size > 0;
    paintPicks();
  }

  function clearSelect() {
    selected = new Set();
    selectMode = false;
    paintPicks();
  }

  function paintPicks() {
    document.querySelectorAll("#feed .tile").forEach(function (el) {
      el.classList.toggle("is-pick", selected.has(el.dataset.id));
    });
    showRail(selectMode && selected.size > 0);
    document.documentElement.classList.toggle("is-select", selectMode);
    syncGear();
  }

  function confirmTrash() {
    if (!isHost()) return;
    let items = pickedItems();
    if (!items.length) return;
    const jobsOnly = items.every(function (it) { return it.kind === "job"; });
    const orgsOnly = items.every(function (it) { return it.kind === "org"; });
    const inOrg = cwd().indexOf("org:") === 0;
    const books = items.filter(function (it) { return it.kind !== "job" && it.kind !== "org"; });
    let text = "丟掉選取的項目?";
    if (jobsOnly) {
      text = items.length === 1
        ? "取消「" + (items[0].title || "") + "」?"
        : "取消這些工作?";
    } else if (orgsOnly) text = "丟掉這些資料夾?裡頭的書還在。";
    else if (inOrg && books.length && items.every(function (it) { return it.kind !== "org"; })) {
      text = "從這個資料夾拿掉?";
    } else if (items.length === 1) {
      text = "丟掉「" + (items[0].title || "") + "」?";
    }
    openAsk(text, function () {
      runTrash(items, inOrg);
    });
  }

  function runTrash(items, inOrg) {
    const jobsOnly = items.every(function (it) { return it.kind === "job"; });
    const orgsOnly = items.every(function (it) { return it.kind === "org"; });
    const books = items.filter(function (it) { return it.kind !== "job" && it.kind !== "org"; });
    let chain = Promise.resolve();
    if (jobsOnly) {
      items.forEach(function (it) {
        chain = chain.then(function () {
          return post("/api/host/jobs", { op: "cancel", id: it.job_id || String(it.id || "").replace(/^job:/, "") }).then(function (x) {
            return demandOk(x, "取消失敗");
          });
        });
      });
    } else if (orgsOnly) {
      items.forEach(function (it) {
        chain = chain.then(function () {
          return post("/api/host/org", { op: "folder_delete", folder: it.id }).then(function (x) {
            return demandOk(x, "丟掉失敗");
          });
        });
      });
    } else if (inOrg && books.length) {
      chain = post("/api/host/org", {
        op: "unassign",
        folder: cwd(),
        books: books.map(function (it) { return it.id; }),
      }).then(function (x) {
        return demandOk(x, "拿掉失敗");
      });
    } else {
      books.forEach(function (it) {
        chain = chain.then(function () {
          return post("/api/host/item", { op: "delete", book: it.id }, { timeout: 120000 }).then(function (x) {
            return demandOk(x, "丟掉失敗");
          });
        });
      });
      items.filter(function (it) { return it.kind === "org"; }).forEach(function (it) {
        chain = chain.then(function () {
          return post("/api/host/org", { op: "folder_delete", folder: it.id }).then(function (x) {
            return demandOk(x, "丟掉失敗");
          });
        });
      });
    }
    chain.then(function () {
      clearSelect();
      reload();
    }).catch(function (err) {
      flashNote((err && err.message) || "丟掉失敗");
      clearSelect();
      reload();
    });
  }

  function toggleHeart() {
    const items = pickedItems().filter(function (it) { return it.kind !== "job"; });
    if (!items.length) return;
    const ids = items.map(function (it) { return it.id; });
    const allOn = items.every(function (it) { return it.favorite; });
    post("/api/favorite", { ids: ids, on: !allOn }).then(function () {
      clearSelect();
      reload();
    });
  }

  function openFolderSheet() {
    if (!isHost()) return;
    const books = pickedItems().filter(function (it) { return it.kind !== "job" && it.kind !== "org"; });
    const folders = pickedItems().filter(function (it) { return it.kind === "org"; });
    if (!books.length && !folders.length) return;
    if (folders.length >= 2 && !books.length) {
      flashNote("資料夾間無法合併");
      return;
    }
    if (!books.length && folders.length) {
      startForm("rename_org", folders[0]);
      return;
    }
    openActTitle("資料夾");
    const body = openActBody();
    if (!body) return;
    const picked = new Set(folders.map(function (it) { return it.id; }));
    const row = document.createElement("div");
    row.className = "tag-row";
    (orgSnap.folders || []).forEach(function (it) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip" + (picked.has(it.id) ? " is-on" : "");
      chip.textContent = it.title || "資料夾";
      chip.addEventListener("click", function () {
        if (picked.has(it.id)) picked.delete(it.id);
        else picked.add(it.id);
        chip.classList.toggle("is-on", picked.has(it.id));
      });
      row.appendChild(chip);
    });
    const make = document.createElement("button");
    make.type = "button";
    make.className = "tag-chip";
    make.textContent = "新建…";
    make.addEventListener("click", function () {
      startForm("new_org", { books: books.map(function (it) { return it.id; }) });
    });
    row.appendChild(make);
    body.appendChild(row);
    addConfirm(body, function () {
      const ids = Array.from(picked);
      if (!ids.length) {
        closeAct();
        return;
      }
      post("/api/host/org", {
        op: "assign",
        books: books.map(function (it) { return it.id; }),
        folders: ids,
      }).then(function (x) {
        demandOk(x, "放不進資料夾");
        closeAct();
        clearSelect();
        reload();
      }).catch(function (err) {
        flashNote((err && err.message) || "放不進資料夾");
      });
    });
  }

  function afterCreate(id) {
    const folder = cwd();
    if (!id || folder.indexOf("org:") !== 0) return Promise.resolve();
    return post("/api/host/org", { op: "assign", books: [id], folders: [folder] });
  }

  function enqueue(kind, book, title, extra) {
    const cover = document.querySelector("#cab-hud .cab-cover");
    if (cover) cover.classList.add("is-run");
    return post("/api/host/jobs", {
      op: "enqueue",
      kind: kind,
      book: book || "",
      title: title || "",
      extra: extra || {},
    }).then(function (x) {
      pollJobs();
      return x;
    });
  }

  function startForm(kind, item) {
    actItem = item || null;
    const steps = formSteps(kind, item);
    form = { kind: kind, item: item || null, steps: steps, idx: 0, data: {} };
    paintForm();
    const mask = document.getElementById("actMask");
    if (mask) mask.hidden = false;
  }

  function formSteps(kind, item) {
    if (kind === "capture") {
      return [
        { key: "title", label: "書名" },
        {
          key: "volume",
          label: "集號",
          toggle: { key: "allVolumes", label: "全套截取", on: true },
        },
      ];
    }
    if (kind === "private") {
      return [{ key: "go", label: "擷取私藏", confirmOnly: true }];
    }
    if (kind === "title") return [{ key: "title", label: "書名" }];
    if (kind === "folder") return [{ key: "title", label: "資料夾名稱" }];
    if (kind === "new_org") return [{ key: "title", label: "資料夾名稱" }];
    if (kind === "rename_org") return [{ key: "title", label: "名稱", value: item && item.title }];
    if (kind === "rename") return [{ key: "title", label: "書名", value: item && item.title }];
    if (kind === "batch_steam") return [{ key: "lines", label: "每行一本", area: true }];
    if (kind === "research") {
      return [
        { key: "title", label: "主題" },
        { key: "questions", label: "想搞懂" },
        { key: "depth", label: "深度", chips: ["深度研究"] },
      ];
    }
    if (kind === "guide") {
      return [
        { key: "title", label: "遊戲名" },
        { key: "volumes", label: "冊名，一行一本", area: true },
      ];
    }
    if (kind === "steam") {
      return [
        { key: "title", label: "遊戲名" },
        { key: "query", label: "AppID" },
      ];
    }
    return [];
  }

  function paintForm() {
    const title = document.getElementById("actTitle");
    const body = document.getElementById("actBody");
    if (!form || !body) return;
    const step = form.steps[form.idx];
    if (title) title.textContent = step.label;
    body.innerHTML = "";
    const err = document.createElement("p");
    err.className = "err";
    err.id = "hostFormErr";
    body.appendChild(err);
    if (step.confirmOnly) {
      addConfirm(body, function () { advance("1"); });
      return;
    }
    if (step.chips) {
      if (!form.data[step.key]) form.data[step.key] = step.chips[0];
      const row = document.createElement("div");
      row.className = "tag-row";
      step.chips.forEach(function (label) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "tag-chip" + (form.data[step.key] === label ? " is-on" : "");
        chip.textContent = label;
        chip.addEventListener("click", function () {
          form.data[step.key] = label;
          paintForm();
        });
        row.appendChild(chip);
      });
      body.appendChild(row);
      addConfirm(body, function () { advance(form.data[step.key] || step.chips[0]); });
      return;
    }
    const row = document.createElement("div");
    row.className = "apple-row";
    const input = step.area ? document.createElement("textarea") : document.createElement("input");
    if (!step.area) input.autocomplete = "off";
    input.value = form.data[step.key] || step.value || "";
    row.appendChild(input);
    const last = form.idx >= form.steps.length - 1;
    if (!last) {
      const next = document.createElement("button");
      next.type = "button";
      next.className = "apple-next";
      next.setAttribute("aria-label", "繼續");
      next.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="18"/><path d="M15.2 11.5L22.5 18l-7.3 6.5"/></svg>';
      next.addEventListener("click", function () { advance(input.value); });
      row.appendChild(next);
      body.appendChild(row);
    } else {
      body.appendChild(row);
      if (step.toggle) addToggle(body, step.toggle);
      addConfirm(body, function () { advance(input.value); });
    }
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !step.area) {
        ev.preventDefault();
        advance(input.value);
      }
    });
    setTimeout(function () { input.focus(); }, 50);
  }

  function advance(value) {
    if (!form) return;
    const step = form.steps[form.idx];
    form.data[step.key] = value;
    if (step.toggle) {
      const sw = document.querySelector("#actBody .ask-skip input");
      if (sw) form.data[step.toggle.key] = !!sw.checked;
    }
    if (form.idx < form.steps.length - 1) {
      form.idx += 1;
      paintForm();
      return;
    }
    submitForm();
  }

  function formErr(text) {
    const err = document.getElementById("hostFormErr");
    if (err) err.textContent = text;
  }

  function submitForm() {
    if (!form) return;
    const kind = form.kind;
    const data = form.data;
    const item = form.item;
    let req;
    if (kind === "private") {
      req = post("/api/host/item", { op: "private_favorites" }).then(function (x) {
        if (!x.res.ok) return x;
        if (window.FamiShelf && window.FamiShelf.setTab) window.FamiShelf.setTab("jobs");
        return x;
      });
    } else if (kind === "capture") {
      const vol = parseInt(data.volume, 10);
      const title = data.title || "";
      const jobKind = data.allVolumes === false ? "capture" : "series";
      req = post("/api/host/item", {
        op: "ensure_book",
        kind: "book",
        title: title,
        series: isNaN(vol) ? (data.series || "") : title,
        volume: isNaN(vol) ? null : vol,
        cwd: cwd(),
      }).then(function (x) {
        if (!x.res.ok) return x;
        const id = x.j && x.j.id;
        const made = (x.j && x.j.title) || title;
        const extra = {};
        return afterCreate(id).then(function () {
          return enqueue(jobKind, id, made, extra);
        }).then(function () { return x; });
      });
    } else if (kind === "title") {
      req = post("/api/host/item", {
        op: "create_book",
        kind: "title",
        title: data.title || "",
        cwd: cwd(),
      }).then(function (x) {
        if (!x.res.ok) return x;
        return afterCreate(x.j && x.j.id).then(function () { return x; });
      });
    } else if (kind === "research") {
      if (!(data.title || "").trim() && !(data.questions || "").trim()) {
        formErr("請寫主題或想搞懂");
        return;
      }
      req = post("/api/host/item", {
        op: "create_research",
        title: data.title || "",
        questions: data.questions || "",
        depth: data.depth === "深度研究" ? "SSR" : (data.depth || "SSR"),
        cwd: cwd(),
        start_queue: true,
      }).then(function (x) {
        if (!x.res.ok) return x;
        return afterCreate(x.j && x.j.id).then(function () { return x; });
      });
    } else if (kind === "guide") {
      if (!(data.title || "").trim()) {
        formErr("請寫遊戲名");
        return;
      }
      req = post("/api/host/item", {
        op: "create_guide",
        title: data.title || "",
        volumes: data.volumes || "",
        cwd: cwd(),
        start_queue: true,
      }).then(function (x) {
        if (!x.res.ok) return x;
        if (window.FamiShelf && window.FamiShelf.setTab) window.FamiShelf.setTab("research");
        return x;
      });
    } else if (kind === "steam") {
      req = post("/api/host/item", {
        op: "create_steam",
        title: data.title || "",
        query: data.query || data.title || "",
        cwd: cwd(),
        start_queue: true,
      }).then(function (x) {
        if (!x.res.ok) return x;
        return afterCreate(x.j && x.j.id).then(function () { return x; });
      });
    } else if (kind === "new_org") {
      req = post("/api/host/org", {
        op: "folder_create",
        title: data.title || "",
        books: (item && item.books) || [],
        tab: tab(),
      });
    } else if (kind === "folder") {
      req = post("/api/host/item", {
        op: "create_folder",
        name: data.title || "",
        cwd: cwd(),
      });
    } else if (kind === "rename" && item) {
      req = post("/api/host/item", { op: "rename", book: item.id, title: data.title || "" });
    } else if (kind === "batch_steam") {
      req = post("/api/host/item", {
        op: "batch_steam",
        lines: data.lines || "",
        cwd: cwd(),
        start_queue: true,
      });
    } else if (kind === "rename_org" && item) {
      req = post("/api/host/org", { op: "folder_rename", folder: item.id, title: data.title || "" });
    } else {
      return;
    }
    req.then(function (x) {
      if (!x.res.ok) {
        formErr((x.j && x.j.error) || "請再試一次");
        return;
      }
      closeAct();
      clearSelect();
      reload();
      pollJobs();
    }).catch(function () {
      formErr("家裡還沒開");
    });
  }

  function paintJobsHud(snap, reconcile) {
    const cover = document.querySelector("#cab-hud .cab-cover");
    const current = snap && snap.current;
    const queued = (snap && snap.queued) || [];
    const working = !!(current || queued.length);
    if (cover) cover.classList.toggle("is-run", working);
    const row = document.getElementById("job-stops");
    if (row) {
      row.hidden = true;
      row.innerHTML = "";
    }
    syncGear();
    if (reconcile && isJobs()) syncJobTiles(snap);
  }

  function pollJobs() {
    if (!attached || !key || !isHost()) return;
    api("/api/host/jobs", { timeout: 8000 }).then(function (x) {
      if (x.res.ok && x.j) paintJobsHud(x.j, true);
      armPoll(x && x.j);
    }).catch(function () {
      armPoll(null);
    });
  }

  function armPoll(snap) {
    if (jobTimer) window.clearTimeout(jobTimer);
    const busy = !!(snap && snap.current);
    const ms = busy ? 800 : isJobs() ? 1500 : 4000;
    jobTimer = window.setTimeout(pollJobs, ms);
  }

  function jobStateLabel(item) {
    if (!item) return "";
    if (item.state === "running") return item.phase || JOB_LABEL[item.job_kind] || "進行中";
    if (item.state === "paused") return "已暫停";
    if (item.state === "error") return item.error || "失敗";
    if (item.state === "queued" || item.state === "held") return "排隊中";
    if (item.state === "done") return item.phase || "工作完成";
    return "尚未開始";
  }

  function jobFromRow(row) {
    return {
      id: "job:" + row.id,
      job_id: row.id,
      book: row.book,
      cover_book: row.book,
      title: row.title || JOB_LABEL[row.kind] || "工作",
      kind: "job",
      job_kind: row.kind,
      state: row.state,
      percent: row.percent,
      phase: row.phase || "",
      ack: row.ack,
      error: row.error || "",
      has_cover: !!row.has_cover,
      has_pages: false,
      pinned: row.state === "running",
      favorite: false,
    };
  }

  function decorateJob(el, item) {
    if (!el || !item || item.kind !== "job") return;
    el.classList.add("is-job");
    el.classList.toggle("is-run", item.state === "running");
    el.classList.toggle("is-pinned", item.state === "running");
    const img = el.querySelector("img");
    if (img && !item.has_cover) {
      img.removeAttribute("src");
      img.hidden = true;
    }
    const badge = el.querySelector(".tile-pct");
    if (badge) badge.hidden = true;
    const leftover = el.querySelector(".tile-ring");
    if (leftover) leftover.remove();
    let hud = el.querySelector(".tile-job-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.className = "tile-job-hud hp";
      hud.innerHTML =
        '<div class="hp-label">' +
        '<span class="hp-text"></span>' +
        '<span class="hp-alt"><span class="hp-alt-pct"></span></span>' +
        '<div class="thinking-five hp-think" aria-hidden="true" hidden>' +
        "<span></span><span></span><span></span><span></span><span></span></div></div>" +
        '<div class="hp-meter" hidden><div class="hp-track"><div class="hp-fill"></div></div></div>';
      el.appendChild(hud);
    }
    const running = item.state === "running";
    const paused = item.state === "paused";
    const failed = item.state === "error";
    const done = item.state === "done" && item.ack === false;
    const pct = Math.max(0, Math.min(100, Number(item.percent) || 0));
    const showBar = !done && (running || (paused && pct > 0));
    hud.classList.toggle("is-run", running);
    hud.classList.toggle("is-done", done);
    const label = hud.querySelector(".hp-label");
    const text = hud.querySelector(".hp-text");
    const think = hud.querySelector(".thinking-five");
    const meter = hud.querySelector(".hp-meter");
    const fill = hud.querySelector(".hp-fill");
    const alt = hud.querySelector(".hp-alt");
    const altPct = hud.querySelector(".hp-alt-pct");
    if (label) label.hidden = done;
    if (text) text.textContent = done ? "" : jobStateLabel(item);
    if (think) think.hidden = !running;
    if (meter) meter.hidden = !showBar;
    if (fill) fill.style.width = pct + "%";
    if (alt) alt.hidden = !showBar;
    if (altPct) altPct.textContent = pct + "%";
    let doneBtn = hud.querySelector("button.tag-apply");
    if (done) {
      if (!doneBtn) {
        doneBtn = document.createElement("button");
        doneBtn.type = "button";
        doneBtn.className = "tag-apply";
        doneBtn.innerHTML = '<span class="tag-apply-face">工作完成</span>';
        doneBtn.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          const id = doneBtn.dataset.jobId || "";
          if (!id) return;
          post("/api/host/jobs", { op: "cancel", id: id }).then(function () {
            if (isJobs()) loadJobs(true);
            else pollJobs();
          });
        });
        hud.appendChild(doneBtn);
      }
      doneBtn.dataset.jobId = item.job_id || "";
      doneBtn.hidden = false;
    } else if (doneBtn) {
      doneBtn.hidden = true;
    }
    let ctrl = el.querySelector(".job-ctrl");
    const canPause = running;
    const canPlay = paused || failed;
    if (!canPause && !canPlay) {
      if (ctrl) ctrl.remove();
      return;
    }
    const svg = canPause ? PAUSE : PLAY;
    const ctrlLabel = canPause ? "暫停" : "開始";
    if (!ctrl) {
      ctrl = insButton("job-ctrl", svg, ctrlLabel);
      ctrl.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const id = item.job_id || String(el.dataset.id || "").replace(/^job:/, "");
        const op = el.classList.contains("is-run") ? "pause" : "play";
        post("/api/host/jobs", { op: op, id: id }).then(function () {
          if (isJobs()) loadJobs(true);
          else pollJobs();
        });
      });
      el.appendChild(ctrl);
    } else {
      const face = ctrl.querySelector(".ins-face");
      if (face) face.innerHTML = svg;
      ctrl.setAttribute("aria-label", ctrlLabel);
      ctrl.title = ctrlLabel;
    }
  }

  function tilesExceptPlus() {
    return Array.prototype.slice.call(document.querySelectorAll("#feed .tile:not(.tile-add)"));
  }

  function syncJobTiles(snap) {
    if (jobsBusy) return;
    const rows = (snap && snap.active) || [];
    const tiles = tilesExceptPlus();
    if (tiles.length !== rows.length) {
      loadJobs(true);
      return;
    }
    const map = {};
    rows.forEach(function (row) { map["job:" + row.id] = row; });
    for (let i = 0; i < tiles.length; i += 1) {
      if (!map[tiles[i].dataset.id]) {
        loadJobs(true);
        return;
      }
    }
    tiles.forEach(function (el) {
      const row = map[el.dataset.id];
      if (!row) return;
      const item = jobFromRow(row);
      catalog()[item.id] = item;
      decorateJob(el, item);
    });
  }

  function loadJobs(reset) {
    const feed = document.getElementById("feed");
    if (!feed) return Promise.resolve();
    if (jobsBusy) return Promise.resolve();
    jobsBusy = true;
    return api("/api/host/jobs", { timeout: 12000 }).then(function (x) {
      if (!x.res.ok || !x.j) return;
      if (window.FamiShelf && window.FamiShelf.tab && window.FamiShelf.tab() !== "jobs") return;
      if (window.FamiShelf && window.FamiShelf.hostOn && !window.FamiShelf.hostOn()) return;
      paintJobsHud(x.j, false);
      const rows = x.j.active || [];
      if (!reset) {
        const tiles = tilesExceptPlus();
        const map = {};
        rows.forEach(function (row) { map["job:" + row.id] = row; });
        let same = tiles.length === rows.length;
        if (same) {
          tiles.forEach(function (el) {
            if (!map[el.dataset.id]) same = false;
          });
        }
        if (same) {
          tiles.forEach(function (el) {
            const row = map[el.dataset.id];
            if (!row) return;
            const item = jobFromRow(row);
            catalog()[item.id] = item;
            decorateJob(el, item);
          });
          paintPlus();
          paintPicks();
          if (window.FamiShelf && window.FamiShelf.remember) window.FamiShelf.remember();
          return;
        }
      }
      if (window.FamiShelf && window.FamiShelf.resetFeed) window.FamiShelf.resetFeed();
      rows.forEach(function (row, i) {
        const item = jobFromRow(row);
        if (window.FamiShelf && window.FamiShelf.appendTile) {
          const el = window.FamiShelf.appendTile(item, i);
          decorateJob(el, item);
        }
      });
      paintPlus();
      paintPicks();
      if (window.FamiShelf && window.FamiShelf.remember) window.FamiShelf.remember();
    }).finally(function () {
      jobsBusy = false;
      paintHostGearIcons();
    });
  }

  function paintPlus() {
    const feed = document.getElementById("feed");
    if (!feed) return;
    const old = feed.querySelector(".tile-add");
    if (old) old.remove();
    if (window.FamiShelf && window.FamiShelf.hostOn && !window.FamiShelf.hostOn()) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile tile-add";
    btn.dataset.id = "__plus__";
    btn.setAttribute("aria-label", "佔位框");
    const plus = document.createElement("span");
    plus.className = "tile-plus";
    plus.innerHTML = PLUS;
    btn.appendChild(plus);
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      openPlus();
    });
    feed.appendChild(btn);
  }

  function refreshOrg() {
    if (!isHost()) return Promise.resolve();
    return api("/api/host/org", { timeout: 8000 }).then(function (x) {
      if (x.res.ok && x.j) orgSnap = x.j;
    }).catch(function () {});
  }

  function paintHostGearIcons() {
    const menu = gearMenu();
    if (!menu) return;
    const jobsBadge = menu.querySelector('.settings-entry[data-job="jobs"] .ins-icon');
    if (jobsBadge) jobsBadge.classList.toggle("is-run", isJobs());
    const researchBadge = menu.querySelector('.settings-entry[data-job="research"] .ins-icon');
    if (researchBadge) researchBadge.classList.toggle("is-run", tab() === "research");
  }

  function afterPaint() {
    paintPlus();
    paintPicks();
    refreshOrg();
    paintHostGearIcons();
    const row = document.getElementById("job-stops");
    if (row) {
      row.hidden = true;
      row.innerHTML = "";
    }
  }

  function bindTile(btn, item) {
    if (!btn || !item || item.kind === "plus") return;
    let press = 0;
    let sx = 0;
    let sy = 0;
    let fromHold = false;
    function clearPress() {
      if (press) {
        window.clearTimeout(press);
        press = 0;
      }
    }
    btn.addEventListener("pointerdown", function (ev) {
      if (ev.button && ev.button !== 0) return;
      if (ev.target && ev.target.closest && ev.target.closest(".job-ctrl, .tag-apply")) return;
      sx = ev.clientX;
      sy = ev.clientY;
      fromHold = false;
      clearPress();
      press = window.setTimeout(function () {
        press = 0;
        fromHold = true;
        if (selectMode) togglePick(item.id);
        else enterSelect(item.id);
      }, 400);
    });
    btn.addEventListener("pointermove", function (ev) {
      if (!press) return;
      if (Math.abs(ev.clientX - sx) > 14 || Math.abs(ev.clientY - sy) > 14) clearPress();
    });
    btn.addEventListener("pointerup", clearPress);
    btn.addEventListener("pointercancel", clearPress);
    ["contextmenu", "selectstart", "dragstart"].forEach(function (name) {
      btn.addEventListener(name, function (ev) {
        ev.preventDefault();
      }, true);
    });
    btn.addEventListener("click", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest(".job-ctrl, .tag-apply")) {
        ev.stopImmediatePropagation();
        return;
      }
      if (fromHold) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        return;
      }
      if (selectMode) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        togglePick(item.id);
      }
    }, true);
  }

  function attach(token) {
    key = token;
    ensureRail();
    bindBookCoverInput();
    if (attached) {
      syncGear();
      return;
    }
    attached = true;
    bindSheets();
    syncGear();
    refreshOrg();
    if (jobTimer) window.clearTimeout(jobTimer);
    pollJobs();
  }

  window.FamiHost = {
    attach: attach,
    bindTile: bindTile,
    openPlus: openPlus,
    closePlus: closePlus,
    isSelect: function () { return selectMode; },
    clearSelect: clearSelect,
    afterPaint: afterPaint,
    syncGear: syncGear,
    loadJobs: loadJobs,
    paintPlus: paintPlus,
    kind: function () { return tab(); },
  };
})();
