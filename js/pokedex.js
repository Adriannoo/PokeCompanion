/* pokedex.js */
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

    const favoritesFilter = document.getElementById('favoritesFilter');

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
            data?.sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_default;

        const animatedShiny =
            data?.sprites?.versions?.["generation-v"]?.["black-white"]?.animated?.front_shiny;

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
            card.tabIndex = 0;
            card.setAttribute('role', 'link');
            card.setAttribute('aria-label', `Ver detalhes de ${capitalize(p.name)}`);
            card.addEventListener('keydown', event => {
                if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    window.location.href = `sobre-pokemon.html?id=${p.id}`;
                }
            });

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
            img.onerror = null;
            img.src = FALLBACK_IMG;
        };
        imgWrap.appendChild(img);

            const info = document.createElement("div");
            info.className = "card-info";

            const h4 = document.createElement("h4");
            h4.textContent = capitalize(p.name);

            const num = document.createElement("p");
            num.className = "pokemon-number";
            num.textContent = `#${String(p.id).padStart(4, "0")}`;

            // insígnias de tipos (exibir os SVGs completos dos ícones de tipo; usar texto como alternativa)
            const typesWrap = document.createElement("div");
            typesWrap.className = "pokemon-types";
        if (p.types && p.types.length) {
                p.types.forEach(t => {
                    const typeName = t;
                    const span = document.createElement('span');
                    span.className = `type-badge icon-only ${typeName}`;
                    span.style.background = TYPE_SECOND_COLOR[typeName] || '#764ba2';

                    const img = document.createElement('img');
                    img.className = 'type-badge-img';
                    img.alt = '';
                    span.title = Interface.tipo(typeName);
                    img.src = `../assets/types/tipos-desenho/${typeName}.svg`;
                    img.onerror = () => {
                        // usar texto como alternativa se o ícone não estiver disponível
                        img.remove();
                        span.textContent = Interface.tipo(typeName);
                    };

                    span.appendChild(img);
                    const label = document.createElement('span');
                    label.className = 'type-label';
                    label.textContent = Interface.tipo(typeName);
                    span.appendChild(label);
                    typesWrap.appendChild(span);
                });
        }

            info.appendChild(h4);
            info.appendChild(num);
            info.appendChild(typesWrap);

            card.appendChild(Favoritos.criarBotao(p.id, p.name));
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
        // após a inserção no DOM, tentar incorporar (inline) quaisquer SVGs usados como ícones para 
        // que possamos remover fundos brancos embutidos e ter melhor controle de alinhamento
        try { inlineTypeBadgeSvgs(); } catch (e) { /* falhar silenciosamente */ }
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

    // SVGs inline para as insígnias de tipo nos cards: buscar o código-fonte do SVG, 
    // remover os retângulos de fundo e substituir o <img> pelo <svg> processado. 
    // Isso nos permite garantir transparência e centralização consistente mesmo quando os SVGs 
    // exportados contêm caixas brancas.”
    function inlineTypeBadgeSvgs() {
        const imgs = document.querySelectorAll('.type-badge.icon-only img');
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

                // Remover quaisquer retângulos em tamanho completo que funcionem como fundos brancos
                const rects = svg.querySelectorAll('rect');
                rects.forEach(r => {
                    const fill = (r.getAttribute('fill') || '').trim().toLowerCase();
                    const x = r.getAttribute('x') || '0';
                    const y = r.getAttribute('y') || '0';
                    // remover retângulos que aparentem ser fundos completos (brancos ou posicionados em 0,0)
                    if (fill === '#fff' || fill === '#ffffff' || fill === 'white' || (x === '0' && y === '0')) {
                        r.parentNode && r.parentNode.removeChild(r);
                    }
                });

                // Remover (strip) width/height para permitir dimensionamento via CSS, mantendo o viewBox
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                svg.style.width = '92%';
                svg.style.height = '92%';
                svg.style.display = 'block';

                // copiar quaisquer atributos importantes para o svg no documento
                svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet');

                // substituir o nó img pelo svg
                img.replaceWith(svg);
            }).catch(() => {
                // manter a imagem original caso a busca ou a análise falhe
            });
        });
    }

    // Handler: quando usuário clicar pesquisar
    async function onSearchClick() {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (!query) return loadInitial(currentTypeFilter);
        const version = ++requestVersion;
        isLoading = false;
        currentTypeFilter = null;
        updateFavoritesFilter();
        document.querySelectorAll('.type-item.active').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
        const button = document.querySelector('.load-more-btn');
        if (button) button.hidden = true;
        showStatus('Buscando Pokemon...');
        const single = await fetchPokemon(query);
        if (version !== requestVersion) return;
        pokemons = single ? [single] : [];
        applyTypeFilterAndRender();
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

    // Cada consulta tem sua propria versao: respostas antigas nao alteram a tela.
    let requestVersion = 0;
    let isLoading = false;
    let currentTypeFilter = null;
    let entries = [];
    let nextOffset = 0;
    const catalogueCache = new Map();

    function pokemonId(url) {
        return Number(url.split('/').filter(Boolean).pop());
    }

    async function getCatalogue(type = null) {
        if (type === 'favorites') {
            return Favoritos.ids().map(id => ({ url: `${API_URL}${id}/` }));
        }
        const key = type || 'all';
        if (!catalogueCache.has(key)) {
            const promise = (async () => {
                if (!type) {
                    const response = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=100000');
                    if (!response.ok) throw new Error('Catalogo indisponivel');
                    return (await response.json()).results;
                }
                const regular = await getCatalogue();
                const regularIds = new Set(regular.map(item => pokemonId(item.url)));
                const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
                if (!response.ok) throw new Error('Tipo indisponivel');
                const data = await response.json();
                return data.pokemon.map(item => item.pokemon)
                    .filter(item => regularIds.has(pokemonId(item.url)));
            })();
            catalogueCache.set(key, promise);
            promise.catch(() => catalogueCache.delete(key));
        }
        return catalogueCache.get(key);
    }

    function showStatus(message) {
        const text = document.createElement('p');
        text.className = 'pokedex-status';
        text.textContent = message;
        pokemonGrid.replaceChildren(text);
    }

    async function loadInitial(type = null) {
        const version = ++requestVersion;
        currentTypeFilter = type;
        updateFavoritesFilter();
        isLoading = true;
        pokemons = [];
        entries = [];
        nextOffset = 0;
        const button = document.querySelector('.load-more-btn');
        if (button) { button.hidden = false; button.disabled = true; button.textContent = 'Carregando...'; }
        showStatus('Carregando Pokemon...');
        try {
            const catalogue = await getCatalogue(type);
            if (version !== requestVersion) return;
            entries = Array.from(new Map(catalogue.map(item => [pokemonId(item.url), item])).values());
            isLoading = false;
            if (entries.length === 0) {
                showStatus(type === 'favorites' ? 'Você ainda não tem favoritos. Use ☆ nos cartões para salvar.' : 'Nenhum Pokémon encontrado.');
                if (button) button.hidden = true;
                return;
            }
            await loadNext(20);
        } catch (error) {
            if (version !== requestVersion) return;
            isLoading = false;
            showStatus('Nao foi possivel carregar. Tente pesquisar ou selecionar um tipo novamente.');
            if (button) button.hidden = true;
            console.warn('Falha no catalogo', error);
        }
    }

    async function loadNext(n = 20) {
        if (isLoading || nextOffset >= entries.length) return;
        isLoading = true;
        const version = requestVersion;
        const button = document.querySelector('.load-more-btn');
        if (button) { button.disabled = true; button.textContent = 'Carregando...'; }
        const endOffset = Math.min(nextOffset + n, entries.length);
        try {
            const loaded = [];
            for (let start = nextOffset; start < endOffset; start += 8) {
                const batch = entries.slice(start, Math.min(start + 8, endOffset));
                const results = await Promise.all(batch.map(item => fetchPokemon(pokemonId(item.url))));
                if (version !== requestVersion) return;
                if (results.some(item => !item)) throw new Error('Falha ao carregar o lote');
                loaded.push(...results);
            }
            if (version !== requestVersion) return;
            // O ID identifica o Pokemon, mesmo ao alternar busca, tipo e paginacao.
            pokemons = Array.from(new Map([...pokemons, ...loaded].map(item => [item.id, item])).values());
            nextOffset = endOffset;
            applyTypeFilterAndRender();
        } catch (error) {
            if (version === requestVersion) {
                showStatus('Falha ao carregar Pokemon. Use Carregar mais para tentar novamente.');
                console.warn('Falha no carregamento', error);
            }
        } finally {
            if (version === requestVersion) {
                isLoading = false;
                if (button) {
                    button.disabled = nextOffset >= entries.length;
                    button.textContent = button.disabled ? 'Todos carregados' : 'Carregar mais';
                }
            }
        }
    }

    function applyTypeFilterAndRender() {
        sortPokemonsInMemory();
        renderPokemons(pokemons);
    }

    setupSortDropdown();

    function setupTypeFilter() {
        const items = document.querySelectorAll('.type-item');
        if (!items || items.length === 0) return;
        items.forEach(it => {
            // injetar o SVG do glifo (desenho) no contêiner do ícone de tipo
            const icon = it.querySelector('.type-icon');
            if (icon) {
                const typeClass = Array.from(icon.classList).find(c => c !== 'type-icon');
                if (typeClass) {
                    // buscar o SVG do glifo e inseri-lo inline para que ele possa ficar sobre o fundo colorido
                    const glyphUrl = `../assets/types/tipos-desenho/${typeClass}.svg`;
                    fetch(glyphUrl).then(res => {
                        if (!res.ok) throw new Error('glyph not found');
                        return res.text();
                    }).then(svgText => {
                        // remover (sanear) tags básicas de script (por segurança)
                        const safe = svgText.replace(/<\/?script[\s\S]*?>/gi, '');
                        icon.innerHTML = safe;
                        // garantir que o elemento svg não tenha width/height inline que quebrem o dimensionamento
                        const svg = icon.querySelector('svg');
                        if (svg) {
                            svg.setAttribute('width', '');
                            svg.setAttribute('height', '');
                            svg.style.width = '60%';
                            svg.style.height = '60%';
                            svg.style.display = 'block';
                        }
                    }).catch(() => {
                        // alternativa (fallback): não mostrar nada (manter o círculo colorido)
                        // deixar o conteúdo do ícone vazio
                    });
                }
            }

            it.addEventListener('click', () => {
                const icon2 = it.querySelector('.type-icon');
                if (!icon2) return;
                const cls = Array.from(icon2.classList).find(c => c !== 'type-icon');
                if (!cls) return;
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

                if (searchInput) searchInput.value = '';
                items.forEach(item => item.setAttribute('aria-pressed', String(item.classList.contains('active'))));
                loadInitial(currentTypeFilter);
            });
        });
    }

    function updateFavoritesFilter() {
        if (!favoritesFilter) return;
        favoritesFilter.textContent = `☆ Favoritos (${Favoritos.ids().length})`;
        favoritesFilter.setAttribute('aria-pressed', String(currentTypeFilter === 'favorites'));
    }

    if (favoritesFilter) {
        favoritesFilter.addEventListener('click', () => {
            document.querySelectorAll('.type-item.active').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
            if (searchInput) searchInput.value = '';
            loadInitial(currentTypeFilter === 'favorites' ? null : 'favorites');
        });
    }
    window.addEventListener('favoritoschange', () => {
        updateFavoritesFilter();
        if (currentTypeFilter === 'favorites') loadInitial('favorites');
    });
    const filtersToggle = document.getElementById('filtersToggle');
    filtersToggle.addEventListener('click', () => {
        const expanded = filtersToggle.getAttribute('aria-expanded') !== 'true';
        filtersToggle.setAttribute('aria-expanded', String(expanded));
        filtersToggle.textContent = expanded ? 'Recolher tipos ▴' : 'Mostrar tipos ▾';
    });
    setupTypeFilter();

    if (searchBtn) {
        searchBtn.addEventListener("click", onSearchClick);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") onSearchClick();
        });
    }

    loadInitial();

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
    if (!loginBtn || !userMenu) return;
    if (!loginBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.style.display = "none";
    }
});
