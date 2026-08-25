(function () {
  function lockSheetPage(mask, sheet) {
    let onMask = false;
    mask.addEventListener("pointerdown", (e) => {
      onMask = e.target === mask;
    });
    mask.addEventListener("pointerup", (e) => {
      if (onMask && e.target === mask) mask.hidden = true;
      onMask = false;
    });
    sheet.addEventListener("pointerdown", () => {
      onMask = false;
    });
  }

  const listMask = document.getElementById("list-mask");
  const listSheet = document.getElementById("list-sheet");
  const listBody = document.getElementById("list-body");
  const bookMask = document.getElementById("book-mask");
  const bookSheet = document.getElementById("book-sheet");
  const bookBody = document.getElementById("book-body");
  lockSheetPage(listMask, listSheet);
  lockSheetPage(bookMask, bookSheet);

  function chip(tag, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag-chip";
    b.textContent = tag.label;
    b.addEventListener("click", () => onClick(tag));
    return b;
  }

  async function openList() {
    const key = window.FamiShelf.key();
    const x = await window.FamiGate.api("/api/tags", key, { timeout: 15000 });
    listBody.innerHTML = "";
    const all = (x.j && x.j.tags) || [];
    if (!all.length) {
      listBody.textContent = "還沒有套裝標籤。";
    }
    all.forEach((tag) => listBody.appendChild(chip(tag, (t) => {
      listMask.hidden = true;
      window.FamiShelf.setFilter([t.id]);
    })));
    listMask.hidden = false;
  }

  document.getElementById("mode-all").addEventListener("click", () => window.FamiShelf.setFilter([]));
  document.getElementById("mode-list").addEventListener("click", openList);
  document.getElementById("mode-find").addEventListener("click", openList);

  async function pollPdf(bookId) {
    const key = window.FamiShelf.key();
    for (let i = 0; i < 120; i++) {
      const st = await window.FamiGate.api("/api/pdf?book=" + encodeURIComponent(bookId), key, { timeout: 15000 });
      if (st.j && st.j.state === "ready") return true;
      if (st.j && st.j.state === "error") return false;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  }

  window.FamiTags = {
    openBook: function (item) {
      bookBody.innerHTML = "";
      const title = document.createElement("p");
      title.textContent = item.title;
      title.style.fontWeight = "700";
      bookBody.appendChild(title);
      function act(label, fn) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.addEventListener("click", fn);
        bookBody.appendChild(b);
      }
      act("翻閱", () => {
        bookMask.hidden = true;
        window.FamiShelf.openReader(item.id);
      });
      act("存進書籍", async () => {
        const key = window.FamiShelf.key();
        bookMask.hidden = true;
        const wait = document.getElementById("pdf-wait");
        wait.hidden = false;
        if (window.Lissajous) window.Lissajous.mount(document.getElementById("pdf-liss"));
        await window.FamiGate.api("/api/pdf?book=" + encodeURIComponent(item.id), key, { method: "POST", timeout: 20000 });
        const ok = await pollPdf(item.id);
        wait.hidden = true;
        if (!ok) return;
        location.href = window.FamiGate.origin() + "/download/pdf?book=" + encodeURIComponent(item.id) + "&k=" + encodeURIComponent(key);
      });
      const box = document.createElement("div");
      box.style.marginTop = "12px";
      const input = document.createElement("input");
      input.placeholder = "新增標籤";
      input.style.width = "100%";
      input.style.height = "40px";
      input.style.borderRadius = "10px";
      input.style.border = "1px solid var(--line)";
      input.style.background = "#2f2f2f";
      input.style.color = "#fff";
      input.style.padding = "0 10px";
      box.appendChild(input);
      const add = document.createElement("button");
      add.type = "button";
      add.textContent = "加上";
      add.addEventListener("click", async () => {
        const key = window.FamiShelf.key();
        const created = await window.FamiGate.api("/api/tags", key, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", label: input.value }),
          timeout: 15000,
        });
        if (created.j && created.j.tag) {
          await window.FamiGate.api("/api/tags", key, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "attach", book: item.id, id: created.j.tag.id }),
            timeout: 15000,
          });
          input.value = "";
          window.FamiShelf.reload();
        }
      });
      box.appendChild(add);
      (item.tags || []).forEach((tag) => {
        const tid = typeof tag === "string" ? tag : tag.id;
        const label = typeof tag === "string" ? tag : tag.label;
        const kind = typeof tag === "string" ? "" : tag.kind;
        if (kind === "series" || String(tid).indexOf("series:") === 0) return;
        const row = document.createElement("button");
        row.type = "button";
        row.className = "tag-chip is-on";
        row.textContent = label || tid;
        const x = document.createElement("span");
        x.className = "x";
        x.textContent = "×";
        row.appendChild(x);
        row.addEventListener("click", async () => {
          const key = window.FamiShelf.key();
          await window.FamiGate.api("/api/tags", key, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "detach", book: item.id, id: tid }),
            timeout: 15000,
          });
          row.remove();
        });
        box.appendChild(row);
      });
      bookBody.appendChild(box);
      bookMask.hidden = false;
    },
  };
})();
