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
    const sortOptions = sortSelect
        ? sortSelect.querySelector(".sort-options")
        : null;

    // Validações mínimas
    if (!pokemonGrid) {
        console.error(
        "Elemento .pokemon-grid não encontrado no HTML. Verifique a classe."
        );
        return;
    }
    if (!searchInput || !searchBtn) {
        console.warn(
        "Elemento de busca (input ou botão) não encontrado. A pesquisa ficará desativada."
        );
    }

    // Estado
    let pokemons = [];
    let sortMode = "az"; // az, za, id-asc, id-desc

    // Util: fallback de imagem
    const FALLBACK_IMG =
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";

    // Busca um pokémon por nome ou id
    async function fetchPokemon(nameOrId) {
        try {
        const url = `${API_URL}${String(nameOrId).toLowerCase().trim()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch error ${res.status}`);
        const data = await res.json();
        return formatPokemonData(data);
        } catch (err) {
        console.warn("fetchPokemon falhou para:", nameOrId, err.message);
        return null;
        }
    }

    // Formata resposta da API para o formato que usamos
    function formatPokemonData(data) {
        // Preferir o GIF animado da geração V (black-white) se disponível — já é em estilo B/W
        const animated =
        data &&
        data.sprites &&
        data.sprites.versions &&
        data.sprites.versions["generation-v"] &&
        data.sprites.versions["generation-v"]["black-white"] &&
        data.sprites.versions["generation-v"]["black-white"].animated
            ? data.sprites.versions["generation-v"]["black-white"].animated
                .front_default
            : null;

        const animatedShiny =
        data &&
        data.sprites &&
        data.sprites.versions &&
        data.sprites.versions["generation-v"] &&
        data.sprites.versions["generation-v"]["black-white"] &&
        data.sprites.versions["generation-v"]["black-white"].animated
            ? data.sprites.versions["generation-v"]["black-white"].animated
                .front_shiny
            : null;

        const image =
        animated ||
        animatedShiny ||
        (data.sprites &&
            data.sprites.other &&
            data.sprites.other["official-artwork"] &&
            data.sprites.other["official-artwork"].front_default) ||
        (data.sprites && data.sprites.front_default) ||
        (data.sprites && data.sprites.front_shiny) ||
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

    // Renderiza a lista de pokémons no grid (limpo e seguro)
    function renderPokemons(list) {
        pokemonGrid.innerHTML = ""; // limpa

        if (!list || list.length === 0) {
        const p = document.createElement("p");
        p.style.color = "white";
        p.style.fontSize = "1.2rem";
        p.style.textAlign = "center";
        p.textContent = "Nenhum Pokémon encontrado.";
        pokemonGrid.appendChild(p);
        return;
        }

        // cria fragment para performance
        const frag = document.createDocumentFragment();

        list.forEach((p) => {
        const card = document.createElement("div");
        card.className = "pokemon-card";

        // imagem — img element com fallback
        const imgWrap = document.createElement("div");
        imgWrap.className = "card-image";
        const img = document.createElement("img");
        img.src = p.image || FALLBACK_IMG;
        img.alt = p.name || "Pokemon";
        img.onerror = () => {
            img.src = FALLBACK_IMG;
        };
        imgWrap.appendChild(img);

        // infos
        const info = document.createElement("div");
        info.className = "card-info";
        const h4 = document.createElement("h4");
        h4.textContent = capitalize(p.name);
        const num = document.createElement("p");
        num.className = "pokemon-number";
        num.textContent = `#${String(p.id).padStart(4, "0")}`;

        // types badges
        const typesWrap = document.createElement("div");
        typesWrap.className = "pokemon-types";
        if (p.types && p.types.length) {
            p.types.forEach((t) => {
            const span = document.createElement("span");
            span.className = `type-badge ${t}`;
            span.textContent = capitalize(t);
            typesWrap.appendChild(span);
            });
        }

        info.appendChild(h4);
        info.appendChild(num);
        info.appendChild(typesWrap);

        card.appendChild(imgWrap);
        card.appendChild(info);

        frag.appendChild(card);
        });

        pokemonGrid.appendChild(frag);
    }

    function capitalize(s) {
        if (!s) return "";
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Ordenação
    function sortPokemonsInMemory() {
        switch (sortMode) {
        case "az":
            pokemons.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case "za":
            pokemons.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case "id-asc":
            pokemons.sort((a, b) => a.id - b.id);
            break;
        case "id-desc":
            pokemons.sort((a, b) => b.id - a.id);
            break;
        default:
            break;
        }
    }

    // Handler: quando usuário clicar pesquisar
    async function onSearchClick() {
        if (!searchInput) return;
        const q = searchInput.value.trim();
        if (!q) {
        // se campo vazio, renderiza os pokemons carregados
        sortPokemonsInMemory();
        renderPokemons(pokemons);
        return;
        }
        // tenta buscar um pokemon único (nome ou id)
        const single = await fetchPokemon(q);
        pokemons = single ? [single] : [];
        renderPokemons(pokemons);
    }

    // Dropdown / seleção de ordenação
    function setupSortDropdown() {
        if (!sortSelect || !sortBtn || !sortLabel || !sortOptions) {
        // não existe markup de dropdown — criamos comportamento mínimo no console
        console.info(
            "Dropdown de ordenação não encontrado — operação mínima ativa."
        );
        return;
        }

        // abre/fecha dropdown
        sortBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sortSelect.classList.toggle("open");
        });

        // fechar ao clicar fora
        document.addEventListener("click", () =>
        sortSelect.classList.remove("open")
        );

        // clicar em uma opção
        sortOptions.addEventListener("click", (ev) => {
        const li = ev.target.closest("li");
        if (!li) return;
        const chosen = li.dataset.sort;
        if (!chosen) return;
        sortMode = chosen;
        sortLabel.textContent = li.textContent;
        sortSelect.classList.remove("open");
        sortPokemonsInMemory();
        renderPokemons(pokemons);
        });
    }

    // Busca a contagem total de pokémons disponíveis na API (para amostragem aleatória)
    async function getTotalPokemonCount() {
        try {
            const res = await fetch(API_URL + '?limit=1');
            if (!res.ok) throw new Error('count fetch error ' + res.status);
            const data = await res.json();
            return data.count || 898; // fallback razoável
        } catch (err) {
            console.warn('getTotalPokemonCount falhou, usando fallback 898:', err.message);
            return 898;
        }
    }

    // Carrega N pokémons iniciais aleatórios (para variar a lista a cada reload)
    async function loadInitial(n = 20) {
        pokemons = [];
        // escolhe N ids únicos aleatórios entre 1 e total
        const total = await getTotalPokemonCount();
        const ids = new Set();
        while (ids.size < Math.min(n, total)) {
            const id = Math.floor(Math.random() * total) + 1;
            ids.add(id);
        }
        const idArray = Array.from(ids);

        // busca em paralelo em lotes para performance
        const batchSize = 8;
        for (let start = 0; start < idArray.length; start += batchSize) {
            const end = Math.min(idArray.length - 1, start + batchSize - 1);
            const promises = [];
            for (let i = start; i <= end; i++) promises.push(fetchPokemon(idArray[i]));
            const results = await Promise.all(promises);
            results.forEach((r) => r && pokemons.push(r));
        }

        sortPokemonsInMemory();
        renderPokemons(pokemons);
    }

    // INICIALIZAÇÃO
    setupSortDropdown();

    if (searchBtn) searchBtn.addEventListener("click", onSearchClick);
    // permite pesquisar com Enter
    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") onSearchClick();
        });
    }

    // carrega os iniciais
    loadInitial(4).catch((err) => {
        console.error("Erro carregando pokemons iniciais:", err);
    });

    // para debug: expõe no window
    window.__pcdebug = {
        pokemons,
        setSortMode: (m) => {
        sortMode = m;
        sortPokemonsInMemory();
        renderPokemons(pokemons);
        },
    };
});
