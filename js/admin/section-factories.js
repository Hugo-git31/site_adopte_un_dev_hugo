import { $, api, notify } from "./core.js";

export function createPaginatedSection(config) {
  const state = {
    page: 1,
    pageSize: config.pageSize ?? 10,
    total: 0,
    items: [],
    query: "",
    filters: {},
    ...(config.initialState ?? {}),
  };

  const bodyEl = $(config.tableBody);
  const emptyEl = $(config.emptyState);
  const paginationEl = $(config.pagination);
  const searchInput = config.searchInput ? $(config.searchInput) : null;
  const searchForm = config.searchForm ? $(config.searchForm) : null;

  let afterDelete = config.onAfterDelete;

  function render() {
    if (!bodyEl || !emptyEl || !paginationEl) return;
    if (!state.items.length) {
      bodyEl.innerHTML = "";
      emptyEl.style.display = "block";
      paginationEl.innerHTML = "";
      paginationEl.style.display = "none";
      return;
    }

    emptyEl.style.display = "none";
    bodyEl.innerHTML = state.items.map(config.renderRow).join("");

    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize || 1));
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      paginationEl.style.display = "none";
      return;
    }

    const prevDisabled = state.page <= 1;
    const nextDisabled = state.page >= totalPages;
    paginationEl.style.display = "flex";
    paginationEl.innerHTML = config.renderPagination
      ? config.renderPagination(state, totalPages)
      : `
        <button class="admin-page-btn" data-page="${state.page - 1}" ${prevDisabled ? "disabled" : ""}>Précédent</button>
        <span>Page ${state.page} / ${totalPages}</span>
        <button class="admin-page-btn" data-page="${state.page + 1}" ${nextDisabled ? "disabled" : ""}>Suivant</button>
      `;
  }

  async function load(page = 1) {
    state.page = page;
    const params = new URLSearchParams({
      page: String(state.page),
      page_size: String(state.pageSize),
    });

    if (config.paramBuilder) {
      const extra = config.paramBuilder(state) || {};
      Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
    } else if (state.query) {
      params.set(config.searchParam ?? "q", state.query);
    }

    try {
      const data = await api(`${config.endpoint}?${params.toString()}`);
      state.items = data.items || [];
      state.total = data.total ?? state.items.length;
      state.page = data.page || state.page;
      state.pageSize = data.page_size || state.pageSize;
      render();

      if (state.page > 1 && state.items.length === 0 && state.total > 0) {
        const lastPage = Math.max(1, Math.ceil(state.total / state.pageSize));
        if (lastPage !== state.page) {
          return load(lastPage);
        }
      }
      return data;
    } catch (err) {
      console.error("Erreur chargement section", err);
      notify(err?.detail || config.errorMessage || "Chargement impossible", false);
      return null;
    }
  }

  async function handleDelete(event) {
    const btn = event.target.closest(config.deleteSelector);
    if (!btn) return;
    const id = config.extractId(btn);
    if (!Number.isFinite(id)) return;
    const confirmMsg = config.confirmMessage || "Supprimer cet élément ?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await api(config.deleteEndpoint(id), { method: "DELETE" });
      notify(config.successMessage || "Élément supprimé ✅");
      const totalAfter = Math.max(0, state.total - 1);
      const lastPage = Math.max(1, Math.ceil(totalAfter / state.pageSize));
      const targetPage = Math.min(state.page, lastPage);
      await load(targetPage);
      if (afterDelete) await afterDelete(state);
    } catch (err) {
      notify(err?.detail || config.errorMessage || "Suppression impossible", false);
    }
  }

  bodyEl?.addEventListener("click", handleDelete);
  paginationEl?.addEventListener("click", (event) => {
    const btn = event.target.closest(".admin-page-btn");
    if (!btn || btn.disabled) return;
    const nextPage = Number(btn.dataset.page);
    if (!Number.isFinite(nextPage)) return;
    load(Math.max(1, nextPage));
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = searchInput?.value.trim() || "";
    load(1);
  });

  return {
    state,
    load,
    refresh: () => load(state.page),
    setAfterDelete(fn) {
      afterDelete = fn;
    },
    setQuery(value) {
      state.query = value;
    },
    setFilters(updates) {
      state.filters = { ...(state.filters || {}), ...(updates || {}) };
    },
  };
}

export function createFilterableList(config) {
  const state = {
    items: [],
    filtered: [],
    query: "",
  };

  const bodyEl = $(config.tableBody);
  const emptyEl = $(config.emptyState);
  const paginationEl = config.pagination ? $(config.pagination) : null;
  const searchInput = config.searchInput ? $(config.searchInput) : null;
  const searchForm = config.searchForm ? $(config.searchForm) : null;

  let afterDelete = config.onAfterDelete;

  function render() {
    if (!bodyEl || !emptyEl) return;

    if (!state.filtered.length) {
      bodyEl.innerHTML = "";
      emptyEl.style.display = "block";
    } else {
      emptyEl.style.display = "none";
      bodyEl.innerHTML = state.filtered.map(config.renderRow).join("");
    }

    if (paginationEl) {
      paginationEl.innerHTML = "";
      paginationEl.style.display = "none";
    }
  }

  function applyFilter() {
    state.query = (searchInput?.value || "").trim().toLowerCase();
    if (!state.query) {
      state.filtered = [...state.items];
    } else {
      const filterFn =
        config.filter ??
        ((item, query) => {
          const target = `${item.name || ""} ${item.hq_city || ""}`.toLowerCase();
          return target.includes(query);
        });
      state.filtered = state.items.filter((item) => filterFn(item, state.query));
    }
    render();
  }

  async function load() {
    try {
      const data = await api(config.endpoint);
      state.items = data.items || [];
      applyFilter();
      return data;
    } catch (err) {
      console.error("Erreur chargement liste", err);
      notify(err?.detail || config.errorMessage || "Chargement impossible", false);
      return null;
    }
  }

  async function handleDelete(event) {
    const btn = event.target.closest(config.deleteSelector);
    if (!btn) return;
    const id = config.extractId(btn);
    if (!Number.isFinite(id)) return;
    const confirmMsg = config.confirmMessage || "Supprimer cet élément ?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await api(config.deleteEndpoint(id), { method: "DELETE" });
      notify(config.successMessage || "Élément supprimé ✅");
      await load();
      if (afterDelete) await afterDelete(state);
    } catch (err) {
      notify(err?.detail || config.errorMessage || "Suppression impossible", false);
    }
  }

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilter();
  });

  bodyEl?.addEventListener("click", handleDelete);

  return {
    state,
    load,
    refresh: () => load(),
    setAfterDelete(fn) {
      afterDelete = fn;
    },
    applyFilter,
  };
}
