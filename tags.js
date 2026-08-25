(function () {
  const CHEV =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const listMask = document.getElementById("list-mask");
  const listSheet = document.getElementById("list-sheet");
  const listBody = document.getElementById("list-body");
  const borrowDock = document.getElementById("borrow-dock");
  const borrowTitle = document.getElementById("borrow-title");
  const borrowGo = document.getElementById("borrow-go");
  const pdfWait = document.getElementById("pdf-wait");
  const pdfMsg = document.getElementById("pdf-wait-msg");
  const pdfShare = document.getElementById("pdf-share");
  const PDF_CHUNK = 4 * 1024 * 1024;
  let renting = false;
  let shareWait = null;

  function lockSheetPage(mask, sheet) {
    if (!mask || !sheet) return;
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

  lockSheetPage(listMask, listSheet);

  function chip(tag, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tag-chip";
    b.textContent = tag.label;
    b.addEventListener("click", () => onClick(tag));
    return b;
  }

  async function openFind() {
    const key = window.FamiShelf.key();
    const x = await window.FamiGate.api("/api/tags", key, { timeout: 15000 });
    listBody.innerHTML = "";
    const all = (x.j && x.j.series) || (x.j && x.j.tags) || [];
    if (!all.length) {
      listBody.textContent = "還沒有套裝。";
    }
    all.forEach((tag) => listBody.appendChild(chip(tag, (t) => {
      listMask.hidden = true;
      window.FamiShelf.setFilter([t.id]);
    })));
    listMask.hidden = false;
  }

  document.getElementById("mode-find").addEventListener("click", openFind);
  document.getElementById("list-close").addEventListener("click", function () {
    listMask.hidden = true;
  });

  function paintBorrow() {
    if (!borrowDock || !window.FamiShelf) return;
    const n = window.FamiShelf.pickCount();
    const max = window.FamiShelf.borrowMax();
    if (!n || renting) {
      borrowDock.hidden = true;
      return;
    }
    borrowDock.hidden = false;
    if (borrowTitle) {
      borrowTitle.textContent = n >= max ? "租借上限已滿" : "單次租借上限 " + n + "/" + max;
    }
    if (borrowGo) {
      const face = borrowGo.querySelector(".tag-apply-face span");
      if (face) face.textContent = "立即租借";
    }
  }

  function setWait(text, shareOn) {
    if (pdfWait) pdfWait.hidden = false;
    if (pdfMsg) pdfMsg.textContent = text;
    if (pdfShare) pdfShare.hidden = !shareOn;
    if (window.Lissajous) window.Lissajous.mount(document.getElementById("pdf-liss"));
    if (window.FamiShelf) window.FamiShelf.setCabRun(true);
  }

  function hideWait() {
    if (pdfWait) pdfWait.hidden = true;
    if (pdfShare) pdfShare.hidden = true;
    if (window.FamiShelf) window.FamiShelf.setCabRun(false);
  }

  async function pollPdf(bookId) {
    const key = window.FamiShelf.key();
    for (let i = 0; i < 120; i++) {
      const st = await window.FamiGate.api("/api/pdf?book=" + encodeURIComponent(bookId), key, { timeout: 15000 });
      if (st.j && st.j.state === "ready") return st.j;
      if (st.j && st.j.state === "error") return null;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return null;
  }

  function filenameFromDisposition(header, fallback) {
    if (!header) return fallback;
    const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (star) {
      try { return decodeURIComponent(star[1]); } catch (e) {}
    }
    const plain = /filename="?([^";]+)"?/i.exec(header);
    return plain ? plain[1] : fallback;
  }

  async function fetchPdfFile(bookId, index, total) {
    const key = window.FamiShelf.key();
    const url = window.FamiGate.origin() + "/download/pdf?book=" + encodeURIComponent(bookId) + "&k=" + encodeURIComponent(key);
    const parts = [];
    let start = 0;
    let size = null;
    let name = "book.pdf";
    while (size == null || start < size) {
      const hintEnd = size == null ? start + PDF_CHUNK - 1 : Math.min(start + PDF_CHUNK - 1, size - 1);
      const res = await fetch(url, { headers: { Range: "bytes=" + start + "-" + hintEnd } });
      if (!res.ok && res.status !== 206) throw new Error("download");
      name = filenameFromDisposition(res.headers.get("Content-Disposition"), name);
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) break;
      const cr = res.headers.get("Content-Range");
      if (cr) {
        const m = /\/(\d+)\s*$/.exec(cr);
        if (m) size = parseInt(m[1], 10);
      } else {
        size = start + buf.byteLength;
      }
      parts.push(buf);
      start += buf.byteLength;
      const pct = size ? Math.round((start / size) * 100) : 0;
      window.FamiShelf.setDlPct(bookId, pct);
      setWait("下載中 " + pct + "%　" + index + "/" + total, false);
    }
    const blob = new Blob(parts, { type: "application/pdf" });
    return new File([blob], name, { type: "application/pdf" });
  }

  function clickDownload(file) {
    const href = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = href;
    a.download = file.name;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(href);
    }, 4000);
  }

  function shareOrSave(file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file] }).then(
        function () { return true; },
        function (err) {
          if (err && err.name === "AbortError") return false;
          return waitShareTap(file);
        }
      );
    }
    if (typeof navigator.standalone !== "boolean") {
      clickDownload(file);
      return Promise.resolve(true);
    }
    return waitShareTap(file);
  }

  function waitShareTap(file) {
    setWait("送到書籍", true);
    return new Promise(function (resolve) {
      shareWait = function () {
        shareWait = null;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).then(
            function () { resolve(true); },
            function () { resolve(false); }
          );
        } else {
          resolve(false);
        }
      };
    });
  }

  async function rentPicked() {
    if (renting) return;
    const items = window.FamiShelf.pickedItems();
    if (!items.length) return;
    renting = true;
    paintBorrow();
    const key = window.FamiShelf.key();
    const total = items.length;
    setWait("下載中 0%　1/" + total, false);
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await window.FamiGate.api("/api/pdf?book=" + encodeURIComponent(item.id), key, { method: "POST", timeout: 20000 });
        setWait("打包中　" + (i + 1) + "/" + total, false);
        const ready = await pollPdf(item.id);
        if (!ready) throw new Error("bake");
        const file = await fetchPdfFile(item.id, i + 1, total);
        const ok = await shareOrSave(file);
        if (!ok) break;
      }
    } catch (err) {
      window.alert("這本現在存不下來，請再試一次。");
    } finally {
      renting = false;
      hideWait();
      window.FamiShelf.clearSelect();
    }
  }

  if (borrowGo) borrowGo.addEventListener("click", rentPicked);
  if (pdfShare) pdfShare.addEventListener("click", function () {
    if (shareWait) shareWait();
  });

  window.FamiTags = {
    paintBorrow: paintBorrow,
  };
})();
