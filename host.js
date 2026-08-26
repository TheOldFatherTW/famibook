(function () {
  const PLUS =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const TRASH =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V6.8A1.8 1.8 0 0 1 9.8 5h4.4A1.8 1.8 0 0 1 16 6.8V8M5 8h14M9 11v7M12 11v7M15 11v7M7 8l.8 12.2A1.6 1.6 0 0 0 9.4 22h5.2a1.6 1.6 0 0 0 1.6-1.8L17 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const FOLDER =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v10H4z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const HEART =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 20s-6.7-4.2-8.6-8.1C2.2 9.1 3.4 6 6.6 6c1.8 0 3 1.1 3.6 2.2C10.8 7.1 12 6 13.8 6c3.2 0 4.4 3.1 3 5.9-1.9 3.9-8.6 8.1-8.6 8.1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
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
  const JOB_LABEL = {
    capture: "截取",
    series: "全套截取",
    generate: "文字",
    generate_research: "日常研究",
    generate_steam: "遊戲研究",
    pdf: "PDF",
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
  let dragged = false;
  let drag = null;

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
    const books = pagedBooks();
    if (!books.length) return;
    menu.appendChild(gearBtn(TEXT, "文字", "text", function () {
      books.forEach(function (it) { enqueue("generate", it.id, it.title); });
    }));
    menu.appendChild(gearBtn(PDF, "PDF", "pdf", function () {
      books.forEach(function (it) { enqueue("pdf", it.id, it.title); });
    }));
    if (isDesktop()) {
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
      if (folder) folder.hidden = isJobs();
    }
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
    if (p) p.textContent = text;
    if (mask) mask.hidden = false;
  }

  function closeAsk() {
    const mask = document.getElementById("askMask");
    if (mask) mask.hidden = true;
    askFn = null;
  }

  function addConfirm(body, fn) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-apply";
    btn.innerHTML = '<span class="tag-apply-face">確認</span>';
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
      ["research", "日常研究"],
      ["steam", "遊戲研究"],
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

  function enterSelect(id) {
    selectMode = true;
    if (id) selected.add(id);
    paintPicks();
  }

  function togglePick(id) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    if (!selected.size) selectMode = false;
    else selectMode = true;
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

  function queueCtrl(queue, stop) {
    return post("/api/host/jobs", { op: stop ? "stop" : "resume", queue: queue }).then(function () {
      pollJobs();
      if (isJobs()) loadJobs(true);
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
      ];
    }
    if (kind === "title") return [{ key: "title", label: "書名" }];
    if (kind === "new_org") return [{ key: "title", label: "資料夾名稱" }];
    if (kind === "rename_org") return [{ key: "title", label: "名稱", value: item && item.title }];
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
    const input = document.createElement("input");
    input.value = form.data[step.key] || step.value || "";
    input.autocomplete = "off";
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
      if (ev.key === "Enter") {
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
        return afterCreate(id).then(function () {
          return enqueue("capture", id, title);
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

  function paintJobsHud(snap) {
    const cover = document.querySelector("#cab-hud .cab-cover");
    const current = snap && snap.current;
    const queued = (snap && snap.queued) || [];
    const working = !!(current || queued.length);
    if (cover) cover.classList.toggle("is-run", working);
    paintJobStops(snap);
  }

  function paintJobStops(snap) {
    const row = document.getElementById("job-stops");
    if (!row) return;
    if (!isJobs()) {
      row.hidden = true;
      row.innerHTML = "";
      return;
    }
    row.hidden = false;
    row.innerHTML = "";
    [
      ["capture", "擷取", snap && snap.stop_capture],
      ["research", "研究", snap && snap.stop_research],
      ["steam", "遊戲", snap && snap.stop_steam],
    ].forEach(function (pair) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip" + (pair[2] ? " is-on" : "");
      chip.textContent = pair[2] ? "繼續" + pair[1] : "暫停" + pair[1];
      chip.addEventListener("click", function () { queueCtrl(pair[0], !pair[2]); });
      row.appendChild(chip);
    });
  }

  function pollJobs() {
    if (!attached || !key) return;
    api("/api/host/jobs", { timeout: 8000 }).then(function (x) {
      if (x.res.ok && x.j) paintJobsHud(x.j);
    }).catch(function () {});
  }

  function jobStateLabel(item) {
    if (!item) return "";
    if (item.state === "running") return "進行中";
    if (item.state === "paused") return "暫停";
    if (item.state === "held") return "等候切換日";
    const kind = JOB_LABEL[item.job_kind] || "等候";
    return kind;
  }

  function loadJobs(reset) {
    const feed = document.getElementById("feed");
    if (!feed) return Promise.resolve();
    return api("/api/host/jobs", { timeout: 12000 }).then(function (x) {
      if (!x.res.ok || !x.j) return;
      paintJobsHud(x.j);
      if (reset && window.FamiShelf && window.FamiShelf.resetFeed) window.FamiShelf.resetFeed();
      const rows = x.j.active || [];
      rows.forEach(function (row, i) {
        const item = {
          id: "job:" + row.id,
          job_id: row.id,
          book: row.book,
          cover_book: row.book,
          title: row.title || JOB_LABEL[row.kind] || "工作",
          kind: "job",
          job_kind: row.kind,
          state: row.state,
          percent: row.percent,
          has_cover: !!row.book,
          has_pages: false,
          pinned: row.state === "running",
          favorite: false,
        };
        if (window.FamiShelf && window.FamiShelf.appendTile) {
          const el = window.FamiShelf.appendTile(item, i);
          if (el && item.pinned) el.classList.add("is-pinned");
          const pct = el && el.querySelector(".tile-pct");
          if (pct) {
            pct.hidden = false;
            pct.textContent = jobStateLabel(item);
          }
        }
      });
      paintPlus();
      paintPicks();
    });
  }

  function paintPlus() {
    const feed = document.getElementById("feed");
    if (!feed) return;
    const old = feed.querySelector(".tile-add");
    if (old) old.remove();
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
    if (isJobs()) paintJobStops();
    else {
      const row = document.getElementById("job-stops");
      if (row) {
        row.hidden = true;
        row.innerHTML = "";
      }
    }
  }

  function bindTile(btn, item) {
    if (!btn || !item || item.kind === "plus") return;
    let press = 0;
    let sx = 0;
    let sy = 0;
    let fromHold = false;
    let startDrag = false;
    function clearPress() {
      if (press) {
        window.clearTimeout(press);
        press = 0;
      }
    }
    btn.addEventListener("pointerdown", function (ev) {
      if (ev.button && ev.button !== 0) return;
      sx = ev.clientX;
      sy = ev.clientY;
      fromHold = false;
      startDrag = false;
      dragged = false;
      clearPress();
      press = window.setTimeout(function () {
        press = 0;
        fromHold = true;
        enterSelect(item.id);
        startDrag = true;
      }, 400);
    });
    btn.addEventListener("pointermove", function (ev) {
      if (press && (Math.abs(ev.clientX - sx) > 14 || Math.abs(ev.clientY - sy) > 14)) {
        clearPress();
        return;
      }
      if (!startDrag || drag) return;
      if (Math.abs(ev.clientX - sx) < 10 && Math.abs(ev.clientY - sy) < 10) return;
      if (item.pinned || item.kind === "plus") return;
      beginDrag(ev, btn, item);
    });
    btn.addEventListener("pointerup", function () {
      clearPress();
      startDrag = false;
    });
    btn.addEventListener("pointercancel", function () {
      clearPress();
      startDrag = false;
      endDrag(false);
    });
    btn.addEventListener("click", function (ev) {
      if (dragged || fromHold || selectMode) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if (selectMode && !fromHold && !dragged) togglePick(item.id);
        fromHold = false;
        dragged = false;
      }
    }, true);
  }

  function tilesExceptPlus() {
    return Array.prototype.slice.call(document.querySelectorAll("#feed .tile:not(.tile-add)"));
  }

  function beginDrag(ev, btn, item) {
    const list = tilesExceptPlus();
    const from = list.indexOf(btn);
    if (from < 0) return;
    drag = {
      item: item,
      btn: btn,
      from: from,
      hole: from,
      dropFolder: null,
      list: list,
      pointer: ev.pointerId,
      ghost: null,
    };
    dragged = true;
    try { btn.setPointerCapture(ev.pointerId); } catch (e) {}
    btn.classList.add("is-ghost");
    const ghost = btn.cloneNode(true);
    ghost.classList.add("tile-drag");
    ghost.classList.remove("is-ghost", "is-pick");
    const box = btn.getBoundingClientRect();
    ghost.style.width = box.width + "px";
    ghost.style.height = box.height + "px";
    ghost.style.left = box.left + "px";
    ghost.style.top = box.top + "px";
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    drag.offX = ev.clientX - box.left;
    drag.offY = ev.clientY - box.top;
    drag.cellW = box.width;
    drag.cellH = box.height;
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp);
    window.addEventListener("pointercancel", onDragCancel);
    if (ev.cancelable) ev.preventDefault();
  }

  function onDragMove(ev) {
    if (!drag) return;
    if (ev.cancelable) ev.preventDefault();
    if (drag.ghost) {
      drag.ghost.style.left = (ev.clientX - drag.offX) + "px";
      drag.ghost.style.top = (ev.clientY - drag.offY) + "px";
    }
    const hit = document.elementFromPoint(ev.clientX, ev.clientY);
    const over = hit && hit.closest ? hit.closest("#feed .tile") : null;
    drag.dropFolder = null;
    drag.list.forEach(function (el) { el.classList.remove("is-drop"); });
    if (over && over.classList.contains("tile-add")) {
      shiftHole(drag.from);
      return;
    }
    const cat = catalog();
    const overItem = over && cat[over.dataset.id];
    if (overItem && overItem.kind === "org" && overItem.id !== drag.item.id && drag.item.kind !== "org" && drag.item.kind !== "job") {
      over.classList.add("is-drop");
      drag.dropFolder = overItem;
      shiftHole(drag.from);
      return;
    }
    const idx = over ? drag.list.indexOf(over) : -1;
    let hole = idx >= 0 ? idx : drag.from;
    if (isJobs()) {
      const pinned = drag.list.findIndex(function (el) { return el.classList.contains("is-pinned"); });
      if (pinned === 0) hole = Math.max(1, hole);
    }
    drag.hole = hole;
    shiftHole(hole);
  }

  function shiftHole(hole) {
    if (!drag) return;
    const from = drag.from;
    const cols = 3;
    drag.list.forEach(function (el, i) {
      if (el.classList.contains("is-pinned") && i === 0 && isJobs()) {
        el.style.transform = "";
        return;
      }
      let visual = i;
      if (from < hole) {
        if (i > from && i <= hole) visual = i - 1;
      } else if (from > hole) {
        if (i >= hole && i < from) visual = i + 1;
      }
      const dx = (visual % cols) - (i % cols);
      const dy = Math.floor(visual / cols) - Math.floor(i / cols);
      const gap = 2;
      el.style.transition = "transform 0.16s ease";
      el.style.transform = "translate(" + (dx * (drag.cellW + gap)) + "px," + (dy * (drag.cellH + gap)) + "px)";
    });
  }

  function clearShift() {
    tilesExceptPlus().forEach(function (el) {
      el.style.transform = "";
      el.style.transition = "";
      el.classList.remove("is-ghost", "is-drop");
    });
  }

  function onDragUp() {
    endDrag(true);
  }

  function onDragCancel() {
    endDrag(false);
  }

  function endDrag(commit) {
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
    window.removeEventListener("pointercancel", onDragCancel);
    if (!drag) return;
    const state = drag;
    drag = null;
    if (state.ghost && state.ghost.parentNode) state.ghost.parentNode.removeChild(state.ghost);
    clearShift();
    if (!commit) return;
    if (state.dropFolder && state.item.kind !== "job") {
      post("/api/host/org", { op: "assign", books: [state.item.id], folders: [state.dropFolder.id] }).then(function () {
        clearSelect();
        reload();
      });
      return;
    }
    if (state.hole === state.from) return;
    const ids = state.list.map(function (el) { return el.dataset.id; });
    const moving = ids.splice(state.from, 1)[0];
    ids.splice(state.hole, 0, moving);
    if (isJobs()) {
      const jobIds = ids
        .map(function (id) { return String(id || "").replace(/^job:/, ""); })
        .filter(Boolean);
      post("/api/host/jobs", { op: "reorder", ids: jobIds }).then(function () { loadJobs(true); });
      return;
    }
    post("/api/host/org", { op: "reorder", key: cwd() || tab() || "all", ids: ids }).then(function () {
      reload();
    });
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
    isSelect: function () { return selectMode; },
    clearSelect: clearSelect,
    afterPaint: afterPaint,
    loadJobs: loadJobs,
    paintPlus: paintPlus,
    kind: function () { return tab(); },
  };
})();
