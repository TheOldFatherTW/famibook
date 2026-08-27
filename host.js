(function () {
  const PLUS =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const TRASH =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V6.8A1.8 1.8 0 0 1 9.8 5h4.4A1.8 1.8 0 0 1 16 6.8V8M5 8h14M9 11v7M12 11v7M15 11v7M7 8l.8 12.2A1.6 1.6 0 0 0 9.4 22h5.2a1.6 1.6 0 0 0 1.6-1.8L17 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const FOLDER =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v10H4z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const HEART =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 20C10.5 18.4 5.5 15.8 3.6 11.9C2.2 9.1 3.4 6 6.6 6c1.8 0 3 1.1 3.6 2.2C10.8 7.1 12 6 13.8 6c3.2 0 4.4 3.1 3 5.9C15.4 15.8 13.9 18.4 12.2 20Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  const TEXT =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10v15H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 8h5M9.5 12h5M9.5 16h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const PDF =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8h7l4 4v12.4H7z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 3.8v4h4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const DESK =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="11" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 19h8M12 16v3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const PAUSE =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h3v12H8zM13 6h3v12h-3z" fill="currentColor"/></svg>';
  const PLAY =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l12 6-12 6z" fill="currentColor"/></svg>';
  const MAG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.2 15.2L20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const JOB_LABEL = {
    capture: "截取",
    series: "全套截取",
    generate: "文字",
    generate_research: "日常研究",
    generate_steam: "遊戲研究",
    pdf: "PDF",
    cover: "封面",
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

  function api(path, opts) {
    return window.FamiGate.api(path, key, Object.assign({ timeout: 20000 }, opts || {}));
  }

  function post(path, body) {
    return api(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
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

  function closeSettings() {
    const wrap = document.getElementById("album-settings");
    const menu = wrap && wrap.querySelector(".settings-menu");
    const toggle = wrap && wrap.querySelector(".settings-toggle");
    if (menu) menu.hidden = true;
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

  function syncGear() {
    const menu = document.querySelector("#album-settings .settings-menu");
    if (!menu) return;
    menu.querySelectorAll("[data-host-adv]").forEach(function (n) { n.remove(); });
    const head = [];
    head.push(gearBtn(MAG, "找書", "find", openFind));
    const first = menu.firstChild;
    head.forEach(function (row) { menu.insertBefore(row, first); });
    const books = pickedItems().filter(function (it) {
      return it && it.kind !== "org" && it.kind !== "job";
    });
    if (books.length === 1) {
      menu.appendChild(gearBtn(TEXT, "這本…", "this", function () {
        openActFor(books[0]);
      }));
    }
    const paged = pagedBooks();
    if (paged.length > 1) {
      menu.appendChild(gearBtn(TEXT, "文字", "text", function () {
        paged.forEach(function (it) { enqueue("generate", it.id, it.title); });
      }));
      menu.appendChild(gearBtn(PDF, "PDF", "pdf", function () {
        paged.forEach(function (it) { enqueue("pdf", it.id, it.title); });
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
      const heart = rail.querySelector(".rail-heart");
      const folder = rail.querySelector(".rail-folder");
      if (heart) heart.hidden = isJobs();
      if (folder) {
        folder.hidden = isJobs();
        folder.classList.toggle("is-off", !folderOk());
      }
    }
  }

  function folderOk() {
    const items = pickedItems();
    const folders = items.filter(function (it) { return it && it.kind === "org"; });
    const books = items.filter(function (it) { return it && it.kind !== "job" && it.kind !== "org"; });
    if (folders.length >= 2 && !books.length) return false;
    return books.length > 0 || folders.length === 1;
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
    const heart = insButton("rail-heart", HEART, "愛心");
    heart.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      toggleHeart();
    });
    rail.appendChild(trash);
    rail.appendChild(folder);
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

  function openPlus() {
    form = null;
    actItem = { kind: "plus" };
    openActTitle("新增");
    const body = openActBody();
    if (!body) return;
    const box = document.createElement("div");
    box.className = "tag-row";
    [
      ["capture", "截取書籍"],
      ["folder", "資料夾"],
      ["research", "日常研究"],
      ["steam", "遊戲研究"],
      ["batch_steam", "批次遊戲"],
      ["title", "一般書籍"],
    ].forEach(function (pair) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip";
      chip.textContent = pair[1];
      chip.addEventListener("click", function () { startForm(pair[0]); });
      box.appendChild(chip);
    });
    body.appendChild(box);
  }

  function openFind() {
    const mask = document.getElementById("findMask");
    const body = document.getElementById("findBody");
    const title = mask && mask.querySelector(".batch-tag-head p");
    if (!mask || !body) return;
    if (title) title.textContent = "找書";
    body.innerHTML = "";
    const pending = { tab: tab() || "all", q: "" };
    body.appendChild(chipRow(
      [["all", "所有"], ["research", "研究"], ["title", "書籍"], ["manga", "漫畫"], ["jobs", "工作"]],
      pending.tab,
      function (kind) {
        pending.tab = kind;
        body.querySelectorAll(".tag-chip").forEach(function (el) {
          el.classList.toggle("is-on", el.textContent && (
            (kind === "all" && el.textContent === "所有") ||
            (kind === "research" && el.textContent === "研究") ||
            (kind === "title" && el.textContent === "書籍") ||
            (kind === "manga" && el.textContent === "漫畫") ||
            (kind === "jobs" && el.textContent === "工作")
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

  function onTileClick(item) {
    if (!item || item.kind === "job" || item.kind === "folder" || item.kind === "org") return false;
    if (item.has_pages) return false;
    openActFor(item);
    return true;
  }

  function openActFor(item) {
    if (!item) return;
    if (item.kind === "job") return;
    form = null;
    actItem = item;
    if (item.kind === "org") {
      openActTitle(item.title || "資料夾");
      paintActActions(item);
      return;
    }
    openActTitle(item.title || "操作");
    paintActActions(item);
  }

  function actChip(label, fn) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip";
    chip.textContent = label;
    chip.addEventListener("click", fn);
    return chip;
  }

  function paintActActions(item) {
    const body = openActBody();
    if (!body) return;
    const box = document.createElement("div");
    box.className = "tag-row";
    const kind = item.kind || "";
    if (kind === "org" || kind === "folder") {
      box.appendChild(actChip("拍封面", function () { enqueue("cover", item.id, item.title); closeAct(); }));
      box.appendChild(actChip("更改名稱", function () { startForm("rename_org", item); }));
      box.appendChild(actChip("丟掉", function () {
        closeAct();
        selected = new Set([item.id]);
        selectMode = true;
        confirmTrash();
      }));
      body.appendChild(box);
      return;
    }
    if (kind === "research") {
      box.appendChild(actChip("繼續研究", function () {
        enqueue("generate_research", item.id, item.title);
        closeAct();
      }));
    } else if (kind === "steam") {
      box.appendChild(actChip("重新生成", function () {
        enqueue("generate_steam", item.id, item.title);
        closeAct();
      }));
    } else {
      box.appendChild(actChip("開始擷取", function () { startCaptureFlow(item); }));
      box.appendChild(actChip("新增下一集", function () {
        post("/api/host/item", { op: "next_volume", book: item.id }).then(function (x) {
          closeAct();
          reload();
          if (x.j && x.j.id) afterCreate(x.j.id);
        });
      }));
      box.appendChild(actChip(item.reverse_turn ? "翻頁：左翻" : "翻頁：右翻", function () {
        post("/api/host/item", { op: "toggle_turn", book: item.id }).then(function (x) {
          if (x.res.ok && x.j) {
            item.reverse_turn = !!x.j.reverse_turn;
            flashNote(item.reverse_turn ? "左翻 ←" : "右翻 →");
            paintActActions(item);
          }
        });
      }));
    }
    box.appendChild(actChip("生成文字", function () { enqueue("generate", item.id, item.title); closeAct(); }));
    box.appendChild(actChip("匯出 PDF", function () { enqueue("pdf", item.id, item.title); closeAct(); }));
    box.appendChild(actChip("拍封面", function () { enqueue("cover", item.id, item.title); closeAct(); }));
    box.appendChild(actChip("移至資料夾", function () {
      closeAct();
      selected = new Set([item.id]);
      selectMode = true;
      paintPicks();
      openFolderSheet();
    }));
    box.appendChild(actChip("更改書名", function () { startForm("rename", item); }));
    box.appendChild(actChip("丟掉", function () {
      closeAct();
      selected = new Set([item.id]);
      selectMode = true;
      confirmTrash();
    }));
    if (isDesktop()) {
      box.appendChild(actChip("在電腦開", function () {
        enqueue("open_folder", item.id, item.title);
        closeAct();
      }));
    }
    body.appendChild(box);
  }

  function startCaptureFlow(item) {
    openActTitle("開始擷取");
    const body = openActBody();
    if (!body) return;
    const box = document.createElement("div");
    box.className = "tag-row";
    [["capture", "這一本"], ["series", "全套"]].forEach(function (pair) {
      box.appendChild(actChip(pair[1], function () {
        if (item.has_reader_url) {
          enqueue(pair[0], item.id, item.title);
          closeAct();
          return;
        }
        askReaderUrl(item, pair[0]);
      }));
    });
    body.appendChild(box);
  }

  function askReaderUrl(item, kind) {
    form = {
      kind: "reader_url",
      item: item,
      steps: [{ key: "url", label: "閱讀網址" }],
      idx: 0,
      data: { jobKind: kind },
    };
    paintForm();
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
    let items = pickedItems();
    if (!items.length) return;
    const jobsOnly = items.every(function (it) { return it.kind === "job"; });
    const orgsOnly = items.every(function (it) { return it.kind === "org"; });
    const inOrg = cwd().indexOf("org:") === 0;
    const books = items.filter(function (it) { return it.kind !== "job" && it.kind !== "org"; });
    let text = "丟掉選取的項目?";
    if (jobsOnly) {
      const waiting = items.filter(function (it) { return it.state !== "running"; });
      if (!waiting.length) {
        openAsk("進行中的工作不能丟掉", function () {});
        return;
      }
      text = "取消這些工作?";
      items = waiting;
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
          return post("/api/host/jobs", { op: "cancel", id: it.job_id || String(it.id || "").replace(/^job:/, "") });
        });
      });
    } else if (orgsOnly) {
      items.forEach(function (it) {
        chain = chain.then(function () {
          return post("/api/host/org", { op: "folder_delete", folder: it.id });
        });
      });
    } else if (inOrg && books.length) {
      chain = post("/api/host/org", {
        op: "unassign",
        folder: cwd(),
        books: books.map(function (it) { return it.id; }),
      });
    } else {
      books.forEach(function (it) {
        chain = chain.then(function () {
          return post("/api/host/item", { op: "delete", book: it.id });
        });
      });
      items.filter(function (it) { return it.kind === "org"; }).forEach(function (it) {
        chain = chain.then(function () {
          return post("/api/host/org", { op: "folder_delete", folder: it.id });
        });
      });
    }
    chain.then(function () {
      clearSelect();
      reload();
    });
  }

  function toggleHeart() {
    const items = pickedItems().filter(function (it) { return it.kind !== "job"; });
    if (!items.length) return;
    const ids = items.map(function (it) { return it.id; });
    const allOn = items.every(function (it) { return it.favorite; });
    post("/api/host/org", { op: "favorite", ids: ids, on: !allOn }).then(function () {
      clearSelect();
      reload();
    });
  }

  function openFolderSheet() {
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
      }).then(function () {
        closeAct();
        clearSelect();
        reload();
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
        { key: "series", label: "系列" },
        { key: "volume", label: "集號" },
        { key: "url", label: "閱讀網址" },
      ];
    }
    if (kind === "title") return [{ key: "title", label: "書名" }];
    if (kind === "folder") return [{ key: "title", label: "資料夾名稱" }];
    if (kind === "new_org") return [{ key: "title", label: "資料夾名稱" }];
    if (kind === "rename_org") return [{ key: "title", label: "名稱", value: item && item.title }];
    if (kind === "rename") return [{ key: "title", label: "書名", value: item && item.title }];
    if (kind === "reader_url") return [{ key: "url", label: "閱讀網址" }];
    if (kind === "batch_steam") return [{ key: "lines", label: "每行一本", area: true }];
    if (kind === "research") {
      return [
        { key: "title", label: "主題" },
        { key: "questions", label: "想搞懂" },
        { key: "depth", label: "深度", chips: ["速覽", "實務手冊", "深挖", "SSR"] },
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
    if (step.chips) {
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
      addConfirm(body, function () { advance(""); });
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
    if (kind === "capture") {
      const vol = parseInt(data.volume, 10);
      req = post("/api/host/item", {
        op: "ensure_book",
        kind: "book",
        title: data.title || "",
        series: data.series || "",
        volume: isNaN(vol) ? null : vol,
        cwd: cwd(),
      }).then(function (x) {
        if (!x.res.ok) return x;
        const id = x.j && x.j.id;
        const title = (x.j && x.j.title) || data.title;
        const extra = {};
        if ((data.url || "").trim()) extra.reader_url = data.url.trim();
        return afterCreate(id).then(function () {
          return enqueue("capture", id, title, extra);
        }).then(function () { return x; });
      });
    } else if (kind === "reader_url") {
      const item = form.item;
      const url = (data.url || "").trim();
      const jobKind = (form.data && form.data.jobKind) || "capture";
      const extra = {};
      if (url) extra.reader_url = url;
      req = enqueue(jobKind, item && item.id, item && item.title, extra).then(function (x) {
        return x;
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
      req = post("/api/host/item", {
        op: "create_research",
        title: data.title || "",
        questions: data.questions || "",
        depth: data.depth || "實務手冊",
        cwd: cwd(),
        start_queue: true,
      }).then(function (x) {
        if (!x.res.ok) return x;
        return afterCreate(x.j && x.j.id).then(function () { return x; });
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
    if (!attached || !key) return;
    api("/api/host/jobs", { timeout: 8000 }).then(function (x) {
      if (x.res.ok && x.j) paintJobsHud(x.j, true);
    }).catch(function () {});
  }

  function jobStateLabel(item) {
    if (!item) return "";
    if (item.state === "running") return JOB_LABEL[item.job_kind] || "進行中";
    if (item.state === "paused") return "已暫停";
    if (item.state === "error") return item.error || "失敗";
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
      error: row.error || "",
      has_cover: !!row.book,
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
    const badge = el.querySelector(".tile-pct");
    if (badge) badge.hidden = true;
    let ring = el.querySelector(".tile-ring");
    if (!ring) {
      ring = document.createElement("span");
      ring.className = "tile-ring";
      el.appendChild(ring);
    }
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
    const pct = Math.max(0, Math.min(100, Number(item.percent) || 0));
    const showBar = running || (paused && pct > 0);
    hud.classList.toggle("is-run", running);
    const text = hud.querySelector(".hp-text");
    const think = hud.querySelector(".thinking-five");
    const meter = hud.querySelector(".hp-meter");
    const fill = hud.querySelector(".hp-fill");
    const alt = hud.querySelector(".hp-alt");
    const altPct = hud.querySelector(".hp-alt-pct");
    if (text) text.textContent = jobStateLabel(item);
    if (think) think.hidden = !running;
    if (meter) meter.hidden = !showBar;
    if (fill) fill.style.width = pct + "%";
    if (alt) alt.hidden = !showBar;
    if (altPct) altPct.textContent = pct + "%";
    let ctrl = el.querySelector(".job-ctrl");
    const svg = running ? PAUSE : PLAY;
    const label = running ? "暫停" : "開始";
    if (!ctrl) {
      ctrl = insButton("job-ctrl", svg, label);
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
      ctrl.setAttribute("aria-label", label);
      ctrl.title = label;
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
    return api("/api/host/org", { timeout: 8000 }).then(function (x) {
      if (x.res.ok && x.j) orgSnap = x.j;
    }).catch(function () {});
  }

  function afterPaint() {
    paintPlus();
    paintPicks();
    refreshOrg();
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
      if (window.FamiShelf && window.FamiShelf.hostOn && !window.FamiShelf.hostOn()) return;
      if (ev.button && ev.button !== 0) return;
      if (ev.target && ev.target.closest && ev.target.closest(".job-ctrl")) return;
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
    if (attached) {
      syncGear();
      return;
    }
    attached = true;
    bindSheets();
    syncGear();
    refreshOrg();
    pollJobs();
    if (jobTimer) window.clearInterval(jobTimer);
    jobTimer = window.setInterval(pollJobs, 4000);
  }

  window.FamiHost = {
    attach: attach,
    bindTile: bindTile,
    openPlus: openPlus,
    openActFor: openActFor,
    onTileClick: onTileClick,
    isSelect: function () { return selectMode; },
    clearSelect: clearSelect,
    afterPaint: afterPaint,
    loadJobs: loadJobs,
    paintPlus: paintPlus,
    kind: function () { return tab(); },
  };
})();
