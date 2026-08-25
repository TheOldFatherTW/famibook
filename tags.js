(function () {
  const CHEV =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const listMask = document.getElementById("list-mask");
  const listSheet = document.getElementById("list-sheet");
  const listBody = document.getElementById("list-body");
  const borrowDock = document.getElementById("borrow-dock");
  const borrowSheet = document.getElementById("borrow-sheet");
  const borrowHead = document.getElementById("borrow-head");
  const borrowTitle = document.getElementById("borrow-title");
  const borrowBeans = document.getElementById("borrow-beans");
  const borrowStatus = document.getElementById("borrow-status");
  const borrowMeter = document.getElementById("borrow-meter");
  const borrowGo = document.getElementById("borrow-go");
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

  function clampPct(n) {
    const x = Number(n);
    if (!isFinite(x)) return 0;
    return Math.max(0, Math.min(100, Math.round(x)));
  }

  function paintBeans(n, animate) {
    if (!borrowBeans) return;
    const spans = borrowBeans.querySelectorAll("span");
    spans.forEach(function (s, i) {
      s.classList.toggle("is-on", i < n);
    });
    if (!borrowSheet) return;
    borrowSheet.classList.toggle("is-idle", !animate);
    borrowSheet.classList.toggle("is-run", !!animate);
  }

  function showIdle(n, max) {
    if (borrowHead) borrowHead.hidden = false;
    if (borrowTitle) {
      borrowTitle.textContent = n >= max ? "租借上限已滿" : "單次租借 " + n + "/" + max;
    }
    if (borrowStatus) borrowStatus.hidden = true;
    if (borrowMeter) borrowMeter.hidden = true;
    if (borrowGo) borrowGo.hidden = false;
    if (pdfShare) pdfShare.hidden = true;
    if (borrowSheet) borrowSheet.classList.remove("is-dl");
    paintBeans(n, false);
    if (window.FamiShelf) window.FamiShelf.setCabRun(false);
  }

  function showWork(kind, pct, index, total) {
    if (borrowDock) borrowDock.hidden = false;
    if (borrowHead) borrowHead.hidden = true;
    if (borrowGo) borrowGo.hidden = true;
    if (pdfShare) pdfShare.hidden = kind !== "share";
    if (borrowSheet) {
      borrowSheet.classList.toggle("is-dl", kind === "dl");
    }
    paintBeans(window.FamiShelf ? window.FamiShelf.pickCount() : 0, kind !== "share");
    if (borrowStatus) {
      borrowStatus.hidden = false;
      if (kind === "share") {
        borrowStatus.textContent = "打開後按分享選書籍";
      } else {
        const label = kind === "bake" ? "打包中" : "下載中";
        borrowStatus.textContent = label + " " + clampPct(pct) + "%　" + index + "/" + total;
      }
    }
    if (borrowMeter) {
      borrowMeter.hidden = kind === "share";
      const fill = borrowMeter.querySelector("span");
      if (fill && kind !== "share") fill.style.width = clampPct(pct) + "%";
    }
    if (window.FamiShelf) window.FamiShelf.setCabRun(true);
  }

  function paintBorrow() {
    if (!borrowDock || !window.FamiShelf) return;
    const n = window.FamiShelf.pickCount();
    const max = window.FamiShelf.borrowMax();
    if (renting) return;
    if (!n) {
      borrowDock.hidden = true;
      return;
    }
    borrowDock.hidden = false;
    showIdle(n, max);
  }

  async function pollPdf(bookId, index, total) {
    const key = window.FamiShelf.key();
    for (let i = 0; i < 120; i++) {
      const st = await window.FamiGate.api("/api/pdf?book=" + encodeURIComponent(bookId), key, { timeout: 15000 });
      if (st.j && st.j.state === "ready") {
        showWork("bake", 100, index, total);
        return st.j;
      }
      if (st.j && st.j.state === "error") return null;
      showWork("bake", st.j && st.j.percent, index, total);
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
      showWork("dl", pct, index, total);
    }
    const blob = new Blob(parts, { type: "application/pdf" });
    return asPdfFile(blob, name);
  }

  function pdfFileName(raw) {
    let name = String(raw || "book.pdf").split(/[/\\]/).pop() || "book.pdf";
    name = name.replace(/["*/:<>?\\|]/g, "_").trim() || "book.pdf";
    if (!/\.pdf$/i.test(name)) name += ".pdf";
    return name;
  }

  function asPdfFile(blob, rawName) {
    const bits = blob.slice(0, blob.size, "application/pdf");
    return new File([bits], pdfFileName(rawName || blob.name), {
      type: "application/pdf",
      lastModified: Date.now(),
    });
  }

  function openPdfForBooks(file) {
    const pdf = asPdfFile(file, file.name);
    const href = URL.createObjectURL(pdf);
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.type = "application/pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(href);
    }, 120000);
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
    if (typeof navigator.standalone !== "boolean") {
      clickDownload(asPdfFile(file, file.name));
      return Promise.resolve(true);
    }
    return waitShareTap(file);
  }

  function waitShareTap(file) {
    showWork("share", 100, 1, 1);
    return new Promise(function (resolve) {
      let busy = false;
      shareWait = function () {
        if (busy) return;
        busy = true;
        shareWait = null;
        openPdfForBooks(file);
        resolve(true);
      };
    });
  }

  async function rentPicked() {
    if (renting) return;
    const items = window.FamiShelf.pickedItems();
    if (!items.length) return;
    renting = true;
    const key = window.FamiShelf.key();
    const total = items.length;
    showWork("bake", 0, 1, total);
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const started = await window.FamiGate.api("/api/pdf?book=" + encodeURIComponent(item.id), key, { method: "POST", timeout: 20000 });
        if (!(started.j && started.j.state === "ready")) {
          showWork("bake", started.j && started.j.percent, i + 1, total);
          const ready = await pollPdf(item.id, i + 1, total);
          if (!ready) throw new Error("bake");
        }
        const file = await fetchPdfFile(item.id, i + 1, total);
        const ok = await shareOrSave(file);
        if (!ok) {
          window.alert("這本現在存不下來，請再試一次。");
          break;
        }
      }
    } catch (err) {
      window.alert("這本現在存不下來，請再試一次。");
    } finally {
      renting = false;
      if (window.FamiShelf) window.FamiShelf.setCabRun(false);
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
