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

        // comportamento: ao clicar no card, navegar para a página de detalhes
        card.dataset.pokemonId = p.id;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const id = encodeURIComponent(p.id);
            // página de detalhes no mesmo diretório HTML
            window.location.href = `sobre-pokemon.html?id=${id}`;
        });

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

    // Sequential loader: load initial range starting at 1 and support "load more"
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
        if (nextId > totalCount) return; // nothing more

        const startId = nextId;
        const endId = Math.min(totalCount, nextId + n - 1);
        const ids = [];
        for (let id = startId; id <= endId; id++) ids.push(id);

        // fetch in batches
        const batchSize = 8;
        for (let start = 0; start < ids.length; start += batchSize) {
            const end = Math.min(ids.length - 1, start + batchSize - 1);
            const promises = [];
            for (let i = start; i <= end; i++) promises.push(fetchPokemon(ids[i]));
            const results = await Promise.all(promises);
            results.forEach((r) => r && pokemons.push(r));
        }

        nextId = endId + 1;
        sortPokemonsInMemory();
        applyTypeFilterAndRender();
        // update load-more button state
        const btn = document.querySelector('.load-more-btn');
        if (btn) {
            if (nextId > totalCount) {
                btn.disabled = true;
                btn.textContent = 'Todos carregados';
            } else {
                btn.disabled = false;
                btn.textContent = 'Carregar mais';
            }
        }
    }

    // INICIALIZAÇÃO
    setupSortDropdown();

    // filtro por tipo (sidebar)
    let currentTypeFilter = null;
    function applyTypeFilterAndRender() {
        let list = pokemons.slice();
        if (currentTypeFilter) {
            list = list.filter(p => Array.isArray(p.types) && p.types.includes(currentTypeFilter));
        }
        sortPokemonsInMemory();
        renderPokemons(list);
    }

    // configura eventos dos type-items na sidebar (se existirem)
    function setupTypeFilter() {
        const items = document.querySelectorAll('.type-item');
        if (!items || items.length === 0) return;
        items.forEach(it => {
            it.addEventListener('click', () => {
                const icon = it.querySelector('.type-icon');
                if (!icon) return;
                // pega a primeira classe além de 'type-icon'
                const cls = Array.from(icon.classList).find(c => c !== 'type-icon');
                if (!cls) return;
                if (currentTypeFilter === cls) {
                    currentTypeFilter = null; // toggle off
                    it.classList.remove('active');
                } else {
                    // remove active de todos e ativa só este
                    document.querySelectorAll('.type-item.active').forEach(a => a.classList.remove('active'));
                    currentTypeFilter = cls;
                    it.classList.add('active');
                }
                applyTypeFilterAndRender();
            });
        });
    }

    setupTypeFilter();

    if (searchBtn) searchBtn.addEventListener("click", onSearchClick);
    // permite pesquisar com Enter
    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") onSearchClick();
        });
    }

    // carrega os iniciais (sequencial, começando por 1)
    loadInitial(20).catch((err) => {
        console.error("Erro carregando pokemons iniciais:", err);
    });

    // configura botão carregar mais (se existir)
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadNext(20).catch(err => console.error('Erro ao carregar mais:', err));
        });
    }

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
