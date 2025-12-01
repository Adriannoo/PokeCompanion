// =============================
// LÓGICA DO COMPARADOR
// =============================
const apiURL = "https://pokeapi.co/api/v2/pokemon/";
let pokemonsSelecionados = [];

const input = document.getElementById("pokemonSearch");
const addBtn = document.getElementById("addPokemonBtn");
const cards = [document.getElementById("pokemon1"), document.getElementById("pokemon2")];

// Carregar do localStorage
window.addEventListener("load", () => {
  const salvos = JSON.parse(localStorage.getItem("pokemonsComparados")) || [];
  pokemonsSelecionados = salvos;
  atualizarCards();
});

// Buscar Pokémon
addBtn.addEventListener("click", async () => {
  const nome = input.value.trim().toLowerCase();
  if (!nome) return alert("Digite o nome de um Pokémon!");

  try {
    const res = await fetch(apiURL + nome);
    if (!res.ok) throw new Error("Pokémon não encontrado!");
    const data = await res.json();

    if (pokemonsSelecionados.length >= 2) {
      alert("Limite de 2 Pokémons. Remova um antes de adicionar outro.");
      return;
    }

    pokemonsSelecionados.push(data);
    localStorage.setItem("pokemonsComparados", JSON.stringify(pokemonsSelecionados));
    atualizarCards();
    input.value = "";

  } catch (error) {
    alert("Erro ao buscar Pokémon: " + error.message);
  }
});

