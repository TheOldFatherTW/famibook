(function () {
  const listMask = document.getElementById("list-mask");
  const listSheet = document.getElementById("list-sheet");
  const listBody = document.getElementById("list-body");

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

  const findBtn = document.getElementById("mode-find");
  if (findBtn) findBtn.addEventListener("click", openFind);
  const listClose = document.getElementById("list-close");
  if (listClose) listClose.addEventListener("click", function () {
    listMask.hidden = true;
  });
})();
