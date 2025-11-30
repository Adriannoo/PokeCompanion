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

        // tenta pegar flavor text em pt-BR via species
        let flavor = '';
        const species = await fetchJson(`${API}/pokemon-species/${p.id}`);
        if (species && Array.isArray(species.flavor_text_entries)) {
            const entry = species.flavor_text_entries.find(e => e.language && e.language.name === 'pt');
            if (entry) flavor = entry.flavor_text.replace(/\n|\f/g, ' ');
        }

        // imagem preferida
        const image = (p.sprites && p.sprites.other && p.sprites.other['official-artwork'] && p.sprites.other['official-artwork'].front_default)
            || p.sprites.front_default || '';

        // stats
        const stats = (p.stats || []).map(s => ({name: s.stat.name, value: s.base_stat}));

        // tipos
        const types = (p.types || []).map(t => t.type.name);

        // monta HTML simples e reutilizável
        const html = `
            <div class="detail-card">
                <button id="backBtn" class="back-btn">◀ Voltar</button>
                <div class="detail-top">
                    <div class="detail-image">
                        <img src="${image}" alt="${capitalize(p.name)}">
                    </div>
                    <div class="detail-header">
                        <h1>${capitalize(p.name)}</h1>
                        <p class="pokemon-number">#${String(p.id).padStart(4, '0')}</p>
                        <div class="pokemon-types">
                            ${types.map(t => `<span class="type-badge ${t}">${capitalize(t)}</span>`).join(' ')}
                        </div>
                        <p class="flavor">${flavor}</p>
                    </div>
                </div>
                <div class="detail-body">
                    <div class="stats">
                        <h3>Stats</h3>
                        <ul>
                            ${stats.map(s => `<li><strong>${capitalize(s.name)}:</strong> ${s.value}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="meta">
                        <h3>Informações</h3>
                        <p><strong>Altura:</strong> ${p.height / 10} m</p>
                        <p><strong>Peso:</strong> ${p.weight / 10} kg</p>
                    </div>
                </div>
            </div>
        `;

        detailWrap.innerHTML = html;

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