// helper
function capitalize(s){ if(!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }

// Atualizar interface (renderiza cartão com gráfico horizontal de estatísticas, similar a sobre-pokemon)
async function atualizarCards() {
  cards.forEach(async (card, index) => {
    const pokemon = pokemonsSelecionados[index];
    if (!pokemon) {
      card.innerHTML = `<p class="placeholder-text">Selecione um Pokémon</p>`;
      return;
    }

    // ordenar estatísticas na ordem desejada
    const order = ['hp','attack','defense','special-attack','special-defense','speed'];
    const statsMap = {};
    pokemon.stats.forEach(s => statsMap[s.stat.name] = s.base_stat);
    const stats = order.map(k => ({ key: k, value: statsMap[k] || 0 }));

    // calcula fraquezas consultando a API de type (combina double_damage_from)
    const weaknessSet = new Set();
    try {
      for (const t of pokemon.types) {
        const res = await fetch('https://pokeapi.co/api/v2/type/' + t.type.name);
        if (!res.ok) continue;
        const tr = await res.json();
        (tr.damage_relations.double_damage_from || []).forEach(d => weaknessSet.add(d.name));
      }
    } catch (e) {
      console.warn('Erro ao buscar fraquezas', e);
    }

    const weaknesses = Array.from(weaknessSet);

    // render HTML do cartão com gráfico horizontal (barras)
    card.innerHTML = `
      <button class="remove-btn" onclick="removerPokemon(${index})">×</button>
      <div class="card-inner">
        <div class="card-header">
          <img class="pokemon-img" src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
          <h2 class="pokemon-title">#${pokemon.id.toString().padStart(4,'0')}<br><span class="pokemon-name">${pokemon.name.charAt(0).toUpperCase()+pokemon.name.slice(1)}</span></h2>
          <div class="pokemon-meta">Altura: ${(pokemon.height/10).toFixed(1)}m &nbsp;|&nbsp; Peso: ${(pokemon.weight/10).toFixed(1)}kg</div>
          <div class="pokemon-types">${pokemon.types.map(t=>`<span class="type-pill" data-type="${t.type.name}"><span class="type-icon" data-type="${t.type.name}"></span><span class="type-name">${capitalize(t.type.name)}</span></span>`).join('')}</div>
        </div>

        <div class="mini-panel stats-panel">
          <h3>Estatísticas</h3>
          <ul class="stats-list">
            ${stats.map(s => {
              const pct = Math.min(100, Math.round((s.value / 180) * 100));
              return `<li class="stat-row"><span class="stat-label">${capitalize(s.key.replace('special-','Sp.'))}</span><span class="stat-bar-wrap"><span class="stat-bar"><span class="stat-fill" data-pct="${pct}" style="width:0%"></span></span></span><span class="stat-value">${s.value}</span></li>`
            }).join('')}
          </ul>
          <div class="stat-total">Total: ${stats.reduce((a,b)=>a+b.value,0)}</div>
        </div>

        <div class="mini-panel abilities-panel">
          <h4>Habilidades</h4>
          <ul>${pokemon.abilities.map(a=>`<li class="ability-item">${a.ability.name}</li>`).join('')}</ul>
        </div>

        <div class="mini-panel weaknesses-panel">
          <h4>Fraquezas</h4>
          <div class="weak-list">${weaknesses.length ? weaknesses.map(w=>`<span class="type-pill weak" data-type="${w}"><span class="type-badge glyph" data-type="${w}"></span><span class="type-name">${capitalize(w)}</span></span>`).join('') : '<span class="muted">—</span>'}</div>
        </div>
      </div>
    `;

    // after insert animate stat fills (horizontal)
    try {
      const fills = card.querySelectorAll('.stat-fill');
      fills.forEach((el, idx) => {
        const pct = el.getAttribute('data-pct') || '0';
        setTimeout(() => { el.style.width = pct + '%'; }, 80 + idx * 80);
      });
    } catch (e) {}

    // inline svg icons for weakness badges and color pills
    try{
      const TYPE_SECOND_COLOR = { water: '#6cbde4', ice: '#8cddd4', rock: '#d7cd90', steel: '#58a6aa', normal: '#a3a49e', poison: '#c261d4', psychic: '#fe9f92', fighting: '#e74347', fire: '#fbae46', flying: '#a6c2f2', ghost: '#7773d4', grass: '#5ac178', electric: '#fbe273', fairy: '#f3a7e7', dark: '#6e7587', dragon: '#0180c7', bug: '#afc836', ground: '#d29463' };
      // header type icons
      const headerIcons = card.querySelectorAll('.type-pill .type-icon');
      for(const el of headerIcons){
        const t = el.getAttribute('data-type');
        const url = '../assets/types/tipos-desenho/'+t+'.svg';
        try{ const res = await fetch(url); if(res.ok){ el.innerHTML = await res.text(); el.classList.add('has-svg'); } }catch(e){}
      }
      // weakness badges
      const weakBadges = card.querySelectorAll('.type-pill.weak');
      for(const node of weakBadges){
        const t = node.getAttribute('data-type');
        const iconEl = node.querySelector('.type-badge');
        try{ const res = await fetch('../assets/types/tipos-desenho/'+t+'.svg'); if(res.ok){ iconEl.innerHTML = await res.text(); } }catch(e){}
        const color = TYPE_SECOND_COLOR[t] || '#764ba2';
        node.style.background = color; node.style.color = '#06221a';
        const badge = node.querySelector('.type-badge'); if(badge) badge.style.background = 'rgba(255,255,255,0.12)';
      }
    }catch(e){ console.warn('inline icons failed', e) }
  });
}

// Remover Pokémon
function removerPokemon(index) {
  pokemonsSelecionados.splice(index, 1);
  localStorage.setItem("pokemonsComparados", JSON.stringify(pokemonsSelecionados));
  atualizarCards();
}


// =============================
// SISTEMA DE LOGIN (PADRÃO)
// =============================

const loginBtn = document.querySelector(".login-btn");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logoutBtn");

const loggedUser = localStorage.getItem("loggedUser");

if (loggedUser && loginBtn) {
    const userData = JSON.parse(localStorage.getItem(loggedUser));
    loginBtn.textContent = userData.username;

    // Evita navegar para login
    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        positionUserMenu();
        userMenu.style.display =
            userMenu.style.display === "block" ? "none" : "block";
    });
}

// Logout
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedUser");
    userMenu.style.display = "none";
    window.location.href = "login.html";
});

// Fechar menu ao clicar fora
document.addEventListener("click", (e) => {
    if (!loginBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.style.display = "none";
    }
});

// Posicionamento do menu — exatamente abaixo do botão
function positionUserMenu() {
    const rect = loginBtn.getBoundingClientRect();

    const top = rect.top + rect.height + window.scrollY + 4;
    const left = rect.left + window.scrollX;

    userMenu.style.top = top + "px";
    userMenu.style.left = left + "px";
}