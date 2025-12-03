document.addEventListener('DOMContentLoaded', () => {
    const detailWrap = document.getElementById('pokemon-detail');
    const API = 'https://pokeapi.co/api/v2';

    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    function capitalize(s) {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    async function fetchJson(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('fetch status ' + res.status);
            return await res.json();
        } catch (err) {
            console.error('fetchJson error', err);
            return null;
        }
    }

    async function loadPokemon(idOrName) {
        detailWrap.innerHTML = '<p style="color:white; text-align:center;">Carregando...</p>';
        const p = await fetchJson(`${API}/pokemon/${encodeURIComponent(idOrName)}`);
        if (!p) {
            detailWrap.innerHTML = '<p style="color:white; text-align:center;">Não foi possível carregar o Pokémon.</p>';
            return;
        }

        // tenta pegar flavor text em pt-BR via species e categoria (genera)
        let flavor = '';
        let category = '';
        const species = await fetchJson(`${API}/pokemon-species/${p.id}`);
        if (species) {
            if (Array.isArray(species.flavor_text_entries)) {
                // Preferir o texto descritivo em português (qualquer variante ‘pt’), usar o inglês como alternativa (fallback)
                let entry = species.flavor_text_entries.find(e => e.language && typeof e.language.name === 'string' && e.language.name.toLowerCase().startsWith('pt'));
                if (!entry) entry = species.flavor_text_entries.find(e => e.language && e.language.name === 'en');
                if (entry) flavor = entry.flavor_text.replace(/\n|\f/g, ' ');
            }
            if (Array.isArray(species.genera)) {
                let g = species.genera.find(g => g.language && typeof g.language.name === 'string' && g.language.name.toLowerCase().startsWith('pt'));
                if (!g) g = species.genera.find(g => g.language && g.language.name === 'en');
                if (g) category = g.genus;
            }
        }

        // imagem preferida: prioriza sprites animados da geração V (black-white) quando disponíveis
        // escolhe também o tipo principal baseado no slot=1 (para mapear a cor corretamente)
        const primaryTypeObj = Array.isArray(p.types) ? p.types.find(t => t.slot === 1) : null;
        const primaryTypeName = primaryTypeObj ? primaryTypeObj.type.name : (Array.isArray(p.types) && p.types.length ? p.types[0].type.name : null);

        // escolher imagem: preferir o gif animado da generation-v (para manter a animação),
        // usar como alternativa (fallback) a official-artwork (geralmente PNG transparente),
        // e depois front_default.
        let image = '';
        try {
            const gv = p.sprites && p.sprites.versions && p.sprites.versions['generation-v'] && p.sprites.versions['generation-v']['black-white'] && p.sprites.versions['generation-v']['black-white'].animated;
            const official = p.sprites && p.sprites.other && p.sprites.other['official-artwork'] && p.sprites.other['official-artwork'].front_default;
            if (gv && gv.front_default) image = gv.front_default;
            else if (official) image = official;
            else if (p.sprites && p.sprites.front_default) image = p.sprites.front_default;
            else image = '';
        } catch (e) {
            image = p.sprites && p.sprites.front_default ? p.sprites.front_default : '';
        }

        // debug: expor no console a imagem escolhida e as fontes de sprites disponíveis para ajudar na solução de problemas
        try {
            console.debug('sobre-pokemon: chosen image for', p.name, image);
            const available = {
                official: p.sprites && p.sprites.other && p.sprites.other['official-artwork'] && p.sprites.other['official-artwork'].front_default,
                animated_gv: p.sprites && p.sprites.versions && p.sprites.versions['generation-v'] && p.sprites.versions['generation-v']['black-white'] && p.sprites.versions['generation-v']['black-white'].animated && p.sprites.versions['generation-v']['black-white'].animated.front_default,
                front: p.sprites && p.sprites.front_default
            };
            console.debug('sobre-pokemon: available sprites', available);
        } catch (e) {}

        // Status
        const stats = (p.stats || []).map(s => ({name: s.stat.name, value: s.base_stat}));

        // tipos (array) e nome do tipo primário (ciente do slot)
        const types = (p.types || []).map(t => t.type.name);
        const primary = primaryTypeName || (types.length ? types[0] : null);

        // monta HTML simples e reutilizável
        const html = `
            <div class="detail-card">
                <div class="back-row">
                    <button id="backBtn" class="back-btn">◀ Voltar</button>
                </div>
                <div class="detail-stage">
                    <div class="detail-left">
                        <div class="detail-image">
                            <img src="${image}" alt="${capitalize(p.name)}" class="sprite-image">
                        </div>

                        <div class="stats-panel bottom-stats">
                            <h3>Estatísticas</h3>
                            <ul class="stats-list">
                                ${stats.map(s => {
                                    const pct = Math.min(100, Math.round((s.value / 180) * 100));
                                    return `<li class="stat-row"><span class="stat-label">${capitalize(s.name)}</span><span class="stat-bar-wrap"><span class="stat-bar"><span class="stat-fill" data-pct="${pct}" style="width:0%"></span></span></span><span class="stat-value">${s.value}</span></li>`
                                }).join('')}
                            </ul>
                            <div class="stat-total"><div class="total-label">Total:</div><div class="total-value">${stats.reduce((a,b)=>a+b.value,0)}</div></div>
                        </div>
                    </div>
                    <div class="detail-right">
                        <div class="right-top">
                            <div class="detail-header">
                                <h1>${capitalize(p.name)}</h1>
                                <p class="pokemon-number">#${String(p.id).padStart(4, '0')}</p>
                                <div class="pokemon-types">
                                    ${types.map(t => `<span class="type-pill" data-type="${t}"><span class="type-icon" data-type="${t}"></span><span class="type-name">${capitalize(t)}</span></span>`).join(' ')}
                                </div>
                            </div>
                            <div class="meta-card">
                                <p class="meta-category"><strong>${category || ''}</strong></p>
                                <p>Altura ${p.height/10} m</p>
                                <p>Peso ${p.weight/10} kg</p>
                                <p class="meta-abilities">Habilidades: ${(p.abilities||[]).map(a=>a.ability.name).join(', ')}</p>
                            </div>
                        </div>

                        <div class="right-grid">
                            <div class="side-panels">
                                <div class="meta-panel about-panel">
                                    <h3>Sobre</h3>
                                    <p class="flavor">${flavor}</p>
                                </div>
                                <div class="weaknesses">
                                    <h3>Fraquezas</h3>
                                    <div class="weak-list"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        detailWrap.innerHTML = html;
        // definir a cor primária do card com base no tipo primário (considerando slot=1)
        try {
            const cardNode = detailWrap.querySelector('.detail-card');
            const TYPE_SECOND_COLOR = { water: '#6cbde4', ice: '#8cddd4', rock: '#d7cd90', steel: '#58a6aa', normal: '#a3a49e', poison: '#c261d4', psychic: '#fe9f92', fighting: '#e74347', fire: '#fbae46', flying: '#a6c2f2', ghost: '#7773d4', grass: '#5ac178', electric: '#fbe273', fairy: '#f3a7e7', dark: '#6e7587', dragon: '#0180c7', bug: '#afc836', ground: '#d29463' };
            const color = primary && TYPE_SECOND_COLOR[primary] ? TYPE_SECOND_COLOR[primary] : '#764ba2';
            // calcular um tom mais escuro (~50%) para o fundo, para que o painel pareça mais profundo
            function hexToRgb(h) {
                const hex = h.replace('#','');
                const bigint = parseInt(hex.length === 3 ? hex.split('').map(c=>c+c).join('') : hex, 16);
                const r = (bigint >> 16) & 255;
                const g = (bigint >> 8) & 255;
                const b = bigint & 255;
                return {r,g,b};
            }
            function rgbToHex(r,g,b) {
                const toHex = (n) => n.toString(16).padStart(2,'0');
                return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
            }
            function darkenHex(hex, factor) {
                try {
                    const {r,g,b} = hexToRgb(hex);
                    const nr = Math.max(0, Math.round(r * (1 - factor)));
                    const ng = Math.max(0, Math.round(g * (1 - factor)));
                    const nb = Math.max(0, Math.round(b * (1 - factor)));
                    return rgbToHex(nr,ng,nb);
                } catch (e) { return hex }
            }

            const darker = darkenHex(color, 0.5); // 50% mais escuro
            if (cardNode) {
                // armazenar também a cor base caso queiramos usar a cor original em outro lugar
                cardNode.style.setProperty('--card-primary-base', color);
                cardNode.style.setProperty('--card-primary-color', darker);
            }
            // também definir um atributo data para estilização, se necessário
            if (cardNode && primary) cardNode.setAttribute('data-primary-type', primary);
        } catch (e) {}

        // inserir inline os SVGs de glifo para os tipos no cabeçalho e para as fraquezas
        async function inlineTypeIcons() {
            const headerIcons = detailWrap.querySelectorAll('.type-pill .type-icon');
            for (const el of headerIcons) {
                const t = el.getAttribute('data-type');
                const url = `../assets/types/tipos-desenho/${t}.svg`;
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('not ok ' + res.status);
                    const svgText = await res.text();
                    el.innerHTML = svgText;
                    el.classList.add('has-svg');
                } catch (err) {
                    el.textContent = '';
                }
                // colorir a ‘pílula’ com base no tipo
                try {
                    const TYPE_SECOND_COLOR = { water: '#6cbde4', ice: '#8cddd4', rock: '#d7cd90', steel: '#58a6aa', normal: '#a3a49e', poison: '#c261d4', psychic: '#fe9f92', fighting: '#e74347', fire: '#fbae46', flying: '#a6c2f2', ghost: '#7773d4', grass: '#5ac178', electric: '#fbe273', fairy: '#f3a7e7', dark: '#6e7587', dragon: '#0180c7', bug: '#afc836', ground: '#d29463' };
                    const pill = el.closest('.type-pill');
                    const color = TYPE_SECOND_COLOR[t] || '#764ba2';
                    if (pill) {
                        pill.style.background = color;
                        pill.style.color = '#06221a';
                    }
                } catch (e) {}
            }

            // buscar as fraquezas para os tipos do Pokémon e renderizá-las
            const weakWrap = detailWrap.querySelector('.weak-list');
            if (!weakWrap) return;
            try {
                const weaknessSet = new Set();
                for (const t of types) {
                    const tr = await fetchJson(`${API}/type/${t}`);
                    if (tr && tr.damage_relations && Array.isArray(tr.damage_relations.double_damage_from)) {
                        tr.damage_relations.double_damage_from.forEach(w => weaknessSet.add(w.name));
                    }
                }
                const weaknessArr = Array.from(weaknessSet);
                // renderizar as pílulas com emblema circular + nome
                weakWrap.innerHTML = weaknessArr.map(w => `<span class="type-pill weak" data-type="${w}"><span class="type-badge glyph" data-type="${w}"></span><span class="type-name">${capitalize(w)}</span></span>`).join(' ');

                // inserir os ícones inline e colorí-los (emblema)
                const weakIcons = weakWrap.querySelectorAll('.type-pill');
                for (const node of weakIcons) {
                    const t = node.getAttribute('data-type');
                    const url = `../assets/types/tipos-desenho/${t}.svg`;
                    try {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error('not ok ' + res.status);
                        const svgText = await res.text();
                        const iconEl = node.querySelector('.type-badge');
                        if (iconEl) iconEl.innerHTML = svgText;
                    } catch (err) {
                        // ignore
                    }
                    try {
                        const TYPE_SECOND_COLOR = { water: '#6cbde4', ice: '#8cddd4', rock: '#d7cd90', steel: '#58a6aa', normal: '#a3a49e', poison: '#c261d4', psychic: '#fe9f92', fighting: '#e74347', fire: '#fbae46', flying: '#a6c2f2', ghost: '#7773d4', grass: '#5ac178', electric: '#fbe273', fairy: '#f3a7e7', dark: '#6e7587', dragon: '#0180c7', bug: '#afc836', ground: '#d29463' };
                        const color = TYPE_SECOND_COLOR[t] || '#764ba2';
                        node.style.background = color;
                        node.style.color = '#06221a';
                        const badge = node.querySelector('.type-badge');
                        if (badge) badge.style.background = 'rgba(255,255,255,0.12)';
                    } catch (e) {}
                }
            } catch (err) {
                console.warn('weakness fetch failed', err);
            }
        }

        inlineTypeIcons();

        // animar o preenchimento dos status após inserir os ícones inline (espelhar o comportamento do comparador)
        try {
            const fills = detailWrap.querySelectorAll('.stat-fill');
            fills.forEach((el, idx) => {
                const pct = el.getAttribute('data-pct') || '0';
                setTimeout(() => { el.style.width = pct + '%'; }, 80 + idx * 80);
            });
        } catch (e) {}

        // botão de voltar
        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.addEventListener('click', () => history.back());
    }

    const id = getQueryParam('id') || getQueryParam('name');
    if (!id) {
        detailWrap.innerHTML = '<p style="color:white; text-align:center;">Nenhum Pokémon selecionado. Volte para a Pokédex e escolha um Pokémon.</p>';
        return;
    }

    loadPokemon(id);
});


const loginBtn = document.querySelector(".login-btn");

const loggedUser = localStorage.getItem("loggedUser");

if (loggedUser) {
    if (loginBtn) {
        const userData = JSON.parse(localStorage.getItem(loggedUser));
        loginBtn.textContent = userData.username;
    }
}