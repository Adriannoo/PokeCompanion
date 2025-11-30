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
                const entry = species.flavor_text_entries.find(e => e.language && (e.language.name === 'pt' || e.language.name === 'en'));
                if (entry) flavor = entry.flavor_text.replace(/\n|\f/g, ' ');
            }
            if (Array.isArray(species.genera)) {
                const g = species.genera.find(g => g.language && (g.language.name === 'pt' || g.language.name === 'en'));
                if (g) category = g.genus;
            }
        }

        // imagem preferida: prioriza sprites animados da geração V (black-white) quando disponíveis
        // escolhe também o tipo principal baseado no slot=1 (para mapear a cor corretamente)
        const primaryTypeObj = Array.isArray(p.types) ? p.types.find(t => t.slot === 1) : null;
        const primaryTypeName = primaryTypeObj ? primaryTypeObj.type.name : (Array.isArray(p.types) && p.types.length ? p.types[0].type.name : null);

        let image = '';
        try {
            const gv = p.sprites && p.sprites.versions && p.sprites.versions['generation-v'] && p.sprites.versions['generation-v']['black-white'] && p.sprites.versions['generation-v']['black-white'].animated;
            if (gv && gv.front_default) image = gv.front_default;
            else if (p.sprites && p.sprites.other && p.sprites.other['official-artwork'] && p.sprites.other['official-artwork'].front_default) image = p.sprites.other['official-artwork'].front_default;
            else if (p.sprites && p.sprites.front_default) image = p.sprites.front_default;
            else image = '';
        } catch (e) {
            image = p.sprites && p.sprites.front_default ? p.sprites.front_default : '';
        }

        // stats
        const stats = (p.stats || []).map(s => ({name: s.stat.name, value: s.base_stat}));

        // tipos (array) and primary type name (slot-aware)
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
                            <img src="${image}" alt="${capitalize(p.name)}">
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
                            <div class="stats-panel">
                                <h3>Estatísticas</h3>
                                <ul class="stats-list">
                                    ${stats.map(s => {
                                        const pct = Math.min(100, Math.round((s.value / 180) * 100));
                                        return `<li class="stat-row"><span class="stat-label">${capitalize(s.name)}</span><span class="stat-bar-wrap"><span class="stat-bar"><span class="stat-fill" style="width:${pct}%"></span></span></span><span class="stat-value">${s.value}</span></li>`
                                    }).join('')}
                                </ul>
                                <div class="stat-total"><div class="total-label">Total:</div><div class="total-value">${stats.reduce((a,b)=>a+b.value,0)}</div></div>
                            </div>

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
        // set card primary color based on primary type (slot=1 aware)
        try {
            const cardNode = detailWrap.querySelector('.detail-card');
            const TYPE_SECOND_COLOR = { water: '#6cbde4', ice: '#8cddd4', rock: '#d7cd90', steel: '#58a6aa', normal: '#a3a49e', poison: '#c261d4', psychic: '#fe9f92', fighting: '#e74347', fire: '#fbae46', flying: '#a6c2f2', ghost: '#7773d4', grass: '#5ac178', electric: '#fbe273', fairy: '#f3a7e7', dark: '#6e7587', dragon: '#0180c7', bug: '#afc836', ground: '#d29463' };
            const color = primary && TYPE_SECOND_COLOR[primary] ? TYPE_SECOND_COLOR[primary] : '#764ba2';
            if (cardNode) cardNode.style.setProperty('--card-primary-color', color);
            // also set a data attr for styling if needed
            if (cardNode && primary) cardNode.setAttribute('data-primary-type', primary);
        } catch (e) {}

        // inline glyph SVGs for types in header and for weaknesses
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
                // color the pill based on type
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

            // fetch weaknesses for the pokemon types and render
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
                // render pills with icon + name
                weakWrap.innerHTML = weaknessArr.map(w => `<span class="type-pill weak" data-type="${w}"><span class="type-icon" data-type="${w}"></span><span class="type-name">${capitalize(w)}</span></span>`).join(' ');

                // inline icons and color them
                const weakIcons = weakWrap.querySelectorAll('.type-pill');
                for (const node of weakIcons) {
                    const t = node.getAttribute('data-type');
                    const url = `../assets/types/tipos-desenho/${t}.svg`;
                    try {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error('not ok ' + res.status);
                        const svgText = await res.text();
                        const iconEl = node.querySelector('.type-icon');
                        if (iconEl) iconEl.innerHTML = svgText;
                    } catch (err) {
                        // ignore
                    }
                    try {
                        const TYPE_SECOND_COLOR = { water: '#6cbde4', ice: '#8cddd4', rock: '#d7cd90', steel: '#58a6aa', normal: '#a3a49e', poison: '#c261d4', psychic: '#fe9f92', fighting: '#e74347', fire: '#fbae46', flying: '#a6c2f2', ghost: '#7773d4', grass: '#5ac178', electric: '#fbe273', fairy: '#f3a7e7', dark: '#6e7587', dragon: '#0180c7', bug: '#afc836', ground: '#d29463' };
                        const color = TYPE_SECOND_COLOR[t] || '#764ba2';
                        node.style.background = color;
                        node.style.color = '#06221a';
                    } catch (e) {}
                }
            } catch (err) {
                console.warn('weakness fetch failed', err);
            }
        }

        inlineTypeIcons();

        // back button
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