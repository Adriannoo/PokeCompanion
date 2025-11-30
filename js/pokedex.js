/* pokedex.js - versão robusta com debugging e fallbacks */
document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "https://pokeapi.co/api/v2/pokemon/";

    // Seletores (guardados com checagens)
    const searchInput = document.querySelector(".search-bar input");
    const searchBtn = document.querySelector(".search-btn");
    const pokemonGrid = document.querySelector(".pokemon-grid");

    // Dropdown (se existir no HTML)
    const sortSelect = document.querySelector(".sort-select");
    const sortBtn = sortSelect ? sortSelect.querySelector(".sort-btn") : null;
    const sortLabel = sortSelect ? sortSelect.querySelector(".sort-label") : null;
    const sortOptions = sortSelect ? sortSelect.querySelector(".sort-options") : null;

    // Validações mínimas
    if (!pokemonGrid) {
        console.error("Elemento .pokemon-grid não encontrado.");
        return;
    }
    if (!searchInput || !searchBtn) {
        console.warn("Busca desativada — input ou botão ausente.");
    }

    // Estado
    let pokemons = [];
    let sortMode = "az"; // az, za, id-asc, id-desc

    // Imagem fallback
    const FALLBACK_IMG =
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";

    async function fetchPokemon(nameOrId) {
        try {
            const url = `${API_URL}${String(nameOrId).toLowerCase().trim()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`fetch error ${res.status}`);
            const data = await res.json();
            return formatPokemonData(data);
        } catch (err) {
            console.warn("fetchPokemon falhou:", nameOrId);
            return null;
        }
    }

    function formatPokemonData(data) {
        const animated =
            data?.sprites?.versions["generation-v"]["black-white"]?.animated?.front_default;

        const animatedShiny =
            data?.sprites?.versions["generation-v"]["black-white"]?.animated?.front_shiny;

        const image =
            animated ||
            animatedShiny ||
            data?.sprites?.other["official-artwork"]?.front_default ||
            data?.sprites?.front_default ||
            data?.sprites?.front_shiny ||
            FALLBACK_IMG;

        const types = Array.isArray(data.types)
            ? data.types.map((t) => t.type.name)
            : [];

        return {
            id: data.id || 0,
            name: data.name || "unknown",
            image,
            types,
        };
    }

    function renderPokemons(list) {
        pokemonGrid.innerHTML = "";

        if (!list || list.length === 0) {
            const p = document.createElement("p");
            p.style.color = "white";
            p.style.fontSize = "1.2rem";
            p.style.textAlign = "center";
            p.textContent = "Nenhum Pokémon encontrado.";
            pokemonGrid.appendChild(p);
            return;
        }

        const frag = document.createDocumentFragment();

        list.forEach((p) => {
            const card = document.createElement("div");
            card.className = "pokemon-card";

            const imgWrap = document.createElement("div");
            imgWrap.className = "card-image";

            const img = document.createElement("img");
            img.src = p.image || FALLBACK_IMG;
            img.alt = p.name || "Pokemon";
            img.onerror = () => (img.src = FALLBACK_IMG);
            imgWrap.appendChild(img);

            const info = document.createElement("div");
            info.className = "card-info";

            const h4 = document.createElement("h4");
            h4.textContent = capitalize(p.name);

            const num = document.createElement("p");
            num.className = "pokemon-number";
            num.textContent = `#${String(p.id).padStart(4, "0")}`;

            const typesWrap = document.createElement("div");
            typesWrap.className = "pokemon-types";

            p.types.forEach((t) => {
                const span = document.createElement("span");
                span.className = `type-badge ${t}`;
                span.textContent = capitalize(t);
                typesWrap.appendChild(span);
            });

            info.appendChild(h4);
            info.appendChild(num);
            info.appendChild(typesWrap);

            card.appendChild(imgWrap);
            card.appendChild(info);

            card.dataset.pokemonId = p.id;
            card.style.cursor = "pointer";
            card.addEventListener("click", () => {
                window.location.href = `sobre-pokemon.html?id=${encodeURIComponent(p.id)}`;
            });

            frag.appendChild(card);
        });

        pokemonGrid.appendChild(frag);
    }

    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
    }

    function sortPokemonsInMemory() {
        switch (sortMode) {
            case "az": pokemons.sort((a, b) => a.name.localeCompare(b.name)); break;
            case "za": pokemons.sort((a, b) => b.name.localeCompare(a.name)); break;
            case "id-asc": pokemons.sort((a, b) => a.id - b.id); break;
            case "id-desc": pokemons.sort((a, b) => b.id - a.id); break;
        }
    }

    async function onSearchClick() {
        if (!searchInput) return;

        const q = searchInput.value.trim();
        if (!q) {
            sortPokemonsInMemory();
            renderPokemons(pokemons);
            return;
        }

        const single = await fetchPokemon(q);
        pokemons = single ? [single] : [];
        renderPokemons(pokemons);
    }

    function setupSortDropdown() {
        if (!sortSelect || !sortBtn || !sortLabel || !sortOptions) return;

        sortBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sortSelect.classList.toggle("open");
        });

        document.addEventListener("click", () =>
            sortSelect.classList.remove("open")
        );

        sortOptions.addEventListener("click", (ev) => {
            const li = ev.target.closest("li");
            if (!li) return;

            sortMode = li.dataset.sort;
            sortLabel.textContent = li.textContent;
            sortSelect.classList.remove("open");

            sortPokemonsInMemory();
            renderPokemons(pokemons);
        });
    }

    async function getTotalPokemonCount() {
        try {
            const res = await fetch(API_URL + "?limit=1");
            const data = await res.json();
            return data.count || 898;
        } catch {
            return 898;
        }
    }

    let nextId = 1;
    let totalCount = null;

    async function loadInitial(n = 20) {
        pokemons = [];
        totalCount = await getTotalPokemonCount();
        nextId = 1;
        await loadNext(n);
    }

    async function loadNext(n = 20) {
        if (totalCount === null) totalCount = await getTotalPokemonCount();
        if (nextId > totalCount) return;

        const startId = nextId;
        const endId = Math.min(totalCount, nextId + n - 1);
        const ids = [];

        for (let id = startId; id <= endId; id++) ids.push(id);

        const batchSize = 8;
        for (let start = 0; start < ids.length; start += batchSize) {
            const end = Math.min(ids.length - 1, start + batchSize - 1);
            const promises = [];

            for (let i = start; i <= end; i++) {
                promises.push(fetchPokemon(ids[i]));
            }

            const results = await Promise.all(promises);
            results.forEach((r) => r && pokemons.push(r));
        }

        nextId = endId + 1;

        sortPokemonsInMemory();
        applyTypeFilterAndRender();

        const btn = document.querySelector(".load-more-btn");
        if (btn) {
            if (nextId > totalCount) {
                btn.disabled = true;
                btn.textContent = "Todos carregados";
            } else {
                btn.disabled = false;
                btn.textContent = "Carregar mais";
            }
        }
    }

    setupSortDropdown();

    let currentTypeFilter = null;

    function applyTypeFilterAndRender() {
        let list = pokemons.slice();

        if (currentTypeFilter) {
            list = list.filter(
                (p) => p.types && p.types.includes(currentTypeFilter)
            );
        }

        sortPokemonsInMemory();
        renderPokemons(list);
    }

    function setupTypeFilter() {
        const items = document.querySelectorAll(".type-item");
        if (!items.length) return;

        items.forEach((it) => {
            it.addEventListener("click", () => {
                const icon = it.querySelector(".type-icon");
                if (!icon) return;

                const cls = Array.from(icon.classList).find(
                    (c) => c !== "type-icon"
                );

                if (currentTypeFilter === cls) {
                    currentTypeFilter = null;
                    it.classList.remove("active");
                } else {
                    document
                        .querySelectorAll(".type-item.active")
                        .forEach((a) => a.classList.remove("active"));
                    currentTypeFilter = cls;
                    it.classList.add("active");
                }

                applyTypeFilterAndRender();
            });
        });
    }

    setupTypeFilter();

    if (searchBtn) {
        searchBtn.addEventListener("click", onSearchClick);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") onSearchClick();
        });
    }

    loadInitial(20);

    const loadMoreBtn = document.querySelector(".load-more-btn");
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            loadNext(20);
        });
    }
});

/* ====================================================================== */
/* ========================  MENU DE USUÁRIO  ============================ */
/* ====================================================================== */

const loginBtn = document.querySelector(".login-btn");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");

const loggedUser = localStorage.getItem("loggedUser");

function positionUserMenu() {
    const rect = loginBtn.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 4;
    const left = rect.left + window.scrollX;

    userMenu.style.top = top + "px";
    userMenu.style.left = left + "px";
}

if (loggedUser && loginBtn) {
    const userData = JSON.parse(localStorage.getItem(loggedUser));

    loginBtn.textContent = userData.username;

    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();

        positionUserMenu();

        userMenu.style.display =
            userMenu.style.display === "block" ? "none" : "block";
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("loggedUser");

        loginBtn.textContent = "Fazer login";
        userMenu.style.display = "none";

        window.location.href = "login.html";
    });
}

document.addEventListener("click", (e) => {
    if (!loginBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.style.display = "none";
    }
});