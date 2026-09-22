/* Вендорено из vtb-filters/ermo-snapshot/compact-filters.js (компактная панель фильтров).
   Изменения: конфиг снаружи (каталог, наборы, колбэки), монтирование в произвольный контейнер, возврат API. */
window.CF = function (cfg) {
  const STORAGE_KEY = cfg.storageKey || "cf-filter-sets-v1";

  const OPS = {
    contains: { id: "contains", name: "Содержит", sql: "LIKE '%текст%'", kind: "text" },
    startsWith: { id: "startsWith", name: "Начинается С", sql: "LIKE 'текст%'", kind: "text" },
    endsWith: { id: "endsWith", name: "Заканчивается На", sql: "LIKE '%текст'", kind: "text" },
    eq: { id: "eq", name: "Точное совпадение", sql: "=", kind: "all" },
    ne: { id: "ne", name: "Не равно", sql: "!= или <>", kind: "all" },
    in: { id: "in", name: "Один из списка", sql: "IN (...)", kind: "all" },
    notIn: { id: "notIn", name: "Не входит в список", sql: "NOT IN (...)", kind: "all" },
    gt: { id: "gt", name: "Больше", sql: ">", kind: "cmp" },
    lt: { id: "lt", name: "Меньше", sql: "<", kind: "cmp" },
  };

  const TEXT_OPS = ["contains", "startsWith", "endsWith", "eq", "ne", "in", "notIn"];
  const CMP_OPS = ["eq", "ne", "gt", "lt", "in", "notIn"];

  const CATALOG = cfg.catalog;
  const ALL_FIELDS = CATALOG.flatMap((g) => g.fields);
  const FIELD_BY_ID = Object.fromEntries(ALL_FIELDS.map((f) => [f.id, f]));
  const DEFAULT_IDS = cfg.defaultIds || CATALOG[0].fields.slice(0, 4).map((f) => f.id);

  const state = {
    visible: DEFAULT_IDS.slice(),
    values: {},
    ops: {},
    openOp: null,
    suggestFor: null,
    funnelOpen: false,
    modal: null,
    selectedSetId: null,
    editingSetId: null,
  };

  ALL_FIELDS.forEach((f) => {
    state.ops[f.id] = f.type === "number" || f.type === "date" ? "eq" : "contains";
    state.values[f.id] = { list: [], draft: "" };
  });

  function opsFor(field) {
    return (field.type === "number" || field.type === "date" ? CMP_OPS : TEXT_OPS).map((id) => OPS[id]);
  }

  function isListOp(op) {
    return op === "in" || op === "notIn";
  }

  function hasAnyValue() {
    return state.visible.some((id) => {
      const v = state.values[id];
      return v.list.length > 0 || String(v.draft || "").trim() !== "";
    });
  }

  const DEMO_SETS = cfg.demoSets || [];
  function loadSets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        saveSets(DEMO_SETS);
        return DEMO_SETS.slice();
      }
      return JSON.parse(raw);
    } catch {
      return DEMO_SETS.slice();
    }
  }

  function saveSets(sets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  }

  /* Применённые условия в виде списка {id,label,op,opName,values} — для чипов над гридом */
  function describe() {
    return state.visible
      .map((id) => {
        const v = state.values[id];
        const vals = isListOp(state.ops[id]) ? v.list.slice() : (String(v.draft || "").trim() ? [v.draft.trim()] : []);
        return vals.length ? { id, label: FIELD_BY_ID[id].label, op: state.ops[id], opName: OPS[state.ops[id]].name, values: vals } : null;
      })
      .filter(Boolean);
  }
  function snapshot() {
    const values = {};
    const ops = {};
    state.visible.forEach((id) => {
      values[id] = { list: state.values[id].list.slice(), draft: state.values[id].draft };
      ops[id] = state.ops[id];
    });
    return { visible: state.visible.slice(), values, ops };
  }

  function applySnapshot(snap) {
    state.visible = (snap.visible || DEFAULT_IDS).filter((id) => FIELD_BY_ID[id]);
    ALL_FIELDS.forEach((f) => {
      state.values[f.id] = { list: [], draft: "" };
      state.ops[f.id] = f.type === "number" || f.type === "date" ? "eq" : "contains";
    });
    Object.entries(snap.ops || {}).forEach(([id, op]) => {
      if (state.ops[id] !== undefined) state.ops[id] = op;
    });
    Object.entries(snap.values || {}).forEach(([id, v]) => {
      if (state.values[id]) state.values[id] = { list: (v.list || []).slice(), draft: v.draft || "" };
    });
  }

  function svg(path) {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${path}</svg>`;
  }

  const ICO = {
    search: svg('<path fill="currentColor" d="M10.5 3.5a7 7 0 015.52 11.3l3.84 3.84a.75.75 0 11-1.06 1.06l-3.84-3.84A7 7 0 1110.5 3.5zm0 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"/>'),
    funnel: svg('<path fill="currentColor" d="M4.2 5.4A1 1 0 015.1 4h13.8a1 1 0 01.8 1.6L14 12.2V18a1 1 0 01-1.5.86l-3-1.8A1 1 0 019 16.2v-4L4.3 5.6a1 1 0 01-.1-.2z"/>'),
    share: svg('<path fill="currentColor" d="M12 3l4 4h-3v6h-2V7H8l4-4zm-7 10h2v6h10v-6h2v7a1 1 0 01-1 1H6a1 1 0 01-1-1v-7z"/>'),
    trash: svg('<path fill="currentColor" d="M9 4h6l1 2h4v2H4V6h4l1-2zm1 6h2v8h-2v-8zm4 0h2v8h-2v-8zM8 10h2v8H8v-8z"/>'),
    pencil: svg('<path fill="currentColor" d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5zM15.6 4.9l3.5 3.5 1.4-1.4a1 1 0 000-1.4L18.4 3.5a1 1 0 00-1.4 0L15.6 4.9z"/>'),
    import: svg('<path fill="currentColor" d="M12 3v10l3-3 1.4 1.4L12 17.8l-4.4-6.4L9 10l3 3V3h0zM5 19h14v2H5v-2z"/>'),
    gear: svg('<path fill="currentColor" d="M10.2 2h3.6l.4 2.3a7 7 0 011.7 1L17.8 4.6l2.6 2.6-1.7 1.9a7 7 0 011 1.7L22 11.8v3.6l-2.3.4a7 7 0 01-1 1.7l1.7 1.9-2.6 2.6-1.9-1.7a7 7 0 01-1.7 1L13.8 22h-3.6l-.4-2.3a7 7 0 01-1.7-1L6.2 19.4 3.6 16.8l1.7-1.9a7 7 0 01-1-1.7L2 12.2v-3.6l2.3-.4a7 7 0 011-1.7L3.6 4.6 6.2 2l1.9 1.7a7 7 0 011.7-1L10.2 2zM12 8.5A3.5 3.5 0 1012 15.5 3.5 3.5 0 0012 8.5z"/>'),
    check: svg('<path fill="currentColor" d="M5 12.5l4.2 4.2L19 6.9l-1.4-1.4-8.4 8.4-2.8-2.8L5 12.5z"/>'),
    x: svg('<path fill="currentColor" d="M6.4 5.5l5.6 5.6 5.6-5.6 1.4 1.4-5.6 5.6 5.6 5.6-1.4 1.4-5.6-5.6-5.6 5.6-1.4-1.4 5.6-5.6-5.6-5.6 1.4-1.4z"/>'),
  };

  function opIcon(id) {
    if (id === "contains") return ICO.search;
    if (id === "startsWith") return `<span class="cf-op-sym">[..</span>`;
    if (id === "endsWith") return `<span class="cf-op-sym">..]</span>`;
    if (id === "eq") return `<span class="cf-op-sym">=</span>`;
    if (id === "ne") return `<span class="cf-op-sym">≠</span>`;
    if (id === "gt") return `<span class="cf-op-sym">&gt;</span>`;
    if (id === "lt") return `<span class="cf-op-sym">&lt;</span>`;
    if (id === "in") return svg('<rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 12.2l3 3 6-6.5" stroke="#0d69f2" stroke-width="1.8" fill="none"/>');
    if (id === "notIn") return svg('<rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 12.2l3 3 6-6.5" stroke="#0d69f2" stroke-width="1.8" fill="none"/><path d="M6 18L18 6" stroke="#d92020" stroke-width="1.6"/>');
    return ICO.search;
  }

  let root;
  let toastEl;

  function toast(type, text) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement("div");
    toastEl.className = `cf-toast ${type}`;
    toastEl.innerHTML = `${type === "ok" ? ICO.check : ICO.x}<span>${esc(text)}</span><button type="button" aria-label="Закрыть">×</button>`;
    toastEl.querySelector("button").onclick = () => toastEl.remove();
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl && toastEl.remove(), 3200);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function closePopovers(except) {
    if (except !== "op") state.openOp = null;
    if (except !== "suggest") state.suggestFor = null;
    if (except !== "funnel") state.funnelOpen = false;
  }

  function render() {
    const sets = loadSets();
    root.innerHTML = `
      <div class="cf-grid"></div>
      <button type="button" class="cf-add">+ Добавить фильтр</button>
      <div class="cf-actions">
        <div class="cf-actions-left">
          <button type="button" class="cf-btn cf-btn-ghost" data-act="reset">Сбросить фильтр</button>
          <button type="button" class="cf-icon-btn" data-act="funnel" title="Наборы фильтров">${ICO.funnel}</button>
          ${state.funnelOpen ? funnelMenu(sets) : ""}
        </div>
        <div class="cf-actions-right">
          <button type="button" class="cf-btn cf-btn-ghost" data-act="cancel">Отмена</button>
          <button type="button" class="cf-btn cf-btn-primary" data-act="apply" ${hasAnyValue() ? "" : "disabled"}>Показать</button>
        </div>
      </div>
    `;
    const grid = root.querySelector(".cf-grid");
    state.visible.forEach((id) => grid.appendChild(renderField(FIELD_BY_ID[id])));
    bindPanel();
    renderModal();
  }

  function funnelMenu(sets) {
    const items = sets
      .map((s) => `<button type="button" data-load="${esc(s.id)}">${esc(s.name)}</button>`)
      .join("");
    return `<div class="cf-funnel-menu">
      ${items}
      ${sets.length ? '<div class="cf-sep"></div>' : ""}
      <button type="button" data-act="save-new">+ Сохранить новый набор фильтров</button>
      ${sets.length ? `<button type="button" data-act="manage">${ICO.gear} Управление наборами</button>` : ""}
      <button type="button" data-act="import">${ICO.import} Импортировать набор</button>
    </div>`;
  }

  function renderField(field) {
    const op = state.ops[field.id];
    const v = state.values[field.id];
    const listMode = isListOp(op);
    const wrap = document.createElement("div");
    wrap.className = "cf-field";
    wrap.dataset.id = field.id;
    const chips = (listMode ? v.list : []).map((x) => `<span class="cf-chip">${esc(x)}</span>`).join("");
    wrap.innerHTML = `
      <div class="cf-label">${esc(field.label)}</div>
      <div class="cf-control">
        <button type="button" class="cf-op" data-op="${field.id}" title="Тип поиска">${opIcon(op)}</button>
        <div class="cf-value">
          ${chips}
          <input type="${field.type === "number" ? "number" : "text"}" placeholder="Введите значение" value="${esc(v.draft)}" data-in="${field.id}">
        </div>
        ${state.openOp === field.id ? opMenu(field) : ""}
        ${state.suggestFor === field.id ? suggestMenu(field) : ""}
      </div>
    `;
    return wrap;
  }

  function opMenu(field) {
    return `<div class="cf-menu">
      <div class="cf-menu-title">Тип поиска</div>
      ${opsFor(field)
        .map(
          (op) => `<button type="button" class="${op.id === state.ops[field.id] ? "active" : ""}" data-set-op="${op.id}">
            <span class="cf-menu-ico">${opIcon(op.id)}</span>
            <span><span class="cf-menu-name">${op.name}</span><span class="cf-menu-sql">${op.sql}</span></span>
          </button>`
        )
        .join("")}
    </div>`;
  }

  function suggestMenu(field) {
    const q = (state.values[field.id].draft || "").trim().toLowerCase();
    const taken = new Set(state.values[field.id].list);
    const items = (field.dict || []).filter((x) => !taken.has(x) && (!q || x.toLowerCase().includes(q)));
    if (!items.length) return "";
    return `<div class="cf-suggest">${items
      .map((x, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-pick="${esc(x)}">${esc(x)}</button>`)
      .join("")}</div>`;
  }

  function bindPanel() {
    root.querySelector('[data-act="reset"]').onclick = () => {
      ALL_FIELDS.forEach((f) => {
        state.values[f.id] = { list: [], draft: "" };
      });
      closePopovers();
      render();
    };
    root.querySelector('[data-act="cancel"]').onclick = () => {
      closePopovers();
      if (cfg.onCancel) cfg.onCancel();
      else root.style.display = "none";
    };
    root.querySelector('[data-act="apply"]').onclick = () => {
      if (!hasAnyValue()) return;
      closePopovers();
      if (cfg.onApply) cfg.onApply(snapshot(), describe());
      toast("ok", "Фильтры применены");
    };
    root.querySelector('[data-act="funnel"]').onclick = (e) => {
      e.stopPropagation();
      const next = !state.funnelOpen;
      closePopovers();
      state.funnelOpen = next;
      render();
    };
    root.querySelector(".cf-add").onclick = () => {
      closePopovers();
      state.modal = { type: "add", q: "", checked: new Set(state.visible) };
      render();
    };

    root.querySelectorAll("[data-load]").forEach((b) => {
      b.onclick = () => {
        const set = loadSets().find((s) => s.id === b.dataset.load);
        if (set) {
          applySnapshot(set.data);
          state.funnelOpen = false;
          toast("ok", `Загружен набор «${set.name}»`);
          render();
        }
      };
    });
    const saveNew = root.querySelector('[data-act="save-new"]');
    if (saveNew) saveNew.onclick = () => {
      closePopovers();
      state.modal = { type: "save", name: defaultSetName() };
      render();
    };
    const manage = root.querySelector('[data-act="manage"]');
    if (manage) manage.onclick = () => {
      closePopovers();
      state.modal = { type: "manage" };
      state.selectedSetId = loadSets()[0]?.id || null;
      state.editingSetId = null;
      render();
    };
    const importBtn = root.querySelector('[data-act="import"]');
    if (importBtn) importBtn.onclick = () => pickImport();

    root.querySelectorAll("[data-op]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const id = b.dataset.op;
        const next = state.openOp === id ? null : id;
        closePopovers();
        state.openOp = next;
        render();
        focusField(id);
      };
    });
    root.querySelectorAll("[data-set-op]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const fieldId = b.closest(".cf-field").dataset.id;
        const prev = state.ops[fieldId];
        const next = b.dataset.setOp;
        state.ops[fieldId] = next;
        if (isListOp(prev) !== isListOp(next)) {
          const draft = state.values[fieldId].draft.trim();
          if (!isListOp(next) && state.values[fieldId].list.length) {
            state.values[fieldId].draft = state.values[fieldId].list.join(", ");
            state.values[fieldId].list = [];
          } else if (isListOp(next) && draft) {
            state.values[fieldId].list = [];
          }
        }
        state.openOp = null;
        render();
        focusField(fieldId);
      };
    });

    root.querySelectorAll("[data-in]").forEach((input) => {
      const id = input.dataset.in;
      input.addEventListener("input", () => {
        state.values[id].draft = input.value;
        const op = state.ops[id];
        state.suggestFor = FIELD_BY_ID[id].dict ? id : null;
        state.openOp = null;
        const wrap = input.closest(".cf-control");
        const old = wrap.querySelector(".cf-suggest");
        if (old) old.remove();
        if (state.suggestFor === id) {
          wrap.insertAdjacentHTML("beforeend", suggestMenu(FIELD_BY_ID[id]));
          bindSuggest(wrap, id);
        }
        syncApply();
      });
      input.addEventListener("focus", () => {
        if (FIELD_BY_ID[id].dict) {
          state.suggestFor = id;
          const wrap = input.closest(".cf-control");
          if (!wrap.querySelector(".cf-suggest")) {
            wrap.insertAdjacentHTML("beforeend", suggestMenu(FIELD_BY_ID[id]));
            bindSuggest(wrap, id);
          }
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const first = input.closest(".cf-control")?.querySelector("[data-pick]");
          if (first) pickValue(id, first.dataset.pick);
          else if (isListOp(state.ops[id]) && input.value.trim()) pickValue(id, input.value.trim());
        }
        if (e.key === "Backspace" && !input.value && isListOp(state.ops[id]) && state.values[id].list.length) {
          state.values[id].list.pop();
          render();
          focusField(id);
        }
        if (e.key === "Escape") {
          closePopovers();
          render();
          focusField(id);
        }
      });
    });
  }

  function bindSuggest(wrap, id) {
    wrap.querySelectorAll("[data-pick]").forEach((b) => {
      b.onmousedown = (e) => {
        e.preventDefault();
        pickValue(id, b.dataset.pick);
      };
    });
  }

  function pickValue(id, value) {
    const op = state.ops[id];
    if (isListOp(op)) {
      if (!state.values[id].list.includes(value)) state.values[id].list.push(value);
      state.values[id].draft = "";
    } else {
      state.values[id].draft = value;
      state.values[id].list = [];
    }
    state.suggestFor = isListOp(op) ? id : null;
    render();
    focusField(id);
  }

  function focusField(id) {
    requestAnimationFrame(() => {
      const input = root.querySelector(`[data-in="${id}"]`);
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    });
  }

  function syncApply() {
    const btn = root.querySelector('[data-act="apply"]');
    if (btn) btn.disabled = !hasAnyValue();
  }

  function defaultSetName() {
    return state.visible
      .map((id) => FIELD_BY_ID[id].label)
      .slice(0, 3)
      .join(", ");
  }

  function pickImport() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const name = data.name || file.name.replace(/\.json$/i, "");
          const payload = data.data || data;
          if (!payload.visible) throw new Error("bad");
          const sets = loadSets();
          if (sets.some((s) => s.name === name)) {
            toast("err", "Такой набор фильтров уже существует");
            return;
          }
          sets.push({ id: "s" + Date.now(), name, data: payload, createdAt: new Date().toISOString().slice(0, 10) });
          saveSets(sets);
          applySnapshot(payload);
          state.funnelOpen = false;
          toast("ok", "Набор фильтров сохранен");
          render();
        } catch {
          toast("err", "Не удалось импортировать набор");
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  }

  function renderModal() {
    document.getElementById("cf-overlay")?.remove();
    if (!state.modal) return;
    const overlay = document.createElement("div");
    overlay.className = "cf-overlay";
    overlay.id = "cf-overlay";
    if (state.modal.type === "add") overlay.appendChild(addModal());
    if (state.modal.type === "save") overlay.appendChild(saveModal());
    if (state.modal.type === "manage") overlay.appendChild(manageModal());
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) {
        state.modal = null;
        render();
      }
    });
    document.body.appendChild(overlay);
  }

  function addModal() {
    const m = state.modal;
    const box = document.createElement("div");
    box.className = "cf-modal";
    const groups = CATALOG.map((g) => {
      const rows = g.fields
        .filter((f) => !m.q || f.label.toLowerCase().includes(m.q.toLowerCase()) || g.group.toLowerCase().includes(m.q.toLowerCase()))
        .map(
          (f) => `<label class="cf-check"><input type="checkbox" data-id="${f.id}" ${m.checked.has(f.id) ? "checked" : ""}>${esc(f.label)}</label>`
        )
        .join("");
      if (!rows) return "";
      return `<div class="cf-group-title">${g.group}</div>${rows}`;
    }).join("");
    box.innerHTML = `
      <button type="button" class="cf-modal-close">×</button>
      <h3>Добавление фильтров</h3>
      <div class="cf-search-wrap">
        <input class="cf-input" placeholder="Поиск по фильтрам" value="${esc(m.q || "")}">
        ${ICO.search}
      </div>
      <div class="cf-groups">${groups || '<div class="muted">Ничего не найдено</div>'}</div>
      <div class="cf-modal-actions">
        <button type="button" class="cf-btn cf-btn-ghost" data-close>Отменить</button>
        <button type="button" class="cf-btn cf-btn-primary" data-ok>Добавить</button>
      </div>
    `;
    box.querySelector(".cf-input").oninput = (e) => {
      m.q = e.target.value;
      const q = m.q;
      const checked = m.checked;
      state.modal = { type: "add", q, checked };
      render();
      const input = document.querySelector("#cf-overlay .cf-input");
      if (input) {
        input.focus();
        input.setSelectionRange(q.length, q.length);
      }
    };
    box.querySelectorAll("[data-id]").forEach((cb) => {
      cb.onchange = () => {
        if (cb.checked) m.checked.add(cb.dataset.id);
        else m.checked.delete(cb.dataset.id);
      };
    });
    box.querySelector("[data-ok]").onclick = () => {
      const next = ALL_FIELDS.map((f) => f.id).filter((id) => m.checked.has(id));
      DEFAULT_IDS.forEach((id) => {
        if (m.checked.has(id) && !next.includes(id)) next.unshift(id);
      });
      state.visible = next.length ? next : DEFAULT_IDS.slice();
      state.modal = null;
      render();
    };
    box.querySelectorAll("[data-close], .cf-modal-close").forEach((b) => {
      b.onclick = () => {
        state.modal = null;
        render();
      };
    });
    return box;
  }

  function saveModal() {
    const m = state.modal;
    const box = document.createElement("div");
    box.className = "cf-modal";
    box.innerHTML = `
      <button type="button" class="cf-modal-close">×</button>
      <h3>Новый набор фильтров</h3>
      <div class="cf-search-wrap">
        <input class="cf-input" placeholder="Тип, Банк Получателя, Система Отправитель" value="${esc(m.name || "")}">
        <button type="button" class="cf-clear">×</button>
      </div>
      <div class="cf-modal-actions">
        <button type="button" class="cf-btn cf-btn-ghost" data-close>Отменить</button>
        <button type="button" class="cf-btn cf-btn-primary" data-ok>Сохранить</button>
      </div>
    `;
    const input = box.querySelector(".cf-input");
    input.oninput = () => {
      m.name = input.value;
    };
    box.querySelector(".cf-clear").onclick = () => {
      input.value = "";
      m.name = "";
      input.focus();
    };
    box.querySelector("[data-ok]").onclick = () => {
      const name = (m.name || "").trim();
      if (!name) {
        input.focus();
        return;
      }
      const sets = loadSets();
      if (sets.some((s) => s.name === name)) {
        toast("err", "Такой набор фильтров уже существует");
        return;
      }
      sets.unshift({
        id: "s" + Date.now(),
        name,
        data: snapshot(),
        createdAt: new Date().toISOString().slice(0, 10),
      });
      saveSets(sets);
      state.modal = null;
      toast("ok", "Набор фильтров сохранен");
      render();
    };
    box.querySelectorAll("[data-close], .cf-modal-close").forEach((b) => {
      b.onclick = () => {
        state.modal = null;
        render();
      };
    });
    requestAnimationFrame(() => input.focus());
    return box;
  }

  function manageModal() {
    const sets = loadSets();
    const box = document.createElement("div");
    box.className = "cf-modal";
    box.innerHTML = `
      <button type="button" class="cf-modal-close">×</button>
      <h3>Управление наборами</h3>
      <div class="cf-sets"></div>
      <div class="cf-modal-actions">
        <button type="button" class="cf-btn cf-btn-ghost" data-close>Отменить</button>
        <button type="button" class="cf-btn cf-btn-primary" data-ok>Применить</button>
      </div>
    `;
    const list = box.querySelector(".cf-sets");
    sets.forEach((s) => {
      const row = document.createElement("div");
      row.className = "cf-set-row" + (state.selectedSetId === s.id ? " selected" : "");
      if (state.editingSetId === s.id) {
        row.innerHTML = `
          <div class="cf-rename">
            <input value="${esc(s.name)}">
            <button type="button" data-ok-name title="Сохранить">${ICO.check}</button>
            <button type="button" data-cancel-name title="Отмена">${ICO.x}</button>
          </div>
        `;
        const inp = row.querySelector("input");
        requestAnimationFrame(() => inp.focus());
        row.querySelector("[data-ok-name]").onclick = (e) => {
          e.stopPropagation();
          const name = inp.value.trim();
          if (!name) return;
          if (sets.some((x) => x.id !== s.id && x.name === name)) {
            toast("err", "Такой набор фильтров уже существует");
            return;
          }
          s.name = name;
          saveSets(sets);
          state.editingSetId = null;
          render();
        };
        row.querySelector("[data-cancel-name]").onclick = (e) => {
          e.stopPropagation();
          state.editingSetId = null;
          render();
        };
      } else {
        row.innerHTML = `
          <div class="cf-set-tools">
            <button type="button" data-share title="Поделиться">${ICO.share}</button>
            <button type="button" data-del title="Удалить">${ICO.trash}</button>
            <button type="button" data-edit title="Переименовать">${ICO.pencil}</button>
          </div>
          <div class="cf-set-name">${esc(s.name)}</div>
        `;
        row.onclick = () => {
          state.selectedSetId = s.id;
          render();
        };
        row.querySelector("[data-share]").onclick = (e) => {
          e.stopPropagation();
          const blob = new Blob([JSON.stringify({ name: s.name, data: s.data }, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${s.name}.json`;
          a.click();
        };
        row.querySelector("[data-del]").onclick = (e) => {
          e.stopPropagation();
          const next = sets.filter((x) => x.id !== s.id);
          saveSets(next);
          if (state.selectedSetId === s.id) state.selectedSetId = next[0]?.id || null;
          render();
        };
        row.querySelector("[data-edit]").onclick = (e) => {
          e.stopPropagation();
          state.editingSetId = s.id;
          render();
        };
      }
      list.appendChild(row);
    });
    box.querySelector("[data-ok]").onclick = () => {
      const set = sets.find((s) => s.id === state.selectedSetId);
      if (set) {
        applySnapshot(set.data);
        toast("ok", `Загружен набор «${set.name}»`);
      }
      state.modal = null;
      render();
    };
    box.querySelectorAll("[data-close], .cf-modal-close").forEach((b) => {
      b.onclick = () => {
        state.modal = null;
        render();
      };
    });
    return box;
  }

  function mount() {
    root = cfg.root;
    root.classList.add("cf");
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest(".cf-menu, .cf-suggest, .cf-funnel-menu, .cf-op, [data-act=funnel], [data-in]")) {
        if (state.openOp || state.suggestFor || state.funnelOpen) {
          closePopovers();
          render();
        }
      }
    });
    render();
  }
  mount();
  return { render, snapshot, applySnapshot, describe, state, OPS, FIELD_BY_ID, hasAnyValue };
};
