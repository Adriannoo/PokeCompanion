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

    // Mapeamento de cor secundária por tipo — usado para o gradiente do card
    const TYPE_SECOND_COLOR = {
        water: '#6cbde4',
        ice: '#8cddd4',
        rock: '#d7cd90',
        steel: '#58a6aa',
        normal: '#a3a49e',
        poison: '#c261d4',
        psychic: '#fe9f92',
        fighting: '#e74347',
        fire: '#fbae46',
        flying: '#a6c2f2',
        ghost: '#7773d4',
        grass: '#5ac178',
        electric: '#fbe273',
        fairy: '#f3a7e7',
        dark: '#6e7587',
        dragon: '#0180c7',
        bug: '#afc836',
        ground: '#d29463'
    };

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
        // setamos uma variável CSS por card para controlar a cor do gradiente
        // baseada no primeiro tipo do Pokémon (tipo principal)
        try {
            const primary = Array.isArray(p.types) && p.types.length ? p.types[0] : null;
            const color = primary && TYPE_SECOND_COLOR[primary] ? TYPE_SECOND_COLOR[primary] : '#764ba2';
            imgWrap.style.setProperty('--card-primary-color', color);
        } catch (e) {
            // defensive: não bloquear renderização se algo falhar
        }
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

        // types badges (show full icon SVGs from icones-tipos; fallback to text)
        const typesWrap = document.createElement("div");
        typesWrap.className = "pokemon-types";
        if (p.types && p.types.length) {
                p.types.forEach(t => {
                    const typeName = t;
                    const span = document.createElement('span');
                    span.className = `type-badge icon-only ${typeName}`;

                    const img = document.createElement('img');
                    img.className = 'type-badge-img';
                    img.alt = typeName + ' icon';
                    img.src = `../assets/types/icones-tipos/${typeName}.svg`;
                    img.onerror = () => {
                        // fallback to text if icon not available
                        img.remove();
                        span.textContent = typeName;
                    };

                    span.appendChild(img);
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
        // after DOM insertion, try to inline any SVGs used as icons so we can
        // remove embedded white backgrounds and better control alignment
        try { inlineTypeBadgeSvgs(); } catch (e) { /* fail silently */ }
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

    // Inline SVGs for type badges in cards: fetch SVG source, remove background rects
    // and replace the <img> with the parsed <svg>. This lets us ensure transparency
    // and consistent centering even when the exported SVGs contain white boxes.
    function inlineTypeBadgeSvgs() {
        const imgs = document.querySelectorAll('.type-badge.icon-only img[type-badge-img], .type-badge.icon-only img');
        imgs.forEach(img => {
            const src = img.getAttribute('src');
            if (!src || !src.toLowerCase().endsWith('.svg')) return;
            fetch(src).then(res => {
                if (!res.ok) throw new Error('svg fetch failed');
                return res.text();
            }).then(svgText => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, 'image/svg+xml');
                const svg = doc.querySelector('svg');
                if (!svg) return;

                // Remove any full-size rects that act as white backgrounds
                const rects = svg.querySelectorAll('rect');
                rects.forEach(r => {
                    const fill = (r.getAttribute('fill') || '').trim().toLowerCase();
                    const x = r.getAttribute('x') || '0';
                    const y = r.getAttribute('y') || '0';
                    // remove rects that look like full-backgrounds (white or positioned at 0,0)
                    if (fill === '#fff' || fill === '#ffffff' || fill === 'white' || (x === '0' && y === '0')) {
                        r.parentNode && r.parentNode.removeChild(r);
                    }
                });

                // Strip width/height to allow CSS sizing, keep viewBox
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                svg.style.width = '92%';
                svg.style.height = '92%';
                svg.style.display = 'block';

                // copy any important attributes to the svg in the document
                svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet');

                // replace the img node with the svg
                img.replaceWith(svg);
            }).catch(() => {
                // leave the original img if fetching or parsing fails
            });
        });
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
            // inject glyph SVG (drawing) into the type-icon container
            const icon = it.querySelector('.type-icon');
            if (icon) {
                const typeClass = Array.from(icon.classList).find(c => c !== 'type-icon');
                if (typeClass) {
                    // fetch the glyph SVG and inline it so it can sit over the colored background
                    const glyphUrl = `../assets/types/tipos-desenho/${typeClass}.svg`;
                    fetch(glyphUrl).then(res => {
                        if (!res.ok) throw new Error('glyph not found');
                        return res.text();
                    }).then(svgText => {
                        // sanitize basic script tags out (defensive)
                        const safe = svgText.replace(/<\/?script[\s\S]*?>/gi, '');
                        icon.innerHTML = safe;
                        // ensure svg element has no inline width/height that breaks sizing
                        const svg = icon.querySelector('svg');
                        if (svg) {
                            svg.setAttribute('width', '');
                            svg.setAttribute('height', '');
                            svg.style.width = '60%';
                            svg.style.height = '60%';
                            svg.style.display = 'block';
                        }
                    }).catch(() => {
                        // fallback: show nothing (keep colored circle)
                        // leave icon content empty
                    });
                }
            }

            it.addEventListener('click', () => {
                const icon2 = it.querySelector('.type-icon');
                if (!icon2) return;
                const cls = Array.from(icon2.classList).find(c => c !== 'type-icon');
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
