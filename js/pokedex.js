document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("#dexSearch"),
    grid = document.querySelector("#pokemonGrid"),
    more = document.querySelector("#loadMore"),
    sort = document.querySelector("#sortSelect");
  const params = new URLSearchParams(location.search);
  let catalog = [],
    results = [],
    offset = 0,
    version = 0,
    busy = false,
    type = params.get("tipo") || "",
    favorites = params.get("favoritos") === "1" && Boolean(Session.user()),
    query = (params.get("busca") || "").slice(0, 80);
  if (!Poke.types[type]) type = "";
  input.value = query;
  if (["id-asc", "id-desc", "az", "za"].includes(params.get("ordem")))
    sort.value = params.get("ordem");
  const filters = document.querySelector("#typeFilters");
  filters.innerHTML = Object.entries(Poke.types)
    .map(
      ([key, name]) =>
        `<button class="type-item" data-type="${key}" aria-pressed="${key === type}" style="--badge:${Poke.colors[key]}"><span><img src="../assets/types/tipos-desenho/${key}.svg" alt=""></span>${name}</button>`,
    )
    .join("");
  filters.onclick = (e) => {
    const button = e.target.closest("[data-type]");
    if (!button) return;
    type = type === button.dataset.type ? "" : button.dataset.type;
    favorites = false;
    update();
  };
  document.querySelector("#typeSearch").oninput = (e) => {
    const text = e.target.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    filters.querySelectorAll("button").forEach(
      (b) =>
        (b.hidden = !b.textContent
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(text)),
    );
  };
  document.querySelector("#favoritesFilter").onclick = () => {
    if (!Session.require()) return;
    favorites = !favorites;
    update();
  };
  document.querySelector("#clearFilters").onclick = () => {
    type = "";
    query = "";
    input.value = "";
    favorites = false;
    document.querySelector("#typeSearch").value = "";
    filters.querySelectorAll("button").forEach((b) => (b.hidden = false));
    update();
  };
  document.querySelector("#filtersToggle").onclick = (e) => {
    const sidebar = document.querySelector(".sidebar"),
      expanded = sidebar.classList.toggle("expanded");
    e.currentTarget.setAttribute("aria-expanded", String(expanded));
    e.currentTarget.setAttribute(
      "aria-label",
      expanded ? "Recolher filtros" : "Mostrar filtros",
    );
  };
  function search() {
    query = input.value.trim().toLowerCase().replace(/^#/, "");
    update();
  }
  Interface.suggestions(input, () => search());
  document.querySelector(".search-container").onsubmit = (e) => {
    e.preventDefault();
    input.blur();
    search();
  };
  sort.onchange = update;
  window.addEventListener("favoritoschange", () => {
    if (favorites) update();
  });
  async function update() {
    const current = ++version;
    const url = new URL(location.href);
    for (const [key, value] of [
      ["tipo", type],
      ["busca", query],
      ["ordem", sort.value === "id-asc" ? "" : sort.value],
      ["favoritos", favorites ? "1" : ""],
    ]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
    busy = false;
    offset = 0;
    more.disabled = true;
    more.hidden = false;
    grid.innerHTML = Array(6)
      .fill('<div class="skeleton" aria-hidden="true"></div>')
      .join("");
    grid.setAttribute("aria-busy", "true");
    filters
      .querySelectorAll("[data-type]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(type === b.dataset.type)),
      );
    document
      .querySelector("#favoritesFilter")
      .setAttribute("aria-pressed", String(favorites));
    document.querySelector("#activeFilter").textContent = [
      type ? Poke.types[type] : "Todos os tipos",
      favorites ? "Meus favoritos" : "",
      query ? "Busca: " + input.value : "",
    ]
      .filter(Boolean)
      .join(" · ");
    try {
      if (!catalog.length) catalog = await Poke.catalog();
      let list = [...catalog];
      if (type) {
        const data = await Poke.get("type/" + type),
          ids = new Set(data.pokemon.map((p) => Poke.idFrom(p.pokemon.url)));
        list = list.filter((p) => ids.has(p.id));
      }
      if (current !== version) return;
      if (favorites) {
        const ids = new Set(Favoritos.ids());
        list = list.filter((p) => ids.has(p.id));
      }
      if (query)
        list = list.filter(
          (p) => p.name.includes(query) || p.id === Number(query),
        );
      list.sort((a, b) =>
        sort.value === "az"
          ? a.name.localeCompare(b.name)
          : sort.value === "za"
            ? b.name.localeCompare(a.name)
            : sort.value === "id-desc"
              ? b.id - a.id
              : a.id - b.id,
      );
      results = list;
      grid.replaceChildren();
      document.querySelector("#resultCount").textContent =
        `${list.length} Pokémon encontrados`;
      if (!list.length) {
        grid.innerHTML =
          '<div class="empty-state"><h2>Nenhum Pokémon por aqui</h2><p>Experimente outro nome, tipo ou limpe os filtros.</p></div>';
        more.hidden = true;
        grid.setAttribute("aria-busy", "false");
        return;
      }
      await load(current);
    } catch (error) {
      if (current === version) {
        Interface.error(grid, error, update);
        more.hidden = true;
        grid.setAttribute("aria-busy", "false");
      }
    }
  }
  async function load(current = version) {
    if (busy || current !== version) return;
    busy = true;
    more.disabled = true;
    more.textContent = "Carregando…";
    const batch = results.slice(offset, offset + 20);
    try {
      const data = await Promise.all(batch.map((p) => Poke.pokemon(p.id)));
      if (current !== version) return;
      grid.append(...data.map(Interface.card));
      offset += batch.length;
      more.hidden = offset >= results.length;
      document.querySelector("#resultCount").textContent =
        `${offset} de ${results.length} Pokémon`;
    } catch (error) {
      if (current === version) {
        if (!offset) Interface.error(grid, error, update);
        else Interface.mensagem(error.message);
      }
    } finally {
      if (current === version) {
        busy = false;
        more.disabled = false;
        more.textContent = "Carregar mais";
        grid.setAttribute("aria-busy", "false");
      }
    }
  }
  more.onclick = () => load();
  update();
});
